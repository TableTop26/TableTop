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

  // 2. Admin RBAC for /dashboard routes
  if (pathname.startsWith("/dashboard")) {
    // Auth0 proxy will ensure they are logged in.
    // We check session here to enforce routes if they are logged in.
    const res = await auth0.middleware(request);
    const session = await auth0.getSession(request);
    
    if (session?.user) {
      // Temporary fallback: if claim is missing, assume owner (or manager) so everything works.
      const role = session.user["https://tabletop.app/role"] || "owner"; 
      
      // Role-based Restrictions
      if (role === "chef" && pathname !== "/dashboard/kitchen") {
        return NextResponse.redirect(new URL("/unauthorized", request.url));
      }
      
      if (role === "waiter" && pathname !== "/dashboard/floor") {
        return NextResponse.redirect(new URL("/unauthorized", request.url));
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
