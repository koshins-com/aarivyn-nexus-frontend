"use client";

import * as React from "react";
import maplibregl, { type Map as MLMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { BASEMAPS, INDIA_CENTER, basemapById, type BasemapId } from "./basemaps";
import { bboxOf, intensityColor } from "@/lib/format";
import type { LocationRecord, ResolvedGeometry } from "@/lib/types";

export interface ReportFeature {
  record: LocationRecord;
  center: [number, number];
  boundary?: GeoJSON.Geometry;
}

interface Props {
  reports: ReportFeature[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /** Fired when a marker's popover "View details" is pressed. */
  onOpenDetails: (id: string) => void;

  aoi: GeoJSON.Polygon | null;
  onAoiChange: (p: GeoJSON.Polygon | null) => void;

  /** Fly target set by the form as the user types a location. */
  focus: ResolvedGeometry | null;

  basemap: BasemapId;
  onBasemapChange: (b: BasemapId) => void;

  drawing: boolean;
  onDrawingChange: (v: boolean) => void;

  className?: string;
}

const REPORTS_SRC = "community-reports";
const AOI_SRC = "community-aoi";
const DRAFT_SRC = "community-draft";
const FOCUS_SRC = "community-focus";

export default function CommunityMap({
  reports,
  selectedId,
  onSelect,
  onOpenDetails,
  aoi,
  onAoiChange,
  focus,
  basemap,
  onBasemapChange,
  drawing,
  onDrawingChange,
  className,
}: Props) {
  const container = React.useRef<HTMLDivElement>(null);
  const map = React.useRef<MLMap | null>(null);
  const markers = React.useRef<maplibregl.Marker[]>([]);
  const [ready, setReady] = React.useState(false);
  const [styleEpoch, setStyleEpoch] = React.useState(0);
  const [draft, setDraft] = React.useState<[number, number][]>([]);
  const [cursor, setCursor] = React.useState<[number, number] | null>(null);

  /* ── Layers are re-added on every style swap ───────────────────────────── */
  const installLayers = React.useCallback((m: MLMap) => {
    const empty: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: [],
    };
    for (const id of [REPORTS_SRC, AOI_SRC, DRAFT_SRC, FOCUS_SRC]) {
      if (!m.getSource(id)) m.addSource(id, { type: "geojson", data: empty });
    }

    if (!m.getLayer("focus-fill")) {
      m.addLayer({
        id: "focus-fill",
        type: "fill",
        source: FOCUS_SRC,
        paint: { "fill-color": "#4CC9E8", "fill-opacity": 0.08 },
      });
      m.addLayer({
        id: "focus-line",
        type: "line",
        source: FOCUS_SRC,
        paint: { "line-color": "#4CC9E8", "line-width": 1.6 },
      });
    }

    if (!m.getLayer("report-area-fill")) {
      m.addLayer({
        id: "report-area-fill",
        type: "fill",
        source: REPORTS_SRC,
        filter: ["!=", ["geometry-type"], "Point"],
        paint: { "fill-color": ["get", "color"], "fill-opacity": 0.16 },
      });
      m.addLayer({
        id: "report-area-line",
        type: "line",
        source: REPORTS_SRC,
        filter: ["!=", ["geometry-type"], "Point"],
        paint: {
          "line-color": ["get", "color"],
          "line-width": ["case", ["get", "selected"], 2.4, 1.1],
        },
      });
    }

    if (!m.getLayer("aoi-fill")) {
      m.addLayer({
        id: "aoi-fill",
        type: "fill",
        source: AOI_SRC,
        paint: { "fill-color": "#F0A63C", "fill-opacity": 0.12 },
      });
      m.addLayer({
        id: "aoi-line",
        type: "line",
        source: AOI_SRC,
        paint: {
          "line-color": "#F0A63C",
          "line-width": 1.9,
          "line-dasharray": [3, 2],
        },
      });
    }

    if (!m.getLayer("draft-line")) {
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
          "circle-radius": 4.5,
          "circle-color": "#4CC9E8",
          "circle-stroke-color": "#070D18",
          "circle-stroke-width": 1.5,
        },
      });
    }
  }, []);

  /* ── init ─────────────────────────────────────────────────────────────── */
  React.useEffect(() => {
    if (!container.current || map.current) return;
    const m = new maplibregl.Map({
      container: container.current,
      style: basemapById("satellite").style,
      center: INDIA_CENTER,
      zoom: 3.9,
      attributionControl: { compact: true },
    });
    m.addControl(new maplibregl.NavigationControl({ showCompass: true }), "bottom-right");
    m.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-left");
    m.addControl(
      new maplibregl.GeolocateControl({ trackUserLocation: true }),
      "bottom-right",
    );
    m.on("load", () => {
      installLayers(m);
      setReady(true);
    });
    map.current = m;
    return () => {
      m.remove();
      map.current = null;
    };
  }, [installLayers]);

  /* ── basemap swap ─────────────────────────────────────────────────────── */
  React.useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    m.setStyle(basemapById(basemap).style);
    const onStyle = () => {
      installLayers(m);
      setStyleEpoch((e) => e + 1);
    };
    m.once("styledata", onStyle);
  }, [basemap, ready, installLayers]);

  /* ── report data ──────────────────────────────────────────────────────── */
  React.useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    const src = m.getSource(REPORTS_SRC) as maplibregl.GeoJSONSource | undefined;
    if (!src) return;
    src.setData({
      type: "FeatureCollection",
      features: reports
        .filter((r) => r.boundary)
        .map((r) => ({
          type: "Feature" as const,
          id: r.record.id,
          geometry: r.boundary as GeoJSON.Geometry,
          properties: {
            id: r.record.id,
            color: intensityColor(r.record.intensity),
            selected: r.record.id === selectedId,
          },
        })),
    });
  }, [reports, selectedId, ready, styleEpoch]);

  /* ── markers with popovers ────────────────────────────────────────────── */
  React.useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    markers.current.forEach((mk) => mk.remove());

    markers.current = reports.map((r) => {
      const color = intensityColor(r.record.intensity);
      const selected = r.record.id === selectedId;

      const el = document.createElement("button");
      el.type = "button";
      el.setAttribute("aria-label", `Report: ${r.record.name || r.record.district}`);
      el.style.cssText = `width:${selected ? 20 : 15}px;height:${selected ? 20 : 15}px;
        border-radius:50%;cursor:pointer;border:2px solid #070D18;background:${color};
        box-shadow:0 0 0 ${selected ? 6 : 3}px ${color}33;transition:all .18s;`;

      const popup = new maplibregl.Popup({
        offset: 16,
        closeButton: true,
        maxWidth: "270px",
        className: "nexus-popup",
      }).setDOMContent(buildPopup(r.record, () => onOpenDetails(r.record.id)));

      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        onSelect(r.record.id);
      });

      return new maplibregl.Marker({ element: el })
        .setLngLat(r.center)
        .setPopup(popup)
        .addTo(m);
    });

    return () => {
      markers.current.forEach((mk) => mk.remove());
      markers.current = [];
    };
  }, [reports, selectedId, ready, styleEpoch, onSelect, onOpenDetails]);

  /* ── fly to selection / focus ─────────────────────────────────────────── */
  React.useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    const target = reports.find((r) => r.record.id === selectedId);
    if (!target) return;
    if (target.boundary) {
      m.fitBounds(bboxOf(target.boundary), { padding: 70, duration: 900, maxZoom: 12 });
    } else {
      m.flyTo({ center: target.center, zoom: 10, duration: 900 });
    }
  }, [selectedId, reports, ready]);

  React.useEffect(() => {
    const m = map.current;
    if (!m || !ready || !focus) return;
    const src = m.getSource(FOCUS_SRC) as maplibregl.GeoJSONSource | undefined;
    src?.setData({
      type: "FeatureCollection",
      features: [{ type: "Feature", geometry: focus.geometry, properties: {} }],
    });
    m.fitBounds(focus.bbox, { padding: 70, duration: 1000, maxZoom: 12 });
  }, [focus, ready, styleEpoch]);

  /* ── AOI ──────────────────────────────────────────────────────────────── */
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
  }, [aoi, ready, styleEpoch]);

  /* ── drawing ──────────────────────────────────────────────────────────── */
  React.useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    m.getCanvas().style.cursor = drawing ? "crosshair" : "";
    if (!drawing) {
      setDraft([]);
      setCursor(null);
      return;
    }
    const onClick = (e: maplibregl.MapMouseEvent) =>
      setDraft((d) => [...d, [e.lngLat.lng, e.lngLat.lat]]);
    const onMove = (e: maplibregl.MapMouseEvent) =>
      setCursor([e.lngLat.lng, e.lngLat.lat]);
    const close = () =>
      setDraft((d) => {
        if (d.length >= 3) onAoiChange({ type: "Polygon", coordinates: [[...d, d[0]]] });
        return d.length >= 3 ? [] : d;
      });
    const onDbl = (e: maplibregl.MapMouseEvent) => {
      e.preventDefault();
      close();
    };
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Enter") close();
      if (ev.key === "Escape") {
        setDraft([]);
        onDrawingChange(false);
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
  }, [drawing, ready, onAoiChange, onDrawingChange]);

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
  }, [draft, cursor, ready, styleEpoch]);

  /* ── polygon click deselects / selects ────────────────────────────────── */
  React.useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    const onClick = (e: maplibregl.MapMouseEvent) => {
      if (drawing) return;
      const hits = m.queryRenderedFeatures(e.point, { layers: ["report-area-fill"] });
      onSelect(hits.length ? (hits[0].properties?.id as string) : null);
    };
    m.on("click", onClick);
    return () => {
      m.off("click", onClick);
    };
  }, [ready, drawing, onSelect, styleEpoch]);

  const draftCount = draft.length;

  return (
    <div className={className}>
      <div ref={container} className="h-full w-full" />

      {/* Layer control */}
      <div className="absolute left-3 top-3 z-10 rounded-xl border border-hair bg-panel/90 p-2 backdrop-blur-md">
        <div className="rule-label mb-1.5 px-0.5">Map</div>
        <div className="flex gap-1">
          {BASEMAPS.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => onBasemapChange(b.id)}
              className={`rounded-lg border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.1em] transition-colors ${
                basemap === b.id
                  ? "border-observed bg-observed text-abyss"
                  : "border-hair text-ink-mid hover:border-hairlit hover:text-ink-hi"
              }`}
            >
              {b.label}
            </button>
          ))}
        </div>

        <div className="mt-2 flex flex-wrap gap-1 border-t border-hair pt-2">
          <button
            type="button"
            onClick={() => onDrawingChange(!drawing)}
            className={`rounded-lg border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.1em] transition-colors ${
              drawing
                ? "border-inferred bg-inferred text-abyss"
                : "border-hair text-ink-mid hover:border-hairlit hover:text-ink-hi"
            }`}
          >
            {drawing ? "Drawing…" : "Draw area"}
          </button>
          {aoi && (
            <button
              type="button"
              onClick={() => onAoiChange(null)}
              className="rounded-lg border border-hair px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-critical hover:border-critical"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Drawing help + controls */}
      {drawing && (
        <div className="absolute left-1/2 top-3 z-10 -translate-x-1/2 rounded-xl border border-observed/50 bg-abyss/92 px-3.5 py-2 backdrop-blur-md">
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-observed">
            Click corners · {draftCount} placed
          </div>
          <div className="mt-1.5 flex gap-1.5">
            <button
              type="button"
              disabled={draftCount < 3}
              onClick={() => {
                onAoiChange({
                  type: "Polygon",
                  coordinates: [[...draft, draft[0]]],
                });
                setDraft([]);
              }}
              className="rounded border border-observed bg-observed px-2 py-0.5 font-mono text-[10px] uppercase text-abyss disabled:opacity-40"
            >
              Save area
            </button>
            <button
              type="button"
              onClick={() => setDraft([])}
              className="rounded border border-hair px-2 py-0.5 font-mono text-[10px] uppercase text-ink-mid"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => {
                setDraft([]);
                onDrawingChange(false);
              }}
              className="rounded border border-hair px-2 py-0.5 font-mono text-[10px] uppercase text-ink-mid"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Legend — only layers actually present */}
      <Legend hasReports={reports.length > 0} hasAoi={!!aoi} hasFocus={!!focus} />
    </div>
  );
}

