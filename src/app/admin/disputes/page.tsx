import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, XCircle, ShieldAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { formatPrice, timeAgo } from "@/lib/utils";
import { resolveDispute } from "../actions";
import type { AccountRole } from "@/types/database";

export const metadata = { title: "Disputes | Admin" };

const ADMIN_TABS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/sellers", label: "Seller Verification" },
  { href: "/admin/disputes", label: "Disputes" },
  { href: "/admin/payouts", label: "Payouts" },
  { href: "/admin/content", label: "Site Content" },
];

export default async function AdminDisputesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/admin/disputes");
  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/");

  const { data: disputes } = await supabase.from("v_admin_dispute_queue").select("*");

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
                className={`px-4 py-2.5 text-sm font-medium ${t.href === "/admin/disputes" ? "text-brand-600 border-b-2 border-brand-600" : "text-gray-500 hover:text-gray-700"}`}>
                {t.label}
              </Link>
            ))}
          </div>

          <div className="card p-6">
            <h2 className="section-title text-lg mb-4">Open disputes ({disputes?.length ?? 0})</h2>
            {disputes && disputes.length > 0 ? (
              <div className="space-y-5">
                {disputes.map((d) => (
                  <div key={d.id} className="border-b border-gray-100 last:border-0 pb-5 last:pb-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-sm font-semibold text-gray-900">
                        {d.buyer_name} vs. {d.seller_name}
                      </p>
                      <span className="text-sm font-semibold text-gray-700">{formatPrice(Number(d.amount))}</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">{d.reason}</p>
                    <p className="text-xs text-gray-400 mb-3">Raised {timeAgo(d.created_at)} · {d.item_type} order</p>
                    <form action={resolveDispute.bind(null, d.id, d.order_id, "buyer", "")} className="inline-block mr-2">
                      <button type="submit" className="btn-secondary py-2 px-3 text-sm">
                        <XCircle className="h-4 w-4" /> Side with buyer (refund)
                      </button>
                    </form>
                    <form action={resolveDispute.bind(null, d.id, d.order_id, "seller", "")} className="inline-block">
                      <button type="submit" className="btn-primary py-2 px-3 text-sm">
                        <CheckCircle2 className="h-4 w-4" /> Side with seller (release)
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-gray-400">
                <ShieldAlert className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm">No open disputes.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
