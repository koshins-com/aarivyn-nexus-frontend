"use client";

import * as React from "react";
import maplibregl, { type Map as MLMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { INDIA_CENTER, MAP_STYLE } from "./basemap";
import { bboxOf, intensityColor, severityColor } from "@/lib/format";
import type { ContextSignal, ResolvedGeometry } from "@/lib/types";

export type DrawMode = "off" | "drawing";

export interface SignalMarker {
  signal: ContextSignal;
  lngLat: [number, number];
}

interface Props {
  /** Resolved administrative boundaries, keyed by location id. */
  regions: ResolvedGeometry[];
  intensityByKey: Record<string, number>;
  selectedKey: string | null;
  onSelectRegion: (key: string | null) => void;

  /** Hand-drawn area of interest, used as the analysis bbox. */
  aoi: GeoJSON.Polygon | null;
  drawMode: DrawMode;
  onAoiChange: (p: GeoJSON.Polygon | null) => void;
  onDrawComplete: () => void;

  /** Abnormality pins placed inside the AOI. */
  signalMarkers?: SignalMarker[];
  onSelectSignal?: (id: string) => void;

  className?: string;
}

const REGION_SRC = "nexus-regions";
const AOI_SRC = "nexus-aoi";
const DRAFT_SRC = "nexus-draft";

export default function NexusMap({
  regions,
  intensityByKey,
  selectedKey,
  onSelectRegion,
  aoi,
  drawMode,
  onAoiChange,
  onDrawComplete,
  signalMarkers = [],
  onSelectSignal,
  className,
}: Props) {
  const container = React.useRef<HTMLDivElement>(null);
  const map = React.useRef<MLMap | null>(null);
  const [ready, setReady] = React.useState(false);
  const [draft, setDraft] = React.useState<[number, number][]>([]);
  const [cursor, setCursor] = React.useState<[number, number] | null>(null);
  const markers = React.useRef<maplibregl.Marker[]>([]);

  /* ── init ─────────────────────────────────────────────────────────────── */
  React.useEffect(() => {
    if (!container.current || map.current) return;
    const m = new maplibregl.Map({
      container: container.current,
      style: MAP_STYLE,
      center: INDIA_CENTER,
      zoom: 3.8,
      attributionControl: { compact: true },
    });
    m.addControl(new maplibregl.NavigationControl({ showCompass: true }), "bottom-right");
    m.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-left");

    m.on("load", () => {
      const emptyFC: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: [],
      };
      m.addSource(REGION_SRC, { type: "geojson", data: emptyFC });
      m.addSource(AOI_SRC, { type: "geojson", data: emptyFC });
      m.addSource(DRAFT_SRC, { type: "geojson", data: emptyFC });

      m.addLayer({
        id: "region-fill",
        type: "fill",
        source: REGION_SRC,
        paint: {
          "fill-color": ["get", "color"],
          "fill-opacity": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            0.5,
            0.26,
          ],
        },
      });
      m.addLayer({
        id: "region-line",
        type: "line",
        source: REGION_SRC,
        paint: {
          "line-color": ["get", "color"],
          "line-width": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            2.6,
            1.2,
          ],
          "line-opacity": 0.95,
        },
      });
      m.addLayer({
        id: "region-label",
        type: "symbol",
        source: REGION_SRC,
        layout: {
          "text-field": ["get", "label"],
          "text-size": 11,
          "text-letter-spacing": 0.08,
          "text-allow-overlap": false,
        },
        paint: {
          "text-color": "#E6EFFA",
          "text-halo-color": "#070D18",
          "text-halo-width": 1.4,
        },
      });

      m.addLayer({
        id: "aoi-fill",
        type: "fill",
        source: AOI_SRC,
        paint: { "fill-color": "#F0A63C", "fill-opacity": 0.1 },
      });
      m.addLayer({
        id: "aoi-line",
        type: "line",
        source: AOI_SRC,
        paint: {
          "line-color": "#F0A63C",
          "line-width": 1.8,
          "line-dasharray": [3, 2],
        },
      });

      m.addLayer({
        id: "draft-line",
        type: "line",
        source: DRAFT_SRC,
        paint: { "line-color": "#4CC9E8", "line-width": 1.6, "line-dasharray": [2, 2] },
      });
      m.addLayer({
        id: "draft-point",
        type: "circle",
        source: DRAFT_SRC,
        filter: ["==", ["geometry-type"], "Point"],
        paint: {
          "circle-radius": 4,
          "circle-color": "#4CC9E8",
          "circle-stroke-color": "#070D18",
          "circle-stroke-width": 1.5,
        },
      });

      setReady(true);
    });

    map.current = m;
    return () => {
      m.remove();
      map.current = null;
    };
  }, []);

  /* ── region data ──────────────────────────────────────────────────────── */
  React.useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    const src = m.getSource(REGION_SRC) as maplibregl.GeoJSONSource | undefined;
    if (!src) return;
    src.setData({
      type: "FeatureCollection",
      features: regions.map((r) => ({
        type: "Feature" as const,
        id: r.key,
        geometry: r.geometry,
        properties: {
          key: r.key,
          label: r.displayName,
          color: intensityColor(intensityByKey[r.key] ?? 5),
        },
      })),
    });
  }, [regions, intensityByKey, ready]);

  /* ── selection feature-state ──────────────────────────────────────────── */
  React.useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    regions.forEach((r) =>
      m.setFeatureState(
        { source: REGION_SRC, id: r.key },
        { selected: r.key === selectedKey },
      ),
    );
    const target = regions.find((r) => r.key === selectedKey);
    if (target) {
      m.fitBounds(target.bbox, { padding: 90, duration: 900, maxZoom: 11 });
    }
  }, [selectedKey, regions, ready]);

  /* ── fit to all regions when the set changes ──────────────────────────── */
  React.useEffect(() => {
    const m = map.current;
    if (!m || !ready || regions.length === 0 || selectedKey) return;
    const b = new maplibregl.LngLatBounds(
      [regions[0].bbox[0], regions[0].bbox[1]],
      [regions[0].bbox[2], regions[0].bbox[3]],
    );
    regions.forEach((r) => {
      b.extend([r.bbox[0], r.bbox[1]]);
      b.extend([r.bbox[2], r.bbox[3]]);
    });
    m.fitBounds(b, { padding: 80, duration: 900, maxZoom: 10 });
  }, [regions, ready, selectedKey]);

  /* ── region click ─────────────────────────────────────────────────────── */
  React.useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    const click = (e: maplibregl.MapMouseEvent) => {
      if (drawMode === "drawing") return;
      const hits = m.queryRenderedFeatures(e.point, { layers: ["region-fill"] });
      onSelectRegion(hits.length ? (hits[0].properties?.key as string) : null);
    };
    const enter = () => {
      if (drawMode !== "drawing") m.getCanvas().style.cursor = "pointer";
    };
    const leave = () => {
      if (drawMode !== "drawing") m.getCanvas().style.cursor = "";
    };
    m.on("click", click);
    m.on("mouseenter", "region-fill", enter);
    m.on("mouseleave", "region-fill", leave);
    return () => {
      m.off("click", click);
      m.off("mouseenter", "region-fill", enter);
      m.off("mouseleave", "region-fill", leave);
    };
  }, [ready, drawMode, onSelectRegion]);

  /* ── AOI rendering ────────────────────────────────────────────────────── */
  React.useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    const src = m.getSource(AOI_SRC) as maplibregl.GeoJSONSource | undefined;
    src?.setData(
      aoi
        ? {
            type: "FeatureCollection",
            features: [{ type: "Feature", geometry: aoi, properties: {} }],
          }
        : { type: "FeatureCollection", features: [] },
    );
  }, [aoi, ready]);

  /* ── drawing interaction ──────────────────────────────────────────────── */
  React.useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    m.getCanvas().style.cursor = drawMode === "drawing" ? "crosshair" : "";
    if (drawMode !== "drawing") {
      setDraft([]);
      setCursor(null);
      return;
    }

    const onClick = (e: maplibregl.MapMouseEvent) => {
      setDraft((d) => [...d, [e.lngLat.lng, e.lngLat.lat]]);
    };
    const onMove = (e: maplibregl.MapMouseEvent) =>
      setCursor([e.lngLat.lng, e.lngLat.lat]);
    const onDbl = (e: maplibregl.MapMouseEvent) => {
      e.preventDefault();
      setDraft((d) => {
        if (d.length >= 3) {
          onAoiChange({ type: "Polygon", coordinates: [[...d, d[0]]] });
          onDrawComplete();
        }
        return [];
      });
    };
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") {
        setDraft([]);
        onDrawComplete();
      }
      if (ev.key === "Enter") {
        setDraft((d) => {
          if (d.length >= 3) {
            onAoiChange({ type: "Polygon", coordinates: [[...d, d[0]]] });
            onDrawComplete();
          }
          return [];
        });
      }
    };

    m.doubleClickZoom.disable();
    m.on("click", onClick);
    m.on("mousemove", onMove);
    m.on("dblclick", onDbl);
    window.addEventListener("keydown", onKey);
    return () => {
      m.doubleClickZoom.enable();
      m.off("click", onClick);
      m.off("mousemove", onMove);
      m.off("dblclick", onDbl);
      window.removeEventListener("keydown", onKey);
    };
  }, [drawMode, ready, onAoiChange, onDrawComplete]);

  /* ── draft rendering ──────────────────────────────────────────────────── */
  React.useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    const src = m.getSource(DRAFT_SRC) as maplibregl.GeoJSONSource | undefined;
    if (!src) return;
    const path = cursor && draft.length ? [...draft, cursor] : draft;
    src.setData({
      type: "FeatureCollection",
      features: [
        ...(path.length >= 2
          ? [
              {
                type: "Feature" as const,
                geometry: { type: "LineString" as const, coordinates: path },
                properties: {},
              },
            ]
          : []),
        ...draft.map((c) => ({
          type: "Feature" as const,
          geometry: { type: "Point" as const, coordinates: c },
          properties: {},
        })),
      ],
    });
  }, [draft, cursor, ready]);

  /* ── abnormality pins ─────────────────────────────────────────────────── */
  React.useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    markers.current.forEach((mk) => mk.remove());
    markers.current = signalMarkers.map(({ signal, lngLat }) => {
      const el = document.createElement("button");
      el.type = "button";
      el.setAttribute("aria-label", `${signal.severity}: ${signal.title}`);
      el.style.cssText = `width:16px;height:16px;border-radius:50%;cursor:pointer;
        border:2px solid #070D18;background:${severityColor(signal.severity)};
        box-shadow:0 0 0 4px ${severityColor(signal.severity)}33;`;
      el.onclick = (ev) => {
        ev.stopPropagation();
        onSelectSignal?.(signal.id);
      };
      return new maplibregl.Marker({ element: el }).setLngLat(lngLat).addTo(m);
    });
    return () => {
      markers.current.forEach((mk) => mk.remove());
      markers.current = [];
    };
  }, [signalMarkers, ready, onSelectSignal]);

  return (
    <div className={className}>
      <div ref={container} className="h-full w-full" />
      {drawMode === "drawing" && (
        <div className="pointer-events-none absolute left-1/2 top-4 z-10 -translate-x-1/2 rounded-lg border border-observed/50 bg-abyss/90 px-3.5 py-2 font-mono text-tiny uppercase text-observed backdrop-blur">
          Click to place corners · double-click or Enter to close · Esc to cancel
          {draft.length > 0 && ` · ${draft.length} placed`}
        </div>
      )}
    </div>
  );
}

/** Rough interior points for placing abnormality pins inside an area. */
export function scatterInside(
  geometry: GeoJSON.Geometry,
  count: number,
): [number, number][] {
  const [minX, minY, maxX, maxY] = bboxOf(geometry);
  const out: [number, number][] = [];
  const cols = Math.ceil(Math.sqrt(count));
  for (let i = 0; i < count; i++) {
    const cx = (i % cols) + 1;
    const cy = Math.floor(i / cols) + 1;
    out.push([
      minX + ((maxX - minX) * cx) / (cols + 1),
      minY + ((maxY - minY) * cy) / (cols + 1),
    ]);
  }
  return out;
}