function Legend({
  hasReports,
  hasAoi,
  hasFocus,
}: {
  hasReports: boolean;
  hasAoi: boolean;
  hasFocus: boolean;
}) {
  const rows = [
    hasReports && { c: "#FF3F5B", l: "Community report — high severity" },
    hasReports && { c: "#4CC9E8", l: "Community report — low severity" },
    hasFocus && { c: "#4CC9E8", l: "Selected area boundary" },
    hasAoi && { c: "#F0A63C", l: "Drawn area" },
  ].filter(Boolean) as { c: string; l: string }[];

  if (rows.length === 0) return null;

  return (
    <div className="absolute bottom-16 left-3 z-10 rounded-xl border border-hair bg-panel/90 px-3 py-2.5 backdrop-blur-md sm:bottom-20">
      <div className="rule-label mb-1.5">Legend</div>
      <ul className="space-y-1">
        {rows.map((r) => (
          <li key={r.l} className="flex items-center gap-2">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: r.c }}
            />
            <span className="text-[11px] text-ink-mid">{r.l}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Popover content. Every field is read from the stored record. */
function buildPopup(record: LocationRecord, onDetails: () => void): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "nexus-popup-body";

  const rows: Array<[string, string]> = [
    ["Location", [record.city, record.district, record.state].filter(Boolean).join(", ")],
    ["Severity", `${record.intensity} / 10`],
    ["Reported", new Date(record.created_at).toLocaleDateString("en-IN")],
  ];
  if (record.details) rows.push(["Account", record.details]);

  wrap.innerHTML = `
    <div style="font-family:var(--font-mono);font-size:9.5px;letter-spacing:.14em;
      text-transform:uppercase;color:${intensityColor(record.intensity)};margin-bottom:4px;">
      Community report
    </div>
    <div style="font-family:var(--font-display);font-size:14px;color:#E6EFFA;margin-bottom:8px;">
      ${escapeHtml(record.name || record.district)}
    </div>
    ${rows
      .map(
        ([k, v]) => `
      <div style="display:flex;gap:8px;padding:2px 0;">
        <span style="font-family:var(--font-mono);font-size:9.5px;letter-spacing:.12em;
          text-transform:uppercase;color:#61789A;min-width:64px;">${k}</span>
        <span style="font-size:11.5px;color:#E6EFFA;line-height:1.45;">${escapeHtml(v)}</span>
      </div>`,
      )
      .join("")}
  `;

  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = "View details →";
  btn.style.cssText = `margin-top:10px;width:100%;border-radius:8px;border:1px solid #2C4A73;
    background:rgba(22,40,63,.7);color:#E6EFFA;font-family:var(--font-mono);font-size:10px;
    letter-spacing:.12em;text-transform:uppercase;padding:6px 8px;cursor:pointer;`;
  btn.onclick = onDetails;
  wrap.appendChild(btn);

  return wrap;
}

function escapeHtml(s: string) {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}
