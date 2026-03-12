import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";
import { auth0 } from "@/lib/auth0";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

// ₹49 trial — price in paise
const TRIAL_AMOUNT_PAISE = 4900;

export async function POST(request: NextRequest) {
  const session = await auth0.getSession(request);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const order = await razorpay.orders.create({
      amount: TRIAL_AMOUNT_PAISE,
      currency: "INR",
      receipt: `tabletop_${Date.now()}`,
      notes: {
        ownerId: session.user.sub,
        product: "TableTop Trial (1 month)",
      },
    });

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error("[razorpay/create-order]", err);
    return NextResponse.json(
      { error: "Failed to create Razorpay order" },
      { status: 500 }
    );
  }
}
