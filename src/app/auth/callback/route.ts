import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  const ref = searchParams.get("ref");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Password recovery goes straight to the reset-password page — skip the
      // normal role/onboarding redirect, since this is a security action, not
      // a regular sign-in.
      if (next.startsWith("/auth/reset-password")) return NextResponse.redirect(`${origin}${next}`);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        if (ref && ref !== user.id) {
          await supabase.from("referrals").insert({ referrer_id: ref, referred_id: user.id, referral_code: ref });
        }
        const { data: profile } = await supabase
          .from("users").select("role, onboarding_completed_at").eq("id", user.id).single();
        if (profile?.role === "admin") return NextResponse.redirect(`${origin}/admin`);
        if (!profile?.onboarding_completed_at) return NextResponse.redirect(`${origin}/onboarding`);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_failed`);
}
