"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/admin/content");
  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/");
  return { supabase };
}

function revalidateContentPaths() {
  revalidatePath("/admin/content");
  revalidatePath("/");
  revalidatePath("/terms");
  revalidatePath("/privacy");
  revalidatePath("/about");
  revalidatePath("/contact");
  revalidatePath("/listings");
  revalidatePath("/courses");
  revalidatePath("/checkout/[id]", "page");
}

export async function updateSiteContent(formData: FormData) {
  const { supabase } = await requireAdmin();
  const keys = [
    "hero_badge_text", "hero_headline_main", "hero_headline_accent", "hero_subtext",
    "hero_cta_primary_label", "hero_cta_secondary_label",
    "perks_section_title", "perks_section_subtitle",
    "support_whatsapp_number", "support_email",
    "social_instagram_url", "social_facebook_url", "social_whatsapp_channel_url",
    "collection_upi_id", "collection_upi_payee_name",
    "bank_account_holder_name", "bank_name", "bank_account_number",
  ];
  const rows = keys.map((key) => ({ key, value: String(formData.get(key) ?? "") }));
  const { error } = await supabase.from("site_content").upsert(rows, { onConflict: "key" });
  if (error) throw new Error(error.message);
  revalidateContentPaths();
}

export async function upsertAdSlide(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = formData.get("id") as string | null;
  const row = {
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    cta_label: String(formData.get("cta_label") ?? ""),
    link_url: String(formData.get("link_url") ?? ""),
    image_url: (formData.get("image_url") as string) || null,
    image_url_mobile: (formData.get("image_url_mobile") as string) || null,
    is_gold: formData.get("is_gold") === "on",
    sort_order: Number(formData.get("sort_order") ?? 0),
    is_active: formData.get("is_active") === "on",
  };
  const { error } = id
    ? await supabase.from("ad_slides").update(row).eq("id", id)
    : await supabase.from("ad_slides").insert(row);
  if (error) throw new Error(error.message);
  revalidateContentPaths();
}

export async function deleteAdSlide(id: string) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("ad_slides").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidateContentPaths();
}

export async function upsertPerk(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = formData.get("id") as string | null;
  const row = {
    icon_name: String(formData.get("icon_name") ?? "wallet"),
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    sort_order: Number(formData.get("sort_order") ?? 0),
    is_active: formData.get("is_active") === "on",
  };
  const { error } = id
    ? await supabase.from("homepage_perks").update(row).eq("id", id)
    : await supabase.from("homepage_perks").insert(row);
  if (error) throw new Error(error.message);
  revalidateContentPaths();
}

export async function deletePerk(id: string) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("homepage_perks").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidateContentPaths();
}

export async function updateCategoryDisplay(id: string, formData: FormData) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("listing_categories").update({
    name: String(formData.get("name") ?? ""),
    icon: String(formData.get("icon") ?? ""),
  }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidateContentPaths();
}

export async function upsertLegalSection(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = formData.get("id") as string | null;
  const row = {
    page: String(formData.get("page") ?? "terms"),
    heading: String(formData.get("heading") ?? ""),
    body: String(formData.get("body") ?? ""),
    sort_order: Number(formData.get("sort_order") ?? 0),
  };
  const { error } = id
    ? await supabase.from("legal_sections").update(row).eq("id", id)
    : await supabase.from("legal_sections").insert(row);
  if (error) throw new Error(error.message);
  revalidateContentPaths();
}

export async function deleteLegalSection(id: string) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("legal_sections").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidateContentPaths();
}
