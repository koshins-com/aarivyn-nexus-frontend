"use client";

import * as React from "react";
import { Activity, RotateCcw } from "lucide-react";
import { API_URL, describeError } from "@/lib/api/client";
import { getSystemStatus } from "@/lib/api/nexus";
import { useNexus } from "@/lib/store";
import { Button } from "@/components/ui/primitives";
import type { SystemStatus } from "@/lib/types";
import { cn } from "@/lib/format";

export function TopBar() {
  const { brief, reset } = useNexus();
  const [status, setStatus] = React.useState<SystemStatus | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    let alive = true;
    const check = async () => {
      try {
        const s = await getSystemStatus();
        if (alive) {
          setStatus(s);
          setErr(null);
        }
      } catch (e) {
        if (alive) {
          setStatus(null);
          setErr(describeError(e));
        }
      }
    };
    check();
    const t = setInterval(check, 30_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const online = status?.status?.toLowerCase() === "operational" || !!status;

  return (
    <header className="flex items-center gap-4 border-b border-hair bg-hull/90 px-4 py-2.5 backdrop-blur">
      <div className="flex items-baseline gap-2.5">
        <span className="font-display text-[17px] font-semibold tracking-[0.22em] text-ink-hi">
          NEXUS
        </span>
        <span className="hidden font-mono text-micro uppercase text-ink-lo sm:inline">
          Geospatial decision intelligence
        </span>
      </div>

      {brief.district && (
        <div className="hidden items-center gap-2 rounded-lg border border-hair bg-abyss/60 px-2.5 py-1 md:flex">
          <span className="rule-label">Region</span>
          <span className="text-[12px] text-entered">
            {[brief.city, brief.district, brief.state].filter(Boolean).join(", ")}
          </span>
        </div>
      )}

      <div className="ml-auto flex items-center gap-2">
        <StatusPill online={online} status={status} error={err} />
        <Button
          size="sm"
          variant="ghost"
          onClick={reset}
          title="Clear the brief and all analysis results"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">New analysis</span>
        </Button>
      </div>
    </header>
  );
}

function StatusPill({
  online,
  status,
  error,
}: {
  online: boolean;
  status: SystemStatus | null;
  error: string | null;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg border border-hair bg-abyss/60 px-2.5 py-1.5 font-mono text-micro uppercase text-ink-mid transition-colors hover:border-hairlit"
      >
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            online ? "bg-nominal" : "bg-critical",
          )}
        />
        {online ? "Backend online" : "Backend unreachable"}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[290px] rounded-xl border border-hair bg-panel p-3 shadow-panel">
          <div className="rule-label mb-2">API endpoint</div>
          <code className="block break-all rounded bg-abyss/70 px-2 py-1.5 font-mono text-[11px] text-observed">
            {API_URL}
          </code>

          {status ? (
            <dl className="mt-3 space-y-1.5">
              {(
                [
                  ["API", status.api_status],
                  ["Database", status.database_status],
                  ["EO provider", status.eo_provider_status],
                  ["Intelligence engine", status.intelligence_engine_status],
                  ["Optimizer", status.optimizer_status],
                  ["Background worker", status.background_worker_status],
                ] as const
              ).map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between gap-3">
                  <dt className="text-[11.5px] text-ink-mid">{k}</dt>
                  <dd className="font-mono text-[11px] text-ink-hi">{v}</dd>
                </div>
              ))}
              <div className="mt-2 border-t border-hair pt-2 font-mono text-micro uppercase text-ink-lo">
                v{status.application_version}
              </div>
            </dl>
          ) : (
            <p className="mt-3 text-[11.5px] leading-relaxed text-ink-mid">
              {error ??
                "Checking…"}{" "}
              Start the FastAPI server, then set NEXT_PUBLIC_API_URL to its address.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
