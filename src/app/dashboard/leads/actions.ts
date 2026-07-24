"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { LeadStatus } from "@/types/database";

export async function updateLeadStatus(leadId: string, status: LeadStatus) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/dashboard/leads");

  const { error } = await supabase.from("leads").update({ status }).eq("id", leadId).eq("seller_id", user.id);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/leads");
}
