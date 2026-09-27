"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Radio, Satellite } from "lucide-react";
import { ROLES, type RoleDef } from "@/lib/roles";
import { useNetwork } from "@/lib/network-store";

/**
 * The front door. Routing and workspace-selection behaviour are unchanged —
 * only the presentation. A framed, full-bleed satellite hero carries the
 * question; layered glass instrument panels sit over it; the workspace cards
 * follow immediately below.
 */

const FRONT_PAGE_ROLES: RoleDef[] = ["government", "ngo", "csr", "community"]
  .map((id) => ROLES.find((r) => r.id === id))
  .filter((r): r is RoleDef => Boolean(r));

export function RoleSelect() {
  const setRole = useNetwork((s) => s.setRole);

  return (
    <main className="min-h-dvh bg-abyss p-2 sm:p-3 lg:p-4">
      {/* ── Framed cinematic hero ─────────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden rounded-[20px] border border-hair/80 sm:rounded-[28px]">
        <SatelliteBackdrop />

        <div className="relative z-10 flex min-h-[78vh] flex-col px-5 pb-8 pt-5 sm:px-8 sm:pb-10 sm:pt-6 lg:min-h-[86vh] lg:px-12">
          <TopNav />

          <div className="flex flex-1 flex-col justify-center py-14 lg:flex-row lg:items-center lg:gap-12 lg:py-16">
            {/* Headline column */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="min-w-0 flex-1"
            >
              <div className="mb-6 inline-flex items-center gap-2.5 rounded-full border border-hairlit/60 bg-hull/40 py-1.5 pl-2.5 pr-3.5 backdrop-blur-md">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-observed opacity-60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-observed" />
                </span>
                <span className="font-mono text-micro uppercase tracking-[0.16em] text-ink-mid">
                  Earth observation · detection · decision support
                </span>
              </div>

              <h1 className="font-display text-[46px] font-medium leading-[0.98] tracking-[-0.025em] text-ink-hi sm:text-[74px] lg:text-[96px]">
                How will you
                <br />
                use{" "}
                <span className="bg-gradient-to-br from-observed via-ink-hi to-inferred bg-clip-text text-transparent">
                  NEXUS?
                </span>
              </h1>

              <div className="mt-8 max-w-[58ch] border-l-2 border-observed/60 pl-5">
                <p className="text-[15px] leading-relaxed text-ink-hi sm:text-[18px]">
                  Everyone works from the same map, the same satellite record and
                  the same project data.
                </p>
                <p className="mt-1.5 text-[15px] leading-relaxed text-ink-mid sm:text-[18px]">
                  What changes is which tools you get — and what you can do with
                  them.
                </p>
              </div>

              <div className="mt-9 flex flex-wrap items-center gap-3">
                <a
                  href="#workspaces"
                  className="group inline-flex items-center gap-2.5 rounded-xl bg-observed px-5 py-3 text-[13.5px] font-semibold text-abyss transition-colors hover:bg-[#6FD8F0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-observed focus-visible:ring-offset-2 focus-visible:ring-offset-abyss"
                >
                  Choose your workspace
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </a>
                <Link
                  href="/workspace"
                  className="inline-flex items-center gap-2 rounded-xl border border-hairlit bg-hull/40 px-5 py-3 text-[13.5px] text-ink-hi backdrop-blur-md transition-colors hover:border-observed"
                >
                  Open the analysis workspace
                </Link>
              </div>
            </motion.div>

            {/* Layered instrument panels */}
            <InstrumentStack />
          </div>

          <HeroFooterRail />
        </div>
      </section>

      {/* ── Workspace selection ───────────────────────────────────────────── */}
      <section
        id="workspaces"
        className="mx-auto max-w-[1240px] scroll-mt-6 px-1 pb-10 pt-12 sm:px-2 sm:pt-16"
      >
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="font-mono text-micro uppercase tracking-[0.18em] text-observed">
              Workspaces
            </div>
            <h2 className="mt-1.5 font-display text-[26px] font-medium leading-tight text-ink-hi sm:text-[32px]">
              Four ways in. One shared evidence base.
            </h2>
          </div>
          <p className="max-w-[42ch] text-[12.5px] leading-relaxed text-ink-lo">
            Your choice sets the workspace context on the backend. You can switch at
            any time from the mode banner — nothing you have entered is lost.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {FRONT_PAGE_ROLES.map((role, i) => (
            <motion.div
              key={role.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ delay: i * 0.06, duration: 0.45, ease: "easeOut" }}
            >
              <RoleCard role={role} onPick={() => setRole(role.id)} />
            </motion.div>
          ))}
        </div>
      </section>
    </main>
  );
}

