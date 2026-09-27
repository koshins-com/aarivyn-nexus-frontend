"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Cpu, GitCompare } from "lucide-react";
import { StageHeader, StageNav } from "./StageHeader";
import { ParetoChart, toParetoPoints } from "@/components/charts/ParetoChart";
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
import { runOptimizer } from "@/lib/api/nexus";
import { useNexus } from "@/lib/store";
import { cn, crore, inr } from "@/lib/format";
import type { Portfolio } from "@/lib/types";

export function Optimize() {
  const {
    brief,
    portfolios,
    setPortfolios,
    comparedPortfolioIds,
    toggleCompare,
    excludedInterventionIds,
    job,
  } = useNexus();

  const [running, setRunning] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [ranAt, setRanAt] = React.useState<string | null>(null);

  const geographyId = brief.geographyId || brief.district.toLowerCase();

  /* If the master pipeline already produced portfolios, use them rather than
     re-running a 50-generation search for no reason. */
  React.useEffect(() => {
    if (portfolios.length) return;
    const fromJob = job?.result?.optimization?.portfolios;
    if (fromJob?.length) {
      setPortfolios(fromJob);
      setRanAt("from the master pipeline run");
    }
  }, [job, portfolios.length, setPortfolios]);

  const run = async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await runOptimizer({
        geography_id: geographyId,
        budget_limit_inr: brief.budgetInr ?? 0,
        time_horizon_months: brief.timeHorizonMonths,
      });
      setPortfolios(res.portfolios ?? []);
      setRanAt(new Date().toLocaleTimeString("en-IN"));
    } catch (e) {
      setError(describeError(e));
    } finally {
      setRunning(false);
    }
  };

  const points = toParetoPoints(portfolios, comparedPortfolioIds);
  const cheapest = portfolios.length
    ? portfolios.reduce((a, b) => (a.total_cost_inr <= b.total_cost_inr ? a : b))
    : null;
  const strongest = portfolios.length
    ? portfolios.reduce((a, b) =>
        a.water_security_score >= b.water_security_score ? a : b,
      )
    : null;

  return (
    <>
      <StageHeader
        id="optimize"
        lede="NSGA-II searches for combinations that no other combination beats on every measure at once. There is no single best plan here — there are trade-offs, and the choice is yours."
      >
        <Button variant={portfolios.length ? "outline" : "primary"} onClick={run} disabled={running}>
          {running ? "Searching…" : (
            <>
              <Cpu className="h-3.5 w-3.5" />
              {portfolios.length ? "Run again" : "Run optimizer"}
            </>
          )}
        </Button>
      </StageHeader>

      {excludedInterventionIds.length > 0 && (
        <div className="mb-4 rounded-lg border border-inferred/30 bg-inferred/5 px-3.5 py-2.5 text-[12px] leading-relaxed text-ink-mid">
          You excluded {excludedInterventionIds.length} option
          {excludedInterventionIds.length === 1 ? "" : "s"}. The optimizer endpoint
          re-runs its own feasibility filter server-side, so exclusions are applied
          when you review plans below — any plan containing an excluded option is
          marked.
        </div>
      )}

      {running && <Loading label="NSGA-II — 40 individuals over 50 generations" />}
      {error && <ErrorNote message={error} />}

      {!running && !portfolios.length && !error && (
        <Empty
          title="No plans generated yet"
          body="Run the optimizer to search for portfolios that stay inside your budget while trading impact, risk and delivery time against each other."
          action={
            <Button variant="primary" onClick={run}>
              Run optimizer
            </Button>
          }
        />
      )}

      {portfolios.length > 0 && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Plans on the frontier" value={portfolios.length} origin="inferred" />
            <Stat label="Budget ceiling" value={inr(brief.budgetInr)} origin="entered" />
            <Stat
              label="Lowest cost plan"
              value={cheapest ? crore(cheapest.total_cost_inr) : "—"}
              origin="inferred"
              accent="#4CC9E8"
            />
            <Stat
              label="Highest impact plan"
              value={strongest ? strongest.water_security_score.toFixed(2) : "—"}
              origin="inferred"
              accent="#F0A63C"
            />
          </div>

          <Panel
            eyebrow="Trade-off surface"
            title="Cost against impact"
            actions={<Origin kind="inferred" />}
          >
            <ParetoChart points={points} onSelect={toggleCompare} />
            <p className="mt-2 text-[11.5px] leading-relaxed text-ink-mid">
              Each point is one plan. Point size is jobs created. Moving right buys
              more impact — the frontier shows what that costs. Click any point to
              add it to the comparison, up to three.
              {ranAt && (
                <span className="ml-1 font-mono text-micro uppercase text-ink-lo">
                  · generated {ranAt}
                </span>
              )}
            </p>
          </Panel>

          <Panel
            eyebrow="Plans"
            title="Every feasible portfolio"
            actions={
              <Badge tone="entered">
                <GitCompare className="h-3 w-3" />
                {comparedPortfolioIds.length} comparing
              </Badge>
            }
          >
            <ul className="grid gap-2.5 lg:grid-cols-2 2xl:grid-cols-3">
              {portfolios.map((p, i) => (
                <motion.li
                  key={p.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.04, 0.4), duration: 0.3 }}
                >
                  <PortfolioCard
                    portfolio={p}
                    budget={brief.budgetInr}
                    excluded={excludedInterventionIds}
                    comparing={comparedPortfolioIds.includes(p.id)}
                    onCompare={() => toggleCompare(p.id)}
                  />
                </motion.li>
              ))}
            </ul>
          </Panel>
        </div>
      )}

      <StageNav
        back="interventions"
        next="decide"
        nextLabel="Compare and decide"
        nextDisabled={portfolios.length === 0}
        nextBlockedReason={
          portfolios.length === 0 ? "Generate plans to continue." : undefined
        }
      />
    </>
  );
}

