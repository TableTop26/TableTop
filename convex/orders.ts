import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const placeOrder = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.status !== "active") {
      throw new Error("Session is not active");
    }

    // Pull all cart items
    const cartItems = await ctx.db
      .query("cartItems")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
    if (cartItems.length === 0) throw new Error("Cart is empty");

    // Hydrate with current menu item details (snapshot prices at order time)
    const orderItems = await Promise.all(
      cartItems.map(async (item) => {
        const menuItem = await ctx.db.get(item.menuItemId);
        if (!menuItem) throw new Error(`Menu item ${item.menuItemId} not found`);
        return {
          menuItemId: item.menuItemId,
          name: menuItem.name,
          price: menuItem.price,
          quantity: item.quantity,
          modifiers: item.modifiers,
        };
      })
    );

    const orderId = await ctx.db.insert("orders", {
      sessionId: args.sessionId,
      tableId: session.tableId,
      restaurantId: session.restaurantId,
      items: orderItems,
      status: "PLACED",
      placedAt: Date.now(),
    });

    // Clear the cart
    await Promise.all(cartItems.map((item) => ctx.db.delete(item._id)));

    // Table stays ORDERING until chef accepts; will move to DINING on SERVED
    return orderId;
  },
});

export const updateOrderStatus = mutation({
  args: {
    orderId: v.id("orders"),
    status: v.union(
      v.literal("PLACED"),
      v.literal("ACCEPTED"),
      v.literal("COOKING"),
      v.literal("READY"),
      v.literal("SERVED")
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");
    // Verify caller is owner or staff of this restaurant
    const restaurant = await ctx.db.get(order.restaurantId);
    if (!restaurant) throw new Error("Restaurant not found");
    const isOwner = restaurant.ownerId === identity.subject;
    if (!isOwner) {
      const staffMember = await ctx.db
        .query("staff")
        .withIndex("by_restaurant_user", (q) =>
          q
            .eq("restaurantId", order.restaurantId)
            .eq("userId", identity.subject)
        )
        .first();
      if (!staffMember) throw new Error("Not authorized");
    }

    await ctx.db.patch(args.orderId, { status: args.status });

    // When chef marks READY → table becomes READY_TO_SERVE (blue on waiter map)
    if (args.status === "READY") {
      await ctx.db.patch(order.tableId, { status: "READY_TO_SERVE" });
    }

    // When waiter marks SERVED → table becomes DINING (green)
    if (args.status === "SERVED") {
      await ctx.db.patch(order.tableId, { status: "DINING" });
    }
  },
});

export const getOrdersForTable = query({
  args: { tableId: v.id("tables") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("orders")
      .withIndex("by_table", (q) => q.eq("tableId", args.tableId))
      .order("desc")
      .collect();
  },
});

export const getOrdersForSession = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("orders")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .order("desc")
      .collect();
  },
});

export const getOpenKitchenTickets = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, args) => {
    const openOrders = await ctx.db
      .query("orders")
      .withIndex("by_restaurant", (q) =>
        q.eq("restaurantId", args.restaurantId)
      )
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "PLACED"),
          q.eq(q.field("status"), "ACCEPTED"),
          q.eq(q.field("status"), "COOKING"),
          q.eq(q.field("status"), "READY")
        )
      )
      .order("asc")
      .collect();

    // Hydrate with table label for the KDS display
    const hydrated = await Promise.all(
      openOrders.map(async (order) => {
        const table = await ctx.db.get(order.tableId);
        return { ...order, tableLabel: table?.label ?? "?" };
      })
    );

    return hydrated;
  },
});
