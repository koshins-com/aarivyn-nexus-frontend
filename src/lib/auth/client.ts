"use client";

import { useAuth, type AuthUser } from "./store";

interface ApiResult {
  user?: AuthUser;
  error?: string;
}

async function postJson(path: string, body: unknown): Promise<ApiResult> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as {
    user?: AuthUser;
    error?: string;
  };
  if (!res.ok) {
    return { error: data.error ?? "Something went wrong. Please try again." };
  }
  return { user: data.user };
}

export function useAuthActions() {
  const setUser = useAuth((s) => s.setUser);

  return {
    async register(name: string, email: string, password: string) {
      const r = await postJson("/api/auth/register", { name, email, password });
      if (r.user) setUser(r.user);
      return r;
    },
    async login(email: string, password: string) {
      const r = await postJson("/api/auth/login", { email, password });
      if (r.user) setUser(r.user);
      return r;
    },
    async logout() {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
    },
  };
}

/** Fetch the current session once on app load and hydrate the auth store. */
export async function refreshSession(): Promise<void> {
  const res = await fetch("/api/auth/me", { cache: "no-store" });
  if (!res.ok) return;
  const data = (await res.json()) as { user: AuthUser | null };
  useAuth.setState({ user: data.user, loaded: true });
}
