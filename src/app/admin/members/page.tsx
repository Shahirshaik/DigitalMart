import Link from "next/link";
import { redirect } from "next/navigation";
import { Search, ShieldCheck, Ban, CheckCircle2, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { SelectAllCheckbox } from "@/components/ui/SelectAllCheckbox";
import { formatMoney, timeAgo } from "@/lib/utils";
import { toggleUserActive, promoteToManager, demoteManager, bulkSetUserActive } from "../actions";
import type { AccountRole } from "@/types/database";

const BULK_FORM_ID = "bulk-member-actions";

export const metadata = { title: "Members | Admin" };

const CATEGORY_LABELS: Record<string, string> = {
  student: "Student",
  experienced_professional: "Experienced Professional",
  career_gap: "Career Gap",
};

interface Props { searchParams: Promise<{ q?: string }> }

export default async function AdminMembersPage({ searchParams }: Props) {
  const { q } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/admin/members");
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

  let query = supabase.from("v_admin_member_directory").select("*").order("created_at", { ascending: false });
  if (q) query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`);
  const { data: members } = await query;

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
                className={`px-4 py-2.5 text-sm font-medium shrink-0 ${t.href === "/admin/members" ? "text-brand-600 border-b-2 border-brand-600" : "text-gray-500 hover:text-gray-700"}`}>
                {t.label}
              </Link>
            ))}
          </div>

          <form method="GET" className="mb-6">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input name="q" defaultValue={q} placeholder="Search by name or email..." className="input pl-10" />
            </div>
          </form>

          <form id={BULK_FORM_ID} className="mb-3 flex items-center gap-3 flex-wrap">
            <label className="flex items-center gap-2 text-xs text-gray-500">
              <SelectAllCheckbox formId={BULK_FORM_ID} targetName="ids" /> Select all
            </label>
            <button type="submit" formAction={bulkSetUserActive.bind(null, false)} className="btn-secondary py-1.5 px-3 text-xs">
              <Ban className="h-3.5 w-3.5" /> Deactivate selected
            </button>
            <button type="submit" formAction={bulkSetUserActive.bind(null, true)} className="btn-secondary py-1.5 px-3 text-xs">
              <CheckCircle2 className="h-3.5 w-3.5" /> Reactivate selected
            </button>
          </form>

          <div className="card p-6">
            <h2 className="section-title text-lg mb-4">All members ({members?.length ?? 0})</h2>
            {members && members.length > 0 ? (
              <div className="space-y-3">
                {members.map((m) => (
                  <div key={m.id} className="flex items-start gap-2.5">
                    <input type="checkbox" name="ids" value={m.id} form={BULK_FORM_ID}
                      aria-label={`Select ${m.full_name ?? m.email}`}
                      className="h-4 w-4 rounded border-gray-300 mt-4 shrink-0" />
                  <details className="flex-1 min-w-0 rounded-xl border border-gray-100 p-4">
                    <summary className="cursor-pointer flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate flex items-center gap-1.5 flex-wrap">
                          {m.full_name ?? "Unnamed"}
                          {m.role === "admin" && <span className="badge bg-indigo-100 text-indigo-700">admin</span>}
                          {m.role === "manager" && <span className="badge bg-blue-100 text-blue-700">manager</span>}
                          {m.is_seller && <span className="badge bg-trust-100 text-trust-700">seller</span>}
                          {m.is_seller && m.seller_verified_at && <span className="badge bg-green-100 text-green-800 flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> verified</span>}
                          {!m.is_active && <span className="badge bg-red-100 text-red-700">deactivated</span>}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{m.email} · joined {timeAgo(m.created_at)}</p>
                      </div>
                      {m.is_seller ? (
                        <span className="text-sm font-semibold text-gray-800 shrink-0">{formatMoney(Number(m.lifetime_seller_earnings))}</span>
                      ) : (
                        <span className="text-sm font-semibold text-gray-500 shrink-0">{formatMoney(Number(m.lifetime_buyer_spend))} spent</span>
                      )}
                    </summary>

                    <div className="mt-4 pt-4 border-t border-gray-100 space-y-3 text-sm">
                      <div className="grid sm:grid-cols-2 gap-3 text-gray-600">
                        <p><span className="text-gray-400">Phone:</span> {m.phone ?? "—"}</p>
                        <p><span className="text-gray-400">Onboarding:</span> {m.onboarding_completed_at ? "completed" : "not completed"}</p>
                        <p><span className="text-gray-400">Category:</span> {m.category ? CATEGORY_LABELS[m.category] ?? m.category : "—"}</p>
                        <p><span className="text-gray-400">Skill level:</span> {m.skill_level ?? "—"}</p>
                        <p className="sm:col-span-2"><span className="text-gray-400">Looking for / learning:</span> {m.target_field ?? "—"}</p>
                        <p><span className="text-gray-400">Preferred format:</span> {m.preferred_format?.replace(/_/g, " ") ?? "—"}</p>
                        <p><span className="text-gray-400">Wallet balance:</span> {formatMoney(Number(m.wallet_balance))}</p>
                        {m.is_seller && <p><span className="text-gray-400">Lifetime seller earnings:</span> {formatMoney(Number(m.lifetime_seller_earnings))}</p>}
                        <p><span className="text-gray-400">Lifetime spent as buyer:</span> {formatMoney(Number(m.lifetime_buyer_spend))}</p>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap pt-2">
                        <form action={toggleUserActive.bind(null, m.id, !m.is_active)}>
                          <button type="submit" className={m.is_active ? "btn-secondary py-1.5 px-3 text-xs" : "btn-primary py-1.5 px-3 text-xs"}>
                            {m.is_active ? <><Ban className="h-3.5 w-3.5" /> Deactivate</> : <><CheckCircle2 className="h-3.5 w-3.5" /> Reactivate</>}
                          </button>
                        </form>
                        {isAdmin && m.role === "user" && (
                          <form action={promoteToManager.bind(null, m.id)}>
                            <button type="submit" className="btn-secondary py-1.5 px-3 text-xs">
                              <Star className="h-3.5 w-3.5" /> Make Manager
                            </button>
                          </form>
                        )}
                        {isAdmin && m.role === "manager" && (
                          <form action={demoteManager.bind(null, m.id)}>
                            <button type="submit" className="text-xs text-red-600 hover:underline">Remove Manager</button>
                          </form>
                        )}
                      </div>
                    </div>
                  </details>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-10">No members match that search.</p>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
