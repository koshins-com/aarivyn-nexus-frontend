"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { STAGES, useNexus, type StageId } from "@/lib/store";
import { cn } from "@/lib/format";

/**
 * The signature element: a vertical instrument rail reading
 * OBSERVE → DETECT → UNDERSTAND → INTERVENTIONS → OPTIMIZE → DECIDE → MONITOR.
 * The filled portion of the spine is literal — it shows how far the analysis
 * has actually run, not how far the user has clicked.
 */
export function PipelineRail() {
  const { stage, furthest, goTo } = useNexus();
  const current = STAGES.findIndex((s) => s.id === stage);

  return (
    <nav
      aria-label="Analysis pipeline"
      className="hidden w-[188px] shrink-0 flex-col border-r border-hair bg-hull/60 py-4 lg:flex"
    >
      <div className="px-4 pb-3">
        <div className="rule-label">Pipeline</div>
      </div>

      <div className="relative flex-1 px-4">
        {/* spine */}
        <div className="absolute bottom-3 left-[27px] top-3 w-px bg-hair" />
        <motion.div
          className="absolute left-[27px] top-3 w-px bg-gradient-to-b from-observed to-inferred"
          initial={false}
          animate={{
            height: `${(furthest / Math.max(1, STAGES.length - 1)) * 100}%`,
          }}
          transition={{ type: "spring", stiffness: 120, damping: 22 }}
        />

        <ol className="relative space-y-0.5">
          {STAGES.map((s, i) => {
            const reached = i <= furthest;
            const active = i === current;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  disabled={!reached}
                  onClick={() => goTo(s.id as StageId)}
                  className={cn(
                    "group flex w-full items-center gap-3 rounded-lg py-2 pl-0 pr-2 text-left transition-colors",
                    reached ? "cursor-pointer" : "cursor-not-allowed opacity-35",
                    active ? "bg-raised/70" : "hover:bg-raised/40",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-observed",
                  )}
                >
                  <span
                    className={cn(
                      "relative z-10 grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full border font-mono text-[10px] transition-colors",
                      active
                        ? "border-inferred bg-inferred text-abyss"
                        : reached
                          ? "border-observed bg-abyss text-observed"
                          : "border-hair bg-abyss text-ink-lo",
                    )}
                  >
                    {i + 1}
                  </span>
                  <span className="min-w-0">
                    <span
                      className={cn(
                        "block font-mono text-micro uppercase",
                        active ? "text-inferred" : "text-ink-lo",
                      )}
                    >
                      {s.verb}
                    </span>
                    <span
                      className={cn(
                        "block truncate text-[12.5px]",
                        active ? "text-ink-hi" : "text-ink-mid",
                      )}
                    >
                      {s.label}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      <ProvenanceKey />
    </nav>
  );
}

function ProvenanceKey() {
  const rows = [
    { c: "#C7D6EA", label: "You entered" },
    { c: "#4CC9E8", label: "Observed data" },
    { c: "#F0A63C", label: "NEXUS analysis" },
    { c: "#FF5C6C", label: "Critical finding" },
  ];
  return (
    <div className="mx-4 mt-4 rounded-lg border border-hair bg-abyss/50 p-3">
      <div className="rule-label mb-2">Colour key</div>
      <ul className="space-y-1.5">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center gap-2">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: r.c }}
            />
            <span className="text-[11px] text-ink-mid">{r.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Compact horizontal rail for tablet/mobile. */
export function PipelineStrip() {
  const { stage, furthest, goTo } = useNexus();
  return (
    <div className="flex gap-1.5 overflow-x-auto border-b border-hair bg-hull/70 px-3 py-2 lg:hidden">
      {STAGES.map((s, i) => {
        const reached = i <= furthest;
        const active = s.id === stage;
        return (
          <button
            key={s.id}
            type="button"
            disabled={!reached}
            onClick={() => goTo(s.id as StageId)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1 font-mono text-micro uppercase transition-colors",
              active
                ? "border-inferred bg-inferred text-abyss"
                : reached
                  ? "border-hairlit text-ink-mid"
                  : "border-hair text-ink-lo/50",
            )}
          >
            {i + 1} {s.verb}
          </button>
        );
      })}
    </div>
  );
}
