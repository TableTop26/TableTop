# Plan: TableTop — Full Implementation Roadmap

The app is a bare scaffold. Auth0 middleware is wired to a dead file (`proxy.ts`), Convex has zero schema, and there is only one page. Work is split into **8 phases** — infra first, then parallel feature tracks (Guest, Owner, Waiter, Chef, Manager), then RBAC and Razorpay. Each track is independently assignable.

---

## Phase 0 — Infrastructure Fix (Prerequisite for everything)

1. Rename `src/proxy.ts` → `src/middleware.ts` so Next.js picks it up as the edge middleware. The `matcher` config and `auth0.middleware` export are already correct inside.
2. Create `src/app/auth/[auth0]/route.ts` and export `auth0.handleAuth()` as both `GET` and `POST` handlers — this enables `/auth/login`, `/auth/logout`, and `/auth/callback`.
3. Create a `ConvexClientProvider` component (e.g. `src/components/ConvexClientProvider.tsx`) wrapping `ConvexProvider` from `convex/react` with the `NEXT_PUBLIC_CONVEX_URL` env var.
4. Add `ConvexClientProvider` to `src/app/layout.tsx`, wrapping `{children}`.
5. Update app metadata in `src/app/layout.tsx`: title → "TableTop", description → product tagline.
6. Add a `.env.local.example` documenting all required vars: `AUTH0_SECRET`, `AUTH0_BASE_URL`, `AUTH0_ISSUER_BASE_URL`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`, `NEXT_PUBLIC_CONVEX_URL`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`.

---

## Phase 1 — Convex Schema & Backend Core (Parallel with Phase 0)

All files live in `convex/`. This is the most foundational backend work.

**1. `convex/schema.ts`** — Define all tables:
- `restaurants`: `name`, `logoUrl`, `hours`, `upiQrUrl`, `taxRate`, `ownerId (Auth0 sub)`, `subscriptionStatus`, `subscriptionExpiresAt`
- `staff`: `restaurantId`, `userId (Auth0 sub)`, `role: "owner"|"manager"|"waiter"|"chef"`, `name`, `email`
- `tables`: `restaurantId`, `label` (e.g. "T1"), `zone`, `capacity`, `status: "OFFLINE"|"AVAILABLE"|"ORDERING"|"DINING"|"READY_TO_SERVE"|"PAYMENT_PENDING"`, `currentSessionId?`
- `menuItems`: `restaurantId`, `name`, `description`, `price`, `category`, `imageUrl?`, `isAvailable`
- `sessions`: `tableId`, `restaurantId`, `guests: [{name, phone, cookieToken}]`, `status: "active"|"closed"`, `lastActivityAt`, `createdAt`
- `cartItems`: `sessionId`, `menuItemId`, `quantity`, `modifiers`, `addedByGuestName`
- `orders`: `sessionId`, `tableId`, `restaurantId`, `items: [{menuItemId, name, price, quantity, modifiers}]`, `status: "PLACED"|"ACCEPTED"|"COOKING"|"READY"|"SERVED"`, `placedAt`
- `payments`: `sessionId`, `restaurantId`, `totalAmount`, `method: "upi"|"counter"|"waiter_upi"`, `status: "pending"|"confirmed"`, `confirmedAt?`

**2. `convex/restaurants.ts`** — `createRestaurant`, `getRestaurantByOwner`, `updateRestaurant` (logo, hours, UPI QR, tax rate)

