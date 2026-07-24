import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Wallet, Gift, Users, TrendingUp, ArrowDownToLine, ShoppingBag } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { CopyLinkButton } from "@/components/ui/CopyLinkButton";
import { formatPrice, formatMoney, timeAgo } from "@/lib/utils";
import { redeemWalletCredit } from "./actions";
import type { AccountRole } from "@/types/database";

export const metadata = { title: "Wallet & Referrals" };

const REDEMPTION_THRESHOLD = 5000;

const TXN_LABELS: Record<string, string> = {
  earned: "Referral credit earned",
  redeemed_purchase: "Applied to a purchase",
  withdrawn: "Payout requested",
};

export default async function WalletPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/wallet");

  const [{ data: profile }, { data: wallet }, { data: transactions }, { data: referrals }] = await Promise.all([
    supabase.from("users").select("role").eq("id", user.id).single(),
    supabase.from("wallets").select("balance_credits").eq("user_id", user.id).single(),
    supabase.from("wallet_transactions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
    supabase.from("referrals").select("id, created_at, referred:users!referrals_referred_id_fkey(full_name, created_at)")
      .eq("referrer_id", user.id).order("created_at", { ascending: false }),
  ]);

  const balance = Number(wallet?.balance_credits ?? 0);
  const canRedeem = balance >= REDEMPTION_THRESHOLD;
  const referralLink = `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://digitalmart-tau.vercel.app"}/auth/signup?ref=${user.id}`;

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar userRole={profile?.role as AccountRole} userEmail={user.email ?? null} />

      <main className="flex-1 bg-gray-50">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-600 mb-6">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Digital Mart
          </Link>

          <div className="card p-6 mb-6">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="h-5 w-5 text-brand-600" />
              <p className="text-sm font-medium text-gray-500">Wallet balance</p>
            </div>
            <p className="text-3xl font-extrabold text-gray-900 mb-4">{formatMoney(balance)}</p>

            {canRedeem ? (
              <div className="flex flex-col sm:flex-row gap-3">
                <form action={redeemWalletCredit.bind(null, "redeemed_purchase")} className="flex-1">
                  <button type="submit" className="btn-primary w-full py-2.5 text-sm">
                    <ShoppingBag className="h-4 w-4" /> Apply {formatPrice(REDEMPTION_THRESHOLD)} to next purchase
                  </button>
                </form>
                <form action={redeemWalletCredit.bind(null, "withdrawn")} className="flex-1">
                  <button type="submit" className="btn-secondary w-full py-2.5 text-sm">
                    <ArrowDownToLine className="h-4 w-4" /> Request {formatPrice(REDEMPTION_THRESHOLD)} payout
                  </button>
                </form>
              </div>
            ) : (
              <p className="text-xs text-gray-400">
                Earn {formatPrice(REDEMPTION_THRESHOLD)} in referral credit to unlock redemption — apply it to a
                purchase or request a payout.
              </p>
            )}
          </div>

          <div className="card p-6 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Gift className="h-5 w-5 text-brand-600" />
              <h2 className="section-title text-lg">Refer &amp; earn</h2>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Share your link — when someone you referred completes their first purchase, you earn 10% of that
              order as wallet credit.
            </p>
            <div className="flex gap-2">
              <input readOnly value={referralLink} className="input text-xs sm:text-sm flex-1 truncate" />
              <CopyLinkButton text={referralLink} />
            </div>
          </div>

          <div className="card p-6 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-5 w-5 text-brand-600" />
              <h2 className="section-title text-lg">People you referred ({referrals?.length ?? 0})</h2>
            </div>
            {referrals && referrals.length > 0 ? (
              <ul className="space-y-2">
                {referrals.map((r) => (
                  <li key={r.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{(r.referred as any)?.full_name ?? "A new member"}</span>
                    <span className="text-gray-400 text-xs">joined {timeAgo(r.created_at)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-400">No referrals yet — share your link above to start earning.</p>
            )}
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-5 w-5 text-brand-600" />
              <h2 className="section-title text-lg">Wallet history</h2>
            </div>
            {transactions && transactions.length > 0 ? (
              <ul className="space-y-2.5">
                {transactions.map((t) => (
                  <li key={t.id} className="flex items-center justify-between text-sm border-b border-gray-50 last:border-0 pb-2.5 last:pb-0">
                    <div>
                      <p className="text-gray-800">{TXN_LABELS[t.type] ?? t.type}</p>
                      <p className="text-xs text-gray-400">{timeAgo(t.created_at)}</p>
                    </div>
                    <span className={`font-semibold ${Number(t.amount) >= 0 ? "text-green-600" : "text-gray-600"}`}>
                      {Number(t.amount) >= 0 ? "+" : ""}{formatPrice(Number(t.amount))}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-400">No wallet activity yet.</p>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
