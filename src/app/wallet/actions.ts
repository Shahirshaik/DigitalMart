"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function requestWithdrawal() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/wallet");

  const { data: wallet } = await supabase.from("wallets").select("balance_credits").eq("user_id", user.id).single();
  const balance = Number(wallet?.balance_credits ?? 0);
  if (balance <= 0) throw new Error("Your wallet balance is ₹0 — nothing to withdraw yet.");

  const { error } = await supabase.from("wallet_transactions").insert({
    user_id: user.id,
    type: "withdrawn",
    amount: -balance,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/wallet");
}
