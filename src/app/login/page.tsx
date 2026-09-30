"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useAuthActions } from "@/lib/auth/client";
import { Button, Field, Input, ErrorNote } from "@/components/ui/primitives";
import { cn } from "@/lib/format";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/workspace";

  const [mode, setMode] = React.useState<"signin" | "register">("signin");
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const { login, register } = useAuthActions();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const r =
      mode === "register"
        ? await register(name, email, password)
        : await login(email, password);
    setBusy(false);
    if (r.error) {
      setError(r.error);
      return;
    }
    router.replace(next);
    router.refresh();
  };

  return (
    <main className="relative grid min-h-dvh place-items-center bg-abyss p-4">
      {/* Ambient wash, consistent with the landing hero */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_520px_at_72%_-10%,rgba(76,201,232,0.16),transparent_60%),radial-gradient(760px_520px_at_12%_114%,rgba(240,166,60,0.10),transparent_58%)]"
      />

      <div className="relative w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="font-display text-[24px] font-semibold tracking-[0.24em] text-ink-hi">
            NEXUS
          </div>
          <p className="mt-1 font-mono text-micro uppercase text-ink-lo">
            Geospatial decision intelligence
          </p>
        </div>

        <div className="rounded-2xl border border-hair bg-panel/85 p-6 shadow-panel backdrop-blur-sm">
          {/* Mode switch */}
          <div className="mb-5 flex rounded-lg border border-hair p-0.5">
            {(["signin", "register"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m);
                  setError(null);
                }}
                className={cn(
                  "flex-1 rounded-md px-3 py-1.5 font-mono text-tiny uppercase tracking-[0.1em] transition-colors",
                  mode === m
                    ? "bg-observed font-semibold text-abyss"
                    : "text-ink-mid hover:text-ink-hi",
                )}
              >
                {m === "signin" ? "Sign in" : "Register"}
              </button>
            ))}
          </div>

          {error && (
            <div className="mb-4">
              <ErrorNote message={error} />
            </div>
          )}

          <form onSubmit={submit} className="space-y-3.5">
            {mode === "register" && (
              <Field label="Name" required>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  autoComplete="name"
                />
              </Field>
            )}
            <Field label="Email" required>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.org"
                autoComplete="email"
                required
              />
            </Field>
            <Field
              label="Password"
              required
              hint={mode === "register" ? "At least 6 characters." : undefined}
            >
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={mode === "register" ? "new-password" : "current-password"}
                required
              />
            </Field>

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={busy}
            >
              {busy ? "Please wait…" : mode === "register" ? "Create account" : "Sign in"}
            </Button>
          </form>

          <p className="mt-4 text-center text-[11px] leading-relaxed text-ink-lo">
            {mode === "register"
              ? "One account gives access to the analysis workspace and every network role."
              : "Your session is stored locally — credentials never leave this installation."}
          </p>
        </div>
      </div>
    </main>
  );
}
