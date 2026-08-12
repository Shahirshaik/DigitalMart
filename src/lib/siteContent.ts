import { createClient } from "@/lib/supabase/server";

const DEFAULT_WHATSAPP = "+91 9010731398";
const DEFAULT_EMAIL = "digitalmartbuysell@gmail.com";

// Shared support contact info (admin-editable via /admin/content) — used by the
// footer, dispute/order WhatsApp bridges, and legal pages so there's one place
// to update it instead of a hardcoded number/email scattered across files.
export async function getSupportContact() {
  const supabase = await createClient();
  const { data } = await supabase.from("site_content").select("key, value")
    .in("key", ["support_whatsapp_number", "support_email"]);
  const map = Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
  return {
    whatsappNumber: map.support_whatsapp_number || DEFAULT_WHATSAPP,
    email: map.support_email || DEFAULT_EMAIL,
  };
}

// The UPI ID/payee name buyers pay into at checkout (admin-editable via
// /admin/content) — the checkout QR code and app deep links are built from
// this at request time, so changing it here takes effect immediately with no
// redeploy. Bank fields are reference-only for the admin's own record-keeping
// and are never used in any payment flow or shown to buyers.
// Social media links shown in the footer (admin-editable via /admin/content).
// Empty string means "not set" — the footer hides that link entirely rather
// than pointing to a blank/placeholder URL.
export async function getSocialLinks() {
  const supabase = await createClient();
  const { data } = await supabase.from("site_content").select("key, value")
    .in("key", ["social_instagram_url", "social_facebook_url", "social_whatsapp_channel_url"]);
  const map = Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
  return {
    instagramUrl: map.social_instagram_url || "",
    facebookUrl: map.social_facebook_url || "",
    whatsappChannelUrl: map.social_whatsapp_channel_url || "",
  };
}

export async function getPaymentCollectionInfo() {
  const supabase = await createClient();
  const { data } = await supabase.from("site_content").select("key, value")
    .in("key", ["collection_upi_id", "collection_upi_payee_name", "bank_account_holder_name", "bank_name", "bank_account_number"]);
  const map = Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
  return {
    upiId: map.collection_upi_id || "",
    payeeName: map.collection_upi_payee_name || "",
    bankAccountHolderName: map.bank_account_holder_name || "",
    bankName: map.bank_name || "",
    bankAccountNumber: map.bank_account_number || "",
  };
}
