import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Clock, Wallet, TrendingUp, ArrowDownToLine } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { formatPrice, formatMoney, timeAgo, ESCROW_STATUS_COLORS } from "@/lib/utils";
import type { AccountRole } from "@/types/database";

export const metadata = { title: "Payouts" };

export default async function PayoutsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/dashboard/payouts");

  const { data: profile } = await supabase.from("users").select("role, is_seller").eq("id", user.id).single();
  if (!profile?.is_seller && profile?.role !== "admin") redirect("/");

  const [{ data: payouts }, { data: wallet }, { data: orders }] = await Promise.all([
    supabase.from("v_seller_payouts").select("*").eq("seller_id", user.id).maybeSingle(),
    supabase.from("wallets").select("balance_credits").eq("user_id", user.id).single(),
    supabase.from("orders")
      .select("*, listing:listings(title), course:courses(title), buyer:users!orders_buyer_id_fkey(full_name)")
      .eq("seller_id", user.id).order("created_at", { ascending: false }).limit(30),
  ]);

  const CARDS = [
    { icon: Clock, label: "Pending", value: formatMoney(Number(payouts?.pending_amount ?? 0)), sub: `${payouts?.pending_count ?? 0} order(s) in escrow`, color: "text-yellow-600" },
    { icon: Wallet, label: "Wallet balance", value: formatMoney(Number(wallet?.balance_credits ?? 0)), sub: "withdrawable now", color: "text-blue-600" },
    { icon: TrendingUp, label: "Lifetime earnings", value: formatMoney(Number(payouts?.lifetime_earnings ?? 0)), sub: "after platform fee", color: "text-brand-600" },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar userRole={profile?.role as AccountRole} userEmail={user.email ?? null} />

      <main className="flex-1 bg-gray-50">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10">
          <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-600 mb-4">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Payouts</h1>
          <p className="text-sm text-gray-500 mb-6">
            Your earnings (after Digital Mart's platform fee) land in your wallet as soon as an order is
            released — request a withdrawal any time from the{" "}
            <Link href="/wallet" className="text-brand-600 hover:underline font-medium">Wallet</Link> page.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {CARDS.map((c) => (
              <div key={c.label} className="card p-4">
                <c.icon className={`h-5 w-5 mb-2 ${c.color}`} />
                <p className="text-xl font-bold text-gray-900">{c.value}</p>
                <p className="text-xs text-gray-500">{c.label}</p>
                <p className="text-[11px] text-gray-400">{c.sub}</p>
              </div>
            ))}
          </div>

          {Number(wallet?.balance_credits ?? 0) > 0 && (
            <Link href="/wallet" className="btn-primary w-full mb-8 py-3">
              <ArrowDownToLine className="h-4 w-4" /> Go to Wallet to request a withdrawal
            </Link>
          )}

          <div className="card p-6">
            <h2 className="section-title text-lg mb-4">Order history</h2>
            {orders && orders.length > 0 ? (
              <div className="space-y-2">
                {orders.map((o) => (
                  <div key={o.id} className="flex items-center justify-between gap-3 border-b border-gray-50 last:border-0 pb-3 last:pb-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {o.item_type === "listing" ? o.listing?.title : o.course?.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(o.buyer as any)?.full_name} · {timeAgo(o.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-semibold text-gray-800">
                        {formatPrice(Number(o.amount) * (100 - Number(o.platform_fee_pct)) / 100)}
                      </span>
                      {o.status === "released" ? (
                        <span className="badge bg-green-100 text-green-800">in wallet</span>
                      ) : (
                        <span className={`badge ${ESCROW_STATUS_COLORS[o.status]}`}>{o.status.replace(/_/g, " ")}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-10">No orders yet.</p>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
