import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldAlert, Star, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { timeAgo } from "@/lib/utils";
import { promoteToManager, demoteManager } from "../actions";
import type { AccountRole } from "@/types/database";

export const metadata = { title: "Team | Admin" };

interface Props { searchParams: Promise<{ q?: string }> }

export default async function AdminTeamPage({ searchParams }: Props) {
  const { q } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/admin/team");
  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/");

  const ADMIN_TABS = [
    { href: "/admin", label: "Overview" },
    { href: "/admin/members", label: "Members" },
    { href: "/admin/sellers", label: "Seller Verification" },
    { href: "/admin/disputes", label: "Disputes" },
    { href: "/admin/requests", label: "Requests" },
    { href: "/admin/payouts", label: "Payouts" },
    { href: "/admin/content", label: "Site Content" },
    { href: "/admin/team", label: "Team" },
  ];

  const { data: managers } = await supabase.from("users")
    .select("id, full_name, email, created_at").eq("role", "manager").order("created_at", { ascending: false });

  let candidates: { id: string; full_name: string | null; email: string; created_at: string }[] = [];
  if (q) {
    const { data } = await supabase.from("users")
      .select("id, full_name, email, created_at")
      .eq("role", "user")
      .or(`full_name.ilike.%${q}%,email.ilike.%${q}%`)
      .limit(10);
    candidates = data ?? [];
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar userRole={profile?.role as AccountRole} userEmail={user.email ?? null} />

      <main className="flex-1 bg-gray-50">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Admin Panel</h1>
          <p className="text-sm text-gray-500 mb-6">Platform-wide analytics and moderation tools.</p>

          <div className="flex items-center gap-1 mb-6 border-b border-gray-200 overflow-x-auto">
            {ADMIN_TABS.map((t) => (
              <Link key={t.href} href={t.href}
                className={`px-4 py-2.5 text-sm font-medium shrink-0 ${t.href === "/admin/team" ? "text-brand-600 border-b-2 border-brand-600" : "text-gray-500 hover:text-gray-700"}`}>
                {t.label}
              </Link>
            ))}
          </div>

          <div className="card p-6 mb-6 bg-amber-50 border-amber-200">
            <div className="flex items-start gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-700 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-800">
                Managers can access the member directory, seller verification, disputes, and product requests.
                They cannot see payouts, edit site content, or grant/revoke roles — those stay admin-only.
              </p>
            </div>
          </div>

          <div className="card p-6 mb-6">
            <h2 className="section-title text-lg mb-4">Current managers ({managers?.length ?? 0})</h2>
            {managers && managers.length > 0 ? (
              <div className="space-y-2">
                {managers.map((m) => (
                  <div key={m.id} className="flex items-center justify-between gap-3 border-b border-gray-50 last:border-0 pb-3 last:pb-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{m.full_name ?? "Unnamed"}</p>
                      <p className="text-xs text-gray-500 truncate">{m.email} · manager since {timeAgo(m.created_at)}</p>
                    </div>
                    <form action={demoteManager.bind(null, m.id)} className="shrink-0">
                      <button type="submit" className="text-xs text-red-600 hover:underline">Remove</button>
                    </form>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-6">No managers yet — promote a trusted member below.</p>
            )}
          </div>

          <div className="card p-6">
            <h2 className="section-title text-lg mb-4">Promote a member</h2>
            <form method="GET" className="mb-4">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input name="q" defaultValue={q} placeholder="Search by name or email..." className="input pl-10" />
              </div>
            </form>
            {q && candidates.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">No matching members with role "user".</p>
            )}
            {candidates.length > 0 && (
              <div className="space-y-2">
                {candidates.map((c) => (
                  <div key={c.id} className="flex items-center justify-between gap-3 border-b border-gray-50 last:border-0 pb-3 last:pb-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{c.full_name ?? "Unnamed"}</p>
                      <p className="text-xs text-gray-500 truncate">{c.email} · joined {timeAgo(c.created_at)}</p>
                    </div>
                    <form action={promoteToManager.bind(null, c.id)} className="shrink-0">
                      <button type="submit" className="btn-secondary py-1.5 px-3 text-xs">
                        <Star className="h-3.5 w-3.5" /> Make Manager
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
