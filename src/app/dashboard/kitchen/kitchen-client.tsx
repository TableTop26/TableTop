"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { MenuAvailabilityDrawer } from "@/components/dashboard/MenuAvailabilityDrawer";

type OrderItem = {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  modifiers?: string[];
};

type KitchenTicket = {
  _id: Id<"orders">;
  _creationTime: number;
  sessionId: string | Id<"sessions">;
  tableId: string | Id<"tables">;
  restaurantId: string | Id<"restaurants">;
  status: string;
  placedAt: number;
  items: OrderItem[];
  tableLabel: string;
};

export function KitchenClient({ ownerId }: { ownerId: string }) {
  const restaurant = useQuery(api.restaurants.getRestaurantByOwner, { ownerId });
  const openOrders = useQuery(
    api.orders.getOpenKitchenTickets,
    restaurant ? { restaurantId: restaurant._id } : "skip"
  );
  const updateStatus = useMutation(api.orders.updateOrderStatus);

  if (restaurant === undefined || openOrders === undefined) {
    return <div className="p-8 text-muted-foreground">Loading kitchen tickets...</div>;
  }

  if (restaurant === null) {
    return <div className="p-8">Please complete onboarding first.</div>;
  }

  const queued = openOrders.filter((o) => o.status === "PLACED");
  const inProgress = openOrders.filter((o) => o.status === "ACCEPTED" || o.status === "COOKING");
  const ready = openOrders.filter((o) => o.status === "READY");

  const handleStatusChange = async (orderId: Id<"orders">, newStatus: "ACCEPTED" | "READY") => {
    try {
      await updateStatus({ orderId, status: newStatus });
      toast.success(`Order marked as ${newStatus.toLowerCase()}`);
    } catch (_e) {
      toast.error("Failed to update order status");
    }
  };

  return (
    <div className="flex h-full flex-col space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Kitchen Display System</h1>
        <MenuAvailabilityDrawer ownerId={ownerId} />
      </div>

      <div className="grid h-[calc(100vh-10rem)] grid-cols-3 gap-6">
        <Column
          title="Queue"
          orders={queued}
          actionLabel="Accept"
          onAction={(id) => handleStatusChange(id, "ACCEPTED")}
          columnColor="bg-slate-50 dark:bg-slate-900 border-slate-200"
        />
        <Column
          title="In Progress"
          orders={inProgress}
          actionLabel="Ready"
          onAction={(id) => handleStatusChange(id, "READY")}
          columnColor="bg-blue-50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900"
        />
        <Column
          title="Ready"
          orders={ready}
          columnColor="bg-green-50 dark:bg-green-950/20 border-green-100 dark:border-green-900"
        />
      </div>
    </div>
  );
}

function Column({
  title,
  orders,
  actionLabel,
  onAction,
  columnColor,
}: {
  title: string;
  orders: KitchenTicket[];
  actionLabel?: string;
  onAction?: (id: Id<"orders">) => void;
  columnColor: string;
}) {
  return (
    <div className={`flex flex-col rounded-xl border ${columnColor} p-4`}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold text-lg">{title}</h2>
        <Badge variant="secondary" className="font-mono text-sm">
          {orders.length}
        </Badge>
      </div>

      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-4 pr-4">
          {orders.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground pt-10">No tickets</div>
          ) : (
            orders.map((order) => (
              <TicketCard
                key={order._id}
                order={order}
                actionLabel={actionLabel}
                onAction={onAction}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function TicketCard({
  order,
  actionLabel,
  onAction,
}: {
  order: KitchenTicket;
  actionLabel?: string;
  onAction?: (id: Id<"orders">) => void;
}) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const tick = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(tick);
  }, []);

  const diffMs = now ? now - order.placedAt : 0;
  const mins = Math.floor(diffMs / 60000);
  const isOld = diffMs > 15 * 60000;

  return (
    <Card className="shadow-sm border-2">
      <CardHeader className="p-3 pb-2 border-b bg-card">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold">Table {order.tableLabel}</CardTitle>
          <Badge variant={isOld ? "destructive" : "outline"} className="font-mono">
            {now ? `${mins}m` : "..."}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-3">
        <ul className="space-y-2 text-sm">
          {order.items.map((item: OrderItem, i: number) => (
            <li
              key={i}
              className="flex flex-col border-b border-dashed pb-2 last:border-0 last:pb-0"
            >
              <span className="font-medium">
                {item.quantity}x {item.name}
              </span>
              {item.modifiers && item.modifiers.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1 pl-4 text-xs">
                  {item.modifiers.map((mod: string, j: number) => (
                    <span key={j} className="font-bold text-destructive">
                      • {mod}
                    </span>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
      {actionLabel && onAction && (
        <CardFooter className="p-3 pt-0">
          <Button
            className="w-full text-base font-bold h-12"
            onClick={() => onAction(order._id)}
            variant={actionLabel === "Ready" ? "default" : "secondary"}
          >
            {actionLabel}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
