import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  const { tableId, restaurantId, name, phone } = await request.json();

  if (!tableId || !restaurantId || !name || !phone) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const cookieToken = crypto.randomUUID();

  // Check for an existing active session on this table
  const existing = await convex.query(api.sessions.getActiveSession, {
    tableId: tableId as Id<"tables">,
  });

  let sessionId: Id<"sessions">;

  if (existing) {
    sessionId = await convex.mutation(api.sessions.joinSession, {
      sessionId: existing._id,
      guestName: name.trim(),
      guestPhone: phone.trim(),
      cookieToken,
    });
  } else {
    sessionId = await convex.mutation(api.sessions.createSession, {
      tableId: tableId as Id<"tables">,
      restaurantId: restaurantId as Id<"restaurants">,
      guestName: name.trim(),
      guestPhone: phone.trim(),
      cookieToken,
    });
  }

  const cookieValue = JSON.stringify({ sessionId, cookieToken, tableId, restaurantId });

  const response = NextResponse.json({ sessionId });

  // HTTP-only cookie — used by proxy to verify session validity
  response.cookies.set("tabletop_guest_token", cookieValue, {
    httpOnly: true,
    maxAge: 60 * 60 * 4, // 4 hours
    path: "/",
    sameSite: "lax",
  });

  return response;
}
