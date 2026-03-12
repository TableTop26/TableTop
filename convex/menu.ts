import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createMenuItem = mutation({
  args: {
    restaurantId: v.id("restaurants"),
    name: v.string(),
    description: v.optional(v.string()),
    price: v.number(), // in paise
    category: v.string(),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const restaurant = await ctx.db.get(args.restaurantId);
    if (!restaurant || restaurant.ownerId !== identity.subject)
      throw new Error("Not authorized");
    return ctx.db.insert("menuItems", {
      restaurantId: args.restaurantId,
      name: args.name,
      description: args.description,
      price: args.price,
      category: args.category,
      imageUrl: args.imageUrl,
      isAvailable: true,
    });
  },
});

export const updateMenuItem = mutation({
  args: {
    menuItemId: v.id("menuItems"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    price: v.optional(v.number()),
    category: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, { menuItemId, ...patch }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const item = await ctx.db.get(menuItemId);
    if (!item) throw new Error("Menu item not found");
    const restaurant = await ctx.db.get(item.restaurantId);
    if (!restaurant || restaurant.ownerId !== identity.subject)
      throw new Error("Not authorized");
    const updates = Object.fromEntries(
      Object.entries(patch).filter(([, v]) => v !== undefined)
    );
    await ctx.db.patch(menuItemId, updates);
  },
});

export const deleteMenuItem = mutation({
  args: { menuItemId: v.id("menuItems") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const item = await ctx.db.get(args.menuItemId);
    if (!item) throw new Error("Menu item not found");
    const restaurant = await ctx.db.get(item.restaurantId);
    if (!restaurant || restaurant.ownerId !== identity.subject)
      throw new Error("Not authorized");
    await ctx.db.delete(args.menuItemId);
  },
});

export const listMenuItems = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("menuItems")
      .withIndex("by_restaurant", (q) =>
        q.eq("restaurantId", args.restaurantId)
      )
      .collect();
  },
});

export const setItemAvailability = mutation({
  args: {
    menuItemId: v.id("menuItems"),
    isAvailable: v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const item = await ctx.db.get(args.menuItemId);
    if (!item) throw new Error("Menu item not found");
    // Allow owners AND managers (staff) to toggle availability
    const restaurant = await ctx.db.get(item.restaurantId);
    if (!restaurant) throw new Error("Restaurant not found");
    const isOwner = restaurant.ownerId === identity.subject;
    if (!isOwner) {
      const staffMember = await ctx.db
        .query("staff")
        .withIndex("by_restaurant_user", (q) =>
          q.eq("restaurantId", item.restaurantId).eq("userId", identity.subject)
        )
        .first();
      if (!staffMember) throw new Error("Not authorized");
    }
    await ctx.db.patch(args.menuItemId, { isAvailable: args.isAvailable });
  },
});

export const bulkImportMenuItems = mutation({
  args: {
    restaurantId: v.id("restaurants"),
    items: v.array(
      v.object({
        name: v.string(),
        description: v.optional(v.string()),
        price: v.number(), // in paise
        category: v.string(),
        imageUrl: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const restaurant = await ctx.db.get(args.restaurantId);
    if (!restaurant || restaurant.ownerId !== identity.subject)
      throw new Error("Not authorized");
    const ids: string[] = [];
    for (const item of args.items) {
      const id = await ctx.db.insert("menuItems", {
        restaurantId: args.restaurantId,
        name: item.name,
        description: item.description,
        price: item.price,
        category: item.category,
        imageUrl: item.imageUrl,
        isAvailable: true,
      });
      ids.push(id);
    }
    return ids;
  },
});
