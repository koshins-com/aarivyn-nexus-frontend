"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { MapDock } from "@/components/map/MapDock";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { ErrorNote } from "@/components/ui/primitives";
import { describeError } from "@/lib/api/client";
import { getWorkspace } from "@/lib/api/workspace";
import { useNetwork } from "@/lib/network-store";
import type { RoleDef } from "@/lib/roles";
import { cn } from "@/lib/format";

/**
 * Shared chrome for every non-government mode. The map, the location registry
 * and the evidence beneath them are identical to the government workspace —
 * only the tool column changes.
 */
export function NetworkShell({
  role,
  tabs,
  active,
  onTab,
  children,
}: {
  role: RoleDef;
  tabs: { id: string; label: string }[];
  active: string;
  onTab: (id: string) => void;
  children: React.ReactNode;
}) {
  const { setRole, workspace, setWorkspace } = useNetwork();
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setRole(role.id);
    let alive = true;
    getWorkspace(role.persona)
      .then((w) => alive && setWorkspace(w))
      .catch((e) => alive && setError(describeError(e)));
    return () => {
      alive = false;
    };
  }, [role, setRole, setWorkspace]);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-abyss">
      {/* Mode banner — the accent is the only thing that changes per role */}
      <header
        className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-hair bg-hull/90 px-4 py-2.5 backdrop-blur"
        style={{ boxShadow: `inset 0 -1px 0 0 ${role.accent}40` }}
      >
        <Link
          href="/"
          className="flex items-center gap-1.5 font-mono text-micro uppercase text-ink-lo transition-colors hover:text-ink-hi"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Roles
        </Link>

        <div className="flex items-baseline gap-2.5">
          <span className="font-display text-[16px] font-semibold tracking-[0.2em] text-ink-hi">
            NEXUS
          </span>
          <span
            className="font-mono text-micro uppercase"
            style={{ color: role.accent }}
          >
            {role.verb}
          </span>
        </div>

        <span className="hidden text-[12px] text-ink-mid md:inline">
          {role.title}
        </span>

        <div className="ml-auto">
          <SignOutButton />
        </div>
      </header>

      {/* Tool tabs */}
      <nav className="flex gap-1 overflow-x-auto border-b border-hair bg-hull/60 px-3 py-2">
        {tabs.map((t) => {
          const on = t.id === active;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onTab(t.id)}
              className={cn(
                "shrink-0 rounded-lg border px-3 py-1.5 font-mono text-tiny uppercase transition-colors",
                on
                  ? "text-abyss"
                  : "border-hair text-ink-mid hover:border-hairlit hover:text-ink-hi",
              )}
              style={
                on
                  ? { background: role.accent, borderColor: role.accent }
                  : undefined
              }
            >
              {t.label}
            </button>
          );
        })}
      </nav>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 xl:flex-row">
        <div className="h-[34vh] shrink-0 xl:h-auto xl:w-[36%]">
          <div className="h-full min-h-[300px]">
            <MapDock />
          </div>
        </div>

        <div className="min-w-0 flex-1 xl:overflow-y-auto xl:pr-1">
          {error && (
            <div className="mb-4">
              <ErrorNote message={error} />
            </div>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
