"use client";

import * as React from "react";
import {
  CartesianGrid,
  Legend,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
  ResponsiveContainer,
} from "recharts";
import type { Portfolio } from "@/lib/types";
import { crore } from "@/lib/format";

export interface ParetoPoint {
  id: string;
  name: string;
  costCr: number;
  impact: number;
  jobs: number;
  interventions: number;
  compared: boolean;
}

export function toParetoPoints(
  portfolios: Portfolio[],
  compared: string[],
): ParetoPoint[] {
  return portfolios.map((p) => ({
    id: p.id,
    name: p.name,
    costCr: p.cost_crores ?? p.total_cost_inr / 1e7,
    impact: p.water_security_score,
    jobs: p.jobs_created,
    interventions: p.intervention_count,
    compared: compared.includes(p.id),
  }));
}

/**
 * Cost against impact, with jobs encoded as point size. Every plan the
 * optimizer returned is non-dominated, so the frontier is the shape of the
 * trade-off, not a ranking.
 */
export function ParetoChart({
  points,
  onSelect,
}: {
  points: ParetoPoint[];
  onSelect: (id: string) => void;
}) {
  const compared = points.filter((p) => p.compared);
  const rest = points.filter((p) => !p.compared);

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer>
        <ScatterChart margin={{ top: 10, right: 16, bottom: 26, left: 6 }}>
          <CartesianGrid stroke="#1E3554" strokeDasharray="2 4" />
          <XAxis
            type="number"
            dataKey="costCr"
            name="Cost"
            unit=" Cr"
            stroke="#61789A"
            tick={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
            label={{
              value: "Total cost (₹ crore)",
              position: "insideBottom",
              offset: -16,
              fill: "#61789A",
              fontSize: 11,
            }}
          />
          <YAxis
            type="number"
            dataKey="impact"
            name="Impact"
            stroke="#61789A"
            tick={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
            label={{
              value: "Water security score",
              angle: -90,
              position: "insideLeft",
              fill: "#61789A",
              fontSize: 11,
            }}
          />
          <ZAxis type="number" dataKey="jobs" range={[60, 420]} name="Jobs" />
          <Tooltip content={<ParetoTooltip />} cursor={{ stroke: "#2C4A73" }} />
          <Legend
            verticalAlign="top"
            height={26}
            wrapperStyle={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
          />
          <Scatter
            name="Feasible plans"
            data={rest}
            fill="#4CC9E8"
            fillOpacity={0.55}
            stroke="#4CC9E8"
            onClick={(d: unknown) => onSelect((d as ParetoPoint).id)}
            cursor="pointer"
          />
          <Scatter
            name="Comparing"
            data={compared}
            fill="#F0A63C"
            stroke="#F0A63C"
            onClick={(d: unknown) => onSelect((d as ParetoPoint).id)}
            cursor="pointer"
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

function ParetoTooltip({ payload }: { payload?: Array<{ payload: ParetoPoint }> }) {
  const p = payload?.[0]?.payload;
  if (!p) return null;
  return (
    <div className="rounded-lg border border-hair bg-panel px-3 py-2 shadow-panel">
      <div className="font-display text-[13px] text-ink-hi">{p.name}</div>
      <dl className="mt-1.5 space-y-0.5 font-mono text-[11px] text-ink-mid">
        <div>Cost — {crore(p.costCr * 1e7)}</div>
        <div>Water security — {p.impact.toFixed(2)}</div>
        <div>Jobs — {p.jobs.toLocaleString("en-IN")}</div>
        <div>Interventions — {p.interventions}</div>
      </dl>
      <div className="mt-1.5 font-mono text-micro uppercase text-observed">
        Click to compare
      </div>
    </div>
  );
}