/* ── Navigation ───────────────────────────────────────────────────────────── */

function TopNav() {
  return (
    <header className="flex items-center gap-6">
      <div className="flex items-baseline gap-3">
        <span className="font-display text-[20px] font-semibold tracking-[0.28em] text-ink-hi">
          NEXUS
        </span>
        <span className="hidden font-mono text-micro uppercase tracking-[0.14em] text-ink-lo sm:inline">
          Geospatial Decision Intelligence
        </span>
      </div>
    </header>
  );
}

/* ── Layered instrument panels ────────────────────────────────────────────── */

function InstrumentStack() {
  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.2, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="mt-12 hidden w-full max-w-[380px] shrink-0 lg:mt-0 lg:block"
    >
      <div className="relative">
        {/* Primary panel — scene readout */}
        <div className="rounded-2xl border border-hair/90 bg-panel/40 p-4 shadow-panel backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 font-mono text-micro uppercase tracking-[0.14em] text-ink-lo">
              <Satellite className="h-3.5 w-3.5 text-observed" />
              Scene readout
            </span>
            <span className="font-mono text-micro uppercase text-nominal">Live</span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            {[
              { k: "Water stress", v: "0.71", c: "#FF9A47" },
              { k: "Vegetation", v: "0.34", c: "#F5D160" },
              { k: "Flood risk", v: "0.12", c: "#3FD79A" },
              { k: "Drawdown", v: "1.8 m/yr", c: "#FF5C6C" },
            ].map((s) => (
              <div
                key={s.k}
                className="rounded-lg border border-hair/80 bg-abyss/50 px-2.5 py-2"
              >
                <div className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-ink-lo">
                  {s.k}
                </div>
                <div
                  className="mt-0.5 font-display text-[17px] tabular-nums"
                  style={{ color: s.c }}
                >
                  {s.v}
                </div>
              </div>
            ))}
          </div>

          <Sparkline />

          <div className="mt-3 flex items-center justify-between border-t border-hair/70 pt-2.5">
            <span className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-ink-lo">
              Sentinel-2 L2A
            </span>
            <span className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-observed">
              4.1% cloud
            </span>
          </div>
        </div>

        {/* Offset panel — detection feed */}
        <div className="mt-3 translate-x-6 rounded-2xl border border-hair/90 bg-panel/35 p-4 shadow-panel backdrop-blur-xl">
          <div className="flex items-center gap-2 font-mono text-micro uppercase tracking-[0.14em] text-ink-lo">
            <Radio className="h-3.5 w-3.5 text-inferred" />
            Detected abnormalities
          </div>
          <ul className="mt-2.5 space-y-2">
            {[
              { t: "Surface hydrologic deficit", s: "ELEVATED", c: "#FF9A47" },
              { t: "Canopy water stress", s: "MODERATE", c: "#F5D160" },
              { t: "Turbidity variance zone", s: "CRITICAL", c: "#FF5C6C" },
            ].map((r) => (
              <li key={r.t} className="flex items-center gap-2.5">
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: r.c }}
                />
                <span className="min-w-0 flex-1 truncate text-[11.5px] text-ink-mid">
                  {r.t}
                </span>
                <span
                  className="shrink-0 font-mono text-[9px] uppercase tracking-[0.1em]"
                  style={{ color: r.c }}
                >
                  {r.s}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Small floating chip */}
        <div className="absolute -left-7 bottom-16 rounded-xl border border-observed/40 bg-hull/70 px-3 py-2 shadow-glow backdrop-blur-xl">
          <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-lo">
            Pareto plans
          </div>
          <div className="font-display text-[19px] tabular-nums text-observed">14</div>
        </div>
      </div>
    </motion.div>
  );
}

function Sparkline() {
  return (
    <svg viewBox="0 0 300 54" className="mt-3 h-[54px] w-full" aria-hidden>
      <defs>
        <linearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4CC9E8" stopOpacity="0.34" />
          <stop offset="100%" stopColor="#4CC9E8" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M0 40 L30 34 L60 37 L90 24 L120 28 L150 16 L180 22 L210 12 L240 19 L270 8 L300 14 L300 54 L0 54 Z"
        fill="url(#spark)"
      />
      <path
        d="M0 40 L30 34 L60 37 L90 24 L120 28 L150 16 L180 22 L210 12 L240 19 L270 8 L300 14"
        fill="none"
        stroke="#4CC9E8"
        strokeWidth="1.4"
      />
      <circle cx="270" cy="8" r="2.6" fill="#4CC9E8" />
    </svg>
  );
}

