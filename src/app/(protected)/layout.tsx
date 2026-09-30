import { RequireAuth } from "@/components/auth/RequireAuth";

/**
 * Shared guard for every page under /workspace and /network. The actual
 * session check runs client-side (so it can read the exact pathname and return
 * visitors there after sign-in); the route group simply keeps all protected
 * pages under one roof so the URLs stay unchanged.
 */
export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RequireAuth>{children}</RequireAuth>;
}
