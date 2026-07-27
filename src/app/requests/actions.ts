"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function submitProductRequest(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/requests");

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!title || !description) throw new Error("Please fill in both fields.");

  const { error } = await supabase.from("product_requests").insert({
    requester_id: user.id,
    title,
    description,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/requests");
}
