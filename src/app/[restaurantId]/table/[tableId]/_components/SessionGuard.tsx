"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";

interface SessionGuardProps {
  tableId: string;
  restaurantId: string;
  children: React.ReactNode;
}

export function SessionGuard({ tableId, restaurantId, children }: SessionGuardProps) {
  const router = useRouter();

  const session = useQuery(api.sessions.getActiveSession, {
    tableId: tableId as Id<"tables">,
  });

  useEffect(() => {
    // null means query resolved but no active session — guest has been cleared
    if (session === null) {
      router.replace("/thank-you");
    }
  }, [session, router]);

  if (session === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center text-zinc-400 text-sm">
        Loading…
      </div>
    );
  }

  if (session === null) return null;

  return <>{children}</>;
}
