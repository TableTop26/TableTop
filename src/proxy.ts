import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "./lib/auth0";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Guest Session Validation for /table/ routes
  if (pathname.includes("/table/") && !pathname.endsWith("/checkout")) {
    const guestTokenCookie = request.cookies.get("tabletop_guest_token")?.value;
    if (guestTokenCookie) {
      try {
        const { sessionId } = JSON.parse(guestTokenCookie);
        
        // Edge-compatible fetch to check session
        const session = await convex.query(api.sessions.getSessionById, { 
          sessionId: sessionId as Id<"sessions"> 
        });

        // If session is closed/expired
        if (!session || session.status !== "active") {
          // Identify table route to redirect correctly (extract /restaurantId/table/tableId format)
          const match = pathname.match(/(\/[^\/]+\/table\/[^\/]+)/);
          const redirectPath = match ? match[1] : "/";
          
          const response = NextResponse.redirect(new URL(redirectPath, request.url));
          response.cookies.delete("tabletop_guest_token");
          return response;
        }
      } catch (e) {
        // Ignored, let the page handle missing/invalid cookies
      }
    }
  }

  // 2. Admin RBAC + subscription gate for /dashboard routes
  if (pathname.startsWith("/dashboard")) {
    const res = await auth0.middleware(request);
    const session = await auth0.getSession(request);

    if (session?.user) {
      // Resolve role: prefer Auth0 custom claim, otherwise look up staff table by email.
      let role: string = session.user["https://tabletop.app/role"] || "";

      if (!role && session.user.email) {
        try {
          const staffRecord = await convex.query(api.staff.getStaffByEmail, {
            email: session.user.email,
          });
          if (staffRecord) {
            role = staffRecord.role;
            // Auto-link Auth0 sub on first login so subsequent role lookups by userId work
            if (!staffRecord.userId || staffRecord.userId !== session.user.sub) {
              await convex.mutation(api.staff.linkStaffUserByEmail, {
                email: session.user.email,
                userId: session.user.sub,
              });
            }
          }
        } catch {
          // Convex unavailable — fall through to owner default
        }
      }

      if (!role) role = "owner";

      // --- Subscription gate (owner only) ---
      // If the owner's subscription has expired, send them to the payment page.
      // Skip the gate when they're already navigating to /dashboard/onboarding to avoid loops.
      const isPayPage = pathname.startsWith("/dashboard/onboarding");
      if (role === "owner" && !isPayPage) {
        try {
          const restaurant = await convex.query(api.restaurants.getRestaurantByOwner, {
            ownerId: session.user.sub,
          });
          if (restaurant && restaurant.subscriptionStatus === "expired") {
            return NextResponse.redirect(new URL("/dashboard/onboarding/pay", request.url));
          }
        } catch {
          // Convex unavailable — allow through rather than hard-locking
        }
      }

      // --- Role-based route restrictions ---
      if (role === "chef" && pathname !== "/dashboard/kitchen") {
        return NextResponse.redirect(new URL("/dashboard/kitchen", request.url));
      }

      if (role === "waiter" && !pathname.startsWith("/dashboard/floor")) {
        return NextResponse.redirect(new URL("/dashboard/floor", request.url));
      }
    }

    return res;
  }

  // Standard fallback
  return await auth0.middleware(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|api).*)",
  ],
};
