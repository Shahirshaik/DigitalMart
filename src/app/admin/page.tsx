import Link from "next/link";
import { redirect } from "next/navigation";
import { Users, ShoppingBag, GraduationCap, TrendingUp, ShieldCheck, AlertTriangle, Wallet, MessageSquarePlus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { formatMoney } from "@/lib/utils";
import type { AccountRole } from "@/types/database";

export const metadata = { title: "Admin Panel" };

export default async function AdminOverviewPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/admin");
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

  const [
    { count: userCount },
    { count: activeUserCount },
    { count: listingCount },
    { count: courseCount },
    { count: pendingSellerCount },
    { count: openDisputeCount },
    { count: awaitingPayoutCount },
    { count: newRequestCount },
    { data: gmvRow },
    { data: categories },
  ] = await Promise.all([
    supabase.from("users").select("*", { count: "exact", head: true }),
    supabase.from("users").select("*", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("listings").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("courses").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("users").select("*", { count: "exact", head: true }).eq("is_seller", true).is("seller_verified_at", null),
    supabase.from("disputes").select("*", { count: "exact", head: true }).in("status", ["open", "under_review"]),
    supabase.from("wallet_transactions").select("*", { count: "exact", head: true }).eq("type", "withdrawn").is("fulfilled_at", null),
    supabase.from("product_requests").select("*", { count: "exact", head: true }).eq("status", "new"),
    supabase.from("orders").select("amount").eq("status", "released"),
    supabase.from("v_admin_category_performance").select("*").limit(7),
  ]);

  const gmv = (gmvRow ?? []).reduce((sum, o) => sum + Number(o.amount), 0);

  const STATS = [
    { icon: Users, label: "Total members", value: userCount ?? 0, href: "/admin/members" },
    { icon: Users, label: "Active members", value: activeUserCount ?? 0, href: "/admin/members" },
    { icon: ShoppingBag, label: "Active listings", value: listingCount ?? 0 },
    { icon: GraduationCap, label: "Active courses", value: courseCount ?? 0 },
    { icon: TrendingUp, label: "Lifetime GMV", value: formatMoney(gmv) },
    { icon: ShieldCheck, label: "Sellers awaiting verification", value: pendingSellerCount ?? 0, href: "/admin/sellers" },
    { icon: AlertTriangle, label: "Open disputes", value: openDisputeCount ?? 0, href: "/admin/disputes" },
    { icon: MessageSquarePlus, label: "New product requests", value: newRequestCount ?? 0, href: "/admin/requests" },
    ...(isAdmin ? [{ icon: Wallet, label: "Withdrawals to send", value: awaitingPayoutCount ?? 0, href: "/admin/payouts" }] : []),
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar userRole={profile?.role as AccountRole} userEmail={user.email ?? null} />

      <main className="flex-1 bg-gray-50">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Admin Panel</h1>
          <p className="text-sm text-gray-500 mb-6">Platform-wide analytics and moderation tools.</p>

          <div className="flex items-center gap-1 mb-6 border-b border-gray-200">
            {ADMIN_TABS.map((t) => (
              <Link key={t.href} href={t.href}
                className={`px-4 py-2.5 text-sm font-medium ${t.href === "/admin" ? "text-brand-600 border-b-2 border-brand-600" : "text-gray-500 hover:text-gray-700"}`}>
                {t.label}
              </Link>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
            {STATS.map((s) => {
              const Card = (
                <div className={`card p-4 ${s.href ? "hover:-translate-y-0.5 cursor-pointer" : ""}`}>
                  <s.icon className="h-5 w-5 mb-2 text-brand-600" />
                  <p className="text-xl font-bold text-gray-900">{s.value}</p>
                  <p className="text-xs text-gray-500">{s.label}</p>
                </div>
              );
              return s.href ? <Link key={s.label} href={s.href}>{Card}</Link> : <div key={s.label}>{Card}</div>;
            })}
          </div>

          <div className="card p-6">
            <h2 className="section-title text-lg mb-4">Category performance</h2>
            {categories && categories.length > 0 ? (
              <div className="space-y-2">
                {categories.map((c) => (
                  <div key={c.category_id} className="flex items-center justify-between text-sm border-b border-gray-50 last:border-0 pb-2.5 last:pb-0">
                    <div>
                      <p className="font-medium text-gray-800">{c.category_name}</p>
                      <p className="text-xs text-gray-400">{c.listing_count} listing(s) · {c.order_count} sold</p>
                    </div>
                    <span className="font-semibold text-gray-800">{formatMoney(Number(c.revenue))}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-6">No category data yet.</p>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
