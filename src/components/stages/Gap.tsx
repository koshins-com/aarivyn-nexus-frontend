"use client";

import * as React from "react";
import { ArrowRight } from "lucide-react";
import { StageHeader, StageNav } from "./StageHeader";
import {
  Badge,
  Empty,
  ErrorNote,
  Input,
  Loading,
  Meter,
  Origin,
  Panel,
} from "@/components/ui/primitives";
import { describeError } from "@/lib/api/client";
import { getContextSignals } from "@/lib/api/nexus";
import { useNexus } from "@/lib/store";
import { cn } from "@/lib/format";
import type { DerivedIndicatorsResponse } from "@/lib/types";

interface Measure {
  key: string;
  label: string;
  unit: string;
  current: number;
  /** Higher is better, or lower is better. */
  direction: "higher" | "lower";
  /** Scale ceiling used to draw the bar. */
  scale: number;
  defaultTarget: number;
  meaning: string;
}

/**
 * Gap analysis reads the derived indices from `GET /context/{id}/signals`.
 * Current condition is measured. The desired condition is *the officer's
 * target* — NEXUS does not assert what "good" is, because that is a policy
 * judgement, not an observation.
 */
export function Gap() {
  const { brief, signals } = useNexus();
  const [data, setData] = React.useState<DerivedIndicatorsResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [targets, setTargets] = React.useState<Record<string, number>>({});

  const geographyId = brief.geographyId || brief.district.toLowerCase();

  React.useEffect(() => {
    let alive = true;
    setLoading(true);
    getContextSignals(geographyId)
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
  }, [geographyId]);

  const measures: Measure[] = React.useMemo(() => {
    if (!data) return [];
    return [
      {
        key: "water_stress_index",
        label: "Water stress",
        unit: "index",
        current: data.water_stress_index,
        direction: "lower",
        scale: 1,
        defaultTarget: 0.3,
        meaning:
          "How far the area's moisture balance sits below what its season and land cover would normally show.",
      },
      {
        key: "vegetation_condition_index",
        label: "Vegetation condition",
        unit: "index",
        current: data.vegetation_condition_index,
        direction: "higher",
        scale: 1,
        defaultTarget: 0.7,
        meaning:
          "Canopy vigour relative to the historical range for the same period.",
      },
      {
        key: "flood_risk_score",
        label: "Flood risk",
        unit: "score",
        current: data.flood_risk_score,
        direction: "lower",
        scale: 1,
        defaultTarget: 0.25,
        meaning:
          "Likelihood of inundation given observed surface water extent and terrain.",
      },
      {
        key: "groundwater_drawdown_rate_m_yr",
        label: "Groundwater drawdown",
        unit: "m/year",
        current: data.groundwater_drawdown_rate_m_yr,
        direction: "lower",
        scale: Math.max(2, data.groundwater_drawdown_rate_m_yr * 1.6),
        defaultTarget: 0,
        meaning:
          "Rate at which the water table is falling, inferred from the satellite proxy record.",
      },
    ];
  }, [data]);

  const targetFor = (m: Measure) => targets[m.key] ?? m.defaultTarget;

  return (
    <>
      <StageHeader
        id="gap"
        lede="Where the region stands today, where you need it to be, and the distance between the two. Set the targets — those are policy calls, not satellite readings."
      />

      {loading && <Loading label={`Reading indices for ${geographyId}`} />}
      {error && <ErrorNote message={error} />}

      {data && (
        <div className="space-y-4">
          <Panel eyebrow="Condition" title="Current → gap → desired">
            <div className="space-y-3">
              {measures.map((m) => {
                const target = targetFor(m);
                const gap =
                  m.direction === "lower" ? m.current - target : target - m.current;
                const closed = gap <= 0;
                return (
                  <div
                    key={m.key}
                    className="rounded-lg border border-hair bg-abyss/50 p-3.5"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="text-[13.5px] font-medium text-ink-hi">
                        {m.label}
                      </h3>
                      <Badge tone={closed ? "ok" : "critical"}>
                        {closed ? "Target met" : `Gap ${Math.abs(gap).toFixed(2)} ${m.unit}`}
                      </Badge>
                    </div>
                    <p className="mt-1 text-[11.5px] leading-relaxed text-ink-mid">
                      {m.meaning}
                    </p>

                    <div className="mt-3 grid items-center gap-3 md:grid-cols-[1fr_auto_1fr]">
                      <div className="from-observed rounded-lg border border-hair bg-hull/60 p-2.5">
                        <div className="rule-label mb-1">Current condition</div>
                        <div className="font-display text-[20px] tabular-nums text-observed">
                          {m.current.toFixed(2)}
                          <span className="ml-1 text-[11px] text-ink-lo">{m.unit}</span>
                        </div>
                        <div className="mt-1.5">
                          <Origin kind="observed" />
                        </div>
                      </div>

                      <div className="flex items-center justify-center gap-2 md:flex-col">
                        <ArrowRight className="h-4 w-4 text-inferred md:rotate-0" />
                        <span className="font-mono text-micro uppercase text-inferred">
                          Gap
                        </span>
                      </div>

                      <div className="from-entered rounded-lg border border-hair bg-hull/60 p-2.5">
                        <div className="rule-label mb-1">Desired condition</div>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            step={0.05}
                            value={target}
                            onChange={(e) =>
                              setTargets((t) => ({
                                ...t,
                                [m.key]: Number(e.target.value),
                              }))
                            }
                            className="h-8 w-24 py-1 text-[15px]"
                            aria-label={`Target for ${m.label}`}
                          />
                          <span className="text-[11px] text-ink-lo">{m.unit}</span>
                        </div>
                        <div className="mt-1.5">
                          <Origin kind="entered" />
                        </div>
                      </div>
                    </div>

                    <div className="mt-3">
                      <Meter
                        value={Math.min(m.current, m.scale)}
                        max={m.scale}
                        color={closed ? "#3FD79A" : "#FF9A47"}
                      />
                      <div className="mt-1 flex justify-between font-mono text-micro text-ink-lo">
                        <span>0</span>
                        <span
                          className={cn(
                            "tabular-nums",
                            closed ? "text-nominal" : "text-elevated",
                          )}
                        >
                          {m.direction === "lower"
                            ? "lower is better"
                            : "higher is better"}
                        </span>
                        <span>{m.scale.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel
            eyebrow="Why"
            title="Findings behind the gap"
            actions={<Origin kind="inferred" />}
          >
            {(signals.length ? signals : data.signals).length === 0 ? (
              <Empty
                title="No findings attached"
                body="Run detection first so the gap can be traced back to specific observations."
              />
            ) : (
              <ul className="space-y-2">
                {(signals.length ? signals : data.signals).map((s) => (
                  <li
                    key={s.id}
                    className="from-inferred rounded-lg border border-hair bg-abyss/50 p-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[13px] font-medium text-ink-hi">
                        {s.title}
                      </span>
                      <Badge tone="critical">{s.severity}</Badge>
                    </div>
                    <p className="mt-1 text-[11.5px] leading-relaxed text-ink-mid">
                      {s.description}
                    </p>
                    <p className="mt-1.5 font-mono text-micro uppercase text-ink-lo">
                      Evidence — {s.underlying_data_citation}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      )}

      <StageNav
        back="detect"
        next="interventions"
        nextLabel="Review interventions"
        nextDisabled={!data}
      />
    </>
  );
}
