/**
 * Run once to seed test data:
 *   node scripts/seed.mjs
 */

import { ConvexHttpClient } from "convex/browser";
import { readFileSync } from "fs";
import { resolve } from "path";

// Read NEXT_PUBLIC_CONVEX_URL from .env.local
const envPath = resolve(process.cwd(), ".env.local");
const envContent = readFileSync(envPath, "utf-8");
const match = envContent.match(/NEXT_PUBLIC_CONVEX_URL=(.+)/);
if (!match) {
  console.error("NEXT_PUBLIC_CONVEX_URL not found in .env.local");
  process.exit(1);
}

const CONVEX_URL = match[1].trim();
const client = new ConvexHttpClient(CONVEX_URL);

// Dynamically import generated API (ESM)
const { api } = await import("../convex/_generated/api.js");

console.log("🌱 Seeding TableTop test data...\n");

// 1. Create restaurant
const restaurantId = await client.mutation(api.restaurants.createRestaurant, {
  name: "The Test Kitchen",
  ownerId: "seed|test-owner",
  taxRate: 5,
});
console.log("✅ Restaurant:", restaurantId);

// 2. Update with a UPI QR placeholder
await client.mutation(api.restaurants.updateRestaurant, {
  restaurantId,
  hours: "Mon–Sun 11am–11pm",
  upiQrUrl: "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=test@upi",
});

// 3. Create tables
const tableIds = await Promise.all(
  [
    { label: "T1", zone: "Main Hall", capacity: 4 },
    { label: "T2", zone: "Main Hall", capacity: 2 },
    { label: "T3", zone: "Outdoor",   capacity: 6 },
  ].map((t) =>
    client.mutation(api.tables.createTable, { restaurantId, ...t })
  )
);
console.log("✅ Tables:", tableIds);

// 4. Seed menu
const menuItems = [
  { name: "Butter Chicken",  category: "Mains",    price: 34900, description: "Slow-cooked chicken in a rich tomato-butter gravy." },
  { name: "Dal Makhani",     category: "Mains",    price: 27900, description: "Black lentils simmered overnight." },
  { name: "Garlic Naan",     category: "Breads",   price: 6900,  description: "Leavened bread with garlic, baked in tandoor." },
  { name: "Butter Naan",     category: "Breads",   price: 5900  },
  { name: "Mango Lassi",     category: "Drinks",   price: 14900, description: "Fresh mango blended with chilled yoghurt." },
  { name: "Masala Chai",     category: "Drinks",   price: 4900  },
  { name: "Gulab Jamun",     category: "Desserts", price: 12900, description: "Soft milk-solid dumplings in rose-scented syrup." },
];

await Promise.all(
  menuItems.map((item) =>
    client.mutation(api.menu.createMenuItem, { restaurantId, ...item })
  )
);
console.log("✅ Menu items:", menuItems.length, "items");

console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎉 Done! Open these URLs to test the guest flow:

  Table T1: http://localhost:3000/${restaurantId}/table/${tableIds[0]}
  Table T2: http://localhost:3000/${restaurantId}/table/${tableIds[1]}
  Table T3: http://localhost:3000/${restaurantId}/table/${tableIds[2]}

Open two different browsers (or private + normal) on the same
table URL to test the real-time shared cart.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
