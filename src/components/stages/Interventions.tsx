"use client";

import * as React from "react";
import { Check, Filter, X } from "lucide-react";
import { StageHeader, StageNav } from "./StageHeader";
import {
  Badge,
  Button,
  Empty,
  ErrorNote,
  Loading,
  Meter,
  Origin,
  Panel,
  Stat,
} from "@/components/ui/primitives";
import { describeError } from "@/lib/api/client";
import { filterFeasibility, listInterventions } from "@/lib/api/nexus";
import { useNexus } from "@/lib/store";
import { cn, inr, months, riskColor } from "@/lib/format";
import type { InterventionCard, InterventionFilterResult } from "@/lib/types";

export function Interventions() {
  const {
    brief,
    catalogue,
    setCatalogue,
    feasibility,
    setFeasibility,
    excludedInterventionIds,
    toggleExclusion,
  } = useNexus();

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [showRejected, setShowRejected] = React.useState(false);

  const geographyId = brief.geographyId || brief.district.toLowerCase();

  React.useEffect(() => {
    let alive = true;
    setLoading(true);
    (async () => {
      try {
        const [cards, feas] = await Promise.all([
          listInterventions(),
          filterFeasibility({
            candidate_intervention_ids: [],
            geography_id: geographyId,
            budget_limit_inr: brief.budgetInr ?? 0,
            time_horizon_months: brief.timeHorizonMonths,
            max_risk_level: brief.maxRiskLevel,
          }),
        ]);
        if (!alive) return;
        setCatalogue(cards);
        setFeasibility(feas);
        setError(null);
      } catch (e) {
        if (alive) setError(describeError(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geographyId, brief.budgetInr, brief.timeHorizonMonths, brief.maxRiskLevel]);

  const matrixById = React.useMemo(
    () =>
      Object.fromEntries(
        (feasibility?.filter_matrix ?? []).map((m) => [m.intervention_id, m]),
      ) as Record<string, InterventionFilterResult>,
    [feasibility],
  );

  const viable = feasibility?.viable_interventions ?? [];
  const rejected = (catalogue ?? []).filter(
    (c) => matrixById[c.id] && !matrixById[c.id].passed_all,
  );

  const included = viable.filter((v) => !excludedInterventionIds.includes(v.id));
  const includedCost = included.reduce((a, i) => a + i.cost_inr, 0);
  const overBudget = brief.budgetInr !== null && includedCost > brief.budgetInr;

  return (
    <>
      <StageHeader
        id="interventions"
        lede="Every option the knowledge graph holds, checked against your budget, timeline and risk appetite. Exclude anything that will not work here — the optimizer only sees what you keep."
      >
        <Origin kind="inferred" />
      </StageHeader>

      {loading && <Loading label="Filtering the intervention catalogue" />}
      {error && <ErrorNote message={error} />}

      {feasibility && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Stat
              label="Options in catalogue"
              value={feasibility.total_candidates}
              origin="observed"
            />
            <Stat
              label="Passed all filters"
              value={feasibility.viable_candidates_count}
              origin="inferred"
              accent="#3FD79A"
            />
            <Stat
              label="You kept"
              value={included.length}
              origin="entered"
            />
            <Stat
              label="Cost if all kept"
              value={inr(includedCost)}
              origin="inferred"
              accent={overBudget ? "#FF5C6C" : undefined}
            />
          </div>

          {overBudget && (
            <div className="rounded-lg border border-elevated/40 bg-elevated/10 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-ink-hi">
              Selecting every option costs {inr(includedCost)}, which is above your{" "}
              {inr(brief.budgetInr)} ceiling. That is expected — the optimizer picks
              affordable combinations from this pool rather than taking all of it.
            </div>
          )}

          <Panel
            eyebrow="Candidates"
            title="Interventions that fit your constraints"
            actions={
              <Badge tone="entered">
                {included.length} of {viable.length} kept
              </Badge>
            }
          >
            {viable.length === 0 ? (
              <Empty
                title="Nothing passed the filters"
                body="No intervention fits this budget, timeline and risk level together. Raising any one of the three usually opens the field."
              />
            ) : (
              <ul className="grid gap-2.5 lg:grid-cols-2">
                {viable.map((card) => (
                  <li key={card.id}>
                    <CandidateCard
                      card={card}
                      excluded={excludedInterventionIds.includes(card.id)}
                      onToggle={() => toggleExclusion(card.id)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {rejected.length > 0 && (
            <Panel
              eyebrow="Filtered out"
              title={`${rejected.length} options ruled out`}
              actions={
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowRejected((s) => !s)}
                >
                  <Filter className="h-3.5 w-3.5" />
                  {showRejected ? "Hide" : "Show why"}
                </Button>
              }
            >
              {showRejected ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] border-collapse text-left">
                    <thead>
                      <tr className="border-b border-hair">
                        {["Intervention", "Area", "Budget", "Time", "Risk", "Reason"].map(
                          (h) => (
                            <th key={h} className="rule-label py-2 pr-3 font-normal">
                              {h}
                            </th>
                          ),
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {rejected.map((c) => {
                        const m = matrixById[c.id];
                        return (
                          <tr key={c.id} className="border-b border-hair/60">
                            <td className="py-2 pr-3 text-[12.5px] text-ink-hi">
                              {c.name}
                            </td>
                            <PassCell ok={m.geographic_filter_pass} />
                            <PassCell ok={m.budget_filter_pass} />
                            <PassCell ok={m.time_filter_pass} />
                            <PassCell ok={m.risk_filter_pass} />
                            <td className="py-2 pr-3 text-[11.5px] leading-relaxed text-ink-mid">
                              {m.failure_reasons.join("; ") || "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-[12.5px] text-ink-mid">
                  These failed at least one of the four checks. Open the table to see
                  which one, and why.
                </p>
              )}
            </Panel>
          )}
        </div>
      )}

      <StageNav
        back="gap"
        next="optimize"
        nextLabel="Build plans"
        nextDisabled={included.length === 0}
        nextBlockedReason={
          included.length === 0 ? "Keep at least one intervention." : undefined
        }
      />
    </>
  );
}

function PassCell({ ok }: { ok: boolean }) {
  return (
    <td className="py-2 pr-3">
      {ok ? (
        <Check className="h-3.5 w-3.5 text-nominal" aria-label="passed" />
      ) : (
        <X className="h-3.5 w-3.5 text-critical" aria-label="failed" />
      )}
    </td>
  );
}

function CandidateCard({
  card,
  excluded,
  onToggle,
}: {
  card: InterventionCard;
  excluded: boolean;
  onToggle: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <div
      className={cn(
        "h-full rounded-lg border bg-abyss/50 transition-colors",
        excluded ? "border-hair opacity-45" : "border-hairlit",
      )}
    >
      <div className="flex items-start gap-3 p-3.5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="text-[13.5px] font-medium text-ink-hi">{card.name}</h3>
            <Badge>{card.category}</Badge>
          </div>
          <p className="mt-1 text-[11.5px] leading-relaxed text-ink-mid">
            {card.description}
          </p>

          <dl className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5 sm:grid-cols-4">
            <Metric label="Cost" value={inr(card.cost_inr)} />
            <Metric label="Delivery" value={months(card.implementation_time_months)} />
            <Metric
              label="Risk"
              value={card.risk_level}
              color={riskColor(card.risk_level)}
            />
            <Metric label="Jobs" value={card.jobs_created.toLocaleString("en-IN")} />
          </dl>

          <div className="mt-2.5">
            <div className="mb-1 flex items-baseline justify-between">
              <span className="rule-label">Water security contribution</span>
              <span className="font-mono text-[11px] tabular-nums text-observed">
                {card.water_security_score?.toFixed(2)}
              </span>
            </div>
            <Meter
              value={card.water_security_score}
              max={Math.max(1, card.water_security_score)}
            />
          </div>
        </div>

        <Button
          size="sm"
          variant={excluded ? "outline" : "ghost"}
          onClick={onToggle}
          title={excluded ? "Put this back in the pool" : "Remove from the pool"}
        >
          {excluded ? "Include" : "Exclude"}
        </Button>
      </div>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full border-t border-hair px-3.5 py-2 text-left font-mono text-micro uppercase text-ink-lo hover:text-ink-mid"
      >
        {open ? "Hide evidence" : "Evidence & readiness"}
      </button>

      {open && (
        <div className="space-y-2 border-t border-hair px-3.5 py-3">
          <Line
            label="Technology readiness"
            value={`Level ${card.technology_maturity_lvl} of 9`}
          />
          <Line label="Domain" value={card.domain} />
          {card.sdg_alignments.length > 0 && (
            <Line label="SDG alignment" value={card.sdg_alignments.join(", ")} />
          )}
          {card.co_benefits.length > 0 && (
            <Line label="Co-benefits" value={card.co_benefits.join(", ")} />
          )}
          {card.dependencies.length > 0 && (
            <Line label="Depends on" value={card.dependencies.join(", ")} />
          )}
          {Object.keys(card.applicable_conditions ?? {}).length > 0 && (
            <Line
              label="Applies when"
              value={Object.entries(card.applicable_conditions)
                .map(([k, v]) => `${k.replace(/_/g, " ")}: ${String(v)}`)
                .join(" · ")}
            />
          )}
        </div>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div>
      <dt className="rule-label">{label}</dt>
      <dd
        className="font-mono text-[12px] tabular-nums text-ink-hi"
        style={color ? { color } : undefined}
      >
        {value}
      </dd>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-0.5 sm:grid-cols-[140px_1fr] sm:gap-3">
      <span className="rule-label">{label}</span>
      <span className="text-[11.5px] leading-relaxed text-ink-hi">{value}</span>
    </div>
  );
}
