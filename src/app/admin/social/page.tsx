import Link from "next/link";
import { redirect } from "next/navigation";
import { Instagram, Facebook, Trash2, Send, CheckCircle2, XCircle, Clock, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ImageUploader } from "@/components/ui/ImageUploader";
import { startMetaConnect, disconnectAccount, composePost, publishPostNow, deletePost, setAutoPostSetting } from "./actions";
import type { AccountRole } from "@/types/database";

export const metadata = { title: "Social Media | Admin" };

interface Props { searchParams: Promise<{ connected?: string; error?: string }> }

const STATUS_STYLE: Record<string, { icon: typeof Clock; className: string }> = {
  draft: { icon: Clock, className: "bg-gray-100 text-gray-600" },
  scheduled: { icon: Clock, className: "bg-blue-100 text-blue-700" },
  posted: { icon: CheckCircle2, className: "bg-trust-100 text-trust-700" },
  failed: { icon: XCircle, className: "bg-red-100 text-red-700" },
};

export default async function AdminSocialPage({ searchParams }: Props) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/admin/social");
  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/");

  const [{ data: accounts }, { data: posts }, { data: settingRow }] = await Promise.all([
    supabase.from("social_accounts").select("*").eq("is_active", true).order("connected_at", { ascending: false }),
    supabase.from("social_posts").select("*, account:social_accounts(account_label, platform)").order("created_at", { ascending: false }).limit(30),
    supabase.from("site_content").select("value").eq("key", "social_auto_post_new_listings").maybeSingle(),
  ]);
  const autoPostEnabled = settingRow?.value === "true";

  const ADMIN_TABS = [
    { href: "/admin", label: "Overview" },
    { href: "/admin/members", label: "Members" },
    { href: "/admin/sellers", label: "Seller Verification" },
    { href: "/admin/disputes", label: "Disputes" },
    { href: "/admin/requests", label: "Requests" },
    { href: "/admin/referrals", label: "Partner Referrals" },
    { href: "/admin/payouts", label: "Payouts" },
    { href: "/admin/content", label: "Site Content" },
    { href: "/admin/social", label: "Social Media" },
    { href: "/admin/team", label: "Team" },
    { href: "/admin/audit", label: "Audit Log" },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar userRole={profile?.role as AccountRole} userEmail={user.email ?? null} />

      <main className="flex-1 bg-gray-50">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Admin Panel</h1>
          <p className="text-sm text-gray-500 mb-6">Platform-wide analytics and moderation tools.</p>

          <div className="flex items-center gap-1 mb-6 border-b border-gray-200 overflow-x-auto">
            {ADMIN_TABS.map((t) => (
              <Link key={t.href} href={t.href}
                className={`px-4 py-2.5 text-sm font-medium shrink-0 ${t.href === "/admin/social" ? "text-brand-600 border-b-2 border-brand-600" : "text-gray-500 hover:text-gray-700"}`}>
                {t.label}
              </Link>
            ))}
          </div>

          {params.connected && (
            <div className="rounded-xl bg-trust-50 border border-trust-200 text-trust-800 text-sm px-4 py-3 mb-6 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" /> Connected {params.connected} account(s).
            </div>
          )}
          {params.error && (
            <div className="rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm px-4 py-3 mb-6 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" /> {params.error}
            </div>
          )}

          {/* ── Connected Accounts ───────────────────────── */}
          <section className="card p-6 mb-8">
            <div className="flex items-center justify-between mb-1">
              <h2 className="section-title text-lg">Connected Accounts</h2>
              <form action={startMetaConnect}>
                <button type="submit" className="btn-primary py-2 px-4 text-sm">Connect Instagram / Facebook</button>
              </form>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Connects via Meta's official Business API. Requires the Instagram account to be a Business/Creator
              account linked to a Facebook Page, and a Meta Developer App with{" "}
              <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">META_APP_ID</code> /{" "}
              <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">META_APP_SECRET</code> configured.
            </p>

            {accounts && accounts.length > 0 ? (
              <div className="space-y-2">
                {accounts.map((a) => (
                  <div key={a.id} className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3">
                    <div className="flex items-center gap-3">
                      {a.platform === "instagram" ? <Instagram className="h-4 w-4 text-brand-600" /> : <Facebook className="h-4 w-4 text-brand-600" />}
                      <span className="text-sm font-medium text-gray-800">{a.account_label}</span>
                    </div>
                    <form action={disconnectAccount.bind(null, a.id)}>
                      <button type="submit" className="text-xs text-red-600 hover:underline">Disconnect</button>
                    </form>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 py-4 text-center">No accounts connected yet.</p>
            )}
          </section>

          {/* ── Auto-post setting ────────────────────────── */}
          <section className="card p-6 mb-8">
            <h2 className="section-title text-lg mb-1">Auto-Post New Listings</h2>
            <p className="text-sm text-gray-500 mb-4">
              When on, a post is auto-drafted and scheduled to every connected account whenever a seller
              publishes a new listing (Instagram only if the listing has a photo — text-only posts aren't
              supported there).
            </p>
            <form action={setAutoPostSetting} className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" name="auto_post_new_listings" defaultChecked={autoPostEnabled} />
                Auto-post new listings
              </label>
              <button type="submit" className="btn-secondary py-1.5 px-3 text-xs">Save</button>
            </form>
          </section>

          {/* ── Compose ──────────────────────────────────── */}
          <section className="card p-6 mb-8">
            <h2 className="section-title text-lg mb-1">Compose a Post</h2>
            <p className="text-sm text-gray-500 mb-4">
              Scheduled posts go out on the next daily posting run — exact-time scheduling isn't available on
              the current hosting plan, so treat "scheduled for" as "goes out that day," not a fixed minute.
            </p>
            {accounts && accounts.length > 0 ? (
              <form action={composePost} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Account</label>
                  <select name="account_id" required className="input">
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>{a.account_label} ({a.platform})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Caption</label>
                  <textarea name="caption" required rows={4} className="input" placeholder="What's the post about?" />
                </div>
                <ImageUploader name="image_url" label="Image (required for Instagram)" />
                <div className="grid sm:grid-cols-2 gap-3 items-end">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Schedule for (optional)</label>
                    <input type="datetime-local" name="scheduled_for" className="input" />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-gray-700 pb-2.5">
                    <input type="checkbox" name="post_now" /> Post immediately instead
                  </label>
                </div>
                <button type="submit" className="btn-primary py-2 px-4 text-sm flex items-center gap-1.5">
                  <Send className="h-3.5 w-3.5" /> Save Post
                </button>
              </form>
            ) : (
              <p className="text-sm text-gray-400 py-4 text-center">Connect an account above first.</p>
            )}
          </section>

          {/* ── History ──────────────────────────────────── */}
          <section className="card p-6">
            <h2 className="section-title text-lg mb-4">Recent Posts</h2>
            {posts && posts.length > 0 ? (
              <div className="space-y-2">
                {posts.map((p) => {
                  const style = STATUS_STYLE[p.status] ?? STATUS_STYLE.draft;
                  const StatusIcon = style.icon;
                  const account = p.account as any;
                  return (
                    <div key={p.id} className="rounded-xl border border-gray-100 p-4">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{account?.account_label ?? p.platform}</p>
                          <p className="text-sm text-gray-500 line-clamp-2 mt-0.5">{p.caption}</p>
                        </div>
                        <span className={`badge shrink-0 flex items-center gap-1 ${style.className}`}>
                          <StatusIcon className="h-3 w-3" /> {p.status}
                        </span>
                      </div>
                      {p.error_message && <p className="text-xs text-red-600 mb-2">{p.error_message}</p>}
                      <div className="flex items-center gap-3">
                        {(p.status === "draft" || p.status === "scheduled" || p.status === "failed") && (
                          <form action={publishPostNow.bind(null, p.id)}>
                            <button type="submit" className="text-xs text-brand-600 hover:underline flex items-center gap-1">
                              <Send className="h-3 w-3" /> Post now
                            </button>
                          </form>
                        )}
                        <form action={deletePost.bind(null, p.id)}>
                          <button type="submit" className="text-xs text-red-600 hover:underline flex items-center gap-1">
                            <Trash2 className="h-3 w-3" /> Delete
                          </button>
                        </form>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-400 py-4 text-center">No posts yet.</p>
            )}
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
