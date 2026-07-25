import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, Wallet, MessageCircle, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { formatPrice, formatMoney, timeAgo, buildWhatsAppLink } from "@/lib/utils";
import { markWithdrawalSent } from "../actions";
import type { AccountRole } from "@/types/database";

export const metadata = { title: "Withdrawal Requests | Admin" };

const ADMIN_TABS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/sellers", label: "Seller Verification" },
  { href: "/admin/disputes", label: "Disputes" },
  { href: "/admin/payouts", label: "Payouts" },
];

export default async function AdminPayoutsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/admin/payouts");
  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/");

  const { data: queue } = await supabase.from("v_admin_withdrawal_queue").select("*");
  const totalOwed = (queue ?? []).reduce((sum, q) => sum + Number(q.amount), 0);

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
                className={`px-4 py-2.5 text-sm font-medium ${t.href === "/admin/payouts" ? "text-brand-600 border-b-2 border-brand-600" : "text-gray-500 hover:text-gray-700"}`}>
                {t.label}
              </Link>
            ))}
          </div>

          <div className="card p-6 mb-6">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="h-5 w-5 text-brand-600" />
              <p className="text-sm font-medium text-gray-500">Requested withdrawals awaiting payment</p>
            </div>
            <p className="text-3xl font-extrabold text-gray-900">{formatMoney(totalOwed)}</p>
            <p className="text-xs text-gray-400 mt-1">
              Sellers' earnings sit in their wallet until they request a withdrawal — send each one their share via UPI, then mark it sent.
            </p>
          </div>

          <div className="card p-6">
            <h2 className="section-title text-lg mb-4">Pending requests ({queue?.length ?? 0})</h2>
            {queue && queue.length > 0 ? (
              <div className="space-y-4">
                {queue.map((q) => {
                  const waLink = q.payout_upi_id
                    ? null
                    : buildWhatsAppLink("+91 9010731398", `Hi ${q.seller_name}, could you share your UPI ID so we can send your ₹${q.amount} withdrawal?`);
                  return (
                    <div key={q.request_id} className="border-b border-gray-100 last:border-0 pb-4 last:pb-0">
                      <div className="flex items-center justify-between gap-3 mb-1">
                        <p className="text-sm font-semibold text-gray-900 truncate">{q.seller_name}</p>
                        <span className="text-sm font-bold text-gray-900 shrink-0">{formatPrice(Number(q.amount))}</span>
                      </div>
                      <p className="text-xs text-gray-500 mb-1.5">requested {timeAgo(q.requested_at)}</p>
                      {q.payout_upi_id ? (
                        <p className="text-xs font-mono bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-1.5 inline-block mb-2">
                          {q.payout_upi_id}
                        </p>
                      ) : (
                        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 mb-2 flex items-center gap-1.5 w-fit">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0" /> No UPI ID on file — ask the seller directly
                        </p>
                      )}
                      <div className="flex items-center gap-2 flex-wrap">
                        {waLink && (
                          <a href={waLink} target="_blank" rel="noopener noreferrer" className="btn-ghost py-1.5 px-3 text-xs">
                            <MessageCircle className="h-3.5 w-3.5" /> Ask on WhatsApp
                          </a>
                        )}
                        <form action={markWithdrawalSent.bind(null, q.request_id)}>
                          <button type="submit" className="btn-primary py-1.5 px-3 text-xs">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Mark Sent
                          </button>
                        </form>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-10 text-gray-400">
                <Wallet className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm">No withdrawal requests right now.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
