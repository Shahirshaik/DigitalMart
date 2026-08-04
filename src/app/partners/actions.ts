"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function submitInstituteReferral(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const row = {
    institute_name: String(formData.get("institute_name") ?? "").trim(),
    contact_name: String(formData.get("contact_name") ?? "").trim(),
    contact_phone: String(formData.get("contact_phone") ?? "").trim(),
    candidate_name: String(formData.get("candidate_name") ?? "").trim(),
    candidate_phone: String(formData.get("candidate_phone") ?? "").trim(),
    course_interest: String(formData.get("course_interest") ?? "").trim(),
    notes: String(formData.get("notes") ?? "").trim() || null,
    submitted_by: user?.id ?? null,
  };

  if (!row.institute_name || !row.contact_name || !row.contact_phone || !row.candidate_name || !row.candidate_phone || !row.course_interest) {
    throw new Error("Please fill in all required fields.");
  }

  const { error } = await supabase.from("institute_referrals").insert(row);
  if (error) throw new Error(error.message);

  redirect("/partners?submitted=1");
}
