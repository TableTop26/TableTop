import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";

  // Verify webhook signature
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[razorpay/webhook] RAZORPAY_WEBHOOK_SECRET not set");
    return NextResponse.json({ error: "Misconfigured" }, { status: 500 });
  }

  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");

  if (signature !== expectedSignature) {
    console.warn("[razorpay/webhook] Invalid signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const event = JSON.parse(rawBody);
  const eventName: string = event.event;

  // Handle successful payment capture
  if (eventName === "payment.captured" || eventName === "order.paid") {
    const payment =
      event.payload?.payment?.entity ?? event.payload?.order?.entity;
    const ownerId: string | undefined = payment?.notes?.ownerId;

    if (!ownerId) {
      console.warn("[razorpay/webhook] No ownerId in payment notes");
      return NextResponse.json({ error: "Missing ownerId" }, { status: 400 });
    }

    try {
      await convex.mutation(api.restaurants.activateSubscription, { ownerId });
      console.log(`[razorpay/webhook] Subscription activated for owner: ${ownerId}`);
    } catch (err) {
      console.error("[razorpay/webhook] Convex mutation failed:", err);
      return NextResponse.json(
        { error: "Failed to activate subscription" },
        { status: 500 }
      );
    }
  }

  // Always return 200 so Razorpay stops retrying
  return NextResponse.json({ received: true });
}
