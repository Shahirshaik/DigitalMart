"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const REDEMPTION_AMOUNT = 5000;

export async function redeemWalletCredit(kind: "redeemed_purchase" | "withdrawn") {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/wallet");

  const { data: wallet } = await supabase.from("wallets").select("balance_credits").eq("user_id", user.id).single();
  if (!wallet || Number(wallet.balance_credits) < REDEMPTION_AMOUNT) {
    throw new Error(`You need at least ₹${REDEMPTION_AMOUNT} in credits to redeem`);
  }

  const { error } = await supabase.from("wallet_transactions").insert({
    user_id: user.id,
    type: kind,
    amount: -REDEMPTION_AMOUNT,
  });
  if (error) throw new Error(error.message);

  await supabase.from("notifications").insert({
    user_id: user.id,
    title: kind === "withdrawn" ? "Payout requested" : "Credit applied",
    body: kind === "withdrawn"
      ? `You requested a ₹${REDEMPTION_AMOUNT} payout. Our team will reach out via WhatsApp/email to complete it.`
      : `₹${REDEMPTION_AMOUNT} credit has been reserved for your next purchase. Our team will follow up to apply it.`,
    type: "info",
  });

  revalidatePath("/wallet");
}
