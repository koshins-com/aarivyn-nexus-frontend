"use client";

import * as React from "react";
import { Download, FlaskConical, Save } from "lucide-react";
import { NetworkShell } from "./NetworkShell";
import { Header } from "./NgoMode";
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
} from "@/components/ui/primitives";
import { describeError } from "@/lib/api/client";
import { datasetGeoJSONUrl, listDatasets } from "@/lib/api/datasets";
import { getContextSignals } from "@/lib/api/nexus";
import { submitOnboarding } from "@/lib/api/workspace";
import { useNetwork, type AcademicProfile } from "@/lib/network-store";
import { roleById } from "@/lib/roles";
import { severityColor } from "@/lib/format";
import type { ContextSignal, DatasetRecord, DerivedIndicatorsResponse } from "@/lib/types";

const ROLE = roleById("research")!;

export function ResearchMode() {
  const [tab, setTab] = React.useState("datasets");
  return (
    <NetworkShell
      role={ROLE}
      active={tab}
      onTab={setTab}
      tabs={[
        { id: "datasets", label: "Datasets" },
        { id: "abnormalities", label: "Abnormalities" },
        { id: "methodology", label: "Methodology" },
        { id: "profile", label: "Workspace" },
      ]}
    >
      {tab === "datasets" && <Datasets />}
      {tab === "abnormalities" && <Abnormalities />}
      {tab === "methodology" && <Methodology />}
      {tab === "profile" && <Profile />}
    </NetworkShell>
  );
}

/* ── Datasets ─────────────────────────────────────────────────────────────── */

const CATEGORIES = [
  "all",
  "base_maps",
  "utilities",
  "imagery",
  "geological",
  "water_demand",
  "field_observations",
  "engineering",
  "weather",
  "general",
];

