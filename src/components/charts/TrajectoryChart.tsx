"use client";

import {
  Area,
  ComposedChart,
  CartesianGrid,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface TrajectoryPoint {
  month: number;
  planned: number;
  actual?: number | null;
}

/** Planned trajectory (solid, from the approved plan) against actuals
 *  (dashed, only drawn where a real reading exists). */
export function TrajectoryChart({
  data,
  unitLabel,
}: {
  data: TrajectoryPoint[];
  unitLabel: string;
}) {
  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 20, left: 4 }}>
          <defs>
            <linearGradient id="plannedFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4CC9E8" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#4CC9E8" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#1E3554" strokeDasharray="2 4" />
          <XAxis
            dataKey="month"
            stroke="#61789A"
            tick={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
            label={{
              value: "Months from approval",
              position: "insideBottom",
              offset: -12,
              fill: "#61789A",
              fontSize: 11,
            }}
          />
          <YAxis
            stroke="#61789A"
            tick={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
            width={62}
          />
          <Tooltip
            contentStyle={{
              background: "#101E33",
              border: "1px solid #1E3554",
              borderRadius: 10,
              fontSize: 11,
            }}
            formatter={(v: number) => [`${v.toLocaleString("en-IN")} ${unitLabel}`, ""]}
          />
          <Legend wrapperStyle={{ fontSize: 11, fontFamily: "var(--font-mono)" }} />
          <Area
            type="monotone"
            dataKey="planned"
            name="Planned"
            stroke="#4CC9E8"
            strokeWidth={1.8}
            fill="url(#plannedFill)"
          />
          <Line
            type="monotone"
            dataKey="actual"
            name="Actual"
            stroke="#F0A63C"
            strokeWidth={2}
            strokeDasharray="5 3"
            dot={{ r: 3 }}
            connectNulls={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
