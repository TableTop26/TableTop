import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createRestaurant = mutation({
  args: {
    name: v.string(),
    ownerId: v.string(),
    taxRate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
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
    // Strip undefined fields
    const updates = Object.fromEntries(
      Object.entries(patch).filter(([, v]) => v !== undefined)
    );
    await ctx.db.patch(restaurantId, updates);
  },
});
