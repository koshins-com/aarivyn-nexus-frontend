import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type Bbox = [number, number, number, number];

function parseBbox(value: unknown): Bbox | null {
  if (!Array.isArray(value) || value.length !== 4) return null;
  const numbers = value.map(Number);
  if (!numbers.every(Number.isFinite)) return null;
  const [west, south, east, north] = numbers;
  if (
    west < -180 || east > 180 || south < -90 || north > 90 ||
    west >= east || south >= north
  ) return null;
  return [west, south, east, north];
}

async function readJson(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(25_000),
    headers: { Accept: "application/json", ...init?.headers },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Data provider returned ${response.status} ${response.statusText}`);
  }
  return response.json();
}

function rectangle(bbox: Bbox): GeoJSON.Polygon {
  const [west, south, east, north] = bbox;
  return {
    type: "Polygon",
    coordinates: [[[west, south], [east, south], [east, north], [west, north], [west, south]]],
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const dataset = String(body.dataset ?? "");
    const bbox = parseBbox(body.bbox);
    if (!bbox) return NextResponse.json({ error: "Enter a valid west, south, east, north extent." }, { status: 400 });

    const [west, south, east, north] = bbox;
    const centerLat = (south + north) / 2;
    const centerLon = (west + east) / 2;
    let data: unknown;
    let sourceUrl = "";

    switch (dataset) {
      case "imagery": {
        const response = await readJson("https://earth-search.aws.element84.com/v1/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bbox,
            collections: ["sentinel-2-l2a", "landsat-c2-l2"],
            datetime: "2024-01-01T00:00:00Z/..",
            limit: 8,
            sortby: [{ field: "properties.datetime", direction: "desc" }],
          }),
        });
        data = response;
        sourceUrl = "https://earth-search.aws.element84.com/v1/search";
        break;
      }
      case "hazards": {
        const url = new URL("https://eonet.gsfc.nasa.gov/api/v3/events/geojson");
        // EONET orders bbox as west,north,east,south.
        url.searchParams.set("bbox", `${west},${north},${east},${south}`);
        url.searchParams.set("status", "open");
        url.searchParams.set("limit", "100");
        data = await readJson(url.toString());
        sourceUrl = url.toString();
        break;
      }
      case "climate": {
        const end = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
        const start = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
        const url = new URL("https://archive-api.open-meteo.com/v1/archive");
        url.search = new URLSearchParams({
          latitude: centerLat.toFixed(4), longitude: centerLon.toFixed(4),
          start_date: start, end_date: end,
          daily: "temperature_2m_max,temperature_2m_min,precipitation_sum",
          timezone: "auto",
        }).toString();
        data = await readJson(url.toString());
        sourceUrl = url.toString();
        break;
      }
      case "terrain": {
        const locations = [-1, 0, 1].flatMap((y) => [-1, 0, 1].map((x) => {
          const lon = centerLon + x * (east - west) / 4;
          const lat = centerLat + y * (north - south) / 4;
          return `${lat.toFixed(5)},${lon.toFixed(5)}`;
        })).join("|");
        const url = `https://api.opentopodata.org/v1/srtm90m?locations=${encodeURIComponent(locations)}&format=geojson`;
        data = await readJson(url);
        sourceUrl = url;
        break;
      }
      case "infrastructure": {
        // Keep public Overpass requests small; large extents can overload the shared service.
        if (east - west > 0.15 || north - south > 0.15) {
          return NextResponse.json({ error: "Infrastructure queries are limited to 0.15° per side. Draw or enter a smaller study area." }, { status: 413 });
        }
        const query = `[out:json][timeout:20];(nwr["highway"](${south},${west},${north},${east});nwr["building"](${south},${west},${north},${east});nwr["amenity"~"school|hospital|clinic|shelter|community_centre"](${south},${west},${north},${east});nwr["railway"](${south},${west},${north},${east});nwr["waterway"](${south},${west},${north},${east}););out center tags;`;
        sourceUrl = "https://overpass-api.de/api/interpreter";
        data = await readJson(sourceUrl, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ data: query }).toString(),
        });
        break;
      }
      case "population": {
        const taskId = typeof body.taskId === "string" && /^[\w-]{1,100}$/.test(body.taskId) ? body.taskId : null;
        if (taskId) {
          data = await readJson(`https://api.worldpop.org/v2/tasks/${encodeURIComponent(taskId)}`);
          sourceUrl = `https://api.worldpop.org/v2/tasks/${encodeURIComponent(taskId)}`;
        } else {
          const geojson = body.geometry?.type === "Polygon" || body.geometry?.type === "MultiPolygon"
            ? body.geometry
            : rectangle(bbox);
          data = await readJson("https://api.worldpop.org/v2/population", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ geojson, year: Number(body.year) || 2020, resolution: "1km" }),
          });
          sourceUrl = "https://api.worldpop.org/v2/population";
        }
        break;
      }
      default:
        return NextResponse.json({ error: "Unknown dataset." }, { status: 400 });
    }

    return NextResponse.json({ dataset, sourceUrl, retrievedAt: new Date().toISOString(), data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The data provider could not be reached.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