function HeroFooterRail() {
  const stats = [
    ["Coverage", "Sentinel-1 · 2 · Landsat"],
    ["Optimizer", "NSGA-II multi-objective"],
    ["Provenance", "Tagged on every value"],
    ["Workspaces", "Government · NGO · CSR · Community"],
  ];
  return (
    <div className="grid gap-px overflow-hidden rounded-2xl border border-hair/70 bg-hair/60 backdrop-blur-md sm:grid-cols-2 lg:grid-cols-4">
      {stats.map(([k, v]) => (
        <div key={k} className="bg-hull/50 px-4 py-3">
          <div className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-lo">
            {k}
          </div>
          <div className="mt-0.5 truncate text-[12.5px] text-ink-hi">{v}</div>
        </div>
      ))}
    </div>
  );
}

/* ── Card ─────────────────────────────────────────────────────────────────── */

function RoleCard({ role, onPick }: { role: RoleDef; onPick: () => void }) {
  const href = role.id === "government" ? "/workspace" : `/network/${role.id}`;

  return (
    <Link
      href={href}
      onClick={onPick}
      className="group relative block h-full overflow-hidden rounded-2xl border border-hair/90 bg-panel/45 p-6 backdrop-blur-md transition-[transform,border-color,background-color] duration-300 hover:-translate-y-1 hover:bg-panel/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-observed sm:p-7"
    >
      <span
        className="absolute inset-y-0 left-0 w-[3px] opacity-80 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: role.accent }}
      />
      <span
        className="pointer-events-none absolute -left-24 -top-24 h-56 w-56 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-[0.16]"
        style={{ background: role.accent }}
      />
      <span
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ boxShadow: `inset 0 0 0 1px ${role.accent}55` }}
      />

      <div className="relative">
        <div
          className="font-mono text-micro uppercase tracking-[0.16em]"
          style={{ color: role.accent }}
        >
          {role.verb}
        </div>

        <h3 className="mt-2 font-display text-[22px] font-medium leading-tight text-ink-hi sm:text-[25px]">
          {role.title}
        </h3>

        <p className="mt-2.5 max-w-[46ch] text-[13px] leading-relaxed text-ink-mid">
          {role.blurb}
        </p>

        <ul className="mt-4 space-y-2">
          {role.actions.map((a) => (
            <li
              key={a}
              className="flex items-baseline gap-2.5 text-[13px] text-ink-mid"
            >
              <span
                className="mt-[7px] h-1 w-1 shrink-0 rounded-full"
                style={{ background: role.accent }}
              />
              {a}
            </li>
          ))}
        </ul>

        <span
          className="mt-6 inline-flex items-center gap-2 font-mono text-micro uppercase tracking-[0.14em]"
          style={{ color: role.accent }}
        >
          Enter workspace
          <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
        </span>
      </div>
    </Link>
  );
}

/* ── Satellite backdrop ───────────────────────────────────────────────────── */

const MARKERS = [
  { x: 18, y: 30, label: "24.53°N 81.30°E", tone: "#4CC9E8" },
  { x: 44, y: 20, label: "AOI · 412 km²", tone: "#F0A63C" },
  { x: 62, y: 68, label: "NDWI −0.18", tone: "#3FD79A" },
  { x: 30, y: 74, label: "18 villages", tone: "#FF8A6B" },
];

