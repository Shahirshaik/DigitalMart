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

// Day-to-day operations (seller verification, disputes, member directory,
// product requests) are open to admin AND manager. Payouts, site content, and
// granting the manager role itself stay strictly requireAdmin().
async function requireStaff() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/admin");
  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin" && profile?.role !== "manager") redirect("/");
  return { supabase, staffId: user.id };
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

async function logAudit(
  supabase: Supabase,
  actorId: string,
  action: string,
  targetType: string,
  targetId: string | null,
  details: Record<string, unknown> | null = null
) {
  await supabase.from("admin_audit_log").insert({ actor_id: actorId, action, target_type: targetType, target_id: targetId, details });
}

export async function verifySeller(sellerId: string) {
  const { supabase, staffId } = await requireStaff();
  const { error } = await supabase.from("users").update({ seller_verified_at: new Date().toISOString() }).eq("id", sellerId);
  if (error) throw new Error(error.message);

  await supabase.from("notifications").insert({
    user_id: sellerId,
    title: "You're verified!",
    body: "Digital Mart has verified your seller profile. Your listings now show a verified badge.",
    type: "info",
  });

  await logAudit(supabase, staffId, "seller.verify", "user", sellerId);
  revalidatePath("/admin/sellers");
}

export async function resolveDispute(disputeId: string, orderId: string, resolution: "buyer" | "seller", notes: string) {
  const { supabase, staffId } = await requireStaff();

  const { data: order, error: orderErr } = await supabase.from("orders")
    .update({ status: resolution === "seller" ? "released" : "refunded" })
    .eq("id", orderId)
    .select("buyer_id, seller_id")
    .single();
  if (orderErr) throw new Error(orderErr.message);

  const { error: disputeErr } = await supabase.from("disputes").update({
    status: resolution === "seller" ? "resolved_seller" : "resolved_buyer",
    resolved_by: staffId,
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

  await logAudit(supabase, staffId, "dispute.resolve", "dispute", disputeId, { resolution, order_id: orderId, notes: notes || null });
  revalidatePath("/admin/disputes");
}

export async function markWithdrawalSent(requestId: string) {
  const { supabase, adminId } = await requireAdmin();

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

  await logAudit(supabase, adminId, "payout.mark_sent", "wallet_transaction", requestId, request ? { user_id: request.user_id, amount: request.amount } : null);
  revalidatePath("/admin/payouts");
  revalidatePath("/wallet");
}

export async function toggleUserActive(userId: string, nextActive: boolean) {
  const { supabase, staffId } = await requireStaff();
  const { error } = await supabase.from("users").update({ is_active: nextActive }).eq("id", userId);
  if (error) throw new Error(error.message);
  await logAudit(supabase, staffId, nextActive ? "user.reactivate" : "user.deactivate", "user", userId);
  revalidatePath("/admin/members");
}

export async function bulkSetUserActive(nextActive: boolean, formData: FormData) {
  const { supabase, staffId } = await requireStaff();
  const ids = formData.getAll("ids").map(String).filter(Boolean);
  if (ids.length === 0) return;

  const { error } = await supabase.from("users").update({ is_active: nextActive }).in("id", ids);
  if (error) throw new Error(error.message);

  await logAudit(supabase, staffId, nextActive ? "user.bulk_reactivate" : "user.bulk_deactivate", "user", null, { user_ids: ids, count: ids.length });
  revalidatePath("/admin/members");
}

export async function promoteToManager(userId: string) {
  const { supabase, adminId } = await requireAdmin();
  const { data: target, error: fetchErr } = await supabase.from("users").select("role").eq("id", userId).single();
  if (fetchErr) throw new Error(fetchErr.message);
  if (target?.role === "admin") throw new Error("Can't change an admin's role from here.");

  const { error } = await supabase.from("users").update({ role: "manager" }).eq("id", userId);
  if (error) throw new Error(error.message);

  await supabase.from("notifications").insert({
    user_id: userId,
    title: "You're now a Digital Mart manager",
    body: "You've been given manager access — seller verification, disputes, member directory, and product requests.",
    type: "info",
  });

  await logAudit(supabase, adminId, "user.promote_manager", "user", userId);
  revalidatePath("/admin/team");
  revalidatePath("/admin/members");
}

export async function demoteManager(userId: string) {
  const { supabase, adminId } = await requireAdmin();
  const { data: target, error: fetchErr } = await supabase.from("users").select("role").eq("id", userId).single();
  if (fetchErr) throw new Error(fetchErr.message);
  if (target?.role !== "manager") throw new Error("This user isn't a manager.");

  const { error } = await supabase.from("users").update({ role: "user" }).eq("id", userId);
  if (error) throw new Error(error.message);

  await logAudit(supabase, adminId, "user.demote_manager", "user", userId);
  revalidatePath("/admin/team");
  revalidatePath("/admin/members");
}

export async function updateProductRequestStatus(requestId: string, status: "new" | "contacted" | "fulfilled" | "declined", notes: string) {
  const { supabase, staffId } = await requireStaff();
  const { error } = await supabase.from("product_requests")
    .update({ status, admin_notes: notes || null })
    .eq("id", requestId);
  if (error) throw new Error(error.message);
  await logAudit(supabase, staffId, "request.status_update", "product_request", requestId, { status, notes: notes || null });
  revalidatePath("/admin/requests");
}

export async function updateInstituteReferralStatus(referralId: string, status: "new" | "contacted" | "enrolled" | "commission_paid") {
  const { supabase, adminId } = await requireAdmin();
  const { error } = await supabase.from("institute_referrals")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", referralId);
  if (error) throw new Error(error.message);
  await logAudit(supabase, adminId, "referral.status_update", "institute_referral", referralId, { status });
  revalidatePath("/admin/referrals");
}
