import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const inviteStaff = mutation({
  args: {
    restaurantId: v.id("restaurants"),
    name: v.string(),
    email: v.string(),
    role: v.union(
      v.literal("manager"),
      v.literal("waiter"),
      v.literal("chef")
    ),
  },
  handler: async (ctx, args) => {
    // userId will be linked when the staff member logs in via Auth0
    return ctx.db.insert("staff", {
      restaurantId: args.restaurantId,
      userId: "", // placeholder until they authenticate
      name: args.name,
      email: args.email,
      role: args.role,
    });
  },
});

export const linkStaffUser = mutation({
  args: {
    restaurantId: v.id("restaurants"),
    email: v.string(),
    userId: v.string(), // Auth0 sub
  },
  handler: async (ctx, args) => {
    const staffMember = await ctx.db
      .query("staff")
      .withIndex("by_restaurant", (q) =>
        q.eq("restaurantId", args.restaurantId)
      )
      .filter((q) => q.eq(q.field("email"), args.email))
      .first();
    if (!staffMember) throw new Error("Staff member not found");
    await ctx.db.patch(staffMember._id, { userId: args.userId });
  },
});

export const getStaffByRestaurant = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("staff")
      .withIndex("by_restaurant", (q) =>
        q.eq("restaurantId", args.restaurantId)
      )
      .collect();
  },
});

export const getMyRole = query({
  args: { userId: v.string(), restaurantId: v.id("restaurants") },
  handler: async (ctx, args) => {
    const member = await ctx.db
      .query("staff")
      .withIndex("by_restaurant_user", (q) =>
        q.eq("restaurantId", args.restaurantId).eq("userId", args.userId)
      )
      .first();
    return member?.role ?? null;
  },
});

export const removeStaff = mutation({
  args: { staffId: v.id("staff") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.staffId);
  },
});
