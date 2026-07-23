"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/profile");

  const full_name = String(formData.get("full_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();
  const whatsapp_enabled = formData.get("whatsapp_enabled") === "on";

  const { error } = await supabase.from("users").update({
    full_name: full_name || null,
    phone: phone || null,
    bio: bio || null,
    whatsapp_enabled,
  }).eq("id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/profile");
}
