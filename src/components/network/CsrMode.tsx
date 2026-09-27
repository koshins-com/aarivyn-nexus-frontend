"use client";

import * as React from "react";
import { BadgeIndianRupee, Save } from "lucide-react";
import { NetworkShell } from "./NetworkShell";
import { Cell, Header } from "./NgoMode";
import { ChipSelect, MatchBadge, UnsavedNotice, matchScore } from "./common";
import { PlanRadar } from "@/components/charts/PlanRadar";
import { ParetoChart, toParetoPoints } from "@/components/charts/ParetoChart";
import {
  Badge,
  Button,
  Empty,
  ErrorNote,
  Field,
  Input,
  Loading,
  Meter,
  Origin,
  Panel,
  Stat,
  Textarea,
} from "@/components/ui/primitives";
import { describeError } from "@/lib/api/client";
import { getParetoPortfolios } from "@/lib/api/nexus";
import { submitOnboarding } from "@/lib/api/workspace";
import { commitFunding, type FundingCommitment } from "@/lib/api/network";
import { NotConnectedError } from "@/lib/api/monitoring";
import { SECTORS, uid, useNetwork, type CsrProfile } from "@/lib/network-store";
import { roleById } from "@/lib/roles";
import { crore, inr, months, riskColor } from "@/lib/format";
import type { Portfolio } from "@/lib/types";

const ROLE = roleById("csr")!;

export function CsrMode() {
  const [tab, setTab] = React.useState("profile");
  return (
    <NetworkShell
      role={ROLE}
      active={tab}
      onTab={setTab}
      tabs={[
        { id: "profile", label: "Funding profile" },
        { id: "projects", label: "Projects" },
        { id: "portfolio", label: "What I fund" },
      ]}
    >
      {tab === "profile" && <Profile onDone={() => setTab("projects")} />}
      {tab === "projects" && <Projects />}
      {tab === "portfolio" && <Committed />}
    </NetworkShell>
  );
}

/* ── Funding profile ──────────────────────────────────────────────────────── */

function Profile({ onDone }: { onDone: () => void }) {
  const { csr, setCsr, setWorkspace } = useNetwork();
  const [form, setForm] = React.useState<CsrProfile>(
    csr ?? {
      organization: "",
      funding_program: "",
      available_budget_inr: null,
      focus_areas: [],
      target_geography: "",
      time_horizon_years: 3,
    },
  );
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);

  const set = <K extends keyof CsrProfile>(k: K, v: CsrProfile[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const valid =
    form.organization.trim() &&
    form.target_geography.trim() &&
    (form.available_budget_inr ?? 0) > 0 &&
    form.focus_areas.length > 0;

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const ctx = await submitOnboarding({
        persona: "CSR_FUNDER",
        csr_funder: {
          organization: form.organization,
          funding_program: form.funding_program,
          available_budget_inr: form.available_budget_inr,
          focus_areas: form.focus_areas,
          target_geography: form.target_geography,
          time_horizon_years: form.time_horizon_years,
        },
      });
      setWorkspace(ctx);
      setCsr(form);
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
        title="Your funding envelope"
        lede="How much, for what, and where. Projects are filtered and scored against this — nothing is shown that you could not actually fund."
      />

      <Panel eyebrow="Profile" title="Programme and preferences">
        <div className="space-y-4">
          {error && <ErrorNote message={error} />}

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Organisation" required>
              <Input
                value={form.organization}
                onChange={(e) => set("organization", e.target.value)}
                placeholder="Bharat Industries CSR Trust"
              />
            </Field>
            <Field label="Funding programme">
              <Input
                value={form.funding_program}
                onChange={(e) => set("funding_program", e.target.value)}
                placeholder="Jal Sanchay 2026"
              />
            </Field>
          </div>

          <Field
            label="Funding available"
            required
            hint={
              form.available_budget_inr
                ? `That is ${inr(form.available_budget_inr)}.`
                : "Amount in rupees."
            }
          >
            <Input
              type="number"
              min={0}
              step={100000}
              value={form.available_budget_inr ?? ""}
              onChange={(e) =>
                set(
                  "available_budget_inr",
                  e.target.value ? Number(e.target.value) : null,
                )
              }
              placeholder="50000000"
            />
          </Field>

          <Field label="Preferred sectors" required>
            <ChipSelect
              options={SECTORS}
              value={form.focus_areas.filter((f) => SECTORS.includes(f))}
              onChange={(v) =>
                set("focus_areas", [
                  ...v,
                  ...form.focus_areas.filter((f) => !SECTORS.includes(f)),
                ])
              }
              accent={ROLE.accent}
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Geographic preference" required>
              <Input
                value={form.target_geography}
                onChange={(e) => set("target_geography", e.target.value)}
                placeholder="Madhya Pradesh — Vindhya region"
              />
            </Field>
            <Field label="Commitment horizon" hint="Years.">
              <Input
                type="number"
                min={1}
                max={15}
                value={form.time_horizon_years ?? ""}
                onChange={(e) =>
                  set(
                    "time_horizon_years",
                    e.target.value ? Number(e.target.value) : null,
                  )
                }
              />
            </Field>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary" disabled={!valid || saving} onClick={save}>
              <Save className="h-3.5 w-3.5" />
              {saving ? "Saving…" : "Save profile"}
            </Button>
            {saved && (
              <>
                <Badge tone="ok">Profile active</Badge>
                <Button variant="ghost" onClick={onDone}>
                  See fundable projects
                </Button>
              </>
            )}
          </div>
        </div>
      </Panel>
    </div>
  );
}

