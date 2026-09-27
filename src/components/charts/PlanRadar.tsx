"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import type { Portfolio } from "@/lib/types";

const SERIES = ["#4CC9E8", "#F0A63C", "#3FD79A"];

/**
 * Normalised comparison across the four axes an officer actually weighs.
 * Cost and duration are inverted so that "further out" always means "better",
 * which is stated in the caption so the chart cannot be misread.
 */
export function PlanRadar({ plans }: { plans: Portfolio[] }) {
  if (plans.length === 0) return null;

  const durationOf = (p: Portfolio) =>
    Math.max(
      1,
      ...p.interventions.map((i) => i.implementation_time_months ?? 0),
      1,
    );
  const riskOf = (p: Portfolio) => {
    const w = { LOW: 1, MEDIUM: 2, HIGH: 3 } as Record<string, number>;
    const vals = p.interventions.map((i) => w[i.risk_level?.toUpperCase()] ?? 2);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 2;
  };

  const maxCost = Math.max(...plans.map((p) => p.total_cost_inr), 1);
  const maxImpact = Math.max(...plans.map((p) => p.water_security_score), 1);
  const maxJobs = Math.max(...plans.map((p) => p.jobs_created), 1);
  const maxDur = Math.max(...plans.map(durationOf), 1);

  const axes = [
    { axis: "Impact" },
    { axis: "Value for money" },
    { axis: "Jobs" },
    { axis: "Speed" },
    { axis: "Safety" },
  ] as Array<Record<string, string | number>>;

  plans.forEach((p) => {
    const vals = [
      p.water_security_score / maxImpact,
      1 - p.total_cost_inr / maxCost,
      p.jobs_created / maxJobs,
      1 - durationOf(p) / maxDur,
      1 - (riskOf(p) - 1) / 2,
    ];
    axes.forEach((row, i) => {
      row[p.name] = Number((vals[i] * 100).toFixed(1));
    });
  });

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer>
        <RadarChart data={axes} outerRadius="72%">
          <PolarGrid stroke="#1E3554" />
          <PolarAngleAxis
            dataKey="axis"
            tick={{ fill: "#9FB4CE", fontSize: 11, fontFamily: "var(--font-mono)" }}
          />
          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
          {plans.map((p, i) => (
            <Radar
              key={p.id}
              name={p.name}
              dataKey={p.name}
              stroke={SERIES[i % SERIES.length]}
              fill={SERIES[i % SERIES.length]}
              fillOpacity={0.16}
              strokeWidth={1.8}
            />
          ))}
          <Legend wrapperStyle={{ fontSize: 11, fontFamily: "var(--font-mono)" }} />
          <Tooltip
            contentStyle={{
              background: "#101E33",
              border: "1px solid #1E3554",
              borderRadius: 10,
              fontSize: 11,
            }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
