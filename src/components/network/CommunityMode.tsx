"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  ChevronLeft,
  MapPin,
  MessageSquare,
  Pencil,
  Plus,
  RefreshCw,
  Send,
  Trash2,
} from "lucide-react";
import type { BasemapId } from "./community/basemaps";
import type { ReportFeature } from "./community/CommunityMap";
import { DetailSheet } from "./community/DetailSheet";
import { DatasetExplorer } from "./community/DatasetExplorer";
import {
  pointInPolygon,
  reportsInArea,
  useAreaIntelligence,
} from "./community/useAreaIntelligence";
import { UnsavedNotice } from "./common";
import {
  Badge,
  Button,
  Empty,
  ErrorNote,
  Field,
  Input,
  Loading,
  Origin,
  Panel,
  Select,
  Stat,
  Textarea,
} from "@/components/ui/primitives";
import { describeError } from "@/lib/api/client";
import {
  createLocation,
  deleteLocation,
  updateLocation,
} from "@/lib/api/locations";
import { submitOnboarding } from "@/lib/api/workspace";
import { submitFeedback, type CommunityFeedback } from "@/lib/api/network";
import { NotConnectedError } from "@/lib/api/monitoring";
import {
  locationLabel,
  locationQuery,
  resolveBoundary,
} from "@/lib/api/geocode";
import { uid, useNetwork } from "@/lib/network-store";
import { roleById, ROLES } from "@/lib/roles";
import { bboxOf, cn, intensityColor, months, relativeTime } from "@/lib/format";
import type { LocationRecord, ResolvedGeometry } from "@/lib/types";

const CommunityMap = dynamic(() => import("./community/CommunityMap"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full place-items-center bg-abyss">
      <span className="font-mono text-micro uppercase text-ink-lo">
        Loading satellite basemap…
      </span>
    </div>
  ),
});

const ROLE = roleById("community")!;

/** Fallback problem categories. Replaced at runtime by the domains the
 *  backend's intervention catalogue actually covers. */
const FALLBACK_CATEGORIES = [
  "Drinking water",
  "Irrigation",
  "Flooding",
  "Sanitation",
  "Water quality",
  "Crop failure",
  "Other",
];

type Tab = "report" | "planned" | "datasets" | "feedback";

