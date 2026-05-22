/* eslint-disable @typescript-eslint/no-require-imports */
const Stripe = require("stripe");
import { createClient } from "@supabase/supabase-js";
import type { TopUpPackage, WebhookResult } from "../types";

let _stripe: any = null;

function getStripe() {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not configured. Please add it to backend/.env");
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return _stripe;
}

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TOPUP_PACKAGES: TopUpPackage[] = [
  { id: "10_scans", quota: 10, priceThb: 20, priceSatang: 2000, label: "10 Scans" },
  { id: "50_scans", quota: 50, priceThb: 100, priceSatang: 10000, label: "50 Scans" },
  { id: "100_scans", quota: 100, priceThb: 200, priceSatang: 20000, label: "100 Scans" },
];

export function getPackages() {
  return TOPUP_PACKAGES.map((pkg) => ({
    id: pkg.id,
    quota: pkg.quota,
    priceThb: pkg.priceThb,
    label: pkg.label,
    pricePerScan: 2,
  }));
}

export async function createCheckoutSession(userId: string, userEmail: string, packageId: string) {
  const pkg = TOPUP_PACKAGES.find((p) => p.id === packageId);
  if (!pkg) {
    throw new Error("Invalid package ID");
  }

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card", "promptpay"],
    mode: "payment",
    customer_email: userEmail,
    line_items: [
      {
        price_data: {
          currency: "thb",
          product_data: {
            name: `Receipt Scanner - ${pkg.label}`,
            description: `เพิ่มโควต้าอัพโหลด ${pkg.quota} ครั้ง`,
          },
          unit_amount: pkg.priceSatang,
        },
        quantity: 1,
      },
    ],
    metadata: {
      userId,
      packageId: pkg.id,
      quota: pkg.quota.toString(),
    },
    success_url: `${process.env.FRONTEND_URL}/topup/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.FRONTEND_URL}/topup`,
  });

  await supabase.from("topup_transactions").insert({
    user_id: userId,
    stripe_session_id: session.id,
    amount_satang: pkg.priceSatang,
    quota_added: pkg.quota,
    status: "pending",
  });

  return { sessionId: session.id, url: session.url };
}

export async function handleWebhookEvent(event: any): Promise<WebhookResult> {
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    if (session.payment_status !== "paid") {
      return { processed: false, reason: "payment not paid" };
    }

    const userId = session.metadata.userId;
    const quota = parseInt(session.metadata.quota, 10);
    const sessionId = session.id;

    const { data: existing } = await supabase
      .from("topup_transactions")
      .select("status")
      .eq("stripe_session_id", sessionId)
      .single();

    if (existing && existing.status === "completed") {
      return { processed: false, reason: "already processed" };
    }

    await supabase
      .from("topup_transactions")
      .update({
        status: "completed",
        stripe_payment_intent: session.payment_intent,
        completed_at: new Date().toISOString(),
      })
      .eq("stripe_session_id", sessionId);

    const { data: settings } = await supabase
      .from("user_settings")
      .select("bonus_quota")
      .eq("user_id", userId)
      .single();

    if (settings) {
      await supabase
        .from("user_settings")
        .update({ bonus_quota: (settings.bonus_quota || 0) + quota })
        .eq("user_id", userId);
    } else {
      await supabase.from("user_settings").insert({
        user_id: userId,
        bonus_quota: quota,
      });
    }

    return { processed: true, userId, quotaAdded: quota };
  }

  return { processed: false, reason: "unhandled event type" };
}

export async function getTransactionHistory(userId: string) {
  const { data, error } = await supabase
    .from("topup_transactions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    throw new Error(`Failed to fetch transactions: ${error.message}`);
  }

  return data || [];
}
