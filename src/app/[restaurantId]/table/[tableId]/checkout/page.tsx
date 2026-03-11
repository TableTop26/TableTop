"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SessionGuard } from "../_components/SessionGuard";

function formatPrice(paise: number) {
  return `₹${(paise / 100).toFixed(2)}`;
}

export default function CheckoutPage() {
  const params = useParams<{ restaurantId: string; tableId: string }>();
  const router = useRouter();
  const { restaurantId, tableId } = params;

  const [selectedMethod, setSelectedMethod] = useState<
    "upi" | "counter" | "waiter_upi" | null
  >(null);
  const [loading, setLoading] = useState(false);

  const session = useQuery(api.sessions.getActiveSession, {
    tableId: tableId as Id<"tables">,
  });

  const restaurant = useQuery(api.restaurants.getRestaurantById, {
    restaurantId: restaurantId as Id<"restaurants">,
  });

  const orders = useQuery(
    api.orders.getOrdersForSession,
    session?._id ? { sessionId: session._id } : "skip"
  );

  const payment = useQuery(
    api.payments.getPaymentForSession,
    session?._id ? { sessionId: session._id } : "skip"
  );

  const initiatePayment = useMutation(api.payments.initiatePayment);

  // Redirect when payment confirmed
  useEffect(() => {
    if (payment?.status === "confirmed") {
      router.replace("/thank-you");
    }
  }, [payment, router]);

  const subtotal =
    orders?.reduce(
      (sum, order) =>
        sum + order.items.reduce((s, i) => s + i.price * i.quantity, 0),
      0
    ) ?? 0;
  const taxRate = restaurant?.taxRate ?? 0;
  const tax = Math.round(subtotal * (taxRate / 100));
  const total = subtotal + tax;

  async function handlePay(method: "upi" | "counter" | "waiter_upi") {
    if (!session?._id) return;
    setLoading(true);
    setSelectedMethod(method);
    try {
      await initiatePayment({
        sessionId: session._id,
        restaurantId: restaurantId as Id<"restaurants">,
        totalAmount: total,
        method,
      });
      if (method === "counter" || method === "waiter_upi") {
        toast.success(
          method === "counter"
            ? "Head to the counter to complete payment."
            : "A waiter will come to help you pay."
        );
      }
    } catch {
      toast.error("Something went wrong. Try again.");
      setLoading(false);
      setSelectedMethod(null);
    }
  }

  const paymentPending = !!payment && payment.status === "pending";

  return (
    <SessionGuard tableId={tableId} restaurantId={restaurantId}>
      <div className="min-h-screen bg-zinc-50">
        <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white px-4 py-3">
          <div className="mx-auto max-w-sm">
            <h1 className="font-semibold text-zinc-900">Bill Summary</h1>
          </div>
        </header>

        <main className="mx-auto max-w-sm px-4 pt-6 pb-12">
          {/* Itemized bill */}
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-zinc-100 mb-6">
            {orders === undefined ? (
              <p className="text-zinc-400 text-sm text-center py-4">Loading…</p>
            ) : (
              <>
                <ul className="space-y-2 text-sm">
                  {orders.flatMap((order) =>
                    order.items.map((item, idx) => (
                      <li key={`${order._id}-${idx}`} className="flex justify-between">
                        <span className="text-zinc-700">
                          {item.quantity}× {item.name}
                        </span>
                        <span className="text-zinc-900 font-medium">
                          {formatPrice(item.price * item.quantity)}
                        </span>
                      </li>
                    ))
                  )}
                </ul>
                <Separator className="my-3" />
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between text-zinc-500">
                    <span>Subtotal</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-zinc-500">
                    <span>Tax ({taxRate}%)</span>
                    <span>{formatPrice(tax)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-zinc-900 text-base">
                    <span>Total</span>
                    <span>{formatPrice(total)}</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Payment options */}
          {paymentPending ? (
            <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-zinc-100 text-center">
              {payment.method === "upi" && restaurant?.upiQrUrl ? (
                <>
                  <p className="mb-4 text-sm font-medium text-zinc-700">
                    Scan to pay {formatPrice(total)}
                  </p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={restaurant.upiQrUrl}
                    alt="UPI QR Code"
                    className="mx-auto h-56 w-56 rounded-lg object-contain"
                  />
                  <p className="mt-4 text-xs text-zinc-400">
                    Payment will be confirmed once the waiter verifies.
                  </p>
                </>
              ) : payment.method === "waiter_upi" ? (
                <p className="text-sm text-zinc-600">
                  A waiter is on their way with the payment device. Please wait.
                </p>
              ) : (
                <p className="text-sm text-zinc-600">
                  Please head to the counter to complete your payment.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-medium text-zinc-600">How would you like to pay?</p>

              {restaurant?.upiQrUrl && (
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3 h-auto py-3"
                  disabled={loading}
                  onClick={() => handlePay("upi")}
                >
                  {loading && selectedMethod === "upi" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <span className="text-lg">📱</span>
                  )}
                  <div className="text-left">
                    <p className="font-medium">Pay via UPI</p>
                    <p className="text-xs text-zinc-400">Scan the restaurant's QR code</p>
                  </div>
                </Button>
              )}

              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-auto py-3"
                disabled={loading}
                onClick={() => handlePay("waiter_upi")}
              >
                {loading && selectedMethod === "waiter_upi" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <span className="text-lg">🧾</span>
                )}
                <div className="text-left">
                  <p className="font-medium">Ask Waiter</p>
                  <p className="text-xs text-zinc-400">Waiter brings POS device to your table</p>
                </div>
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-auto py-3"
                disabled={loading}
                onClick={() => handlePay("counter")}
              >
                {loading && selectedMethod === "counter" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <span className="text-lg">🏦</span>
                )}
                <div className="text-left">
                  <p className="font-medium">Pay at Counter</p>
                  <p className="text-xs text-zinc-400">Walk up to the billing counter</p>
                </div>
              </Button>
            </div>
          )}
        </main>
      </div>
    </SessionGuard>
  );
}
