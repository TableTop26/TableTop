# Product Requirements Document: TableTop

## 1. Meta Information
* **App Name:** TableTop
* **Authors:** Aman & Paras
* **Status:** Final / Ready for Development
* **Target Launch Date:** TBD

---

## 2. Problem Statement
Dining out in groups often results in a disjointed ordering experience. Waiting for servers to take orders, miscommunications with custom dish modifiers, and the awkwardness of splitting the bill at the end of the meal create friction. Simultaneously, restaurants struggle with table turnover speed, order accuracy, and efficient floor management during peak hours.

## 3. Value Proposition
TableTop is a two-sided restaurant operating system. For guests, it delivers a seamless, real-time shared cart so a group can order and pay collaboratively from their own phones. For restaurants, it provides digital floor management, a kitchen display system, and point-of-sale capabilities that increase table turnover and reduce staff friction.

## 4. Target Audience
* **Guests:** Diners who want control over their ordering pace and payment without flagging down staff.
* **Owners:** Restaurant operators seeking to increase table turnover and digitize operations.
* **Managers:** Day-to-day operators who need full access to the floor map combined with admin-level menu and staff control.
* **Waiters:** Front-of-house staff needing a visual, real-time pulse on their assigned tables.
* **Chefs:** Back-of-house staff needing organized, digital order tickets with clear modifiers.

---

## 5. Core Features (The MVP)

### Guest App Features
* **QR Table Auto-Detect:** Seamless session entry via physical QR scan.
* **Real-Time Shared Cart:** Multi-user sync allowing a table to build a single order collaboratively.
* **Live Order Tracking:** Visibility into kitchen status (e.g., In queue, Cooking, Ready).
* **Mid-Meal Additions:** Ability to add items (drinks, extra bread) to an active session without starting over.
* **Flexible Checkout:** Support for App UPI, scanning the Waiter's device, or paying at the counter.
* **Auto-Session Timeout:** Cart automatically clears after 30 minutes of zero activity.

### Restaurant OS Features
* **Role-Based Access Control (RBAC):** Distinct permission levels and views for Owners, Managers, Waiters, and Chefs.
* **Admin Dashboard:** Tools for menu management (Swiggy/Zomato import), payment setup (UPI QR upload), floor plan building, and analytics.
* **Live Table Map (Waiter/Manager):** A real-time, color-coded visual dashboard of the restaurant floor.
* **Kitchen Display System (Chef):** Digital Kanban board for incoming tickets, preparation tracking, and "Out of Stock" alerts.
* **Manual POS Fallback:** Ability for floor staff to bypass the QR system and manually input orders for tech-averse guests.

---

## 6. System Architecture: Table States (Dev Reference)
The entire restaurant floor logic relies on the following automated state changes triggered by Guest or Staff actions:

* ⚫ **`OFFLINE` (Dark Grey):** Table is reserved, closed, or out of service.
* ⚪ **`AVAILABLE` (Light Grey):** Table is empty, clean, and ready to be seated.
* 🟡 **`ORDERING` (Yellow):** Active shared cart session; guests are browsing and adding items.
* 🔵 **`READY_TO_SERVE` (Blue):** Chef marked the ticket complete; a Waiter must run food to the table.
* 🟢 **`DINING` (Green):** Food delivered; active dining session.
* 🟠 **`PAYMENT_PENDING` (Orange):** Guests requested the bill and are settling via UPI, cash, or card.

---

## 7. User Flows

### A. The Guest Flow (Shared Cart & Checkout)
1. **Join:** Guest scans table QR, enters name/phone, and joins the real-time shared cart.
2. **Order:** Guests collaboratively add items and modifiers. One guest taps "Confirm Place Order."
3. **Dine:** Guests view live status. Can add mid-meal items to the active session.
4. **Pay:** Guests view the final bill and select a payment method (Phone UPI, Waiter screen UPI, Counter).
5. **Exit:** System confirms payment, texts/emails the receipt, and clears the table session.

### B. The Owner Flow (Setup & Admin)
1. **Initialize:** Owner creates the restaurant profile (Logo, Hours).
2. **Finance:** Owner uploads the master UPI QR code and sets tax rates.
3. **Menu & Floor:** Owner imports menu items and maps out the physical tables/zones.
4. **Staff:** Owner invites Managers, Waitstaff, and Kitchen staff, assigning respective permissions.

### C. The Waiter Flow (Floor Management)
1. **Monitor:** Waiter watches the Live Table Map for status changes.
2. **Action (Blue):** Waiter picks up food from the kitchen and serves it to the table (updates to Green).
3. **Action (Orange):** Waiter assists with payment (displays UPI QR or takes physical card).
4. **Reset:** Waiter taps "Mark Clear" to turn the table back to Light Grey for the next guests.
5. **Fallback:** Waiter manually inputs orders for tech-averse guests.

### D. The Chef Flow (Kitchen Display System)
1. **Receive:** Chef views chronological tickets with highlighted modifiers (e.g., "no onion").
2. **Cook:** Chef taps "Accept" to move the ticket to *In Progress*.
3. **Handoff:** Chef taps "Set for Pickup," changing the Waiter's map to Blue.
4. **Exception:** Chef taps "Out of Stock" on an item, sending an immediate alert to the floor staff.

### E. The Manager Flow (Operations & Escalation)
1. **Monitor:** Manager accesses both the Live Table Map and Admin Dashboard.
2. **Intervene:** Manager updates menu item availability on the fly if the kitchen runs out of ingredients.
3. **Support:** Manager assists Waiters on the floor during peak hours and handles staffing updates in the system.

---

## 8. Success Metrics (V1 Goals)
* **Adoption:** % of tables that use the QR system vs. Manual Waiter Fallback.
* **Speed:** Reduction in average table turnover time (from seating to payment).
* **Cart Health:** Cart abandonment rate (sessions started vs. orders actually placed).

## 9. Out of Scope (For Future V1.1+)
* Complex loyalty point systems.
* Granular ingredient-level inventory tracking.
* Split-the-bill calculators (guests will pay the single grand total for V1).

---

## 10. Tech Stack & Infrastructure
* **Database & Real-Time Engine:** Convex. Acts as the reactive backend, automatically syncing database mutations across all connected clients (Guests, Waiters, Chefs) without requiring custom WebSocket management.
* **Frontend Component Library:** shadcn/ui for rapid, customizable, and accessible UI development.
* **Authentication (Restaurant Side):** Auth0. Handles secure login and token management for all Role-Based Access profiles (Owner, Manager, Waiter, Chef).
* **Authentication (Guest Side):** Frictionless, passwordless entry using HTTP-only cookies.
    * *Cookie Logic:* Guest cookies are set with a **4-hour expiration** to cover long dining sessions. However, the session is forcefully invalidated on the backend the moment the table is marked `AVAILABLE` (Light Grey) by the staff, preventing a guest from ordering after they leave.
* **Payment Gateway (SaaS):** Razorpay integration to handle the restaurant's subscription billing. *(Note: Guest food payments are handled via the Owner's uploaded UPI QR, avoiding per-transaction gateway fees for the restaurant).*

## 11. Business Model & Onboarding
* **SaaS Subscription:** The platform operates on a recurring SaaS model for restaurant owners.
* **Trial Structure:** Open, self-serve signups for any restaurant. The first month is offered as a low-barrier trial for **₹49**.
* **Frictionless Onboarding:** Owners can sign up, pay the ₹49 via Razorpay, import their Zomato/Swiggy menu, and be operational the same day without needing a sales call.