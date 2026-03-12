"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@auth0/nextjs-auth0/client";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: any;
  }
}

export default function PayPage() {
  const router = useRouter();
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [scriptReady, setScriptReady] = useState(false);
  const scriptRef = useRef<HTMLScriptElement | null>(null);

  // Load Razorpay checkout script once
  useEffect(() => {
    if (document.getElementById("razorpay-script")) {
      setScriptReady(true);
      return;
    }
    const script = document.createElement("script");
    script.id = "razorpay-script";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => setScriptReady(true);
    document.body.appendChild(script);
    scriptRef.current = script;
  }, []);

  const handlePay = async () => {
    if (!scriptReady) {
      toast.error("Payment gateway not ready. Please wait a moment and try again.");
      return;
    }

    setLoading(true);

    try {
      // 1. Create server-side Razorpay order
      const res = await fetch("/api/razorpay/create-order", { method: "POST" });
      if (!res.ok) throw new Error("Failed to create order");
      const { orderId, amount, currency, keyId } = await res.json();

      // 2. Open Razorpay checkout
      const options = {
        key: keyId,
        amount,
        currency,
        name: "TableTop",
        description: "1-Month Trial Subscription",
        order_id: orderId,
        prefill: {
          name: user?.name ?? "",
          email: user?.email ?? "",
        },
        theme: { color: "#18181b" },
        handler: function () {
          // Payment captured — webhook will activate subscription on backend.
          // Redirect to dashboard with success message.
          toast.success("Payment successful! Your subscription is now active.");
          router.push("/dashboard");
        },
        modal: {
          ondismiss: () => setLoading(false),
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (response: { error: { description: string } }) => {
        toast.error(`Payment failed: ${response.error.description}`);
        setLoading(false);
      });
      rzp.open();
    } catch (err) {
      console.error(err);
      toast.error("Could not initiate payment. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-2xl">
            🍽️
          </div>
          <CardTitle className="text-2xl">Start Your Trial</CardTitle>
          <CardDescription className="text-base">
            Get full access to TableTop for your first month — no hidden fees.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Feature list */}
          <ul className="space-y-2 text-sm text-muted-foreground">
            {[
              "Unlimited tables & QR scanning",
              "Real-time shared cart for guests",
              "Kitchen Display System (KDS)",
              "Live floor map & waiter management",
              "Menu manager + bulk import",
              "Analytics dashboard",
            ].map((feature) => (
              <li key={feature} className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                {feature}
              </li>
            ))}
          </ul>

          {/* Price */}
          <div className="rounded-xl border bg-muted/50 p-4 text-center">
            <p className="text-4xl font-bold">₹49</p>
            <p className="mt-1 text-sm text-muted-foreground">for your first month</p>
          </div>

          <Button
            className="w-full h-12 text-base font-semibold"
            onClick={handlePay}
            disabled={loading || !scriptReady}
          >
            {loading ? "Opening payment…" : "Pay ₹49 & Activate"}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Secured by Razorpay. Cancel anytime.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
