"use client";

import * as React from "react";
import {
  ArrowDownToLine, ArrowUpRight, CloudSun, Database, Mountain, RefreshCw,
  Route, Satellite, Siren, UsersRound,
} from "lucide-react";
import { Button, Input } from "@/components/ui/primitives";
import { bboxOf, cn } from "@/lib/format";

type DatasetId = "imagery" | "terrain" | "climate" | "population" | "infrastructure" | "hazards";
type Bbox = [number, number, number, number];
type DatasetResult = { dataset: DatasetId; sourceUrl: string; retrievedAt: string; data: any };

const CATALOG: {
  id: DatasetId;
  title: string;
  summary: string;
  contents: string;
  source: string;
  docs: string;
  icon: React.ElementType;
  tint: string;
}[] = [
  { id: "imagery", title: "Satellite & Earth observation", summary: "Find recent Sentinel-2 and Landsat scenes.", contents: "Scene dates · cloud cover · downloadable assets", source: "Element 84 Earth Search / AWS Open Data", docs: "https://earth-search.aws.element84.com/v1/", icon: Satellite, tint: "text-observed" },
  { id: "terrain", title: "Terrain & water", summary: "Sample elevation across a 3 × 3 grid.", contents: "Elevation in metres · SRTM 90 m", source: "Open Topo Data · SRTM", docs: "https://www.opentopodata.org/api/", icon: Mountain, tint: "text-inferred" },
  { id: "climate", title: "Climate & environment", summary: "Explore the past 30 days of local weather.", contents: "Daily high/low temperature · precipitation", source: "Open-Meteo Historical Weather · ERA5-Land", docs: "https://open-meteo.com/en/docs/historical-weather-api", icon: CloudSun, tint: "text-observed" },
  { id: "population", title: "Population & development", summary: "Estimate people inside your study area.", contents: "Population total · 1 km grid · selected year", source: "WorldPop Global 2", docs: "https://api.worldpop.org/v2/", icon: UsersRound, tint: "text-inferred" },
  { id: "infrastructure", title: "Infrastructure & places", summary: "Fetch mapped roads, buildings and key services.", contents: "Roads · buildings · schools · health · rail · waterways", source: "OpenStreetMap contributors · Overpass API", docs: "https://wiki.openstreetmap.org/wiki/Overpass_API", icon: Route, tint: "text-entered" },
  { id: "hazards", title: "Disasters & risk", summary: "View currently open natural hazard events.", contents: "Wildfires · storms · volcanoes · floods · other events", source: "NASA Earth Observatory Natural Event Tracker", docs: "https://eonet.gsfc.nasa.gov/docs/v3", icon: Siren, tint: "text-critical" },
];

const RELATED: Record<DatasetId, { label: string; url: string }[]> = {
  imagery: [
    { label: "Copernicus Data Space · Sentinel", url: "https://dataspace.copernicus.eu/" },
    { label: "USGS EarthExplorer · Landsat", url: "https://earthexplorer.usgs.gov/" },
    { label: "ESA WorldCover · land cover", url: "https://worldcover2021.esa.int/" },
    { label: "NASA Earthdata · NDVI products", url: "https://search.earthdata.nasa.gov/" },
  ],
  terrain: [
    { label: "HydroSHEDS · rivers & watersheds", url: "https://www.hydrosheds.org/" },
    { label: "Copernicus DEM", url: "https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM" },
  ],
  climate: [
    { label: "NASA POWER · climate & solar", url: "https://power.larc.nasa.gov/data-access-viewer/" },
    { label: "Copernicus Climate Data Store", url: "https://cds.climate.copernicus.eu/" },
  ],
  population: [
    { label: "World Bank · population indicators", url: "https://datahelpdesk.worldbank.org/knowledgebase/articles/889392" },
    { label: "WorldPop data portal", url: "https://hub.worldpop.org/" },
  ],
  infrastructure: [
    { label: "OpenStreetMap · download extracts", url: "https://download.geofabrik.de/" },
    { label: "Overpass Turbo · build queries", url: "https://overpass-turbo.eu/" },
  ],
  hazards: [
    { label: "NASA FIRMS · active fire detections", url: "https://firms.modaps.eosdis.nasa.gov/" },
    { label: "ReliefWeb · disaster reports", url: "https://reliefweb.int/" },
  ],
};

