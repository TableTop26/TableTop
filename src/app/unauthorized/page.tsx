import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";
import { auth0 } from "@/lib/auth0";

export default async function UnauthorizedPage() {
  const session = await auth0.getSession();
  const role = session?.user?.["https://tabletop.app/role"] || "Unknown";

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-muted/30 px-4 text-center">
      <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6">
        <ShieldAlert className="w-8 h-8" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight mb-2">Access Denied</h1>
      <p className="text-muted-foreground max-w-md mb-6">
        You don't have permission to access that page. Your current role is recognized as{" "}
        <span className="font-semibold text-foreground">"{role}"</span>.
      </p>
      
      <div className="flex gap-4">
        {role === "chef" ? (
          <Link href="/dashboard/kitchen">
            <Button>Go to Kitchen Dashboard</Button>
          </Link>
        ) : role === "waiter" ? (
          <Link href="/dashboard/floor">
            <Button>Go to Floor Plan</Button>
          </Link>
        ) : (
          <Link href="/dashboard">
            <Button>Return to Dashboard</Button>
          </Link>
        )}
      </div>
    </div>
  );
}
