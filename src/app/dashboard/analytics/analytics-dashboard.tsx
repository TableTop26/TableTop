"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Clock, ShoppingBag, TrendingDown } from "lucide-react";

export function AnalyticsDashboard({ ownerId }: { ownerId: string }) {
  const restaurant = useQuery(api.restaurants.getRestaurantByOwner, { ownerId });
  const stats = useQuery(
    api.analytics.getDashboardStats,
    restaurant ? { restaurantId: restaurant._id } : "skip"
  );

  if (restaurant === undefined || stats === undefined) {
    return <div className="p-8">Loading analytics...</div>;
  }

  if (restaurant === null) {
    return <div className="p-8">Please complete onboarding first.</div>;
  }

  const statCards = [
    {
      title: "Total Sessions",
      value: stats.totalSessions,
      description: "Total dining sessions started",
      icon: Users,
    },
    {
      title: "Total Orders",
      value: stats.totalOrders,
      description: "Total successful orders placed",
      icon: ShoppingBag,
    },
    {
      title: "Avg Turnover Time",
      value: stats.avgTurnoverMinutes,
      description: "Start to payment clear",
      icon: Clock,
    },
    {
      title: "Cart Abandonment",
      value: stats.cartAbandonmentRate,
      description: "Sessions without an order",
      icon: TrendingDown,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-card p-6 rounded-lg border shadow-sm">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Analytics Overview</h2>
          <p className="text-muted-foreground">Monitor your restaurant's performance and dining metrics.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