**3. `convex/staff.ts`** — `inviteStaff`, `getStaffByRestaurant`, `getMyRole` (looks up calling user's Auth0 sub)

**4. `convex/tables.ts`** — `createTable`, `listTables`, `updateTableStatus`, `assignSession`, `clearTable` (resets to `AVAILABLE`, invalidates session cookie)

**5. `convex/menu.ts`** — `createMenuItem`, `updateMenuItem`, `deleteMenuItem`, `listMenuItems`, `setItemAvailability`, `bulkImportMenuItems` (for Swiggy/Zomato JSON)

**6. `convex/sessions.ts`** — `createSession` (on QR scan), `joinSession` (adds guest to `guests[]`), `getActiveSession`, `invalidateSession`, Convex scheduled function for 30-min auto-timeout (uses `ctx.scheduler.runAfter`)

**7. `convex/cart.ts`** — `addCartItem`, `removeCartItem`, `updateCartItemQuantity`, `getCartForSession` (real-time reactive query)

**8. `convex/orders.ts`** — `placeOrder` (moves cart → order, sets table to `DINING`), `updateOrderStatus` (`ACCEPTED`→`COOKING`→`READY`→`SERVED`), `getOrdersForTable`, `getOpenKitchenTickets`

**9. `convex/payments.ts`** — `initiatePayment`, `confirmPayment`, `getPaymentForSession`

---

## Phase 2 — Guest Track

Route prefix: `src/app/[restaurantId]/table/[tableId]/`

1. **QR landing** — `page.tsx`: reads `restaurantId` + `tableId` from URL params, calls `sessions.createSession` or `sessions.joinSession`, sets HTTP-only cookie (`tabletop_guest_token`, 4h expiry) via a Route Handler at `src/app/api/guest/session/route.ts`.
2. **Guest join form** — name + phone fields, validation, submits to the session Route Handler above.
3. **Menu/Cart page** — `cart/page.tsx`: reactive `useQuery(api.menu.listMenuItems)` + `useQuery(api.cart.getCartForSession)`. Renders category-grouped menu. "Add to cart" calls `useMutation(api.cart.addCartItem)`. Shows live shared cart sidebar (all guests see each other's additions in real-time).
4. **Place Order button** — calls `api.orders.placeOrder`, transitions UI to order tracking view.
5. **Order tracking view** — `tracking/page.tsx`: reactive `useQuery(api.orders.getOrdersForTable)` showing `PLACED → ACCEPTED → COOKING → READY → SERVED` status badge for each item.
6. **Mid-meal add** — reuse cart page in `DINING` state; "Add More" button reopens menu, appends to existing session.
7. **Checkout page** — `checkout/page.tsx`: shows itemized bill with tax. Three payment method buttons: "Pay via UPI" (shows restaurant's UPI QR from `restaurant.upiQrUrl`), "Ask Waiter" (sets table to `PAYMENT_PENDING`), "Pay at Counter".
8. **Session cleared screen** — redirect to a static `/thank-you` page when `session.status === "closed"`.
9. **Auto-session timeout** — handled server-side in `convex/sessions.ts` (Phase 1 step 6). Frontend just reacts to the closed state.

---

## Phase 3 — Owner Track

Route prefix: `src/app/dashboard/`  (Auth0-protected)

1. **Onboarding wizard** — `onboarding/page.tsx`: multi-step form. Step 1: restaurant name, logo upload. Step 2: UPI QR image upload. Step 3: tax rate. Calls `api.restaurants.createRestaurant`.
2. **Menu management page** — `dashboard/menu/page.tsx`: table of `menuItems` with inline edit/delete. "Add Item" drawer. "Import" button that accepts a JSON file (Swiggy/Zomato format) and calls `api.menu.bulkImportMenuItems`.
3. **Floor plan builder** — `dashboard/floor/page.tsx`: drag-and-drop grid where owner places table icons. Each icon has a label (T1, T2…) and zone name. Saves via `api.tables.createTable`. Generate printable QR codes per table (use a QR library like `qrcode.react`).
4. **Staff management page** — `dashboard/staff/page.tsx`: list of staff with roles. "Invite" form (name, email, role). Calls `api.staff.inviteStaff`. Auth0 Management API call to send invitation email.
5. **Analytics page** — `dashboard/analytics/page.tsx`: basic stats — total sessions, avg table turnover time, cart abandonment rate. Derived from Convex queries over `sessions` and `orders`.
6. **Settings page** — `dashboard/settings/page.tsx`: edit logo, hours, UPI QR, tax rate.

---

## Phase 4 — Waiter Track

Route prefix: `src/app/dashboard/floor/`

1. **Live Table Map** — `page.tsx`: reactive `useQuery(api.tables.listTables)`. Renders a grid of table cards color-coded by `status`:
   - `OFFLINE` → dark grey
   - `AVAILABLE` → light grey
   - `ORDERING` → yellow
   - `READY_TO_SERVE` → blue
   - `DINING` → green
   - `PAYMENT_PENDING` → orange
2. **Table card actions** — clicking a card opens a side panel with context-sensitive action buttons based on state:
   - `READY_TO_SERVE` → "Mark Served" → calls `updateTableStatus('DINING')`
   - `PAYMENT_PENDING` → "Show UPI QR" + "Confirm Cash/Card" → calls `api.payments.confirmPayment` → then `api.tables.clearTable`
   - `DINING` → "Request Bill" shortcut
   - `AVAILABLE` → "New Order" (opens Manual POS)
3. **Manual POS fallback** — `manual-order/[tableId]/page.tsx`: waiter-facing menu browser + cart. Calls same `api.orders.placeOrder` mutation as guest flow.
4. **Mark Clear** — after payment confirmed, "Mark Table Clear" button calls `api.tables.clearTable` → status → `AVAILABLE`, invalidates guest session cookie.

---

## Phase 5 — Chef / KDS Track

Route prefix: `src/app/dashboard/kitchen/`

1. **KDS board** — `page.tsx`: three-column Kanban: *Queue*, *In Progress*, *Ready*. Reactive `useQuery(api.orders.getOpenKitchenTickets)`. Each ticket card shows table label, items with **bolded modifiers** (e.g. "no onion"), and timestamp.
2. **Accept ticket** — "Accept" button calls `api.orders.updateOrderStatus('ACCEPTED')` → card moves to *In Progress* column.
3. **Set for Pickup** — "Ready" button calls `api.orders.updateOrderStatus('READY')` + `api.tables.updateTableStatus('READY_TO_SERVE')` → Waiter's map turns blue.
4. **Out of Stock alert** — "Mark Out of Stock" button per menu item calls `api.menu.setItemAvailability(false)` → triggers a Convex reactive update that grays out the item on all guest menus and shows a toast to floor staff.

---

## Phase 6 — Manager Track

Route prefix: `src/app/dashboard/` (same as Owner, but with role-gated sections)

1. **Combined view** — Managers see both the Live Table Map (Phase 4) and the Admin Dashboard (Phase 3) in a unified nav. No extra pages needed — just RBAC gate.
2. **On-the-fly availability toggle** — on the Live Table Map, add a "Menu" shortcut that opens an availability drawer calling `api.menu.setItemAvailability`. (Reuses Phase 5 OOS logic.)
3. **Staff on-duty management** — add/remove staff from active shift within `dashboard/staff/page.tsx`.

---

## Phase 7 — RBAC & Protected Routes

1. **Auth0 roles claim** — configure Auth0 action (in Auth0 dashboard) to add a custom claim `https://tabletop.app/role` to the ID token from the `staff` Convex table lookup.
2. **Middleware route guards** — extend `src/middleware.ts` with path-based role checks: `/dashboard/kitchen/*` → `chef` only; `/dashboard/floor/*` → `waiter|manager`; `/dashboard/*` → `owner|manager|waiter|chef`; `/` (guest routes) → no Auth0 required.
3. **`withRole` server component wrapper** — `src/lib/withRole.ts`: reads session from `auth0.getSession()`, checks role claim, redirects to `/unauthorized` if mismatch.
4. **Role-aware nav** — top nav renders different links based on role (Owner sees analytics + staff; Waiter sees only floor map; Chef sees only KDS).
5. **`/unauthorized` page** — simple error page for mismatched roles.
6. **Guest cookie middleware** — in the same `src/middleware.ts`, for guest routes, validate the `tabletop_guest_token` cookie against the Convex session; if the table status is `AVAILABLE`, clear the cookie and redirect to the join page.

---

## Phase 8 — Razorpay Subscription Billing

1. **Install Razorpay SDK** — `razorpay` npm package.
2. **Checkout API route** — `src/app/api/razorpay/create-order/route.ts`: creates a Razorpay order for ₹49 trial subscription using server-side `Razorpay` client.
3. **Payment page** — `src/app/onboarding/pay/page.tsx`: loads Razorpay checkout.js, renders the ₹49 payment button. On success, calls next step.
4. **Webhook handler** — `src/app/api/razorpay/webhook/route.ts`: verifies Razorpay signature, on `subscription.activated` event calls `api.restaurants.updateRestaurant` to set `subscriptionStatus: "active"` and `subscriptionExpiresAt`.
5. **Subscription gate** — add a check in `src/middleware.ts`: if an authenticated restaurant user has `subscriptionStatus !== "active"`, redirect them to `/onboarding/pay` before any dashboard access.
6. **Subscription expiry handling** — Convex scheduled function that daily checks `subscriptionExpiresAt`; marks `subscriptionStatus: "expired"` and triggers a renewal email.

---

## Verification Checklist

- [ ] `npx convex dev` — schema pushes cleanly, all query/mutation types generate
- [ ] Auth0 round-trip — `/auth/login` → callback → session → `/auth/logout`
- [ ] Guest flow — scan (or manually hit) `/:restaurantId/table/:tableId`, join, add items, place order; verify real-time sync across two browser tabs
- [ ] KDS — confirm order placed in guest tab appears on `/dashboard/kitchen` instantly
- [ ] Waiter map — confirm status color changes in real-time on `/dashboard/floor`
- [ ] Razorpay — test ₹1 payment in sandbox, confirm webhook flips `subscriptionStatus`
- [ ] RBAC — log in as each role, confirm forbidden routes redirect correctly

---

## Delegation Map (Feature-by-Feature Tracks)

| Track | Suggested Owner |
|---|---|
| Phase 0 (Infra) + Phase 1 (Convex schema/backend) | Co-founder A (backend-heavy) |
| Phase 2 (Guest flow) | Co-founder B (frontend-heavy) |
| Phase 3 (Owner dashboard) | Co-founder A |
| Phase 4 (Waiter floor map) | Co-founder B |
| Phase 5 (Chef KDS) | Co-founder A |
| Phase 6 (Manager) | No extra work — emerges from Phases 3+4 |
| Phase 7 (RBAC) | Co-founder A |
| Phase 8 (Razorpay) | Co-founder A |

> Phase 2 (Guest) and Phase 3 (Owner) can run in parallel once Phase 1 schema is published.
