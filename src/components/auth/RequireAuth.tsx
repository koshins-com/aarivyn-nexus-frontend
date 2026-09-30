"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { refreshSession } from "@/lib/auth/client";
import { useAuth } from "@/lib/auth/store";
import { Loading } from "@/components/ui/primitives";

/**
 * Guard for the protected route group. On mount it hydrates the session from
 * the cookie, shows a loading state until that resolves, and redirects signed-
 * out visitors to /login carrying the exact path they were trying to reach.
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loaded } = useAuth();

  React.useEffect(() => {
    refreshSession();
  }, []);

  React.useEffect(() => {
    if (loaded && !user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [loaded, user, pathname, router]);

  if (!loaded) {
    return (
      <div className="grid min-h-dvh place-items-center bg-abyss">
        <Loading label="Checking session" />
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}