function Datasets() {
  const [items, setItems] = React.useState<DatasetRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [category, setCategory] = React.useState("all");
  const [query, setQuery] = React.useState("");

  React.useEffect(() => {
    let alive = true;
    listDatasets()
      .then((d) => alive && setItems(d))
      .catch((e) => alive && setError(describeError(e)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const filtered = items.filter(
    (d) =>
      (category === "all" || d.category === category) &&
      (query.trim() === "" ||
        `${d.name} ${d.usage} ${d.category}`
          .toLowerCase()
          .includes(query.toLowerCase())),
  );

  const documents = items.filter((d) => d.representation === "document");
  const spatial = items.filter((d) => d.representation === "vector_geojson");

  return (
    <div className="space-y-4">
      <Header
        title="Regional datasets"
        lede="Everything ingested into NEXUS for this region — vector layers, rasters, field observation tables, point clouds and documents. Vector layers download as RFC 7946 GeoJSON in EPSG:4326."
      />

      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Datasets" value={items.length} origin="observed" />
        <Stat label="Spatial layers" value={spatial.length} origin="observed" />
        <Stat label="Documents" value={documents.length} origin="observed" />
        <Stat
          label="Categories present"
          value={new Set(items.map((i) => i.category)).size}
          origin="observed"
        />
      </div>

      {loading && <Loading label="Listing ingested datasets" />}
      {error && <ErrorNote message={error} />}

      {!loading && !error && (
        <Panel
          eyebrow="Catalogue"
          title={`${filtered.length} datasets`}
          actions={<Origin kind="observed" />}
        >
          <div className="mb-3 grid gap-2 sm:grid-cols-[1fr_200px]">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or what the data is for"
            />
            <Select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c === "all" ? "All categories" : c.replace(/_/g, " ")}
                </option>
              ))}
            </Select>
          </div>

          {items.length === 0 ? (
            <Empty
              title="No datasets ingested"
              body="Nothing has been uploaded to this NEXUS instance yet. Once an operator ingests files through the maps API they appear here, with their category and representation."
            />
          ) : filtered.length === 0 ? (
            <Empty
              title="Nothing matches"
              body="No dataset matches this search and category. Clear the filters to see the full catalogue."
            />
          ) : (
            <ul className="grid gap-2 lg:grid-cols-2">
              {filtered.map((d) => (
                <li
                  key={d.id}
                  className="from-observed rounded-lg border border-hair bg-abyss/50 p-3"
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[13px] font-medium text-ink-hi">
                      {d.name}
                    </span>
                    <Badge tone="observed">
                      {(d.representation ?? "unknown").replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <div className="mt-1 font-mono text-micro uppercase text-ink-lo">
                    {d.category?.replace(/_/g, " ")} · for {d.usage}
                  </div>
                  {d.representation === "vector_geojson" ? (
                    <a
                      href={datasetGeoJSONUrl(d.id)}
                      download={`${d.name}.geojson`}
                      className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg border border-hairlit bg-raised/60 px-3 py-1.5 text-[12px] text-ink-hi transition-colors hover:border-observed"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download GeoJSON
                    </a>
                  ) : (
                    <p className="mt-2.5 text-[11px] leading-relaxed text-ink-lo">
                      Only vector layers have a GeoJSON export endpoint. This one is
                      stored in its original form and is not downloadable through
                      the API.
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}

      <Panel eyebrow="Literature" title="Papers and government reports">
        <p className="text-[12.5px] leading-relaxed text-ink-hi">
          NEXUS has no literature endpoint. Any papers or government reports you see
          here would have to be ingested as documents through the maps API first —
          they then appear in the catalogue above with{" "}
          <code className="rounded bg-abyss/70 px-1.5 py-0.5 font-mono text-[11.5px] text-observed">
            representation: document
          </code>
          .
        </p>
        {documents.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {documents.map((d) => (
              <li
                key={d.id}
                className="rounded border border-hair bg-abyss/50 px-3 py-2 text-[12px] text-ink-hi"
              >
                {d.name}
                <span className="ml-2 font-mono text-micro uppercase text-ink-lo">
                  {d.category?.replace(/_/g, " ")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

/* ── Abnormalities ────────────────────────────────────────────────────────── */

function Abnormalities() {
  const { academic } = useNetwork();
  const [geo, setGeo] = React.useState(academic?.region_of_interest || "rewa");
  const [applied, setApplied] = React.useState(geo);
  const [data, setData] = React.useState<DerivedIndicatorsResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [domain, setDomain] = React.useState("all");

  React.useEffect(() => {
    let alive = true;
    setLoading(true);
    getContextSignals(applied.toLowerCase().trim())
      .then((d) => {
        if (!alive) return;
        setData(d);
        setError(null);
      })
      .catch((e) => alive && setError(describeError(e)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [applied]);

  const signals = data?.signals ?? [];
  const domains = ["all", ...Array.from(new Set(signals.map((s) => s.domain)))];
  const shown = domain === "all" ? signals : signals.filter((s) => s.domain === domain);

  return (
    <div className="space-y-4">
      <Header
        title="Detected abnormalities"
        lede="Signals derived from the satellite record, with the index each one came from and an explicit statement of what it cannot establish."
      />

      <Panel eyebrow="Query" title="Filter the record">
        <div className="grid gap-2 sm:grid-cols-[1fr_180px_auto]">
          <Field label="Geography ID">
            <Input
              value={geo}
              onChange={(e) => setGeo(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && setApplied(geo)}
              placeholder="rewa"
            />
          </Field>
          <Field label="Domain">
            <Select value={domain} onChange={(e) => setDomain(e.target.value)}>
              {domains.map((d) => (
                <option key={d} value={d}>
                  {d === "all" ? "All domains" : d}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex items-end">
            <Button variant="primary" onClick={() => setApplied(geo)}>
              Load
            </Button>
          </div>
        </div>
      </Panel>

      {loading && <Loading label={`Querying signals for ${applied}`} />}
      {error && <ErrorNote message={error} />}

      {data && (
        <>
          <div className="grid gap-3 sm:grid-cols-4">
            <Stat
              label="Water stress index"
              value={data.water_stress_index.toFixed(3)}
              origin="observed"
            />
            <Stat
              label="Vegetation condition"
              value={data.vegetation_condition_index.toFixed(3)}
              origin="observed"
            />
            <Stat
              label="Flood risk score"
              value={data.flood_risk_score.toFixed(3)}
              origin="observed"
            />
            <Stat
              label="Drawdown rate"
              value={data.groundwater_drawdown_rate_m_yr.toFixed(2)}
              unit="m/yr"
              origin="observed"
            />
          </div>

          <Panel
            eyebrow="Signals"
            title={`${shown.length} abnormalities`}
            actions={
              <Button
                size="sm"
                variant="ghost"
                onClick={() => downloadJson(data, `nexus-signals-${applied}.json`)}
              >
                <Download className="h-3.5 w-3.5" />
                Export JSON
              </Button>
            }
          >
            {shown.length === 0 ? (
              <Empty
                title="No signals for this geography"
                body="Either the identifier is unknown to the backend, or nothing was flagged for it. Try the identifier used in the government workspace."
              />
            ) : (
              <ul className="space-y-2">
                {shown.map((s) => (
                  <SignalRow key={s.id} signal={s} />
                ))}
              </ul>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}

function SignalRow({ signal }: { signal: ContextSignal }) {
  const color = severityColor(signal.severity);
  return (
    <li
      className="rounded-lg border border-hair bg-abyss/50 p-3.5"
      style={{ boxShadow: `inset 2px 0 0 0 ${color}` }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[13px] font-medium text-ink-hi">{signal.title}</span>
        <span
          className="rounded border px-1.5 py-0.5 font-mono text-micro uppercase"
          style={{ color, borderColor: `${color}66`, background: `${color}1a` }}
        >
          {signal.severity}
        </span>
        <Badge>{signal.domain}</Badge>
        <Badge tone="observed">{signal.provenance_tag.replace(/_/g, " ")}</Badge>
      </div>
      <p className="mt-1.5 text-[12px] leading-relaxed text-ink-mid">
        {signal.description}
      </p>
      <dl className="mt-2 space-y-1 font-mono text-[11px]">
        <Kv k="Index" v={signal.underlying_data_citation} />
        <Kv k="Sensor" v={signal.source} />
        <Kv
          k="Type"
          v={
            signal.direct_measurement
              ? "direct measurement"
              : `${signal.measurement_type} — inferred`
          }
        />
        <Kv k="Villages" v={String(signal.affected_villages_count)} />
      </dl>
      <div className="mt-2 rounded-lg border border-inferred/30 bg-inferred/5 p-2.5">
        <div className="rule-label mb-1 text-inferred">Stated limitations</div>
        <p className="text-[11.5px] leading-relaxed text-ink-mid">
          {signal.limitations}
        </p>
      </div>
    </li>
  );
}

function Kv({ k, v }: { k: string; v: string }) {
  return (
    <div className="grid gap-0.5 sm:grid-cols-[90px_1fr] sm:gap-3">
      <dt className="rule-label">{k}</dt>
      <dd className="text-ink-hi">{v}</dd>
    </div>
  );
}

/* ── Methodology ──────────────────────────────────────────────────────────── */

function Methodology() {
  return (
    <div className="space-y-4">
      <Header
        title="How these numbers are produced"
        lede="Cite this correctly. Most NEXUS indicators are spectral proxies, not ground measurements, and the distinction matters for anything you publish."
      />

      <Panel eyebrow="Pipeline" title="Where each figure comes from">
        <ol className="space-y-3">
          {[
            {
              n: "Acquisition",
              b: "Scenes are queried from the Microsoft Planetary Computer STAC API — sentinel-2-l2a and landsat-c2-l2 collections. When the API is unreachable, cached metadata is used and the record is tagged accordingly.",
            },
            {
              n: "Index derivation",
              b: "Indicators are computed by band-ratio algebra over the retrieved scenes. Each carries a pedigree tag; MODELLED_SATELLITE_PROXY means the value was modelled from reflectance, not measured.",
            },
            {
              n: "Signal detection",
              b: "Abnormalities are raised where an index departs from its expected range. Each signal names the index it came from and states what it cannot establish.",
            },
            {
              n: "Intervention graph",
              b: "Candidate responses are traversed from the detected problem through a recursive graph query, then filtered on geography, budget, time and risk.",
            },
            {
              n: "Optimization",
              b: "Portfolios are produced by NSGA-II (pymoo) over the surviving candidates. Every returned portfolio is non-dominated — none is 'the best'.",
            },
          ].map((s, i) => (
            <li
              key={s.n}
              className="from-observed rounded-lg border border-hair bg-abyss/50 p-3"
            >
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-micro text-ink-lo">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-[13px] font-medium text-ink-hi">{s.n}</span>
              </div>
              <p className="mt-1 text-[12px] leading-relaxed text-ink-mid">{s.b}</p>
            </li>
          ))}
        </ol>
      </Panel>

      <Panel eyebrow="Caution" title="Reading the provenance tags">
        <dl className="space-y-2">
          {[
            ["REAL_DATA / REAL_RASTER", "Retrieved from the source archive."],
            [
              "REAL_STAC_METADATA",
              "Scene metadata is genuine; derived values may still be modelled.",
            ],
            [
              "MODELLED_SATELLITE_PROXY",
              "Inferred from spectral bands. Not a ground measurement. Do not cite as one.",
            ],
            ["CACHED_DATA", "Served from cache; check the acquisition date."],
            [
              "SYNTHETIC_TEST",
              "Generated for testing. Never valid for research use.",
            ],
          ].map(([k, v]) => (
            <div key={k} className="grid gap-0.5 sm:grid-cols-[240px_1fr] sm:gap-3">
              <dt className="font-mono text-[11px] uppercase text-observed">{k}</dt>
              <dd className="text-[12px] leading-relaxed text-ink-mid">{v}</dd>
            </div>
          ))}
        </dl>
      </Panel>
    </div>
  );
}

/* ── Workspace profile ────────────────────────────────────────────────────── */

function Profile() {
  const { academic, setAcademic, setWorkspace } = useNetwork();
  const [form, setForm] = React.useState<AcademicProfile>(
    academic ?? {
      name: "",
      institution: "",
      region_of_interest: "rewa",
      level: "researcher",
    },
  );
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const set = <K extends keyof AcademicProfile>(k: K, v: AcademicProfile[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    setError(null);
    const payload = {
      name: form.name,
      institution: form.institution,
      region_of_interest: form.region_of_interest,
    };
    try {
      const ctx = await submitOnboarding(
        form.level === "student"
          ? { persona: "STUDENT", student: payload }
          : { persona: "RESEARCHER", researcher: payload },
      );
      setWorkspace(ctx);
      setAcademic(form);
      setSaved(true);
    } catch (e) {
      setError(describeError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Header
        title="Your research workspace"
        lede="Researcher accounts get raw data export in their permission scope; student accounts get the same catalogue in academic mode."
      />
      <Panel eyebrow="Profile" title="Who you are">
        <div className="space-y-3.5">
          {error && <ErrorNote message={error} />}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name">
              <Input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
              />
            </Field>
            <Field label="Institution">
              <Input
                value={form.institution}
                onChange={(e) => set("institution", e.target.value)}
                placeholder="Manipal Institute of Technology"
              />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Region of interest" hint="Geography identifier.">
              <Input
                value={form.region_of_interest}
                onChange={(e) => set("region_of_interest", e.target.value)}
              />
            </Field>
            <Field label="Account type">
              <Select
                value={form.level}
                onChange={(e) =>
                  set("level", e.target.value as AcademicProfile["level"])
                }
              >
                <option value="student">Student</option>
                <option value="researcher">Researcher — raw data export</option>
              </Select>
            </Field>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              disabled={saving || !form.institution.trim()}
              onClick={save}
            >
              {saving ? "Saving…" : <><Save className="h-3.5 w-3.5" /> Save</>}
            </Button>
            {saved && (
              <Badge tone="ok">
                <FlaskConical className="h-3 w-3" /> Workspace active
              </Badge>
            )}
          </div>
        </div>
      </Panel>
    </div>
  );
}

function downloadJson(data: unknown, filename: string) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
