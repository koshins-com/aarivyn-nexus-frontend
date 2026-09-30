"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth/store";
import { useAuthActions } from "@/lib/auth/client";
import { Button } from "@/components/ui/primitives";

/** Shared sign-out control, used identically in the workspace and every
 *  network mode so the header stays consistent. */
export function SignOutButton({ variant = "ghost" }: { variant?: "ghost" | "outline" }) {
  const user = useAuth((s) => s.user);
  const { logout } = useAuthActions();
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  if (!user) return null;

  const onSignOut = async () => {
    setBusy(true);
    await logout();
    router.replace("/");
    router.refresh();
  };

  return (
    <div className="flex items-center gap-2">
      <span className="hidden max-w-[180px] truncate font-mono text-tiny uppercase text-ink-lo sm:inline">
        {user.name}
      </span>
      <Button size="sm" variant={variant} onClick={onSignOut} disabled={busy}>
        <LogOut className="h-3.5 w-3.5" />
        Sign out
      </Button>
    </div>
  );
}