function pretty(value: unknown) {
  if (value == null || value === "") return "—";
  if (typeof value === "number") return Number.isInteger(value) ? value.toLocaleString() : value.toFixed(2);
  return String(value);
}

function dataRows(id: DatasetId, data: any): { columns: string[]; rows: Record<string, unknown>[] } {
  if (id === "imagery") {
    const items = data?.features ?? [];
    return { columns: ["Scene", "Collection", "Acquired", "Cloud %", "Assets"], rows: items.map((item: any) => ({
      Scene: item.id,
      Collection: item.collection,
      Acquired: item.properties?.datetime,
      "Cloud %": item.properties?.["eo:cloud_cover"],
      Assets: Object.keys(item.assets ?? {}).join(", "),
      _url: item.links?.find((link: any) => link.rel === "self")?.href,
      _assets: item.assets,
    })) };
  }
  if (id === "hazards") {
    const features = data?.features ?? [];
    return { columns: ["Event", "Category", "Date", "Status"], rows: features.map((f: any) => ({
      Event: f.properties?.title,
      Category: f.properties?.categories?.map((c: any) => c.title).join(", "),
      Date: f.properties?.date,
      Status: f.properties?.closed ? "Closed" : "Open",
      _url: f.properties?.link,
    })) };
  }
  if (id === "climate") {
    const daily = data?.daily;
    const rows = (daily?.time ?? []).map((date: string, i: number) => ({
      Date: date,
      "High °C": daily.temperature_2m_max?.[i],
      "Low °C": daily.temperature_2m_min?.[i],
      "Precip. mm": daily.precipitation_sum?.[i],
    }));
    return { columns: ["Date", "High °C", "Low °C", "Precip. mm"], rows };
  }
  if (id === "terrain") {
    const features = data?.features ?? [];
    return { columns: ["Longitude", "Latitude", "Elevation m"], rows: features.map((f: any) => ({
      Longitude: f.geometry?.coordinates?.[0], Latitude: f.geometry?.coordinates?.[1],
      "Elevation m": f.geometry?.coordinates?.[2] ?? f.properties?.elevation,
    })) };
  }
  if (id === "infrastructure") {
    const elements = data?.elements ?? [];
    return { columns: ["Type", "Name", "Class", "Latitude", "Longitude"], rows: elements.map((item: any) => ({
      Type: item.type, Name: item.tags?.name, Class: item.tags?.highway ?? item.tags?.building ?? item.tags?.amenity ?? item.tags?.railway ?? item.tags?.waterway,
      Latitude: item.lat ?? item.center?.lat, Longitude: item.lon ?? item.center?.lon,
      _url: `https://www.openstreetmap.org/${item.type}/${item.id}`,
    })) };
  }
  const result = data?.result ?? {};
  return { columns: ["Measure", "Value"], rows: [
    { Measure: "Population estimate", Value: result.total_population ?? result.population ?? "Processing / unavailable" },
    { Measure: "Year", Value: result.year },
    { Measure: "Resolution", Value: "1 km" },
  ] };
}

