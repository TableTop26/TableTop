import { query } from "./_generated/server";
import { v } from "convex/values";

export const getDashboardStats = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, args) => {
    // Basic stats derived from sessions and orders
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_restaurant", (q) => q.eq("restaurantId", args.restaurantId))
      .collect();

    const orders = await ctx.db
      .query("orders")
      .withIndex("by_restaurant", (q) => q.eq("restaurantId", args.restaurantId))
      .collect();

    // Total Sessions
    const totalSessions = sessions.length;

    // Cart Abandonment Rate
    // Sessions that are closed but have no corresponding orders placed
    const sessionsWithOrders = new Set(orders.map((o) => o.sessionId));
    
    let abandonedCount = 0;
    let completedSessionsForTimeCalc = 0;
    let totalTimeMs = 0;

    for (const session of sessions) {
      if (!sessionsWithOrders.has(session._id) && session.status === "closed") {
        abandonedCount++;
      }

      // If the session has orders and is closed, calculate turnover time
      if (sessionsWithOrders.has(session._id) && session.status === "closed") {
        completedSessionsForTimeCalc++;
        // Time from creation to last activity (payment/close)
        const duration = session.lastActivityAt - session.createdAt;
        if (duration > 0) {
          totalTimeMs += duration;
        }
      }
    }

    const cartAbandonmentRate = totalSessions > 0 ? (abandonedCount / totalSessions) * 100 : 0;
    
    const avgTurnoverMinutes = completedSessionsForTimeCalc > 0 
      ? (totalTimeMs / completedSessionsForTimeCalc) / (1000 * 60) 
      : 0;

    return {
      totalSessions,
      cartAbandonmentRate: cartAbandonmentRate.toFixed(1) + "%",
      avgTurnoverMinutes: Math.round(avgTurnoverMinutes) + " mins",
      totalOrders: orders.length,
    };
  },
});
