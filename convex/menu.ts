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
    const updates = Object.fromEntries(
      Object.entries(patch).filter(([, v]) => v !== undefined)
    );
    await ctx.db.patch(menuItemId, updates);
  },
});

export const deleteMenuItem = mutation({
  args: { menuItemId: v.id("menuItems") },
  handler: async (ctx, args) => {
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
