/**
 * Administrative boundary resolution.
 *
 * The locations API stores administrative *names* (state / district / city),
 * not geometry. To draw a location on the map we resolve those names to a
 * polygon using the same public Nominatim service the backend itself uses in
 * `app/mapdata/name_to_geojson.py`.
 *
 * If the backend later exposes a boundary endpoint, replace `resolveBoundary`
 * with an `api(...)` call — every caller keeps working.
 *
 * Results are cached in-memory and in sessionStorage to respect the public
 * geocoder's usage policy (max ~1 request/second).
 */
import type { LocationRecord, ResolvedGeometry } from "@/lib/types";

const GEOCODER =
  process.env.NEXT_PUBLIC_GEOCODER_URL ??
  "https://nominatim.openstreetmap.org/search";

const memory = new Map<string, ResolvedGeometry | null>();
let queue: Promise<unknown> = Promise.resolve();

function cacheKey(q: string) {
  return `nexus.boundary.${q.toLowerCase()}`;
}

function readSession(q: string): ResolvedGeometry | null | undefined {
  if (typeof window === "undefined") return undefined;
  const raw = window.sessionStorage.getItem(cacheKey(q));
  if (raw === null) return undefined;
  return raw === "null" ? null : (JSON.parse(raw) as ResolvedGeometry);
}

/** Serialise requests one-per-second — the public geocoder requires it. */
function throttled<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn);
  queue = run.then(
    () => new Promise((r) => setTimeout(r, 1100)),
    () => new Promise((r) => setTimeout(r, 1100)),
  );
  return run;
}

export function locationQuery(loc: LocationRecord): string {
  return [loc.city, loc.district, loc.state].filter(Boolean).join(", ");
}

export function locationLabel(loc: LocationRecord): string {
  return loc.name?.trim() || loc.city?.trim() || loc.district;
}

export async function resolveBoundary(
  key: string,
  query: string,
  displayName: string,
): Promise<ResolvedGeometry | null> {
  if (memory.has(query)) {
    const hit = memory.get(query)!;
    return hit ? { ...hit, key, displayName } : null;
  }
  const sessionHit = readSession(query);
  if (sessionHit !== undefined) {
    memory.set(query, sessionHit);
    return sessionHit ? { ...sessionHit, key, displayName } : null;
  }

  const url = new URL(GEOCODER);
  url.searchParams.set("q", query);
  url.searchParams.set("countrycodes", "in");
  url.searchParams.set("format", "json");
  url.searchParams.set("polygon_geojson", "1");
  url.searchParams.set("limit", "1");

  const result = await throttled(async () => {
    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as Array<{
      geojson?: GeoJSON.Geometry;
      boundingbox?: string[];
    }>;
    const row = rows?.[0];
    if (!row?.geojson || !row.boundingbox) return null;
    // Nominatim returns [south, north, west, east] as strings.
    const [s, n, w, e] = row.boundingbox.map(Number);
    const resolved: ResolvedGeometry = {
      key,
      displayName,
      geometry: row.geojson,
      bbox: [w, s, e, n],
    };
    return resolved;
  });

  memory.set(query, result);
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.setItem(cacheKey(query), JSON.stringify(result));
    } catch {
      /* storage full — cache in memory only */
    }
  }
  return result ? { ...result, key, displayName } : null;
}
