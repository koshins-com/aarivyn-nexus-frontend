"use client";

import * as React from "react";
import { Download, RefreshCw } from "lucide-react";
import { StageHeader, StageNav } from "./StageHeader";
import { TrajectoryChart } from "@/components/charts/TrajectoryChart";
import {
  Badge,
  Button,
  Empty,
  ErrorNote,
  Origin,
  Panel,
  Stat,
} from "@/components/ui/primitives";
import {
  NotConnectedError,
  fetchActualOutcomes,
  plannedTrajectory,
  requestReoptimization,
  type OutcomeReading,
} from "@/lib/api/monitoring";
import { useNexus } from "@/lib/store";
import { describeError } from "@/lib/api/client";
import { inr, months } from "@/lib/format";

export function Monitor() {
  const { approvedPlan, decision, brief, goTo } = useNexus();
  const [actuals, setActuals] = React.useState<OutcomeReading[]>([]);
  const [notConnected, setNotConnected] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!approvedPlan) return;
    fetchActualOutcomes(approvedPlan.portfolio_id)
      .then(setActuals)
      .catch((e) => {
        if (e instanceof NotConnectedError) setNotConnected(e.endpoint);
        else setError(describeError(e));
      });
  }, [approvedPlan]);

  if (!approvedPlan) {
    return (
      <>
        <StageHeader
          id="monitor"
          lede="Track what the approved plan promised against what is actually happening on the ground."
        />
        <Empty
          title="Nothing to monitor yet"
          body="Approve a plan first. Its schedule becomes the baseline that field reporting and fresh satellite passes are measured against."
          action={
            <Button variant="outline" onClick={() => goTo("decide")}>
              Go to decision
            </Button>
          }
        />
        <StageNav back="decide" />
      </>
    );
  }

  const planned = plannedTrajectory(approvedPlan);
  const spendSeries = planned.map((p) => ({
    month: p.month,
    planned: Number((p.plannedSpendInr / 1e7).toFixed(2)),
    actual: null as number | null,
  }));

  const exportBaseline = () => {
    const payload = {
      approved_plan: approvedPlan,
      decision,
      brief: {
        problem: brief.problem,
        region: [brief.city, brief.district, brief.state].filter(Boolean).join(", "),
        budget_inr: brief.budgetInr,
        time_horizon_months: brief.timeHorizonMonths,
        constraints: brief.constraints,
      },
      exported_at: new Date().toISOString(),
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `nexus-baseline-${approvedPlan.portfolio_id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const reoptimize = async () => {
    try {
      await requestReoptimization(approvedPlan.portfolio_id);
    } catch (e) {
      if (e instanceof NotConnectedError) {
        goTo("intake");
        return;
      }
      setError(describeError(e));
    }
  };

  return (
    <>
      <StageHeader
        id="monitor"
        lede="The approved schedule is the baseline. As field reports and new satellite passes arrive, the gap between planned and actual is what tells you whether to re-plan."
      >
        <Button variant="ghost" onClick={exportBaseline}>
          <Download className="h-3.5 w-3.5" />
          Export baseline
        </Button>
      </StageHeader>

      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat
            label="Plan under monitoring"
            value={approvedPlan.portfolio_name}
            origin="inferred"
          />
          <Stat
            label="Committed spend"
            value={inr(approvedPlan.total_cost_inr)}
            origin="inferred"
          />
          <Stat
            label="Planned duration"
            value={months(approvedPlan.total_duration_months)}
            origin="inferred"
          />
          <Stat
            label="Actual readings"
            value={actuals.length}
            origin="observed"
            accent={actuals.length ? "#3FD79A" : "#61789A"}
          />
        </div>

        <Panel
          eyebrow="Baseline"
          title="Planned spend against actual"
          actions={<Origin kind="inferred" />}
        >
          <TrajectoryChart data={spendSeries} unitLabel="Cr" />
          <p className="mt-2 text-[11.5px] leading-relaxed text-ink-mid">
            The solid line is what the approved plan commits to, phase by phase. The
            dashed line stays empty until real disbursement figures are reported —
            an empty actual line means no data, not zero spend.
          </p>
        </Panel>

        {error && <ErrorNote message={error} />}

        {notConnected && (
          <Panel eyebrow="Not yet available" title="Outcome reporting is not connected">
            <p className="text-[12.5px] leading-relaxed text-ink-hi">
              NEXUS has no endpoint yet at{" "}
              <code className="rounded bg-abyss/70 px-1.5 py-0.5 font-mono text-[11.5px] text-observed">
                {notConnected}
              </code>
              , so there are no actual outcomes to plot. Rather than show an
              estimate, this panel stays empty until the backend can supply real
              readings.
            </p>
            <p className="mt-2 text-[12px] leading-relaxed text-ink-mid">
              The frontend contract is already defined in{" "}
              <code className="font-mono text-[11.5px] text-ink-hi">
                src/lib/api/monitoring.ts
              </code>
              . Wiring it up means replacing two function bodies.
            </p>
          </Panel>
        )}

        {approvedPlan.monitoring_indicators.length > 0 && (
          <Panel
            eyebrow="What to watch"
            title="Indicators the plan will be judged on"
            actions={<Origin kind="inferred" />}
          >
            <ul className="grid gap-2 sm:grid-cols-2">
              {approvedPlan.monitoring_indicators.map((ind, i) => (
                <li
                  key={i}
                  className="rounded-lg border border-hair bg-abyss/50 p-3 text-[12px] text-ink-hi"
                >
                  {Object.entries(ind).map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-3 py-0.5">
                      <span className="rule-label">{k.replace(/_/g, " ")}</span>
                      <span className="font-mono text-[11.5px] tabular-nums">
                        {String(v)}
                      </span>
                    </div>
                  ))}
                </li>
              ))}
            </ul>
          </Panel>
        )}

        <Panel eyebrow="Re-plan" title="When the ground changes">
          <p className="text-[12.5px] leading-relaxed text-ink-mid">
            If conditions shift — a failed monsoon, a revised sanction, an
            intervention that underdelivers — run the pipeline again with the new
            numbers. The previous approval stays on record as the baseline you are
            departing from.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="accent" onClick={reoptimize}>
              <RefreshCw className="h-3.5 w-3.5" />
              Re-run with updated conditions
            </Button>
            <Badge tone="entered">Returns you to the brief</Badge>
          </div>
        </Panel>
      </div>

      <StageNav back="decide" />
    </>
  );
}
