import { auth0 } from "@/lib/auth0";
import { redirect } from "next/navigation";
import { FloorPlanManager } from "./floor-plan-manager";
import { LiveTableMap } from "./live-table-map";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutGrid, Edit3 } from "lucide-react";
import { MenuAvailabilityDrawer } from "@/components/dashboard/MenuAvailabilityDrawer";
import { Id } from "../../../../convex/_generated/dataModel";

// TEMPORARY TILL RBAC is fully wired, this is the hardcoded ID we are using
const DUMMY_RESTAURANT_ID = "jx71g8n9w54f5h9k3k20j04g997amfxf" as Id<"restaurants">;

export default async function FloorPlanPage() {
  const session = await auth0.getSession();

  if (!session?.user) {
    redirect("/auth/login");
  }

  const ownerId = session.user.sub;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-card p-6 rounded-lg border shadow-sm">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Floor Management</h2>
          <p className="text-muted-foreground">Monitor table statuses in real-time or edit the floor layout.</p>
        </div>
        <MenuAvailabilityDrawer restaurantId={DUMMY_RESTAURANT_ID} />
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
          <LiveTableMap ownerId={ownerId} />
        </TabsContent>
        <TabsContent value="builder" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
          <FloorPlanManager ownerId={ownerId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
