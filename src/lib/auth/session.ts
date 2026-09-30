import { cookies } from "next/headers";

/**
 * Single place for the session cookie name so the route handlers, middleware
 * and any server component all agree. The value is an opaque token that maps
 * to a row in the SQLite `sessions` table — nothing sensitive is in the cookie
 * itself.
 */
export const SESSION_COOKIE = "nexus_session";

export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export function sessionCookie() {
  return cookies().get(SESSION_COOKIE)?.value;
}
