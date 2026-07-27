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
