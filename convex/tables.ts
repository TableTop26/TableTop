import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createTable = mutation({
  args: {
    restaurantId: v.id("restaurants"),
    label: v.string(),
    zone: v.optional(v.string()),
    capacity: v.number(),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("tables", {
      restaurantId: args.restaurantId,
      label: args.label,
      zone: args.zone,
      capacity: args.capacity,
      status: "AVAILABLE",
    });
  },
});

export const listTables = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("tables")
      .withIndex("by_restaurant", (q) =>
        q.eq("restaurantId", args.restaurantId)
      )
      .collect();
  },
});

export const getTable = query({
  args: { tableId: v.id("tables") },
  handler: async (ctx, args) => {
    return ctx.db.get(args.tableId);
  },
});

export const updateTableStatus = mutation({
  args: {
    tableId: v.id("tables"),
    status: v.union(
      v.literal("OFFLINE"),
      v.literal("AVAILABLE"),
      v.literal("ORDERING"),
      v.literal("DINING"),
      v.literal("READY_TO_SERVE"),
      v.literal("PAYMENT_PENDING")
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.tableId, { status: args.status });
  },
});

export const assignSession = mutation({
  args: {
    tableId: v.id("tables"),
    sessionId: v.id("sessions"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.tableId, {
      currentSessionId: args.sessionId,
      status: "ORDERING",
    });
  },
});

export const clearTable = mutation({
  args: { tableId: v.id("tables") },
  handler: async (ctx, args) => {
    const table = await ctx.db.get(args.tableId);
    if (!table) throw new Error("Table not found");

    // Close the active session so guest cookies become invalid
    if (table.currentSessionId) {
      await ctx.db.patch(table.currentSessionId, { status: "closed" });
    }

    await ctx.db.patch(args.tableId, {
      status: "AVAILABLE",
      currentSessionId: undefined,
    });
  },
});

export const updateTable = mutation({
  args: {
    tableId: v.id("tables"),
    label: v.optional(v.string()),
    zone: v.optional(v.string()),
    capacity: v.optional(v.number()),
  },
  handler: async (ctx, { tableId, ...patch }) => {
    const updates = Object.fromEntries(
      Object.entries(patch).filter(([, v]) => v !== undefined)
    );
    await ctx.db.patch(tableId, updates);
  },
});

export const deleteTable = mutation({
  args: { tableId: v.id("tables") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.tableId);
  },
});
