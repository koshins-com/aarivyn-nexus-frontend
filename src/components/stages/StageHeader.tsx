"use client";

import * as React from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { STAGES, useNexus, type StageId } from "@/lib/store";
import { Button } from "@/components/ui/primitives";

export function StageHeader({
  id,
  lede,
  children,
}: {
  id: StageId;
  lede: string;
  children?: React.ReactNode;
}) {
  const i = STAGES.findIndex((s) => s.id === id);
  const stage = STAGES[i];
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-micro uppercase text-inferred">
            {stage.verb}
          </span>
          <span className="font-mono text-micro text-ink-lo">
            Step {i + 1} of {STAGES.length}
          </span>
        </div>
        <h1 className="mt-0.5 font-display text-[22px] font-medium leading-tight text-ink-hi">
          {stage.label}
        </h1>
        <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-ink-mid">
          {lede}
        </p>
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}

export function StageNav({
  back,
  next,
  nextLabel = "Continue",
  nextDisabled,
  nextBlockedReason,
  onNext,
}: {
  back?: StageId;
  next?: StageId;
  nextLabel?: string;
  nextDisabled?: boolean;
  nextBlockedReason?: string;
  onNext?: () => void;
}) {
  const goTo = useNexus((s) => s.goTo);
  return (
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-hair pt-4">
      <div>
        {back && (
          <Button variant="ghost" onClick={() => goTo(back)}>
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </Button>
        )}
      </div>
      <div className="flex items-center gap-3">
        {nextDisabled && nextBlockedReason && (
          <span className="text-[11.5px] text-ink-lo">{nextBlockedReason}</span>
        )}
        {next && (
          <Button
            variant="primary"
            disabled={nextDisabled}
            onClick={() => {
              onNext?.();
              goTo(next);
            }}
          >
            {nextLabel}
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
