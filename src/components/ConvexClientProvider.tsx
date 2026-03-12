"use client";

import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithAuth } from "convex/react";
import { useUser } from "@auth0/nextjs-auth0/client";
import { useCallback } from "react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * Custom auth hook that bridges Auth0 v4 with the Convex client.
 * Fetches the Auth0 access token (JWT) from a server-side API route and
 * hands it to Convex so mutations can call ctx.auth.getUserIdentity().
 */
function useAuth() {
  const { user, isLoading } = useUser();

  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
      try {
        const url =
          "/api/auth/convex-token" +
          (forceRefreshToken ? "?refresh=true" : "");
        const res = await fetch(url);
        if (!res.ok) return null;
        const { token } = await res.json();
        return token as string | null;
      } catch {
        return null;
      }
    },
    []
  );

  return {
    isLoading,
    isAuthenticated: !!user,
    fetchAccessToken,
  };
}

export function ConvexClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ConvexProviderWithAuth client={convex} useAuth={useAuth}>
      {children}
    </ConvexProviderWithAuth>
  );
}