export function CommunityMode() {
  const [tab, setTab] = React.useState<Tab>("report");
  const [basemap, setBasemap] = React.useState<BasemapId>("satellite");
  const [drawing, setDrawing] = React.useState(false);
  const [aoi, setAoi] = React.useState<GeoJSON.Polygon | null>(null);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [detailId, setDetailId] = React.useState<string | null>(null);
  const [focus, setFocus] = React.useState<ResolvedGeometry | null>(null);
  const [geometries, setGeometries] = React.useState<Record<string, ResolvedGeometry>>({});
  const [editing, setEditing] = React.useState<LocationRecord | "new" | null>(null);
  const [feedbackTarget, setFeedbackTarget] = React.useState<LocationRecord | null>(null);

  /* The area the user is currently looking at, driven by the form. */
  const [area, setArea] = React.useState({ state: "", district: "", city: "" });
  const geographyId = area.district.trim().toLowerCase();

  const intel = useAreaIntelligence(geographyId);
  const { setWorkspace, setCommunity } = useNetwork();

  /* Resolve a boundary for every report so it can be drawn and pinned. */
  React.useEffect(() => {
    const pending = intel.reports.filter((r) => !geometries[r.id]);
    if (pending.length === 0) return;
    let alive = true;
    (async () => {
      for (const loc of pending) {
        const g = await resolveBoundary(loc.id, locationQuery(loc), locationLabel(loc));
        if (!alive) return;
        if (g) setGeometries((prev) => ({ ...prev, [loc.id]: g }));
      }
    })();
    return () => {
      alive = false;
    };
  }, [intel.reports, geometries]);

  /* Reports narrowed to the area in view, then to the drawn polygon. */
  const areaReports = React.useMemo(() => {
    let list = reportsInArea(intel.reports, area);
    if (aoi) {
      list = list.filter((r) => {
        const g = geometries[r.id];
        if (!g) return false;
        const [minX, minY, maxX, maxY] = g.bbox;
        return pointInPolygon([(minX + maxX) / 2, (minY + maxY) / 2], aoi);
      });
    }
    return list;
  }, [intel.reports, area, aoi, geometries]);

  const features: ReportFeature[] = React.useMemo(
    () =>
      areaReports
        .map((record) => {
          const g = geometries[record.id];
          if (!g) return null;
          const [minX, minY, maxX, maxY] = g.bbox;
          return {
            record,
            center: [(minX + maxX) / 2, (minY + maxY) / 2] as [number, number],
            boundary: g.geometry,
          };
        })
        .filter(Boolean) as ReportFeature[],
    [areaReports, geometries],
  );

  const detailRecord = intel.reports.find((r) => r.id === detailId) ?? null;

  /* Categories from the live catalogue, falling back when it's unreachable. */
  const categories = React.useMemo(() => {
    const fromBackend = Array.from(
      new Set(intel.interventions.map((i) => i.category).filter(Boolean)),
    );
    return fromBackend.length ? fromBackend : FALLBACK_CATEGORIES;
  }, [intel.interventions]);

  const removeReport = async (record: LocationRecord) => {
    if (
      !window.confirm(
        `Delete the report for "${locationLabel(record)}"? This removes it from the backend for everyone.`,
      )
    )
      return;
    try {
      await deleteLocation(record.id);
      if (selectedId === record.id) setSelectedId(null);
      if (detailId === record.id) setDetailId(null);
      await intel.refresh();
    } catch (e) {
      window.alert(describeError(e));
    }
  };

  const afterSave = async (saved: LocationRecord) => {
    setEditing(null);
    await intel.refresh();
    const g = await resolveBoundary(saved.id, locationQuery(saved), locationLabel(saved));
    if (g) setGeometries((prev) => ({ ...prev, [saved.id]: g }));
    setSelectedId(saved.id);
  };

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-abyss">
      {/* Mode banner */}
      <header
        className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-hair bg-hull/90 px-4 py-2.5 backdrop-blur"
        style={{ boxShadow: `inset 0 -1px 0 0 ${ROLE.accent}40` }}
      >
        <Link
          href="/"
          className="flex items-center gap-1.5 font-mono text-micro uppercase text-ink-lo transition-colors hover:text-ink-hi"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to roles
        </Link>
        <div className="flex items-baseline gap-2.5">
          <span className="font-display text-[16px] font-semibold tracking-[0.2em] text-ink-hi">
            NEXUS
          </span>
          <span
            className="font-mono text-micro uppercase"
            style={{ color: ROLE.accent }}
          >
            {ROLE.verb}
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => void intel.refresh()}>
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <RoleSwitcher />
        </div>
      </header>

      {/* Tabs */}
      <nav className="flex gap-1 overflow-x-auto border-b border-hair bg-hull/60 px-3 py-2">
        {(
          [
            ["report", "Report a problem"],
            ["planned", "What's planned here"],
            ["datasets", "Explore datasets"],
            ["feedback", "Give feedback"],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "shrink-0 rounded-lg border px-3 py-1.5 font-mono text-tiny uppercase transition-colors",
              tab === id
                ? "text-abyss"
                : "border-hair text-ink-mid hover:border-hairlit hover:text-ink-hi",
            )}
            style={
              tab === id
                ? { background: ROLE.accent, borderColor: ROLE.accent }
                : undefined
            }
          >
            {label}
          </button>
        ))}
      </nav>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3 xl:flex-row">
        {/* Map + registry */}
        <div className="flex h-[46vh] shrink-0 overflow-hidden rounded-xl border border-hair xl:h-auto xl:w-[54%]">
          <div className="relative flex-1">
            <CommunityMap
              className="absolute inset-0"
              reports={features}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onOpenDetails={setDetailId}
              aoi={aoi}
              onAoiChange={setAoi}
              focus={focus}
              basemap={basemap}
              onBasemapChange={setBasemap}
              drawing={drawing}
              onDrawingChange={setDrawing}
            />
          </div>

          <aside className="hidden w-[250px] shrink-0 flex-col border-l border-hair bg-hull/95 lg:flex">
            <Registry
              reports={areaReports}
              total={intel.reports.length}
              loading={intel.loading}
              geometries={geometries}
              selectedId={selectedId}
              onSelect={(id) => setSelectedId(id === selectedId ? null : id)}
              onDetails={setDetailId}
              onAdd={() => setEditing("new")}
              onEdit={setEditing}
              onDelete={removeReport}
            />
          </aside>
        </div>

        {/* Working column */}
        <div className="min-w-0 flex-1 xl:overflow-y-auto xl:pr-1">
          {intel.error && (
            <div className="mb-3">
              <ErrorNote message={intel.error} />
            </div>
          )}

          {aoi && (
            <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-inferred/40 bg-inferred/10 px-3 py-2">
              <span className="font-mono text-micro uppercase text-inferred">
                Filtered to drawn area
              </span>
              <code className="font-mono text-[10.5px] text-ink-mid">
                {bboxOf(aoi).map((n) => n.toFixed(3)).join(", ")}
              </code>
              <Button size="sm" variant="ghost" onClick={() => setAoi(null)}>
                Clear
              </Button>
            </div>
          )}

          {tab === "report" && (
            <ReportTab
              area={area}
              setArea={setArea}
              categories={categories}
              onFocus={setFocus}
              onFiled={async (saved) => {
                await afterSave(saved);
                setTab("planned");
              }}
              setWorkspace={setWorkspace}
              setCommunity={setCommunity}
            />
          )}

          {tab === "planned" && (
            <PlannedTab
              intel={intel}
              area={area}
              areaReports={areaReports}
              onOpenReport={setDetailId}
            />
          )}

          {tab === "datasets" && <DatasetExplorer aoi={aoi} />}

          {tab === "feedback" && (
            <FeedbackTab reports={intel.reports} preset={feedbackTarget} />
          )}
        </div>
      </div>

      {detailRecord && (
        <DetailSheet
          record={detailRecord}
          signals={intel.signals}
          onClose={() => setDetailId(null)}
          onViewOnMap={() => {
            setSelectedId(detailRecord.id);
            setDetailId(null);
          }}
          onEdit={() => {
            setEditing(detailRecord);
            setDetailId(null);
          }}
          onDelete={() => void removeReport(detailRecord)}
          onFeedback={() => {
            setFeedbackTarget(detailRecord);
            setTab("feedback");
            setDetailId(null);
          }}
        />
      )}

      {editing && (
        <ReportEditor
          record={editing === "new" ? null : editing}
          categories={categories}
          onClose={() => setEditing(null)}
          onSaved={afterSave}
        />
      )}
    </div>
  );
}

