"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { CheckCircle2, ChefHat, Clock, Truck, UtensilsCrossed, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SessionGuard } from "../_components/SessionGuard";

type OrderStatus = "PLACED" | "ACCEPTED" | "COOKING" | "READY" | "SERVED" | "CANCELLED";

const STATUS_STEPS: { key: OrderStatus; label: string; Icon: React.ElementType }[] = [
  { key: "PLACED", label: "Order placed", Icon: Clock },
  { key: "ACCEPTED", label: "Accepted", Icon: CheckCircle2 },
  { key: "COOKING", label: "Cooking", Icon: ChefHat },
  { key: "READY", label: "Ready to serve", Icon: Truck },
  { key: "SERVED", label: "Served", Icon: UtensilsCrossed },
];

const STATUS_INDEX: Record<OrderStatus, number> = {
  PLACED: 0,
  ACCEPTED: 1,
  COOKING: 2,
  READY: 3,
  SERVED: 4,
  CANCELLED: -1,
};

function formatPrice(paise: number) {
  return `₹${(paise / 100).toFixed(2)}`;
}

function OrderStatusBadge({ status }: { status: OrderStatus }) {
  if (status === "CANCELLED") {
    return (
      <span className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-red-100 text-red-700">
        Rejected by kitchen
      </span>
    );
  }
  const colors: Record<Exclude<OrderStatus, "CANCELLED">, string> = {
    PLACED: "bg-yellow-100 text-yellow-700",
    ACCEPTED: "bg-blue-100 text-blue-700",
    COOKING: "bg-orange-100 text-orange-700",
    READY: "bg-green-100 text-green-700",
    SERVED: "bg-zinc-100 text-zinc-600",
  };
  const idx = STATUS_INDEX[status];
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[status as Exclude<OrderStatus, "CANCELLED">]}`}>
      {STATUS_STEPS[idx].label}
    </span>
  );
}

export default function TrackingPage() {
  const params = useParams<{ restaurantId: string; tableId: string }>();
  const router = useRouter();
  const { restaurantId, tableId } = params;

  const session = useQuery(api.sessions.getActiveSession, {
    tableId: tableId as Id<"tables">,
  });

  const orders = useQuery(
    api.orders.getOrdersForSession,
    session?._id ? { sessionId: session._id } : "skip"
  );

  const allServed =
    orders &&
    orders.length > 0 &&
    orders.every((o) => o.status === "SERVED" || o.status === "CANCELLED");

  return (
    <SessionGuard tableId={tableId} restaurantId={restaurantId}>
      <div className="min-h-screen bg-zinc-50 pb-24">
        {/* Header */}
        <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white px-4 py-3">
          <div className="mx-auto flex max-w-xl items-center justify-between">
            <h1 className="font-semibold text-zinc-900">Your Orders</h1>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/${restaurantId}/table/${tableId}/cart`)}
            >
              + Add More
            </Button>
          </div>
        </header>

        <main className="mx-auto max-w-xl px-4 pt-6 space-y-4">
          {orders === undefined ? (
            <p className="text-center text-zinc-400 text-sm py-16">Loading orders…</p>
          ) : orders.length === 0 ? (
            <p className="text-center text-zinc-400 text-sm py-16">No orders yet.</p>
          ) : (
            orders.map((order) => (
              <div
                key={order._id}
                className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-zinc-100"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs text-zinc-400">
                    {new Date(order.placedAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <OrderStatusBadge status={order.status as OrderStatus} />
                </div>

                {/* Status pipeline */}
                {order.status === "CANCELLED" ? (
                  <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2">
                    <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                    <span className="text-xs text-red-600">This order was rejected by the kitchen. Please add items again or ask your waiter.</span>
                  </div>
                ) : (
                <div className="mb-4 flex items-center gap-1">
                  {STATUS_STEPS.map((step, i) => {
                    const current = STATUS_INDEX[order.status as OrderStatus];
                    const done = i <= current;
                    return (
                      <div key={step.key} className="flex flex-1 items-center">
                        <div
                          className={`h-1.5 flex-1 rounded-full ${
                            done ? "bg-zinc-800" : "bg-zinc-200"
                          }`}
                        />
                      </div>
                    );
                  })}
                </div>
                )}

                {/* Order items */}
                <ul className="space-y-1.5">
                  {order.items.map((item, idx) => (
                    <li key={idx} className="flex items-start justify-between text-sm">
                      <div>
                        <span className="font-medium text-zinc-900">
                          {item.quantity}× {item.name}
                        </span>
                        {item.modifiers.length > 0 && (
                          <p className="text-xs text-zinc-400">{item.modifiers.join(", ")}</p>
                        )}
                      </div>
                      <span className="text-zinc-500 text-xs mt-0.5">
                        {formatPrice(item.price * item.quantity)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </main>

        {/* Request Bill button — shows once orders exist */}
        {orders && orders.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 border-t border-zinc-200 bg-white p-4 shadow-lg">
            <div className="mx-auto max-w-xl">
              <Button
                className="w-full"
                onClick={() =>
                  router.push(`/${restaurantId}/table/${tableId}/checkout`)
                }
              >
                {allServed ? "Pay Now" : "Request Bill"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </SessionGuard>
  );
}
