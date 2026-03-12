import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  restaurants: defineTable({
    name: v.string(),
    logoUrl: v.optional(v.string()),
    hours: v.optional(v.string()),
    upiQrUrl: v.optional(v.string()),
    taxRate: v.number(), // percentage e.g. 5 for 5%
    ownerId: v.string(), // Auth0 sub
    subscriptionStatus: v.union(
      v.literal("trial"),
      v.literal("active"),
      v.literal("expired")
    ),
    subscriptionExpiresAt: v.optional(v.number()), // Unix ms
  }).index("by_owner", ["ownerId"]),

  staff: defineTable({
    restaurantId: v.id("restaurants"),
    userId: v.string(), // Auth0 sub
    role: v.union(
      v.literal("owner"),
      v.literal("manager"),
      v.literal("waiter"),
      v.literal("chef")
    ),
    name: v.string(),
    email: v.string(),
    isOnDuty: v.optional(v.boolean()),
  })
    .index("by_restaurant", ["restaurantId"])
    .index("by_user", ["userId"])
    .index("by_restaurant_user", ["restaurantId", "userId"]),

  tables: defineTable({
    restaurantId: v.id("restaurants"),
    label: v.string(), // e.g. "T1", "T2"
    zone: v.optional(v.string()), // e.g. "Outdoor", "Main Hall"
    capacity: v.number(),
    status: v.union(
      v.literal("OFFLINE"),
      v.literal("AVAILABLE"),
      v.literal("ORDERING"),
      v.literal("DINING"),
      v.literal("READY_TO_SERVE"),
      v.literal("PAYMENT_PENDING")
    ),
    currentSessionId: v.optional(v.id("sessions")),
  })
    .index("by_restaurant", ["restaurantId"])
    .index("by_restaurant_status", ["restaurantId", "status"]),

  menuItems: defineTable({
    restaurantId: v.id("restaurants"),
    name: v.string(),
    description: v.optional(v.string()),
    price: v.number(), // in paise (smallest unit)
    category: v.string(),
    imageUrl: v.optional(v.string()),
    isAvailable: v.boolean(),
  })
    .index("by_restaurant", ["restaurantId"])
    .index("by_restaurant_category", ["restaurantId", "category"]),

  sessions: defineTable({
    tableId: v.id("tables"),
    restaurantId: v.id("restaurants"),
    guests: v.array(
      v.object({
        name: v.string(),
        phone: v.string(),
        cookieToken: v.string(),
      })
    ),
    status: v.union(v.literal("active"), v.literal("closed")),
    lastActivityAt: v.number(), // Unix ms
    createdAt: v.number(), // Unix ms
  })
    .index("by_table", ["tableId"])
    .index("by_restaurant", ["restaurantId"])
    .index("by_table_status", ["tableId", "status"]),

  cartItems: defineTable({
    sessionId: v.id("sessions"),
    menuItemId: v.id("menuItems"),
    quantity: v.number(),
    modifiers: v.array(v.string()), // e.g. ["no onion", "extra spicy"]
    addedByGuestName: v.string(),
  })
    .index("by_session", ["sessionId"])
    .index("by_session_item", ["sessionId", "menuItemId"]),

  orders: defineTable({
    sessionId: v.id("sessions"),
    tableId: v.id("tables"),
    restaurantId: v.id("restaurants"),
    items: v.array(
      v.object({
        menuItemId: v.id("menuItems"),
        name: v.string(),
        price: v.number(),
        quantity: v.number(),
        modifiers: v.array(v.string()),
      })
    ),
    status: v.union(
      v.literal("PLACED"),
      v.literal("ACCEPTED"),
      v.literal("COOKING"),
      v.literal("READY"),
      v.literal("SERVED")
    ),
    placedAt: v.number(), // Unix ms
  })
    .index("by_session", ["sessionId"])
    .index("by_table", ["tableId"])
    .index("by_restaurant", ["restaurantId"])
    .index("by_restaurant_status", ["restaurantId", "status"]),

  payments: defineTable({
    sessionId: v.id("sessions"),
    restaurantId: v.id("restaurants"),
    totalAmount: v.number(), // in paise
    method: v.union(
      v.literal("upi"),
      v.literal("counter"),
      v.literal("waiter_upi")
    ),
    status: v.union(v.literal("pending"), v.literal("confirmed")),
    confirmedAt: v.optional(v.number()), // Unix ms
  })
    .index("by_session", ["sessionId"])
    .index("by_restaurant", ["restaurantId"]),
});