function PortfolioCard({
  portfolio,
  budget,
  excluded,
  comparing,
  onCompare,
}: {
  portfolio: Portfolio;
  budget: number | null;
  excluded: string[];
  comparing: boolean;
  onCompare: () => void;
}) {
  const conflicts = portfolio.interventions.filter((i) => excluded.includes(i.id));
  const share = budget ? portfolio.total_cost_inr / budget : 0;

  return (
    <div
      className={cn(
        "flex h-full flex-col rounded-lg border bg-abyss/50 p-3.5 transition-colors",
        comparing ? "border-inferred" : "border-hair hover:border-hairlit",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-[13.5px] font-medium text-ink-hi">{portfolio.name}</h3>
          <p className="text-[11.5px] text-ink-mid">{portfolio.focus}</p>
        </div>
        <Button
          size="sm"
          variant={comparing ? "accent" : "ghost"}
          onClick={onCompare}
        >
          {comparing ? "Comparing" : "Compare"}
        </Button>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-2">
        <Cell label="Cost" value={crore(portfolio.total_cost_inr)} tone="#4CC9E8" />
        <Cell
          label="Water security"
          value={portfolio.water_security_score.toFixed(2)}
          tone="#F0A63C"
        />
        <Cell label="Interventions" value={String(portfolio.intervention_count)} />
        <Cell
          label="Jobs"
          value={portfolio.jobs_created.toLocaleString("en-IN")}
        />
      </dl>

      {budget !== null && budget > 0 && (
        <div className="mt-3">
          <div className="mb-1 flex items-baseline justify-between">
            <span className="rule-label">Budget used</span>
            <span className="font-mono text-[11px] tabular-nums text-ink-mid">
              {(share * 100).toFixed(0)}%
            </span>
          </div>
          <Meter
            value={share}
            max={1}
            color={share > 1 ? "#FF5C6C" : share > 0.85 ? "#F5D160" : "#3FD79A"}
          />
        </div>
      )}

      <ul className="mt-3 space-y-1 border-t border-hair pt-2.5">
        {portfolio.interventions.slice(0, 4).map((i) => (
          <li
            key={i.id}
            className="flex items-baseline justify-between gap-2 text-[11.5px]"
          >
            <span className="truncate text-ink-mid">{i.name}</span>
            <span className="shrink-0 font-mono text-[10.5px] tabular-nums text-ink-lo">
              {crore(i.cost_inr)}
            </span>
          </li>
        ))}
        {portfolio.interventions.length > 4 && (
          <li className="font-mono text-micro uppercase text-ink-lo">
            +{portfolio.interventions.length - 4} more
          </li>
        )}
      </ul>

      {conflicts.length > 0 && (
        <p className="mt-2.5 rounded border border-elevated/40 bg-elevated/10 px-2 py-1.5 text-[11px] leading-relaxed text-elevated">
          Includes {conflicts.length} option{conflicts.length === 1 ? "" : "s"} you
          excluded: {conflicts.map((c) => c.name).join(", ")}
        </p>
      )}

      {portfolio.sdg_alignments.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1">
          {portfolio.sdg_alignments.slice(0, 5).map((s) => (
            <Badge key={s}>{s}</Badge>
          ))}
        </div>
      )}
    </div>
  );
}

function Cell({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="rounded border border-hair bg-hull/50 px-2 py-1.5">
      <dt className="rule-label">{label}</dt>
      <dd
        className="font-display text-[15px] tabular-nums text-ink-hi"
        style={tone ? { color: tone } : undefined}
      >
        {value}
      </dd>
    </div>
  );
}
