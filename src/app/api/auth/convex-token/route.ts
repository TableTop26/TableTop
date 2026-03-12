import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";

/**
 * Returns the Auth0 ID token so the Convex client can authenticate itself
 * with the Convex backend (which validates the JWT via auth.config.ts).
 * Called by ConvexClientProvider's fetchAccessToken hook.
 */
export async function GET(request: NextRequest) {
  const session = await auth0.getSession(request);
  if (!session) {
    return NextResponse.json({ token: null });
  }

  // Return the Auth0 ID token — always a signed JWT for OIDC clients.
  // Convex validates it against Auth0's JWKS as configured in convex/auth.config.ts.
  // @auth0/nextjs-auth0 v4 stores it on tokenSet.idToken.
  const token =
    (session as unknown as { tokenSet?: { idToken?: string } })
      .tokenSet?.idToken ?? null;

  return NextResponse.json({ token });
}
