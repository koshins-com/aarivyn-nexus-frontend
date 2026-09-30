import { NextResponse } from "next/server";
import { userForToken } from "@/lib/auth/db";
import { sessionCookie } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function GET() {
  const token = sessionCookie();
  if (!token) {
    return NextResponse.json({ user: null }, { status: 200 });
  }
  const user = userForToken(token);
  return NextResponse.json({ user });
}
