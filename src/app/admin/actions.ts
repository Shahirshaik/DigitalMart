"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/admin");
  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/");
  return { supabase, adminId: user.id };
}

export async function verifySeller(sellerId: string) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("users").update({ seller_verified_at: new Date().toISOString() }).eq("id", sellerId);
  if (error) throw new Error(error.message);

  await supabase.from("notifications").insert({
    user_id: sellerId,
    title: "You're verified!",
    body: "Digital Mart has verified your seller profile. Your listings now show a verified badge.",
    type: "info",
  });

  revalidatePath("/admin/sellers");
}

export async function resolveDispute(disputeId: string, orderId: string, resolution: "buyer" | "seller", notes: string) {
  const { supabase, adminId } = await requireAdmin();

  const { data: order, error: orderErr } = await supabase.from("orders")
    .update({ status: resolution === "seller" ? "released" : "refunded" })
    .eq("id", orderId)
    .select("buyer_id, seller_id")
    .single();
  if (orderErr) throw new Error(orderErr.message);

  const { error: disputeErr } = await supabase.from("disputes").update({
    status: resolution === "seller" ? "resolved_seller" : "resolved_buyer",
    resolved_by: adminId,
    resolution_notes: notes || null,
    resolved_at: new Date().toISOString(),
  }).eq("id", disputeId);
  if (disputeErr) throw new Error(disputeErr.message);

  if (order) {
    const resolutionText = resolution === "seller"
      ? "in the seller's favor — the order has been released."
      : "in the buyer's favor — the order has been refunded.";
    await supabase.from("notifications").insert([
      { user_id: order.buyer_id, title: "Dispute resolved", body: `Your dispute was resolved ${resolutionText}`, type: "dispute_update", link_type: "order", link_id: orderId },
      { user_id: order.seller_id, title: "Dispute resolved", body: `The dispute on your order was resolved ${resolutionText}`, type: "dispute_update", link_type: "order", link_id: orderId },
    ]);
  }

  revalidatePath("/admin/disputes");
}

export async function markWithdrawalSent(requestId: string) {
  const { supabase } = await requireAdmin();

  const { data: request, error } = await supabase.from("wallet_transactions")
    .update({ fulfilled_at: new Date().toISOString() })
    .eq("id", requestId)
    .eq("type", "withdrawn")
    .is("fulfilled_at", null)
    .select("user_id, amount")
    .single();
  if (error) throw new Error(error.message);

  if (request) {
    await supabase.from("notifications").insert({
      user_id: request.user_id,
      title: "Withdrawal sent",
      body: `We've sent ₹${Math.abs(Number(request.amount))} to your UPI ID.`,
      type: "payout_released",
      link_type: "wallet",
      link_id: null,
    });
  }

  revalidatePath("/admin/payouts");
  revalidatePath("/wallet");
}
