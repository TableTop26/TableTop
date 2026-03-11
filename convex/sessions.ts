import {
  mutation,
  query,
  internalMutation,
} from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

export const createSession = mutation({
  args: {
    tableId: v.id("tables"),
    restaurantId: v.id("restaurants"),
    guestName: v.string(),
    guestPhone: v.string(),
    cookieToken: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Close any stale active session on this table first
    const stale = await ctx.db
      .query("sessions")
      .withIndex("by_table_status", (q) =>
        q.eq("tableId", args.tableId).eq("status", "active")
      )
      .first();
    if (stale) {
      await ctx.db.patch(stale._id, { status: "closed" });
    }

    const sessionId = await ctx.db.insert("sessions", {
      tableId: args.tableId,
      restaurantId: args.restaurantId,
      guests: [
        {
          name: args.guestName,
          phone: args.guestPhone,
          cookieToken: args.cookieToken,
        },
      ],
      status: "active",
      lastActivityAt: now,
      createdAt: now,
    });

    // Update table status to ORDERING
    await ctx.db.patch(args.tableId, {
      status: "ORDERING",
      currentSessionId: sessionId,
    });

    // Schedule auto-close after 30 minutes of inactivity
    await ctx.scheduler.runAfter(
      SESSION_TIMEOUT_MS,
      internal.sessions.checkAndExpireSession,
      { sessionId, expectedLastActivityAt: now }
    );

    return sessionId;
  },
});

export const joinSession = mutation({
  args: {
    sessionId: v.id("sessions"),
    guestName: v.string(),
    guestPhone: v.string(),
    cookieToken: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.status !== "active") {
      throw new Error("Session is not active");
    }

    const now = Date.now();
    const alreadyJoined = session.guests.some(
      (g) => g.phone === args.guestPhone
    );
    if (alreadyJoined) return args.sessionId;

    await ctx.db.patch(args.sessionId, {
      guests: [
        ...session.guests,
        {
          name: args.guestName,
          phone: args.guestPhone,
          cookieToken: args.cookieToken,
        },
      ],
      lastActivityAt: now,
    });

    return args.sessionId;
  },
});

export const getActiveSession = query({
  args: { tableId: v.id("tables") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("sessions")
      .withIndex("by_table_status", (q) =>
        q.eq("tableId", args.tableId).eq("status", "active")
      )
      .first();
  },
});

export const getSessionById = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    return ctx.db.get(args.sessionId);
  },
});

export const invalidateSession = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, { status: "closed" });
  },
});

export const touchSession = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.sessionId, { lastActivityAt: now });

    // Re-arm the inactivity timeout
    await ctx.scheduler.runAfter(
      SESSION_TIMEOUT_MS,
      internal.sessions.checkAndExpireSession,
      { sessionId: args.sessionId, expectedLastActivityAt: now }
    );
  },
});

// Internal — called by the scheduler, not exposed to clients
export const checkAndExpireSession = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    expectedLastActivityAt: v.number(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.status !== "active") return;

    // Only expire if there has been no activity since the timer was set
    if (session.lastActivityAt !== args.expectedLastActivityAt) return;

    await ctx.db.patch(args.sessionId, { status: "closed" });

    // Reset table back to AVAILABLE
    await ctx.db.patch(session.tableId, {
      status: "AVAILABLE",
      currentSessionId: undefined,
    });
  },
});
