import { auth0 } from "@/lib/auth0";
import { redirect } from "next/navigation";
import { KitchenClient } from "./kitchen-client";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export default async function KitchenPage() {
  const session = await auth0.getSession();

  if (!session?.user) {
    redirect("/auth/login");
  }

  const userId = session.user.sub;
  const userName = session.user.name || session.user.email || "Chef";

  // Resolve the restaurant owner's ID for KitchenClient
  let ownerIdForKitchen = userId;
  try {
    const staff = await convex.query(api.staff.getStaffMemberByUserId, { userId });
    if (staff) {
      const restaurant = await convex.query(api.restaurants.getRestaurantById, {
        restaurantId: staff.restaurantId,
      });
      if (restaurant) ownerIdForKitchen = restaurant.ownerId;
    }
  } catch {}

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <header className="flex items-center justify-between border-b bg-card px-4 py-2 shrink-0">
        <span className="text-sm font-medium text-foreground">{userName}</span>
        <Link
          href="/auth/logout"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-destructive transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Log out
        </Link>
      </header>
      <div className="flex-1 overflow-hidden">
        <KitchenClient ownerId={ownerIdForKitchen} />
      </div>
    </div>
  );
}
