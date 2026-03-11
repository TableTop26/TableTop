import { NextResponse } from "next/server";

// Auth0 v4: all /auth/* routes (login, logout, callback) are handled by
// the Auth0 middleware in src/middleware.ts before they reach this handler.
// This file is a No-op fallback.
export function GET() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

export function POST() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