/* ── Projects ─────────────────────────────────────────────────────────────── */

function Projects() {
  const { csr, addCommitment, commitments } = useNetwork();
  const [portfolios, setPortfolios] = React.useState<Portfolio[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [compare, setCompare] = React.useState<string[]>([]);
  const [funding, setFunding] = React.useState<Portfolio | null>(null);
  const [affordableOnly, setAffordableOnly] = React.useState(true);

  React.useEffect(() => {
    let alive = true;
    getParetoPortfolios()
      .then((r) => alive && setPortfolios(r.portfolios ?? []))
      .catch((e) => alive && setError(describeError(e)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const budget = csr?.available_budget_inr ?? null;
  const focus = csr?.focus_areas ?? [];

  const scored = portfolios
    .map((p) => ({
      p,
      score: matchScore(focus, [
        p.focus,
        ...p.sdg_alignments,
        ...p.interventions.map((i) => i.domain),
      ]),
      affordable: budget === null || p.total_cost_inr <= budget,
    }))
    .sort((a, b) => b.score - a.score || a.p.total_cost_inr - b.p.total_cost_inr);

  const shown = affordableOnly ? scored.filter((s) => s.affordable) : scored;
  const compared = portfolios.filter((p) => compare.includes(p.id));

  const toggle = (id: string) =>
    setCompare((c) =>
      c.includes(id) ? c.filter((x) => x !== id) : [...c, id].slice(-3),
    );

  return (
    <div className="space-y-4">
      <Header
        title="Projects that need funding"
        lede="Optimizer-verified portfolios, each one a combination that no other beats on every measure at once. Cost, impact, beneficiaries and risk are the backend's own figures."
      />

      {loading && <Loading label="Loading verified projects" />}
      {error && <ErrorNote message={error} />}

      {portfolios.length > 0 && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Projects available" value={portfolios.length} origin="inferred" />
            <Stat
              label="Within your budget"
              value={scored.filter((s) => s.affordable).length}
              origin="inferred"
              accent={ROLE.accent}
            />
            <Stat label="Your envelope" value={inr(budget)} origin="entered" />
            <Stat
              label="Already committed"
              value={inr(commitments.reduce((a, c) => a + c.amountInr, 0))}
              origin="entered"
            />
          </div>

          <Panel
            eyebrow="Trade-off"
            title="What your money buys"
            actions={<Origin kind="inferred" />}
          >
            <ParetoChart
              points={toParetoPoints(portfolios, compare)}
              onSelect={toggle}
            />
            <p className="mt-2 text-[11.5px] leading-relaxed text-ink-mid">
              Each point is a fundable project. Further right costs more; higher up
              delivers more water security. Click to add to your comparison.
            </p>
          </Panel>

          {compared.length >= 2 && (
            <Panel eyebrow="Side by side" title="Comparing your shortlist">
              <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[460px] border-collapse text-left">
                    <thead>
                      <tr className="border-b border-hair">
                        <th className="rule-label py-2 pr-3 font-normal">Measure</th>
                        {compared.map((p) => (
                          <th
                            key={p.id}
                            className="py-2 pr-3 text-[12.5px] font-medium text-ink-hi"
                          >
                            {p.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <Row
                        label="Cost to fund"
                        cells={compared.map((p) => inr(p.total_cost_inr))}
                      />
                      <Row
                        label="Water security gain"
                        cells={compared.map((p) =>
                          p.water_security_score.toFixed(2),
                        )}
                      />
                      <Row
                        label="Jobs created"
                        cells={compared.map((p) =>
                          p.jobs_created.toLocaleString("en-IN"),
                        )}
                      />
                      <Row
                        label="Cost per job"
                        cells={compared.map((p) =>
                          p.jobs_created
                            ? inr(Math.round(p.total_cost_inr / p.jobs_created))
                            : "—",
                        )}
                      />
                      <Row
                        label="SDGs covered"
                        cells={compared.map((p) => String(p.sdg_count))}
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
                    </tbody>
                  </table>
                </div>
                <div>
                  <PlanRadar plans={compared} />
                  <p className="mt-1 text-center text-[11px] text-ink-lo">
                    Normalised across your shortlist. Further out is better on every
                    axis.
                  </p>
                </div>
              </div>
            </Panel>
          )}

          <Panel
            eyebrow="Fundable"
            title={`${shown.length} projects`}
            actions={
              budget !== null && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setAffordableOnly((a) => !a)}
                >
                  {affordableOnly ? "Show all" : "Within budget only"}
                </Button>
              )
            }
          >
            {shown.length === 0 ? (
              <Empty
                title="Nothing fits your envelope"
                body="Every verified project costs more than your available funding. Showing all projects reveals what a larger commitment would reach."
              />
            ) : (
              <ul className="grid gap-2.5 lg:grid-cols-2">
                {shown.map(({ p, score, affordable }) => {
                  const funded = commitments.some((c) => c.portfolioId === p.id);
                  const share = budget ? p.total_cost_inr / budget : 0;
                  return (
                    <li
                      key={p.id}
                      className="rounded-lg border border-hair bg-abyss/50 p-3.5"
                    >
                      <div className="flex flex-wrap items-center gap-1.5">
                        <h3 className="text-[13.5px] font-medium text-ink-hi">
                          {p.name}
                        </h3>
                        {focus.length > 0 && <MatchBadge score={score} />}
                        {!affordable && <Badge tone="critical">Over budget</Badge>}
                        {funded && <Badge tone="ok">Funded by you</Badge>}
                      </div>
                      <p className="mt-1 text-[11.5px] text-ink-mid">{p.focus}</p>

                      <dl className="mt-2.5 grid grid-cols-2 gap-2 font-mono text-[11px] sm:grid-cols-4">
                        <Cell label="Cost" value={crore(p.total_cost_inr)} />
                        <Cell
                          label="Impact"
                          value={p.water_security_score.toFixed(2)}
                        />
                        <Cell
                          label="Jobs"
                          value={p.jobs_created.toLocaleString("en-IN")}
                        />
                        <Cell
                          label="Longest build"
                          value={months(
                            Math.max(
                              0,
                              ...p.interventions.map(
                                (i) => i.implementation_time_months ?? 0,
                              ),
                            ),
                          )}
                        />
                      </dl>

                      {budget !== null && budget > 0 && (
                        <div className="mt-2.5">
                          <div className="mb-1 flex items-baseline justify-between">
                            <span className="rule-label">Share of your funding</span>
                            <span className="font-mono text-[11px] text-ink-mid">
                              {(share * 100).toFixed(0)}%
                            </span>
                          </div>
                          <Meter
                            value={Math.min(share, 1)}
                            color={share > 1 ? "#FF5C6C" : ROLE.accent}
                          />
                        </div>
                      )}

                      <div className="mt-2.5 flex flex-wrap gap-1">
                        {p.sdg_alignments.slice(0, 4).map((s) => (
                          <Badge key={s}>{s}</Badge>
                        ))}
                      </div>

                      <div className="mt-3 flex gap-2">
                        <Button
                          size="sm"
                          variant={compare.includes(p.id) ? "accent" : "ghost"}
                          onClick={() => toggle(p.id)}
                        >
                          {compare.includes(p.id) ? "Comparing" : "Compare"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={funded || !csr}
                          onClick={() => setFunding(p)}
                        >
                          <BadgeIndianRupee className="h-3.5 w-3.5" />
                          {funded ? "Committed" : "Fund this"}
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </>
      )}

      {funding && csr && (
        <FundDialog
          portfolio={funding}
          organization={csr.organization}
          onClose={() => setFunding(null)}
          onSubmit={(r) => {
            addCommitment(r);
            setFunding(null);
          }}
        />
      )}
    </div>
  );
}

function FundDialog({
  portfolio,
  organization,
  onClose,
  onSubmit,
}: {
  portfolio: Portfolio;
  organization: string;
  onClose: () => void;
  onSubmit: (r: FundingCommitment) => void;
}) {
  const [amount, setAmount] = React.useState<number>(portfolio.total_cost_inr);
  const [note, setNote] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const send = async () => {
    setBusy(true);
    const record: FundingCommitment = {
      id: uid(),
      portfolioId: portfolio.id,
      portfolioName: portfolio.name,
      organization,
      amountInr: amount,
      note: note.trim(),
      committedAt: new Date().toISOString(),
      persisted: false,
    };
    try {
      onSubmit(await commitFunding(record));
    } catch (e) {
      if (e instanceof NotConnectedError) onSubmit(record);
      else setError(describeError(e));
    } finally {
      setBusy(false);
    }
  };

  const partial = amount < portfolio.total_cost_inr;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-abyss/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-hair bg-panel shadow-panel">
        <header className="border-b border-hair px-4 py-3">
          <div className="rule-label">Commit funding</div>
          <h3 className="font-display text-[15px] text-ink-hi">{portfolio.name}</h3>
        </header>
        <div className="space-y-3 p-4">
          {error && <ErrorNote message={error} />}
          <Field
            label="Amount"
            hint={`Full cost is ${inr(portfolio.total_cost_inr)}.`}
          >
            <Input
              type="number"
              min={0}
              step={100000}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
          </Field>
          {partial && (
            <p className="text-[11.5px] leading-relaxed text-inferred">
              This is a partial commitment. The remaining{" "}
              {inr(portfolio.total_cost_inr - amount)} would need another funder or
              a government allocation.
            </p>
          )}
          <Field label="Note" hint="Conditions, reporting expectations, contacts.">
            <Textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Quarterly reporting; disbursed against milestone completion."
            />
          </Field>
          <UnsavedNotice endpoint="/api/v1/network/funding" />
        </div>
        <footer className="flex justify-end gap-2 border-t border-hair px-4 py-3">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="accent" disabled={busy || amount <= 0} onClick={send}>
            Commit {inr(amount)}
          </Button>
        </footer>
      </div>
    </div>
  );
}

/* ── Committed portfolio ──────────────────────────────────────────────────── */

function Committed() {
  const { commitments, csr } = useNetwork();
  const total = commitments.reduce((a, c) => a + c.amountInr, 0);
  const remaining = (csr?.available_budget_inr ?? 0) - total;

  return (
    <div className="space-y-4">
      <Header
        title="What you are funding"
        lede="Your commitments and where each project stands. Outcome tracking arrives once the implementing side reports against the plan."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Projects funded" value={commitments.length} origin="entered" />
        <Stat label="Total committed" value={inr(total)} origin="entered" />
        <Stat
          label="Uncommitted"
          value={inr(Math.max(0, remaining))}
          origin="entered"
          accent={remaining < 0 ? "#FF5C6C" : undefined}
        />
      </div>

      <Panel eyebrow="Commitments" title="Funded projects">
        {commitments.length === 0 ? (
          <Empty
            title="Nothing committed yet"
            body="Browse the verified projects and commit funding to one — it will appear here with its outcome tracking."
          />
        ) : (
          <ul className="space-y-2">
            {commitments.map((c) => (
              <li key={c.id} className="rounded-lg border border-hair bg-abyss/50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[13px] font-medium text-ink-hi">
                    {c.portfolioName}
                  </span>
                  <span className="font-mono text-[12px] text-inferred">
                    {inr(c.amountInr)}
                  </span>
                </div>
                <div className="mt-1 font-mono text-micro uppercase text-ink-lo">
                  {new Date(c.committedAt).toLocaleDateString("en-IN")} ·{" "}
                  {c.organization}
                </div>
                {c.note && (
                  <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-mid">
                    {c.note}
                  </p>
                )}
                <p className="mt-2 text-[11.5px] leading-relaxed text-ink-lo">
                  No outcome readings yet — the monitoring endpoint is not
                  connected, so nothing is reported against this commitment.
                </p>
              </li>
            ))}
          </ul>
        )}
        {commitments.length > 0 && (
          <div className="mt-3">
            <UnsavedNotice endpoint="/api/v1/network/funding" />
          </div>
        )}
      </Panel>
    </div>
  );
}

function Row({ label, cells }: { label: string; cells: string[] }) {
  return (
    <tr className="border-b border-hair/60">
      <td className="rule-label py-2 pr-3">{label}</td>
      {cells.map((c, i) => (
        <td
          key={i}
          className="py-2 pr-3 font-mono text-[12px] tabular-nums text-ink-hi"
        >
          {c}
        </td>
      ))}
    </tr>
  );
}
