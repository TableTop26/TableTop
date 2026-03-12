import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "./lib/auth0";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export default async function proxy(request: NextRequest) {
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
      // Resolve role: prefer Auth0 custom claim, otherwise look up staff table.
      // Try by userId (sub) first — most reliable once linked. Fall back to email
      // for first login before the userId is written into the staff record.
      let role: string = session.user["https://tabletop.app/role"] || "";

      if (!role) {
        try {
          // Primary: look up by Auth0 sub (works after first login)
          let staffRecord = await convex.query(api.staff.getStaffMemberByUserId, {
            userId: session.user.sub,
          });
          // Secondary: look up by email (very first login, userId not yet linked)
          if (!staffRecord && session.user.email) {
            staffRecord = await convex.query(api.staff.getStaffByEmail, {
              email: session.user.email,
            });
          }
          if (staffRecord) {
            role = staffRecord.role;
            // Auto-link Auth0 sub on first login so userId lookup works next time
            if (staffRecord.userId !== session.user.sub && session.user.email) {
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

      // --- Onboarding & Subscription gate (owner only) ---
      // 1. If no restaurant exists, redirect to onboarding form.
      // 2. If restaurant exists but subscription is trial/expired, redirect to pay page.
      const isOnboardingPage = pathname.startsWith("/dashboard/onboarding");
      if (role === "owner" && !isOnboardingPage) {
        try {
          const restaurant = await convex.query(api.restaurants.getRestaurantByOwner, {
            ownerId: session.user.sub,
          });
          
          if (!restaurant) {
            return NextResponse.redirect(new URL("/dashboard/onboarding", request.url));
          }
          
          // TODO: Uncomment this after Razorpay integration is complete
          // if (restaurant.subscriptionStatus !== "active") {
          //   return NextResponse.redirect(new URL("/dashboard/onboarding/pay", request.url));
          // }
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
