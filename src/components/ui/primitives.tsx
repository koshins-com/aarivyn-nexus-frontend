"use client";

import * as React from "react";
import { cn } from "@/lib/format";

/* ── Panel ───────────────────────────────────────────────────────────────── */

export function Panel({
  title,
  eyebrow,
  actions,
  className,
  bodyClassName,
  children,
}: {
  title?: React.ReactNode;
  eyebrow?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border border-hair bg-panel/85 shadow-panel backdrop-blur-sm",
        className,
      )}
    >
      {(title || actions) && (
        <header className="flex items-start justify-between gap-3 border-b border-hair px-4 py-3">
          <div className="min-w-0">
            {eyebrow && (
              <div className="font-mono text-micro uppercase text-ink-lo">{eyebrow}</div>
            )}
            {title && (
              <h2 className="font-display text-[15px] font-medium text-ink-hi">{title}</h2>
            )}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cn("p-4", bodyClassName)}>{children}</div>
    </section>
  );
}

/* ── Button ──────────────────────────────────────────────────────────────── */

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "outline" | "danger" | "accent";
  size?: "sm" | "md";
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "outline", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium",
        "transition-colors duration-150 focus-visible:outline-none",
        "focus-visible:ring-2 focus-visible:ring-observed focus-visible:ring-offset-2 focus-visible:ring-offset-abyss",
        "disabled:cursor-not-allowed disabled:opacity-40",
        size === "sm" ? "h-8 px-3 text-[12px]" : "h-9 px-4 text-[13px]",
        variant === "primary" && "bg-observed font-semibold text-abyss hover:bg-[#6FD8F0]",
        variant === "accent" && "bg-inferred font-semibold text-abyss hover:bg-[#F6BB63]",
        variant === "outline" &&
          "border border-hairlit bg-raised/60 text-ink-hi hover:border-observed hover:bg-raised",
        variant === "ghost" && "text-ink-mid hover:bg-raised/70 hover:text-ink-hi",
        variant === "danger" &&
          "border border-critical/50 bg-critical/10 text-critical hover:bg-critical/20",
        className,
      )}
    />
  ),
);
Button.displayName = "Button";

/* ── Form fields ─────────────────────────────────────────────────────────── */

export function Field({
  label,
  hint,
  required,
  children,
  className,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 flex items-baseline gap-1.5 font-mono text-micro uppercase text-ink-lo">
        {label}
        {required && <span className="text-inferred">•</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-ink-lo">{hint}</span>}
    </label>
  );
}

const fieldBase =
  "w-full rounded-lg border border-hair bg-abyss/70 px-3 py-2 text-[13px] text-entered " +
  "placeholder:text-ink-lo/60 transition-colors focus:border-observed focus:outline-none " +
  "focus:ring-1 focus:ring-observed/40";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...p }, ref) => (
  <input ref={ref} {...p} className={cn(fieldBase, className)} />
));
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...p }, ref) => (
  <textarea ref={ref} {...p} className={cn(fieldBase, "resize-y", className)} />
));
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, ...p }, ref) => (
  <select ref={ref} {...p} className={cn(fieldBase, "appearance-none", className)} />
));
Select.displayName = "Select";

/* ── Badges & provenance ─────────────────────────────────────────────────── */

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "observed" | "inferred" | "entered" | "critical" | "ok";
  className?: string;
}) {
  const tones = {
    neutral: "border-hairlit text-ink-mid",
    observed: "border-observed/50 bg-observed/10 text-observed",
    inferred: "border-inferred/50 bg-inferred/10 text-inferred",
    entered: "border-entered/40 bg-entered/10 text-entered",
    critical: "border-critical/50 bg-critical/10 text-critical",
    ok: "border-nominal/50 bg-nominal/10 text-nominal",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-micro uppercase",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** The provenance key, used identically in every stage. */
export function Origin({ kind }: { kind: "entered" | "observed" | "inferred" }) {
  const map = {
    entered: { label: "You entered", tone: "entered" as const },
    observed: { label: "Observed", tone: "observed" as const },
    inferred: { label: "NEXUS analysis", tone: "inferred" as const },
  };
  const { label, tone } = map[kind];
  return <Badge tone={tone}>{label}</Badge>;
}

/* ── Stat ────────────────────────────────────────────────────────────────── */

export function Stat({
  label,
  value,
  unit,
  origin,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  unit?: string;
  origin?: "entered" | "observed" | "inferred";
  accent?: string;
}) {
  return (
    <div className="rounded-lg border border-hair bg-abyss/50 px-3 py-2.5">
      <div className="font-mono text-micro uppercase text-ink-lo">{label}</div>
      <div
        className="mt-1 font-display text-[19px] leading-tight tabular-nums text-ink-hi"
        style={accent ? { color: accent } : undefined}
      >
        {value}
        {unit && <span className="ml-1 text-[11px] text-ink-lo">{unit}</span>}
      </div>
      {origin && (
        <div className="mt-1.5">
          <Origin kind={origin} />
        </div>
      )}
    </div>
  );
}

/* ── States ──────────────────────────────────────────────────────────────── */

export function Empty({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-dashed border-hair bg-abyss/40 px-5 py-8 text-center">
      <p className="font-display text-[14px] text-ink-hi">{title}</p>
      <p className="mx-auto mt-1.5 max-w-sm text-[12px] leading-relaxed text-ink-mid">{body}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-critical/40 bg-critical/10 px-3.5 py-2.5">
      <div className="font-mono text-micro uppercase text-critical">Request failed</div>
      <p className="mt-1 text-[12px] leading-relaxed text-ink-hi">{message}</p>
    </div>
  );
}

export function Loading({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-hair bg-abyss/40 px-3.5 py-3">
      <span className="relative flex h-1.5 w-16 overflow-hidden rounded-full bg-hair">
        <span className="absolute inset-y-0 w-1/2 animate-sweep rounded-full bg-observed" />
      </span>
      <span className="font-mono text-tiny uppercase text-ink-mid">{label}</span>
    </div>
  );
}

/* ── Meter ───────────────────────────────────────────────────────────────── */

export function Meter({
  value,
  max = 1,
  color = "#4CC9E8",
  className,
}: {
  value: number;
  max?: number;
  color?: string;
  className?: string;
}) {
  const w = Math.max(0, Math.min(1, value / max)) * 100;
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-hair", className)}>
      <div
        className="h-full rounded-full transition-[width] duration-500"
        style={{ width: `${w}%`, backgroundColor: color }}
      />
    </div>
  );
}