/* ── Registry ─────────────────────────────────────────────────────────────── */

function Registry({
  reports,
  total,
  loading,
  geometries,
  selectedId,
  onSelect,
  onDetails,
  onAdd,
  onEdit,
  onDelete,
}: {
  reports: LocationRecord[];
  total: number;
  loading: boolean;
  geometries: Record<string, ResolvedGeometry>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDetails: (id: string) => void;
  onAdd: () => void;
  onEdit: (r: LocationRecord) => void;
  onDelete: (r: LocationRecord) => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-hair px-3 py-2.5">
        <div>
          <div className="rule-label">Location registry</div>
          <p className="text-[11.5px] text-ink-mid">
            {loading ? "Loading…" : `${reports.length} shown · ${total} total`}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={onAdd}>
          <Plus className="h-3.5 w-3.5" />
          Add
        </Button>
      </header>

      <div className="flex-1 space-y-2 overflow-y-auto p-2.5">
        {loading && reports.length === 0 && <Loading label="Fetching reports" />}

        {!loading && reports.length === 0 && (
          <Empty
            title="No reports here"
            body="Nothing has been reported for this area yet. Filing a report puts it on the map officers plan from."
          />
        )}

        {reports.map((r) => {
          const on = r.id === selectedId;
          return (
            <div
              key={r.id}
              className={cn(
                "rounded-lg border bg-abyss/50 transition-colors",
                on ? "border-observed" : "border-hair hover:border-hairlit",
              )}
            >
              <button
                type="button"
                onClick={() => onSelect(r.id)}
                className="flex w-full items-start gap-2.5 p-2.5 text-left"
              >
                <span
                  className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: intensityColor(r.intensity) }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12.5px] font-medium text-ink-hi">
                    {locationLabel(r)}
                  </span>
                  <span className="block truncate text-[11px] text-ink-mid">
                    {[r.city, r.district, r.state].filter(Boolean).join(" · ")}
                  </span>
                  <span className="mt-1 flex flex-wrap items-center gap-1.5">
                    <Badge tone="critical">{r.intensity}/10</Badge>
                    {!geometries[r.id] && <Badge>Locating…</Badge>}
                    <span className="font-mono text-micro text-ink-lo">
                      {relativeTime(r.created_at)}
                    </span>
                  </span>
                </span>
              </button>

              <div className="flex justify-end gap-0.5 border-t border-hair px-1.5 py-1">
                <Button size="sm" variant="ghost" onClick={() => onDetails(r.id)}>
                  Details
                </Button>
                <Button size="sm" variant="ghost" onClick={() => onEdit(r)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => onDelete(r)}>
                  <Trash2 className="h-3.5 w-3.5 text-critical" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Report tab ───────────────────────────────────────────────────────────── */

function ReportTab({
  area,
  setArea,
  categories,
  onFocus,
  onFiled,
  setWorkspace,
  setCommunity,
}: {
  area: { state: string; district: string; city: string };
  setArea: (a: { state: string; district: string; city: string }) => void;
  categories: string[];
  onFocus: (g: ResolvedGeometry | null) => void;
  onFiled: (r: LocationRecord) => Promise<void>;
  setWorkspace: ReturnType<typeof useNetwork.getState>["setWorkspace"];
  setCommunity: ReturnType<typeof useNetwork.getState>["setCommunity"];
}) {
  const [category, setCategory] = React.useState("");
  const [severity, setSeverity] = React.useState(6);
  const [details, setDetails] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [filed, setFiled] = React.useState<LocationRecord | null>(null);
  const [locating, setLocating] = React.useState(false);
  const [notFound, setNotFound] = React.useState(false);

  React.useEffect(() => {
    if (!category && categories[0]) setCategory(categories[0]);
  }, [categories, category]);

  /* Geocode as the location settles, and move the map to it. */
  React.useEffect(() => {
    if (!area.district.trim() || !area.state.trim()) return;
    const q = [area.city, area.district, area.state].filter(Boolean).join(", ");
    const t = setTimeout(async () => {
      setLocating(true);
      setNotFound(false);
      const g = await resolveBoundary("form-focus", q, q);
      onFocus(g);
      setNotFound(!g);
      setLocating(false);
    }, 700);
    return () => clearTimeout(t);
  }, [area.state, area.district, area.city, onFocus]);

  const valid =
    area.state.trim() && area.district.trim() && details.trim().length > 10;

  const file = async () => {
    setBusy(true);
    setError(null);
    try {
      const saved = await createLocation({
        state: area.state.trim(),
        district: area.district.trim(),
        city: area.city.trim() || null,
        name: `${category} — ${area.city.trim() || area.district.trim()}`,
        intensity: severity,
        details: details.trim(),
      });

      try {
        setWorkspace(
          await submitOnboarding({
            persona: "COMMUNITY",
            community: {
              location_name: [area.city, area.district, area.state]
                .filter(Boolean)
                .join(", "),
              problem_category: category,
            },
          }),
        );
      } catch {
        /* the report is what matters; workspace context is supplementary */
      }

      setCommunity({
        location_name: [area.city, area.district, area.state]
          .filter(Boolean)
          .join(", "),
        problem_category: category,
      });

      setFiled(saved);
      setDetails("");
      await onFiled(saved);
    } catch (e) {
      setError(describeError(e));
    } finally {
      setBusy(false);
    }
  };

  if (filed) {
    return (
      <Panel eyebrow="Filed" title="Your report is on the map">
        <div className="space-y-2 text-[12.5px] leading-relaxed">
          <p className="text-ink-hi">
            Reference{" "}
            <code className="rounded bg-abyss/70 px-1.5 py-0.5 font-mono text-[11.5px] text-observed">
              {filed.id}
            </code>
          </p>
          <p className="text-ink-mid">
            {[filed.city, filed.district, filed.state].filter(Boolean).join(", ")} ·
            severity {filed.intensity} of 10
          </p>
          <p className="text-ink-mid">{filed.details}</p>
        </div>
        <Button className="mt-4" variant="ghost" onClick={() => setFiled(null)}>
          Report something else
        </Button>
      </Panel>
    );
  }

  return (
    <div className="space-y-3">
      <Panel eyebrow="Report" title="What is happening?">
        <div className="space-y-4">
          {error && <ErrorNote message={error} />}

          <Field
            label="What kind of problem is it?"
            hint={
              categories === FALLBACK_CATEGORIES
                ? "Catalogue unreachable — showing the standard list."
                : "Categories loaded from the NEXUS intervention catalogue."
            }
          >
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>

          <div className="rounded-lg border border-hair bg-abyss/50 p-3">
            <div className="rule-label mb-1.5 flex items-center gap-1.5">
              <MapPin className="h-3 w-3" /> Where
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="State" required>
                <Input
                  value={area.state}
                  onChange={(e) => setArea({ ...area, state: e.target.value })}
                  placeholder="Madhya Pradesh"
                />
              </Field>
              <Field label="District" required>
                <Input
                  value={area.district}
                  onChange={(e) => setArea({ ...area, district: e.target.value })}
                  placeholder="Rewa"
                />
              </Field>
              <Field label="Village or town">
                <Input
                  value={area.city}
                  onChange={(e) => setArea({ ...area, city: e.target.value })}
                  placeholder="Mauganj"
                />
              </Field>
            </div>
            <p className="mt-2 text-[11.5px] leading-relaxed text-ink-lo">
              {locating
                ? "Finding this area on the map…"
                : notFound
                  ? "No boundary found for that combination. Check the spelling — the report can still be filed."
                  : "The map moves to this area and loads what NEXUS already holds for it."}
            </p>
          </div>

          <Field
            label={`How bad is it — ${severity} of 10`}
            hint="10 means people are going without water now. This is saved as the report's intensity."
          >
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={10}
                value={severity}
                onChange={(e) => setSeverity(Number(e.target.value))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full accent-observed"
                style={{
                  background: `linear-gradient(to right, ${intensityColor(severity)} ${
                    (severity / 10) * 100
                  }%, #1E3554 ${(severity / 10) * 100}%)`,
                }}
              />
              <span
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg font-mono text-[13px] text-abyss"
                style={{ background: intensityColor(severity) }}
              >
                {severity}
              </span>
            </div>
          </Field>

          <Field
            label="What have you seen?"
            required
            hint="When it started, how many households are affected, what you are doing instead."
          >
            <Textarea
              rows={4}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="The three hand pumps near the school stopped giving water in early March. About sixty households now walk to the canal, roughly two kilometres each way."
            />
          </Field>

          <Button variant="primary" disabled={!valid || busy} onClick={file}>
            <Send className="h-3.5 w-3.5" />
            {busy ? "Filing…" : "File this report"}
          </Button>
        </div>
      </Panel>
    </div>
  );
}

/* ── Planned tab ──────────────────────────────────────────────────────────── */

function PlannedTab({
  intel,
  area,
  areaReports,
  onOpenReport,
}: {
  intel: ReturnType<typeof useAreaIntelligence>;
  area: { state: string; district: string; city: string };
  areaReports: LocationRecord[];
  onOpenReport: (id: string) => void;
}) {
  const label =
    [area.city, area.district, area.state].filter(Boolean).join(", ") ||
    "all reported areas";

  return (
    <div className="space-y-3">
      <div>
        <h2 className="font-display text-[19px] font-medium text-ink-hi">
          What NEXUS holds for {label}
        </h2>
        <p className="mt-1 text-[12.5px] leading-relaxed text-ink-mid">
          Everything the backend has for this area. Nothing here is a commitment —
          work begins only when an officer approves a plan and funding is in place.
        </p>
      </div>

      {intel.loading && <Loading label="Loading area intelligence" />}

      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Reports here" value={areaReports.length} origin="entered" />
        <Stat
          label="Satellite findings"
          value={intel.signals.length}
          origin="observed"
        />
        <Stat
          label="Response options"
          value={intel.interventions.length}
          origin="inferred"
        />
        <Stat label="Datasets" value={intel.datasets.length} origin="observed" />
      </div>

      {intel.indices && (
        <Panel
          eyebrow="Measured"
          title="Environmental indices for this area"
          actions={<Origin kind="observed" />}
        >
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Water stress", intel.indices.water_stress_index, ""],
              ["Vegetation condition", intel.indices.vegetation_condition_index, ""],
              ["Flood risk", intel.indices.flood_risk_score, ""],
              ["Drawdown", intel.indices.groundwater_drawdown_rate_m_yr, "m/yr"],
            ].map(([k, v, u]) => (
              <div
                key={k as string}
                className="from-observed rounded-lg border border-hair bg-abyss/50 px-3 py-2"
              >
                <div className="rule-label">{k as string}</div>
                <div className="mt-0.5 font-display text-[18px] tabular-nums text-observed">
                  {typeof v === "number" ? v.toFixed(2) : "—"}
                  {u ? <span className="ml-1 text-[11px] text-ink-lo">{u}</span> : null}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {intel.signals.length > 0 && (
        <Panel
          eyebrow="Detected"
          title="Satellite findings"
          actions={<Origin kind="inferred" />}
        >
          <ul className="space-y-2">
            {intel.signals.map((s) => (
              <li key={s.id} className="rounded-lg border border-hair bg-abyss/50 p-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[13px] font-medium text-ink-hi">{s.title}</span>
                  <Badge tone="critical">{s.severity}</Badge>
                  <Badge>{s.domain}</Badge>
                </div>
                <p className="mt-1 text-[11.5px] leading-relaxed text-ink-mid">
                  {s.description}
                </p>
                <p className="mt-1.5 text-[11px] leading-relaxed text-ink-lo">
                  {s.limitations}
                </p>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {areaReports.length > 0 && (
        <Panel
          eyebrow="Reported"
          title="Problems people have raised here"
          actions={<Origin kind="entered" />}
        >
          <ul className="space-y-2">
            {[...areaReports]
              .sort((a, b) => b.intensity - a.intensity)
              .map((r) => (
                <li
                  key={r.id}
                  className="rounded-lg border border-hair bg-abyss/50 p-3"
                  style={{ boxShadow: `inset 2px 0 0 0 ${intensityColor(r.intensity)}` }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[13px] font-medium text-ink-hi">
                      {locationLabel(r)}
                    </span>
                    <div className="flex items-center gap-2">
                      <Badge tone="critical">Severity {r.intensity}/10</Badge>
                      <Button size="sm" variant="ghost" onClick={() => onOpenReport(r.id)}>
                        View details →
                      </Button>
                    </div>
                  </div>
                  <div className="mt-0.5 font-mono text-micro uppercase text-ink-lo">
                    {[r.city, r.district, r.state].filter(Boolean).join(" · ")} ·{" "}
                    {relativeTime(r.created_at)}
                  </div>
                  {r.details && (
                    <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-mid">
                      {r.details}
                    </p>
                  )}
                </li>
              ))}
          </ul>
        </Panel>
      )}

      {intel.interventions.length > 0 && (
        <Panel
          eyebrow="Candidate responses"
          title="What NEXUS would consider"
          actions={<Origin kind="inferred" />}
        >
          <p className="mb-3 text-[11.5px] leading-relaxed text-ink-lo">
            These come from the national intervention catalogue. The backend does not
            attach a location, status, organisation or funding source to them, so
            none is shown — and none is placed on the map.
          </p>
          <ul className="grid gap-2 lg:grid-cols-2">
            {intel.interventions.map((c) => (
              <li key={c.id} className="rounded-lg border border-hair bg-abyss/50 p-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[13px] font-medium text-ink-hi">{c.name}</span>
                  <Badge>{c.category}</Badge>
                </div>
                <p className="mt-1 text-[11.5px] leading-relaxed text-ink-mid">
                  {c.description}
                </p>
                <dl className="mt-2 grid grid-cols-3 gap-2 font-mono text-[11px]">
                  <div>
                    <dt className="rule-label">Typical build</dt>
                    <dd className="text-ink-hi">
                      {months(c.implementation_time_months)}
                    </dd>
                  </div>
                  <div>
                    <dt className="rule-label">Risk</dt>
                    <dd className="text-ink-hi">{c.risk_level}</dd>
                  </div>
                  <div>
                    <dt className="rule-label">Readiness</dt>
                    <dd className="text-ink-hi">TRL {c.technology_maturity_lvl}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {intel.unavailable.length > 0 && (
        <Panel eyebrow="Not available" title="Data this backend does not hold">
          <ul className="space-y-1.5">
            {intel.unavailable.map((u) => (
              <li key={u} className="text-[12px] leading-relaxed text-ink-mid">
                <code className="rounded bg-abyss/70 px-1.5 py-0.5 font-mono text-[11px] text-observed">
                  {u}
                </code>{" "}
                returned nothing for this area, so that panel is hidden rather than
                filled with estimates.
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}

/* ── Feedback tab ─────────────────────────────────────────────────────────── */

function FeedbackTab({
  reports,
  preset,
}: {
  reports: LocationRecord[];
  preset: LocationRecord | null;
}) {
  const { feedback, addFeedback } = useNetwork();
  const [locationId, setLocationId] = React.useState(preset?.id ?? "");
  const [subject, setSubject] = React.useState("");
  const [body, setBody] = React.useState("");
  const [sentiment, setSentiment] =
    React.useState<CommunityFeedback["sentiment"]>("partial");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (preset) setLocationId(preset.id);
    else if (!locationId && reports[0]) setLocationId(reports[0].id);
  }, [preset, reports, locationId]);

  const send = async () => {
    setBusy(true);
    const record: CommunityFeedback = {
      id: uid(),
      locationId,
      subject: subject.trim(),
      body: body.trim(),
      sentiment,
      submittedAt: new Date().toISOString(),
      persisted: false,
    };
    try {
      addFeedback(await submitFeedback(record));
      setSubject("");
      setBody("");
    } catch (e) {
      if (e instanceof NotConnectedError) {
        addFeedback(record);
        setSubject("");
        setBody("");
      } else {
        setError(describeError(e));
      }
    } finally {
      setBusy(false);
    }
  };

  const OPTIONS: Array<{ id: CommunityFeedback["sentiment"]; label: string }> = [
    { id: "working", label: "It is working" },
    { id: "partial", label: "Partly working" },
    { id: "not_working", label: "Not working" },
  ];

  return (
    <div className="space-y-3">
      <Panel eyebrow="Verify" title="Tell us how it is going">
        <div className="space-y-3.5">
          {error && <ErrorNote message={error} />}

          <Field label="Which location">
            <Select value={locationId} onChange={(e) => setLocationId(e.target.value)}>
              {reports.length === 0 && <option value="">No reports on record</option>}
              {reports.map((r) => (
                <option key={r.id} value={r.id}>
                  {[locationLabel(r), r.city, r.state].filter(Boolean).join(" · ")}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="How is it working?">
            <div className="flex flex-wrap gap-1.5">
              {OPTIONS.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setSentiment(o.id)}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-[12px] transition-colors",
                    sentiment === o.id
                      ? "text-abyss"
                      : "border-hair text-ink-mid hover:border-hairlit",
                  )}
                  style={
                    sentiment === o.id
                      ? { background: ROLE.accent, borderColor: ROLE.accent }
                      : undefined
                  }
                >
                  {o.label}
                </button>
              ))}
            </div>
          </Field>

          <Field label="What is it about?">
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="New borewell near the primary school"
            />
          </Field>

          <Field label="What has actually happened?">
            <Textarea
              rows={3}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="The borewell was dug in May and worked for six weeks. Since July it runs dry by mid-morning."
            />
          </Field>

          <Button
            variant="primary"
            disabled={busy || !subject.trim() || !body.trim() || !locationId}
            onClick={send}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            {busy ? "Sending…" : "Send feedback"}
          </Button>

          <UnsavedNotice endpoint="/api/v1/network/feedback" />
        </div>
      </Panel>

      {feedback.length > 0 && (
        <Panel eyebrow="Sent" title="Your feedback">
          <ul className="space-y-2">
            {feedback.map((f) => (
              <li key={f.id} className="rounded-lg border border-hair bg-abyss/50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[13px] font-medium text-ink-hi">
                    {f.subject}
                  </span>
                  <Badge
                    tone={
                      f.sentiment === "working"
                        ? "ok"
                        : f.sentiment === "partial"
                          ? "inferred"
                          : "critical"
                    }
                  >
                    {f.sentiment.replace("_", " ")}
                  </Badge>
                </div>
                <p className="mt-1 text-[11.5px] leading-relaxed text-ink-mid">
                  {f.body}
                </p>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}

/* ── Report editor (create + edit, backed by the locations API) ───────────── */

function ReportEditor({
  record,
  categories,
  onClose,
  onSaved,
}: {
  record: LocationRecord | null;
  categories: string[];
  onClose: () => void;
  onSaved: (r: LocationRecord) => void | Promise<void>;
}) {
  const [form, setForm] = React.useState({
    state: record?.state ?? "",
    district: record?.district ?? "",
    city: record?.city ?? "",
    name: record?.name ?? "",
    intensity: record?.intensity ?? 5,
    details: record?.details ?? "",
  });
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const valid = form.state.trim() && form.district.trim();

  const save = async () => {
    setSaving(true);
    setError(null);
    const body = {
      state: form.state.trim(),
      district: form.district.trim(),
      city: form.city.trim() || null,
      name: form.name.trim() || null,
      intensity: form.intensity,
      details: form.details,
    };
    try {
      const saved = record
        ? await updateLocation(record.id, body)
        : await createLocation(body);
      await onSaved(saved);
    } catch (e) {
      setError(describeError(e));
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-abyss/80 backdrop-blur-sm sm:items-center sm:p-6">
      <div className="max-h-full w-full max-w-md overflow-y-auto rounded-t-2xl border border-hair bg-panel shadow-panel sm:rounded-2xl">
        <header className="flex items-center justify-between border-b border-hair px-4 py-3">
          <div>
            <div className="rule-label">Location record</div>
            <h3 className="font-display text-[15px] text-ink-hi">
              {record ? "Edit report" : "Add location"}
            </h3>
          </div>
          <Button size="sm" variant="ghost" onClick={onClose}>
            Close
          </Button>
        </header>

        <div className="space-y-3.5 p-4">
          {error && <ErrorNote message={error} />}

          <div className="grid grid-cols-2 gap-3">
            <Field label="State" required>
              <Input value={form.state} onChange={(e) => set("state", e.target.value)} />
            </Field>
            <Field label="District" required>
              <Input
                value={form.district}
                onChange={(e) => set("district", e.target.value)}
              />
            </Field>
          </div>

          <Field label="City or block">
            <Input value={form.city} onChange={(e) => set("city", e.target.value)} />
          </Field>

          <Field label="Label" hint="Shown on the map and in the registry.">
            <Input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder={categories[0] ? `${categories[0]} — village` : undefined}
            />
          </Field>

          <Field label={`Severity — ${form.intensity} of 10`}>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={10}
                value={form.intensity}
                onChange={(e) => set("intensity", Number(e.target.value))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full accent-observed"
                style={{
                  background: `linear-gradient(to right, ${intensityColor(
                    form.intensity,
                  )} ${(form.intensity / 10) * 100}%, #1E3554 ${
                    (form.intensity / 10) * 100
                  }%)`,
                }}
              />
              <span
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg font-mono text-[13px] text-abyss"
                style={{ background: intensityColor(form.intensity) }}
              >
                {form.intensity}
              </span>
            </div>
          </Field>

          <Field label="Details">
            <Textarea
              rows={3}
              value={form.details}
              onChange={(e) => set("details", e.target.value)}
            />
          </Field>
        </div>

        <footer className="flex justify-end gap-2 border-t border-hair px-4 py-3">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" disabled={!valid || saving} onClick={save}>
            {saving ? "Saving…" : record ? "Save changes" : "Add location"}
          </Button>
        </footer>
      </div>
    </div>
  );
}

/* ── Role switcher ────────────────────────────────────────────────────────── */

function RoleSwitcher() {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="rounded-lg border border-hair bg-abyss/60 px-2.5 py-1.5 font-mono text-micro uppercase text-ink-mid hover:border-hairlit"
      >
        Switch mode
      </button>
      {open && (
        <ul className="absolute right-0 top-full z-50 mt-2 w-[250px] overflow-hidden rounded-xl border border-hair bg-panel shadow-panel">
          {ROLES.map((r) => (
            <li key={r.id}>
              <Link
                href={r.id === "government" ? "/workspace" : `/network/${r.id}`}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2.5 transition-colors hover:bg-raised/70"
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: r.accent }}
                />
                <span className="min-w-0">
                  <span className="block truncate text-[12.5px] text-ink-hi">
                    {r.title}
                  </span>
                  <span className="block font-mono text-micro uppercase text-ink-lo">
                    {r.verb}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
