import { auth0 } from "@/lib/auth0";
import { redirect } from "next/navigation";
import { FloorPlanManager } from "./floor-plan-manager";
import { LiveTableMap } from "./live-table-map";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutGrid, Edit3, Printer } from "lucide-react";
import { MenuAvailabilityDrawerWrapper } from "./menu-availability-drawer-wrapper";
import Link from "next/link";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export default async function FloorPlanPage() {
  const session = await auth0.getSession();

  if (!session?.user) {
    redirect("/auth/login");
  }

  const userId = session.user.sub;
  const claimRole = session.user["https://tabletop.app/role"] as string | undefined;
  let role = claimRole || "owner";
  if (!claimRole) {
    try {
      const staff = await convex.query(api.staff.getStaffMemberByUserId, { userId });
      if (staff) role = staff.role;
    } catch {}
  }

  // Waiters see only the live map — full screen, no chrome
  if (role === "waiter") {
    // Need the restaurant owner's ID (not the waiter's sub) for LiveTableMap
    let ownerIdForMap = userId;
    try {
      const staff = await convex.query(api.staff.getStaffMemberByUserId, { userId });
      if (staff) {
        const restaurant = await convex.query(api.restaurants.getRestaurantById, {
          restaurantId: staff.restaurantId,
        });
        if (restaurant) ownerIdForMap = restaurant.ownerId;
      }
    } catch {}
    return <LiveTableMap ownerId={ownerIdForMap} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-card p-6 rounded-lg border shadow-sm">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Floor Management</h2>
          <p className="text-muted-foreground">Monitor table statuses in real-time or edit the floor layout.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/floor/print-qr"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 h-8 text-sm font-medium transition-colors hover:bg-muted"
          >
            <Printer className="h-4 w-4" />
            Print QRs
          </Link>
          <MenuAvailabilityDrawerWrapper ownerId={userId} />
        </div>
      </div>

      <Tabs defaultValue="live" className="w-full">
        <TabsList className="grid w-[400px] grid-cols-2 mb-6">
          <TabsTrigger value="live" className="flex items-center gap-2">
            <LayoutGrid className="h-4 w-4" />
            Live Map
          </TabsTrigger>
          <TabsTrigger value="builder" className="flex items-center gap-2">
            <Edit3 className="h-4 w-4" />
            Floor Plan Builder
          </TabsTrigger>
        </TabsList>
        <TabsContent value="live" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
          <LiveTableMap ownerId={userId} />
        </TabsContent>
        <TabsContent value="builder" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
          <FloorPlanManager ownerId={userId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
