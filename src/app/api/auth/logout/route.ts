import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth/db";
import { SESSION_COOKIE, sessionCookie } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function POST() {
  const token = sessionCookie();
  if (token) destroySession(token);

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
