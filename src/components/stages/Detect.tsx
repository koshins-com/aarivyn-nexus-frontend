"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Play, Satellite } from "lucide-react";
import { StageHeader, StageNav } from "./StageHeader";
import {
  Badge,
  Button,
  Empty,
  ErrorNote,
  Meter,
  Origin,
  Panel,
  Stat,
} from "@/components/ui/primitives";
import { describeError } from "@/lib/api/client";
import { pollJob, submitAnalysis } from "@/lib/api/nexus";
import { useNexus } from "@/lib/store";
import { bboxOf, compact, severityColor } from "@/lib/format";
import type { ContextSignal, Indicator } from "@/lib/types";

export function Detect({
  onSignalsPlaced,
}: {
  onSignalsPlaced?: (signals: ContextSignal[]) => void;
}) {
  const {
    brief,
    aoi,
    geometries,
    selectedLocationId,
    job,
    setJob,
    signals,
    setSignals,
    goTo,
  } = useNexus();

  const [running, setRunning] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [openSignal, setOpenSignal] = React.useState<string | null>(null);
  const abort = React.useRef<AbortController | null>(null);

  const geom = selectedLocationId ? geometries[selectedLocationId] : undefined;
  const bbox = aoi ? bboxOf(aoi) : geom?.bbox;

  const indicators: Indicator[] = React.useMemo(
    () => job?.result?.earth_observation?.indicators ?? [],
    [job],
  );

  const run = async () => {
    if (!bbox) return;
    setRunning(true);
    setError(null);
    abort.current?.abort();
    abort.current = new AbortController();
    try {
      const submitted = await submitAnalysis({
        geography_id: brief.geographyId || brief.district.toLowerCase(),
        bbox,
        date_range_start: brief.dateRangeStart,
        date_range_end: brief.dateRangeEnd,
        data_sources: brief.dataSources,
        budget_limit_inr: brief.budgetInr ?? 0,
        time_horizon_months: brief.timeHorizonMonths,
        max_risk_level: brief.maxRiskLevel,
      });
      setJob(submitted);
      const final = await pollJob(submitted.job_id, setJob, {
        signal: abort.current.signal,
      });
      if (final.status === "FAILED") {
        setError(final.error_message ?? "The analysis job failed.");
      } else {
        const found = final.result?.water_intelligence?.detected_signals ?? [];
        setSignals(found);
        onSignalsPlaced?.(found);
      }
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) {
        setError(describeError(e));
      }
    } finally {
      setRunning(false);
    }
  };

  React.useEffect(() => () => abort.current?.abort(), []);

  const progress = job?.progress_percent ?? 0;
  const done = job?.status === "COMPLETED";

  return (
    <>
      <StageHeader
        id="detect"
        lede="NEXUS reads the satellite record for your area and flags where conditions depart from what is normal. Each finding carries its evidence and its limits."
      >
        <Button
          variant={done ? "outline" : "primary"}
          onClick={run}
          disabled={running || !bbox}
        >
          {running ? (
            <>Running…</>
          ) : (
            <>
              <Play className="h-3.5 w-3.5" />
              {done ? "Run again" : "Run detection"}
            </>
          )}
        </Button>
      </StageHeader>

      {error && (
        <div className="mb-4">
          <ErrorNote message={error} />
        </div>
      )}

      {job && job.status !== "COMPLETED" && (
        <Panel className="mb-4" eyebrow="Pipeline" title={job.stage}>
          <Meter value={progress} max={100} color="#4CC9E8" />
          <div className="mt-2 flex items-center justify-between font-mono text-micro uppercase text-ink-lo">
            <span>Job {job.job_id}</span>
            <span className="tabular-nums text-observed">{progress}%</span>
          </div>
        </Panel>
      )}

      {!job && !running && (
        <Empty
          title="Nothing detected yet"
          body="Run detection to pull the Earth-observation record for your area and surface where conditions look abnormal."
          action={
            <Button variant="primary" onClick={run} disabled={!bbox}>
              <Satellite className="h-3.5 w-3.5" />
              Run detection
            </Button>
          }
        />
      )}

      {job?.result && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Stat
              label="Scenes processed"
              value={job.result.earth_observation?.observations_count ?? "—"}
              origin="observed"
            />
            <Stat
              label="Abnormalities found"
              value={signals.length}
              origin="inferred"
              accent={signals.length ? "#F0A63C" : undefined}
            />
            <Stat
              label="Problem categories"
              value={job.result.water_intelligence?.problem_categories?.length ?? 0}
              origin="inferred"
            />
            <Stat
              label="Villages implicated"
              value={compact(
                signals.reduce((a, s) => a + (s.affected_villages_count ?? 0), 0),
              )}
              origin="inferred"
            />
          </div>

          {indicators.length > 0 && (
            <Panel
              eyebrow="Measured"
              title="Indicators derived from the satellite record"
              actions={<Origin kind="observed" />}
            >
              <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                {indicators.map((ind, i) => (
                  <div
                    key={`${ind.indicator_name}-${i}`}
                    className="from-observed rounded-lg border border-hair bg-abyss/50 p-3"
                  >
                    <div className="text-[12.5px] font-medium text-ink-hi">
                      {ind.indicator_name}
                    </div>
                    <div className="mt-1 font-display text-[20px] tabular-nums text-observed">
                      {typeof ind.value === "number" ? ind.value.toFixed(3) : "—"}
                      <span className="ml-1 text-[11px] text-ink-lo">{ind.unit}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <Badge tone="observed">{ind.pedigree.replace(/_/g, " ")}</Badge>
                      {!ind.direct_measurement && <Badge>Proxy, not direct</Badge>}
                    </div>
                    {ind.limitations && (
                      <p className="mt-2 text-[11px] leading-relaxed text-ink-lo">
                        {ind.limitations}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </Panel>
          )}

          <Panel
            eyebrow="Abnormalities"
            title="What looks wrong, and how confident we are"
            actions={<Origin kind="inferred" />}
          >
            {signals.length === 0 ? (
              <Empty
                title="No abnormalities flagged"
                body="The pipeline completed without raising a signal for this area and observation window. Widening the date range often surfaces seasonal patterns."
              />
            ) : (
              <ul className="space-y-2.5">
                {[...signals]
                  .sort(
                    (a, b) =>
                      severityRankOf(b.severity) - severityRankOf(a.severity),
                  )
                  .map((s, i) => (
                    <motion.li
                      key={s.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05, duration: 0.3 }}
                    >
                      <SignalCard
                        signal={s}
                        open={openSignal === s.id}
                        onToggle={() =>
                          setOpenSignal((o) => (o === s.id ? null : s.id))
                        }
                      />
                    </motion.li>
                  ))}
              </ul>
            )}
          </Panel>

          {job.result.no_solution_reason && (
            <Panel eyebrow="Constraint warning" title="No plan fits your envelope yet">
              <p className="text-[12.5px] leading-relaxed text-ink-hi">
                {job.result.no_solution_reason}
              </p>
              <Button
                className="mt-3"
                variant="outline"
                onClick={() => goTo("intake")}
              >
                Adjust the brief
              </Button>
            </Panel>
          )}
        </div>
      )}

      <StageNav
        back="verify"
        next="gap"
        nextLabel="See the gap"
        nextDisabled={!done}
        nextBlockedReason={!done ? "Run detection to continue." : undefined}
      />
    </>
  );
}

function severityRankOf(s: string) {
  return { CRITICAL: 3, ELEVATED: 2, MODERATE: 1 }[s?.toUpperCase()] ?? 0;
}

function SignalCard({
  signal,
  open,
  onToggle,
}: {
  signal: ContextSignal;
  open: boolean;
  onToggle: () => void;
}) {
  const color = severityColor(signal.severity);
  return (
    <div
      className="rounded-lg border border-hair bg-abyss/50"
      style={{ boxShadow: `inset 2px 0 0 0 ${color}` }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-start gap-3 p-3.5 text-left"
      >
        <span
          className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ background: color }}
          aria-hidden
        />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-[13.5px] font-medium text-ink-hi">
              {signal.title}
            </span>
            <span
              className="rounded border px-1.5 py-0.5 font-mono text-micro uppercase"
              style={{ color, borderColor: `${color}66`, background: `${color}1a` }}
            >
              {signal.severity}
            </span>
            <Badge>{signal.domain}</Badge>
          </span>
          <span className="mt-1 block text-[12px] leading-relaxed text-ink-mid">
            {signal.description}
          </span>
          <span className="mt-1.5 block font-mono text-micro uppercase text-ink-lo">
            {signal.affected_villages_count} villages · {signal.id}
          </span>
        </span>
        <span className="shrink-0 font-mono text-micro uppercase text-ink-lo">
          {open ? "Hide" : "Evidence"}
        </span>
      </button>

      {open && (
        <div className="space-y-2.5 border-t border-hair px-3.5 py-3">
          <Row label="Derived from" value={signal.underlying_data_citation} />
          <Row label="Sensor" value={signal.source} />
          <Row
            label="Measurement"
            value={
              signal.direct_measurement
                ? "Direct measurement"
                : `${signal.measurement_type} — inferred, not measured on the ground`
            }
          />
          <Row label="Provenance" value={signal.provenance_tag.replace(/_/g, " ")} />
          <div className="rounded-lg border border-inferred/30 bg-inferred/5 p-2.5">
            <div className="rule-label mb-1 text-inferred">What this cannot tell you</div>
            <p className="text-[11.5px] leading-relaxed text-ink-mid">
              {signal.limitations}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-0.5 sm:grid-cols-[120px_1fr] sm:gap-3">
      <span className="rule-label">{label}</span>
      <span className="text-[12px] leading-relaxed text-ink-hi">{value}</span>
    </div>
  );
}
