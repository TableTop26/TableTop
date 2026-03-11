import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const addCartItem = mutation({
  args: {
    sessionId: v.id("sessions"),
    menuItemId: v.id("menuItems"),
    quantity: v.number(),
    modifiers: v.array(v.string()),
    addedByGuestName: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if item already exists in cart (same item + same modifiers)
    const existing = await ctx.db
      .query("cartItems")
      .withIndex("by_session_item", (q) =>
        q.eq("sessionId", args.sessionId).eq("menuItemId", args.menuItemId)
      )
      .filter((q) =>
        q.eq(
          q.field("modifiers"),
          args.modifiers
        )
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        quantity: existing.quantity + args.quantity,
      });
      return existing._id;
    }

    // Touch session activity
    await ctx.db.patch(args.sessionId, { lastActivityAt: Date.now() });

    return ctx.db.insert("cartItems", {
      sessionId: args.sessionId,
      menuItemId: args.menuItemId,
      quantity: args.quantity,
      modifiers: args.modifiers,
      addedByGuestName: args.addedByGuestName,
    });
  },
});

export const removeCartItem = mutation({
  args: { cartItemId: v.id("cartItems") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.cartItemId);
  },
});

export const updateCartItemQuantity = mutation({
  args: {
    cartItemId: v.id("cartItems"),
    quantity: v.number(),
  },
  handler: async (ctx, args) => {
    if (args.quantity <= 0) {
      await ctx.db.delete(args.cartItemId);
    } else {
      await ctx.db.patch(args.cartItemId, { quantity: args.quantity });
    }
  },
});

export const getCartForSession = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const cartItems = await ctx.db
      .query("cartItems")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    // Hydrate with menu item details
    const hydrated = await Promise.all(
      cartItems.map(async (item) => {
        const menuItem = await ctx.db.get(item.menuItemId);
        return { ...item, menuItem };
      })
    );

    return hydrated;
  },
});

export const clearCart = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("cartItems")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
    await Promise.all(items.map((item) => ctx.db.delete(item._id)));
  },
});
