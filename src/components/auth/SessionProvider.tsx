"use client";

import * as React from "react";
import { refreshSession } from "@/lib/auth/client";

/**
 * Hydrates the shared auth store from the session cookie exactly once when the
 * app shell mounts, so sign-out buttons and any auth-gated UI render correctly.
 */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    refreshSession();
  }, []);
  return <>{children}</>;
}
