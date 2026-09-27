"use client";

import * as React from "react";
import { Badge, Button, Field, Input } from "@/components/ui/primitives";
import { cn } from "@/lib/format";

/** Multi-select chips used across NGO and CSR profiles. */
export function ChipSelect({
  options,
  value,
  onChange,
  accent,
}: {
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
  accent: string;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const on = value.includes(o);
        return (
          <button
            key={o}
            type="button"
            onClick={() =>
              onChange(on ? value.filter((v) => v !== o) : [...value, o])
            }
            className={cn(
              "rounded-lg border px-2.5 py-1 text-[12px] transition-colors",
              on ? "text-abyss" : "border-hair text-ink-mid hover:border-hairlit",
            )}
            style={on ? { background: accent, borderColor: accent } : undefined}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

/** Free-text list builder — regions, capabilities. */
export function TokenInput({
  label,
  hint,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  placeholder?: string;
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const [draft, setDraft] = React.useState("");
  const add = () => {
    const v = draft.trim();
    if (!v || value.includes(v)) return;
    onChange([...value, v]);
    setDraft("");
  };
  return (
    <Field label={label} hint={hint}>
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
        />
        <Button variant="outline" onClick={add}>
          Add
        </Button>
      </div>
      {value.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {value.map((v) => (
            <li key={v}>
              <button
                type="button"
                onClick={() => onChange(value.filter((x) => x !== v))}
                className="rounded-lg border border-entered/30 bg-entered/10 px-2 py-1 text-[11.5px] text-entered hover:border-critical hover:text-critical"
                title={`Remove ${v}`}
              >
                {v} ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </Field>
  );
}

/** Shown wherever an action has no backend to land in. */
export function UnsavedNotice({ endpoint }: { endpoint: string }) {
  return (
    <p className="rounded-lg border border-elevated/40 bg-elevated/10 px-3 py-2 text-[11.5px] leading-relaxed text-ink-hi">
      Recorded in this session only. NEXUS has no endpoint at{" "}
      <code className="rounded bg-abyss/70 px-1.5 py-0.5 font-mono text-[11px] text-observed">
        {endpoint}
      </code>{" "}
      yet, so nothing was sent to the backend and this will be lost on reload.
    </p>
  );
}

export function MatchBadge({ score }: { score: number }) {
  const tone = score >= 0.66 ? "ok" : score >= 0.33 ? "inferred" : "neutral";
  const label =
    score >= 0.66 ? "Strong match" : score >= 0.33 ? "Partial match" : "Weak match";
  return <Badge tone={tone as "ok" | "inferred" | "neutral"}>{label}</Badge>;
}

/** Overlap between a profile's sectors and an item's domain/category. */
export function matchScore(
  focusAreas: string[],
  haystack: string[],
): number {
  if (focusAreas.length === 0) return 0;
  const hay = haystack.filter(Boolean).map((h) => h.toLowerCase());
  const hits = focusAreas.filter((f) =>
    hay.some((h) => h.includes(f.toLowerCase()) || f.toLowerCase().includes(h)),
  );
  return hits.length / focusAreas.length;
}
