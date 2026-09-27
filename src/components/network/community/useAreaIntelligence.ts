"use client";

import * as React from "react";
import { describeError } from "@/lib/api/client";
import { listLocations } from "@/lib/api/locations";
import { getContextSignals, listInterventions } from "@/lib/api/nexus";
import { listDatasets } from "@/lib/api/datasets";
import type {
  ContextSignal,
  DatasetRecord,
  DerivedIndicatorsResponse,
  InterventionCard,
  LocationRecord,
} from "@/lib/types";

export interface AreaIntelligence {
  reports: LocationRecord[];
  signals: ContextSignal[];
  indices: DerivedIndicatorsResponse | null;
  interventions: InterventionCard[];
  datasets: DatasetRecord[];
  loading: boolean;
  error: string | null;
  /** Endpoints that returned nothing usable, so the UI can hide those panels. */
  unavailable: string[];
  refresh: () => Promise<void>;
}

/**
 * Pulls everything the backend actually holds for a geographic area and
 * reports which pieces are missing so the UI can hide, rather than invent.
 *
 * `geographyId` is the identifier the water/context modules key on — the
 * district name lowercased is what the government workspace uses.
 */
export function useAreaIntelligence(geographyId: string): AreaIntelligence {
  const [reports, setReports] = React.useState<LocationRecord[]>([]);
  const [signals, setSignals] = React.useState<ContextSignal[]>([]);
  const [indices, setIndices] = React.useState<DerivedIndicatorsResponse | null>(null);
  const [interventions, setInterventions] = React.useState<InterventionCard[]>([]);
  const [datasets, setDatasets] = React.useState<DatasetRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [unavailable, setUnavailable] = React.useState<string[]>([]);

  const load = React.useCallback(async () => {
    setLoading(true);
    const missing: string[] = [];

    // Locations are the backbone — a failure here is a real error.
    try {
      const l = await listLocations();
      setReports(l.items);
      setError(null);
    } catch (e) {
      setError(describeError(e));
    }

    // The rest are optional enrichment: absence hides a panel, not an error.
    const geo = geographyId.trim().toLowerCase();
    if (geo) {
      try {
        const ctx = await getContextSignals(geo);
        setIndices(ctx);
        setSignals(ctx.signals ?? []);
      } catch {
        setIndices(null);
        setSignals([]);
        missing.push(`/context/${geo}/signals`);
      }
    } else {
      setIndices(null);
      setSignals([]);
    }

    try {
      setInterventions(await listInterventions());
    } catch {
      setInterventions([]);
      missing.push("/graph/interventions");
    }

    try {
      setDatasets(await listDatasets());
    } catch {
      setDatasets([]);
      missing.push("/api/v1/maps");
    }

    setUnavailable(missing);
    setLoading(false);
  }, [geographyId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  return {
    reports,
    signals,
    indices,
    interventions,
    datasets,
    loading,
    error,
    unavailable,
    refresh: load,
  };
}

/** Reports whose district or town matches the area the user is looking at. */
export function reportsInArea(
  reports: LocationRecord[],
  area: { district?: string; city?: string; state?: string },
): LocationRecord[] {
  const d = area.district?.trim().toLowerCase();
  const c = area.city?.trim().toLowerCase();
  const s = area.state?.trim().toLowerCase();
  if (!d && !c && !s) return reports;
  return reports.filter((r) => {
    const rd = r.district.toLowerCase();
    const rc = (r.city ?? "").toLowerCase();
    const rs = r.state.toLowerCase();
    if (c && rc && rc === c) return true;
    if (d && rd === d) return true;
    if (!d && !c && s) return rs === s;
    return false;
  });
}

/** Point-in-polygon so a drawn area can filter reports by geometry. */
export function pointInPolygon(
  point: [number, number],
  polygon: GeoJSON.Polygon,
): boolean {
  const [x, y] = point;
  const ring = polygon.coordinates[0];
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}
