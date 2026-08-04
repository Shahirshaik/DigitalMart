import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck, ShieldQuestion } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { timeAgo } from "@/lib/utils";
import { verifySeller } from "../actions";
import type { AccountRole } from "@/types/database";

export const metadata = { title: "Seller Verification | Admin" };

export default async function AdminSellersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/admin/sellers");
  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin" && profile?.role !== "manager") redirect("/");
  const isAdmin = profile.role === "admin";

  const ADMIN_TABS = [
    { href: "/admin", label: "Overview" },
    { href: "/admin/members", label: "Members" },
    { href: "/admin/sellers", label: "Seller Verification" },
    { href: "/admin/disputes", label: "Disputes" },
    { href: "/admin/requests", label: "Requests" },
    ...(isAdmin ? [{ href: "/admin/referrals", label: "Partner Referrals" }, { href: "/admin/payouts", label: "Payouts" }, { href: "/admin/content", label: "Site Content" }, { href: "/admin/team", label: "Team" }, { href: "/admin/audit", label: "Audit Log" }] : []),
  ];

  const [{ data: pending }, { data: verified }] = await Promise.all([
    supabase.from("users").select("id, full_name, email, created_at").eq("is_seller", true).is("seller_verified_at", null).order("created_at", { ascending: true }),
    supabase.from("users").select("id, full_name, email, seller_verified_at").eq("is_seller", true).not("seller_verified_at", "is", null).order("seller_verified_at", { ascending: false }).limit(10),
  ]);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar userRole={profile?.role as AccountRole} userEmail={user.email ?? null} />

      <main className="flex-1 bg-gray-50">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Admin Panel</h1>
          <p className="text-sm text-gray-500 mb-6">Platform-wide analytics and moderation tools.</p>

          <div className="flex items-center gap-1 mb-6 border-b border-gray-200">
            {ADMIN_TABS.map((t) => (
              <Link key={t.href} href={t.href}
                className={`px-4 py-2.5 text-sm font-medium ${t.href === "/admin/sellers" ? "text-brand-600 border-b-2 border-brand-600" : "text-gray-500 hover:text-gray-700"}`}>
                {t.label}
              </Link>
            ))}
          </div>

          <div className="card p-6 mb-6">
            <h2 className="section-title text-lg mb-4">Awaiting verification ({pending?.length ?? 0})</h2>
            {pending && pending.length > 0 ? (
              <div className="space-y-2">
                {pending.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-3 border-b border-gray-50 last:border-0 pb-3 last:pb-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{s.full_name ?? "Unnamed seller"}</p>
                      <p className="text-xs text-gray-500 truncate">{s.email} · applied {timeAgo(s.created_at)}</p>
                    </div>
                    <form action={verifySeller.bind(null, s.id)} className="shrink-0">
                      <button type="submit" className="btn-primary py-2 px-3 text-sm">
                        <ShieldCheck className="h-4 w-4" /> Verify
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-gray-400">
                <ShieldQuestion className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm">No sellers waiting on verification.</p>
              </div>
            )}
          </div>

          <div className="card p-6">
            <h2 className="section-title text-lg mb-4">Recently verified</h2>
            {verified && verified.length > 0 ? (
              <div className="space-y-2">
                {verified.map((s) => (
                  <div key={s.id} className="flex items-center justify-between text-sm border-b border-gray-50 last:border-0 pb-2.5 last:pb-0">
                    <span className="flex items-center gap-1.5 text-gray-800">
                      <ShieldCheck className="h-3.5 w-3.5 text-trust-600" /> {s.full_name}
                    </span>
                    <span className="text-xs text-gray-400">{timeAgo(s.seller_verified_at!)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-6">No sellers verified yet.</p>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