function downloadFile(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

function asCsv(rows: Record<string, unknown>[], columns: string[]) {
  const quote = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  return [columns.map(quote).join(","), ...rows.map((row) => columns.map((key) => quote(row[key])).join(","))].join("\r\n");
}

export function DatasetExplorer({ aoi }: { aoi: GeoJSON.Polygon | null }) {
  const [bbox, setBbox] = React.useState<Bbox>([78.85, 22.35, 79.15, 22.65]);
  const [selected, setSelected] = React.useState<DatasetId>("imagery");
  const [year, setYear] = React.useState("2020");
  const [result, setResult] = React.useState<DatasetResult | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (aoi) setBbox(bboxOf(aoi));
  }, [aoi]);

  const chosen = CATALOG.find((item) => item.id === selected)!;
  const { columns, rows } = result ? dataRows(selected, result.data) : { columns: [], rows: [] };

  const fetchDataset = async (id: DatasetId) => {
    setSelected(id);
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const call = async (taskId?: string) => {
        const response = await fetch("/api/community/datasets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dataset: id, bbox, year: Number(year), geometry: aoi, taskId }),
        });
        const json = await response.json();
        if (!response.ok) throw new Error(json.error ?? "The data request failed.");
        return json as DatasetResult;
      };
      let next = await call();
      if (id === "population" && next.data?.task_id) {
        const taskId = String(next.data.task_id);
        for (let attempt = 0; attempt < 25; attempt++) {
          if (next.data.status === "success" || next.data.status === "failure") break;
          await new Promise((resolve) => setTimeout(resolve, 1800));
          next = await call(taskId);
        }
        if (next.data?.status === "failure") throw new Error(next.data.error ?? "WorldPop could not complete this area query.");
        if (next.data?.status !== "success") throw new Error("WorldPop is still processing. Try again shortly.");
      }
      setResult(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load this dataset.");
    } finally {
      setLoading(false);
    }
  };

  const editBbox = (index: number, value: string) => {
    setBbox((current) => current.map((part, i) => i === index ? (value === "" ? 0 : Number(value)) : part) as Bbox);
  };

  return (
    <section className="space-y-3" aria-label="Community data explorer">
      <div className="rounded-xl border border-hair bg-panel/85 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="rule-label">Community data lab</div>
            <h2 className="mt-1 font-display text-[18px] text-ink-hi">Explore real-world datasets</h2>
            <p className="mt-1 max-w-3xl text-[12px] leading-relaxed text-ink-mid">Fetch open data for a study area, inspect the records and export them for class projects. Choose a layer, then use the map’s drawn area or set a small bounding box.</p>
          </div>
          <span className="rounded-full border border-nominal/40 bg-nominal/10 px-2.5 py-1 font-mono text-micro uppercase text-nominal">Live public sources · no API key</span>
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-2">
          {(["West", "South", "East", "North"] as const).map((label, index) => (
            <label key={label} className="w-[calc(50%-4px)] sm:w-24">
              <span className="mb-1 block font-mono text-micro uppercase text-ink-lo">{label} °</span>
              <Input type="number" step="0.01" value={bbox[index]} onChange={(e) => editBbox(index, e.target.value)} aria-label={`${label} coordinate`} />
            </label>
          ))}
          {aoi ? <span className="pb-2 font-mono text-micro uppercase text-inferred">Using drawn map area</span> : <span className="pb-2 text-[11px] text-ink-lo">Default study area: central India</span>}
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {CATALOG.map((item) => {
            const Icon = item.icon;
            const active = selected === item.id;
            return (
              <button key={item.id} type="button" onClick={() => void fetchDataset(item.id)} aria-pressed={active}
                className={cn("rounded-lg border p-3 text-left transition-colors", active ? "border-observed/70 bg-observed/5" : "border-hair bg-abyss/30 hover:border-hairlit")}>
                <span className="flex items-center gap-2"><Icon className={cn("h-4 w-4", item.tint)} /><span className="font-display text-[13px] text-ink-hi">{item.title}</span></span>
                <span className="mt-1 block text-[11.5px] leading-relaxed text-ink-mid">{item.summary}</span>
                <span className="mt-2 block font-mono text-[9px] uppercase text-ink-lo">{item.contents}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-hair bg-panel/85">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-hair px-4 py-3">
          <div className="min-w-0">
            <div className="font-mono text-micro uppercase text-ink-lo">{chosen.source}</div>
            <h3 className="mt-0.5 font-display text-[15px] text-ink-hi">{chosen.title}</h3>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {selected === "population" && <label className="flex items-center gap-2 font-mono text-micro uppercase text-ink-lo">Year <select className="rounded border border-hair bg-abyss px-2 py-1 text-ink-hi" value={year} onChange={(e) => setYear(e.target.value)}>{Array.from({ length: 16 }, (_, i) => 2015 + i).map((v) => <option key={v}>{v}</option>)}</select></label>}
            <a href={chosen.docs} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-hair px-2.5 py-1.5 font-mono text-micro uppercase text-ink-mid hover:text-ink-hi">API docs <ArrowUpRight className="h-3 w-3" /></a>
            <Button size="sm" variant="outline" onClick={() => void fetchDataset(selected)} disabled={loading}><RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />{loading ? "Fetching…" : "Fetch data"}</Button>
          </div>
        </div>

        {error && <div role="alert" className="mx-4 mt-3 rounded-lg border border-critical/40 bg-critical/10 px-3 py-2 text-[12px] text-critical">{error}</div>}
        {loading && <div className="px-4 py-8 text-center font-mono text-[11px] uppercase text-ink-lo">Contacting {chosen.source}…</div>}

        {result && !loading && (
          <>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-[11px] text-ink-mid">
              <span><Database className="mr-1 inline h-3.5 w-3.5 text-observed" />{rows.length.toLocaleString()} records</span>
              <span>Retrieved {new Date(result.retrievedAt).toLocaleString()}</span>
              {selected === "infrastructure" && <span>© OpenStreetMap contributors</span>}
              <div className="ml-auto flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => downloadFile(`${selected}-data.json`, JSON.stringify(result.data, null, 2), "application/json")}><ArrowDownToLine className="h-3.5 w-3.5" />JSON</Button>
                {rows.length > 0 && <Button size="sm" variant="ghost" onClick={() => downloadFile(`${selected}-data.csv`, asCsv(rows, columns), "text/csv;charset=utf-8")}><ArrowDownToLine className="h-3.5 w-3.5" />CSV</Button>}
              </div>
            </div>
            {rows.length > 0 ? (
              <div className="max-h-[340px] overflow-auto border-t border-hair">
                <table className="w-full min-w-[520px] border-collapse text-left text-[11px]">
                  <thead className="sticky top-0 bg-hull text-micro uppercase text-ink-lo"><tr>{columns.map((column) => <th key={column} className="px-3 py-2 font-mono font-normal">{column}</th>)}{selected === "imagery" && <th className="px-3 py-2 font-mono font-normal">Download</th>}</tr></thead>
                  <tbody>{rows.map((row, i) => <tr key={i} className="border-t border-hair/70 text-ink-mid">{columns.map((column) => <td key={column} className="max-w-[240px] truncate px-3 py-2">{pretty(row[column])}</td>)}{selected === "imagery" && <td className="px-3 py-2"><div className="flex flex-wrap gap-2">{Object.entries((row._assets ?? {}) as Record<string, any>).filter(([, asset]) => asset?.href).slice(0, 4).map(([key, asset]) => <a key={key} href={asset.href} target="_blank" rel="noreferrer" className="text-observed underline">{key}</a>)}</div></td>}</tr>)}</tbody>
                </table>
                {rows.length === 0 && <p className="px-4 py-6 text-center text-[12px] text-ink-lo">No records found in this extent.</p>}
              </div>
            ) : <p className="px-4 pb-3 text-[12px] text-ink-mid">The provider accepted the request but returned no tabular records. Download the response JSON to inspect it.</p>}
          </>
        )}

        {!result && !loading && !error && <p className="px-4 py-5 text-[12px] text-ink-mid">Select <strong className="font-medium text-ink-hi">Fetch data</strong> to query this source for your study area.</p>}

        <div className="border-t border-hair px-4 py-3">
          <div className="font-mono text-micro uppercase text-ink-lo">More data for projects</div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">{RELATED[selected].map((link) => <a key={link.url} href={link.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] text-observed hover:underline">{link.label}<ArrowUpRight className="h-3 w-3" /></a>)}</div>
          <p className="mt-2 text-[10.5px] leading-relaxed text-ink-lo">Data availability, resolution and licensing vary by provider. Public services may rate-limit requests. Weather results represent the bounding-box centre; disaster events are not a substitute for official emergency warnings. OpenStreetMap data © OpenStreetMap contributors, ODbL.</p>
        </div>
      </div>
    </section>
  );
}
