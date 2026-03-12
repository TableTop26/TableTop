import Link from "next/link";
import {
  LayoutDashboard,
  UtensilsCrossed,
  MapPin,
  Users,
  Settings,
  PieChart,
  ChefHat,
} from "lucide-react";

import { auth0 } from "@/lib/auth0";

const allLinks = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard, roles: ["owner", "manager"] },
  { name: "Menu", href: "/dashboard/menu", icon: UtensilsCrossed, roles: ["owner", "manager"] },
  { name: "Floor Plan", href: "/dashboard/floor", icon: MapPin, roles: ["owner", "manager", "waiter"] },
  { name: "Kitchen (KDS)", href: "/dashboard/kitchen", icon: ChefHat, roles: ["owner", "manager", "chef"] },
  { name: "Staff", href: "/dashboard/staff", icon: Users, roles: ["owner", "manager"] },
  { name: "Analytics", href: "/dashboard/analytics", icon: PieChart, roles: ["owner", "manager"] },
  { name: "Settings", href: "/dashboard/settings", icon: Settings, roles: ["owner", "manager"] },
];

export async function Sidebar() {
  const session = await auth0.getSession();
  const role = (session?.user?.["https://tabletop.app/role"] || "owner") as string;
  const userName = session?.user?.name || "Admin User";
  
  // Filter links based on the role
  const allowedLinks = allLinks.filter(link => link.roles.includes(role));

  return (
    <div className="flex h-full w-64 flex-col border-r bg-background">
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold tracking-tight">
          <UtensilsCrossed className="h-6 w-6 text-primary" />
          <span>TableTop OS</span>
        </Link>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {allowedLinks.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.name}
              href={link.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-muted hover:text-primary"
            >
              <Icon className="h-4 w-4" />
              {link.name}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-xs">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium truncate max-w-[150px]">{userName}</span>
            <span className="text-xs text-muted-foreground capitalize">{role}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