function SatelliteBackdrop() {
  return (
    <div aria-hidden className="absolute inset-0">
      {/* Deep-space wash and terrain light */}
      <div className="absolute inset-0 bg-[radial-gradient(1300px_820px_at_74%_-14%,rgba(76,201,232,0.20),transparent_60%),radial-gradient(900px_640px_at_10%_22%,rgba(31,72,120,0.62),transparent_66%),radial-gradient(1100px_760px_at_54%_118%,rgba(240,166,60,0.12),transparent_58%)]" />

      <svg
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="xMidYMid slice"
        viewBox="0 0 1440 900"
      >
        <defs>
          <linearGradient id="lat" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#4CC9E8" stopOpacity="0.04" />
            <stop offset="45%" stopColor="#4CC9E8" stopOpacity="0.26" />
            <stop offset="100%" stopColor="#4CC9E8" stopOpacity="0.04" />
          </linearGradient>
          <radialGradient id="limb" cx="0.72" cy="0.42" r="0.55">
            <stop offset="72%" stopColor="#0B1524" stopOpacity="0" />
            <stop offset="97%" stopColor="#4CC9E8" stopOpacity="0.20" />
            <stop offset="100%" stopColor="#4CC9E8" stopOpacity="0" />
          </radialGradient>
          <pattern id="mesh" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M48 0H0V48" fill="none" stroke="#1E3554" strokeWidth="0.7" />
          </pattern>
          <clipPath id="globe">
            <circle cx="1040" cy="380" r="430" />
          </clipPath>
        </defs>

        <rect width="1440" height="900" fill="url(#mesh)" opacity="0.42" />

        {/* Earth limb — a curved horizon rather than a floating ball */}
        <g clipPath="url(#globe)">
          <circle cx="1040" cy="380" r="430" fill="#0C1A2C" opacity="0.55" />
          {[-330, -240, -150, -60, 40, 140, 240, 340].map((dy) => (
            <path
              key={dy}
              d={`M610 ${380 + dy} Q 1040 ${380 + dy - 96} 1470 ${380 + dy}`}
              fill="none"
              stroke="url(#lat)"
              strokeWidth={dy === 40 ? 1.4 : 0.85}
            />
          ))}
          {[-360, -240, -120, 0, 120, 240, 360].map((dx) => (
            <ellipse
              key={dx}
              cx="1040"
              cy="380"
              rx={Math.max(24, Math.abs(dx))}
              ry="430"
              fill="none"
              stroke="#2C4A73"
              strokeWidth="0.75"
              opacity="0.55"
            />
          ))}
          {/* Landmass contour fragments */}
          <g stroke="#4CC9E8" fill="none" opacity="0.3">
            <path d="M840 300 q 90 -70 190 -34 q 96 36 78 122 q -18 84 -140 76 q -122 -8 -130 -82 q -6 -52 2 -82" strokeWidth="1" />
            <path d="M884 322 q 72 -52 152 -22 q 76 28 60 94 q -16 66 -112 60 q -96 -8 -102 -64" strokeWidth="1" />
            <path d="M930 346 q 52 -34 108 -14 q 52 20 40 66 q -12 44 -78 40 q -66 -6 -70 -46" strokeWidth="1" />
            <path d="M700 560 q 120 -46 224 4 q 92 42 46 116" strokeWidth="0.9" />
          </g>
        </g>
        <circle cx="1040" cy="380" r="430" fill="url(#limb)" />

        {/* Orbital track */}
        <ellipse
          cx="1040"
          cy="380"
          rx="560"
          ry="212"
          fill="none"
          stroke="#4CC9E8"
          strokeWidth="0.9"
          strokeDasharray="5 7"
          opacity="0.3"
          transform="rotate(-18 1040 380)"
        />

        {/* Swath footprint */}
        <g opacity="0.42">
          <path
            d="M186 246 L436 214 L470 396 L220 428 Z"
            fill="#4CC9E8"
            fillOpacity="0.06"
            stroke="#4CC9E8"
            strokeWidth="1"
            strokeDasharray="6 5"
          />
          {[
            [186, 246],
            [436, 214],
            [470, 396],
            [220, 428],
          ].map(([cx, cy]) => (
            <rect
              key={`${cx}-${cy}`}
              x={cx - 3}
              y={cy - 3}
              width="6"
              height="6"
              fill="#070D18"
              stroke="#4CC9E8"
              strokeWidth="1"
            />
          ))}
        </g>
      </svg>

      {/* Telemetry markers */}
      {MARKERS.map((m, i) => (
        <div
          key={m.label}
          className="absolute flex items-center gap-2"
          style={{ left: `${m.x}%`, top: `${m.y}%` }}
        >
          <span className="relative flex h-2 w-2">
            <span
              className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-40"
              style={{ background: m.tone, animationDuration: `${3 + i * 0.7}s` }}
            />
            <span
              className="relative inline-flex h-2 w-2 rounded-full"
              style={{ background: m.tone }}
            />
          </span>
          <span
            className="hidden font-mono text-[9.5px] uppercase tracking-[0.12em] opacity-55 xl:inline"
            style={{ color: m.tone }}
          >
            {m.label}
          </span>
        </div>
      ))}

      {/* Readability veils — keep the headline high-contrast at every width */}
      <div className="absolute inset-0 bg-gradient-to-r from-abyss/92 via-abyss/72 to-abyss/48" />
      <div className="absolute inset-0 bg-gradient-to-b from-abyss/70 via-transparent to-abyss/88" />
    </div>
  );
}
