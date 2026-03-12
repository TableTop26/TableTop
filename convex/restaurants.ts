import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createRestaurant = mutation({
  args: {
    name: v.string(),
    ownerId: v.string(),
    taxRate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // If called from an authenticated client, enforce that the caller
    // can only create a restaurant for their own identity.
    const identity = await ctx.auth.getUserIdentity();
    if (identity && identity.subject !== args.ownerId) {
      throw new Error("Not authorized: ownerId must match authenticated user");
    }

    // Prevent duplicate restaurants for the same owner
    const existing = await ctx.db
      .query("restaurants")
      .withIndex("by_owner", (q) => q.eq("ownerId", args.ownerId))
      .first();
    if (existing) return existing._id;

    return ctx.db.insert("restaurants", {
      name: args.name,
      ownerId: args.ownerId,
      taxRate: args.taxRate ?? 5,
      subscriptionStatus: "trial",
    });
  },
});

export const getRestaurantByOwner = query({
  args: { ownerId: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("restaurants")
      .withIndex("by_owner", (q) => q.eq("ownerId", args.ownerId))
      .first();
  },
});

export const getRestaurantById = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, args) => {
    return ctx.db.get(args.restaurantId);
  },
});

export const activateSubscription = mutation({
  args: { ownerId: v.string() },
  handler: async (ctx, { ownerId }) => {
    const restaurant = await ctx.db
      .query("restaurants")
      .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
      .first();
    if (!restaurant) throw new Error("Restaurant not found for owner: " + ownerId);

    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    await ctx.db.patch(restaurant._id, {
      subscriptionStatus: "active",
      subscriptionExpiresAt: Date.now() + thirtyDaysMs,
    });
    return restaurant._id;
  },
});

export const updateRestaurant = mutation({
  args: {
    restaurantId: v.id("restaurants"),
    name: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    hours: v.optional(v.string()),
    upiQrUrl: v.optional(v.string()),
    taxRate: v.optional(v.number()),
    subscriptionStatus: v.optional(
      v.union(v.literal("trial"), v.literal("active"), v.literal("expired"))
    ),
    subscriptionExpiresAt: v.optional(v.number()),
  },
  handler: async (ctx, { restaurantId, ...patch }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const restaurant = await ctx.db.get(restaurantId);
    if (!restaurant || restaurant.ownerId !== identity.subject) {
      throw new Error("Not authorized");
    }
    // Strip undefined fields
    const updates = Object.fromEntries(
      Object.entries(patch).filter(([, v]) => v !== undefined)
    );
    await ctx.db.patch(restaurantId, updates);
  },
});

// Internal — called by the daily cron job in crons.ts
export const expireSubscriptions = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const trialDurationMs = 30 * 24 * 60 * 60 * 1000;
    const restaurants = await ctx.db.query("restaurants").collect();
    for (const r of restaurants) {
      if (r.subscriptionStatus === "expired") continue;

      const expiresAt =
        r.subscriptionExpiresAt ?? r._creationTime + trialDurationMs;

      if (now > expiresAt) {
        await ctx.db.patch(r._id, { subscriptionStatus: "expired" });
      }
    }
  },
});
