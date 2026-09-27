"use client";

import * as React from "react";
import { ShieldCheck } from "lucide-react";
import { StageHeader, StageNav } from "./StageHeader";
import { PlanRadar } from "@/components/charts/PlanRadar";
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
  Textarea,
} from "@/components/ui/primitives";
import { describeError } from "@/lib/api/client";
import { createImplementationPlan, getProvenance } from "@/lib/api/nexus";
import { persistDecision } from "@/lib/api/decisions";
import { NotConnectedError } from "@/lib/api/monitoring";
import { useNexus } from "@/lib/store";
import { crore, inr, months } from "@/lib/format";
import type { Portfolio, ProvenanceAudit } from "@/lib/types";

export function Decide() {
  const {
    portfolios,
    comparedPortfolioIds,
    toggleCompare,
    approvedPlan,
    setApprovedPlan,
    decision,
    setDecision,
  } = useNexus();

  const [choice, setChoice] = React.useState<string | null>(null);
  const [approver, setApprover] = React.useState("");
  const [rationale, setRationale] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [audit, setAudit] = React.useState<ProvenanceAudit | null>(null);

  const compared: Portfolio[] = portfolios.filter((p) =>
    comparedPortfolioIds.includes(p.id),
  );
  const selected = portfolios.find((p) => p.id === choice) ?? null;

  const approve = async () => {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      const plan = await createImplementationPlan(selected.id);
      setApprovedPlan(plan);

      try {
        const prov = await getProvenance(selected.id);
        setAudit(prov);
      } catch {
        setAudit(null); // audit is supplementary; a miss must not block approval
      }

      const record = {
        portfolioId: selected.id,
        portfolioName: selected.name,
        approvedBy: approver.trim() || "Unnamed officer",
        rationale: rationale.trim(),
        approvedAt: new Date().toISOString(),
        persisted: false,
      };
      try {
        setDecision(await persistDecision(record));
      } catch (e) {
        if (e instanceof NotConnectedError) setDecision(record);
        else throw e;
      }
    } catch (e) {
      setError(describeError(e));
    } finally {
      setBusy(false);
    }
  };

  if (portfolios.length === 0) {
    return (
      <>
        <StageHeader id="decide" lede="Compare the plans you shortlisted and approve one." />
        <Empty
          title="No plans to compare"
          body="Generate plans in the optimization step first, then mark two or three for comparison."
        />
        <StageNav back="optimize" />
      </>
    );
  }

  return (
    <>
      <StageHeader
        id="decide"
        lede="Put the shortlisted plans side by side, pick the one you can defend, and record why. The approved plan becomes the baseline that monitoring measures against."
      >
        <Origin kind="entered" />
      </StageHeader>

      <div className="space-y-4">
        {compared.length === 0 ? (
          <Panel eyebrow="Shortlist" title="Choose plans to compare">
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {portfolios.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => toggleCompare(p.id)}
                    className="w-full rounded-lg border border-hair bg-abyss/50 p-3 text-left transition-colors hover:border-observed"
                  >
                    <span className="block text-[13px] font-medium text-ink-hi">
                      {p.name}
                    </span>
                    <span className="mt-1 block font-mono text-[11px] text-ink-mid">
                      {crore(p.total_cost_inr)} · impact{" "}
                      {p.water_security_score.toFixed(2)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </Panel>
        ) : (
          <>
            <Panel
              eyebrow="Side by side"
              title="How the shortlisted plans differ"
              actions={
                <Badge tone="entered">{compared.length} of 3 slots used</Badge>
              }
            >
              <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] border-collapse text-left">
                    <thead>
                      <tr className="border-b border-hair">
                        <th className="rule-label py-2 pr-3 font-normal">Measure</th>
                        {compared.map((p) => (
                          <th key={p.id} className="py-2 pr-3">
                            <span className="block text-[12.5px] font-medium text-ink-hi">
                              {p.name}
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleCompare(p.id)}
                              className="font-mono text-micro uppercase text-ink-lo hover:text-critical"
                            >
                              Remove
                            </button>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <Row
                        label="Total cost"
                        cells={compared.map((p) => inr(p.total_cost_inr))}
                      />
                      <Row
                        label="Water security score"
                        cells={compared.map((p) => p.water_security_score.toFixed(2))}
                      />
                      <Row
                        label="Interventions"
                        cells={compared.map((p) => String(p.intervention_count))}
                      />
                      <Row
                        label="Jobs created"
                        cells={compared.map((p) =>
                          p.jobs_created.toLocaleString("en-IN"),
                        )}
                      />
                      <Row
                        label="Longest delivery"
                        cells={compared.map((p) =>
                          months(
                            Math.max(
                              0,
                              ...p.interventions.map(
                                (i) => i.implementation_time_months ?? 0,
                              ),
                            ),
                          ),
                        )}
                      />
                      <Row
                        label="Highest risk item"
                        cells={compared.map(
                          (p) =>
                            ["LOW", "MEDIUM", "HIGH"]
                              .filter((r) =>
                                p.interventions.some(
                                  (i) => i.risk_level?.toUpperCase() === r,
                                ),
                              )
                              .pop() ?? "—",
                        )}
                      />
                      <Row
                        label="SDGs covered"
                        cells={compared.map((p) => String(p.sdg_count))}
                      />
                    </tbody>
                  </table>
                </div>

                <div>
                  <PlanRadar plans={compared} />
                  <p className="mt-1 text-center text-[11px] leading-relaxed text-ink-lo">
                    Normalised against the shortlist. Cost and duration are inverted,
                    so further from the centre is always better.
                  </p>
                </div>
              </div>
            </Panel>

            <Panel eyebrow="Approval" title="Select and approve a plan">
              <div className="space-y-3.5">
                <div className="grid gap-2 sm:grid-cols-3">
                  {compared.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setChoice(p.id)}
                      className={`rounded-lg border p-3 text-left transition-colors ${
                        choice === p.id
                          ? "border-inferred bg-inferred/10"
                          : "border-hair bg-abyss/50 hover:border-hairlit"
                      }`}
                    >
                      <span className="block text-[13px] font-medium text-ink-hi">
                        {p.name}
                      </span>
                      <span className="mt-0.5 block font-mono text-[11px] text-ink-mid">
                        {crore(p.total_cost_inr)}
                      </span>
                      {choice === p.id && (
                        <span className="mt-1.5 inline-block font-mono text-micro uppercase text-inferred">
                          Selected
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                <div className="grid gap-3 sm:grid-cols-[220px_1fr]">
                  <Field label="Approving officer">
                    <Input
                      value={approver}
                      onChange={(e) => setApprover(e.target.value)}
                      placeholder="Name and designation"
                    />
                  </Field>
                  <Field
                    label="Reason for this choice"
                    hint="Recorded with the plan so the decision can be explained later."
                  >
                    <Textarea
                      rows={2}
                      value={rationale}
                      onChange={(e) => setRationale(e.target.value)}
                      placeholder="Highest coverage of the northern blocks within the sanctioned amount, and no land acquisition required."
                    />
                  </Field>
                </div>

                {error && <ErrorNote message={error} />}
                {busy && <Loading label="Generating the implementation plan" />}

                <Button
                  variant="accent"
                  disabled={!selected || busy}
                  onClick={approve}
                >
                  <ShieldCheck className="h-4 w-4" />
                  Approve {selected ? selected.name : "a plan"}
                </Button>
              </div>
            </Panel>
          </>
        )}

        {approvedPlan && (
          <Panel
            eyebrow="Approved"
            title={approvedPlan.portfolio_name}
            actions={
              decision && !decision.persisted ? (
                <Badge tone="critical">Held in this session only</Badge>
              ) : (
                <Badge tone="ok">Approved</Badge>
              )
            }
          >
            <div className="grid gap-3 sm:grid-cols-3">
              <Info label="Total cost" value={inr(approvedPlan.total_cost_inr)} />
              <Info
                label="Duration"
                value={months(approvedPlan.total_duration_months)}
              />
              <Info
                label="Approved by"
                value={decision?.approvedBy ?? "—"}
              />
            </div>

            {decision && !decision.persisted && (
              <p className="mt-3 rounded-lg border border-elevated/40 bg-elevated/10 px-3 py-2 text-[11.5px] leading-relaxed text-ink-hi">
                The implementation plan came from the backend, but the approval
                record itself has nowhere to be stored yet — there is no decisions
                endpoint. It will be lost when you reload. Export or note it before
                leaving this screen.
              </p>
            )}

            <h3 className="rule-label mt-4 mb-2">Delivery sequence</h3>
            <ol className="space-y-2">
              {approvedPlan.intervention_sequence.map((step, i) => (
                <li
                  key={`${step.intervention_id}-${i}`}
                  className="from-inferred rounded-lg border border-hair bg-abyss/50 p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[13px] font-medium text-ink-hi">
                      {step.intervention_name}
                    </span>
                    <Badge>Phase {step.phase} — {step.phase_name}</Badge>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-ink-mid">
                    <span>{months(step.duration_months)}</span>
                    <span>{inr(step.estimated_cost_inr)}</span>
                    <span>{step.responsible_stakeholder}</span>
                  </div>
                  {step.key_milestones.length > 0 && (
                    <ul className="mt-2 list-inside list-disc text-[11.5px] leading-relaxed text-ink-mid">
                      {step.key_milestones.map((m) => (
                        <li key={m}>{m}</li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ol>

            {audit && (
              <div className="mt-4 rounded-lg border border-hair bg-abyss/50 p-3">
                <div className="rule-label mb-2">Audit trail</div>
                <dl className="space-y-1.5 text-[11.5px]">
                  <AuditRow label="Optimizer" value={audit.optimizer_engine} />
                  <AuditRow label="Confidence" value={audit.confidence_score} />
                  <AuditRow
                    label="Scenes used"
                    value={
                      audit.earth_observation_scene_ids.join(", ") || "Not recorded"
                    }
                  />
                </dl>
              </div>
            )}
          </Panel>
        )}
      </div>

      <StageNav
        back="optimize"
        next="monitor"
        nextLabel="Set up monitoring"
        nextDisabled={!approvedPlan}
        nextBlockedReason={!approvedPlan ? "Approve a plan to continue." : undefined}
      />
    </>
  );
}

function Row({ label, cells }: { label: string; cells: string[] }) {
  return (
    <tr className="border-b border-hair/60">
      <td className="rule-label py-2 pr-3">{label}</td>
      {cells.map((c, i) => (
        <td key={i} className="py-2 pr-3 font-mono text-[12px] tabular-nums text-ink-hi">
          {c}
        </td>
      ))}
    </tr>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-hair bg-abyss/50 px-3 py-2">
      <div className="rule-label">{label}</div>
      <div className="mt-0.5 font-display text-[16px] text-ink-hi">{value}</div>
    </div>
  );
}

function AuditRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-0.5 sm:grid-cols-[120px_1fr] sm:gap-3">
      <dt className="rule-label">{label}</dt>
      <dd className="text-ink-hi">{value}</dd>
    </div>
  );
}
