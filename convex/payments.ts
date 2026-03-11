import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const initiatePayment = mutation({
  args: {
    sessionId: v.id("sessions"),
    restaurantId: v.id("restaurants"),
    totalAmount: v.number(), // in paise
    method: v.union(
      v.literal("upi"),
      v.literal("counter"),
      v.literal("waiter_upi")
    ),
  },
  handler: async (ctx, args) => {
    // Idempotent — return existing pending payment if already initiated
    const existing = await ctx.db
      .query("payments")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .first();
    if (existing) return existing._id;

    const paymentId = await ctx.db.insert("payments", {
      sessionId: args.sessionId,
      restaurantId: args.restaurantId,
      totalAmount: args.totalAmount,
      method: args.method,
      status: "pending",
    });

    // Move table to PAYMENT_PENDING (orange on waiter map)
    const session = await ctx.db.get(args.sessionId);
    if (session) {
      await ctx.db.patch(session.tableId, { status: "PAYMENT_PENDING" });
    }

    return paymentId;
  },
});

export const confirmPayment = mutation({
  args: { paymentId: v.id("payments") },
  handler: async (ctx, args) => {
    const payment = await ctx.db.get(args.paymentId);
    if (!payment) throw new Error("Payment not found");
    if (payment.status === "confirmed") return; // already done

    await ctx.db.patch(args.paymentId, {
      status: "confirmed",
      confirmedAt: Date.now(),
    });

    // Close the session
    await ctx.db.patch(payment.sessionId, { status: "closed" });

    // Clear the table (AVAILABLE + unlink session)
    const session = await ctx.db.get(payment.sessionId);
    if (session) {
      await ctx.db.patch(session.tableId, {
        status: "AVAILABLE",
        currentSessionId: undefined,
      });
    }
  },
});

export const getPaymentForSession = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("payments")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();
  },
});
