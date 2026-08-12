import Link from "next/link";
import { redirect } from "next/navigation";
import { ScrollText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { timeAgo } from "@/lib/utils";
import type { AccountRole } from "@/types/database";

export const metadata = { title: "Audit Log | Admin" };

const ACTION_LABELS: Record<string, string> = {
  "seller.verify": "Verified seller",
  "dispute.resolve": "Resolved dispute",
  "user.deactivate": "Deactivated member",
  "user.reactivate": "Reactivated member",
  "user.bulk_deactivate": "Bulk-deactivated members",
  "user.bulk_reactivate": "Bulk-reactivated members",
  "user.promote_manager": "Promoted to manager",
  "user.demote_manager": "Removed manager access",
  "request.status_update": "Updated product request status",
  "payout.mark_sent": "Marked withdrawal sent",
  "referral.status_update": "Updated partner referral status",
};

interface AuditRow {
  id: string;
  action: string;
  target_type: string;
  target_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
  actor_name: string | null;
  actor_email: string;
  actor_role: string;
  target_user_name: string | null;
  target_user_email: string | null;
}

function describeTarget(row: AuditRow): string {
  if (row.target_type === "user" && row.target_user_name) return row.target_user_name;
  if (row.target_type === "user" && row.target_user_email) return row.target_user_email;
  if (row.details && Array.isArray(row.details.user_ids)) return `${row.details.count ?? row.details.user_ids.length} members`;
  if (row.target_id) return `${row.target_type} ${row.target_id.slice(0, 8)}`;
  return row.target_type;
}

export default async function AdminAuditPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/admin/audit");
  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/");

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

  const { data: log } = await supabase.from("v_admin_audit_log").select("*").limit(200);

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
                className={`px-4 py-2.5 text-sm font-medium shrink-0 ${t.href === "/admin/audit" ? "text-brand-600 border-b-2 border-brand-600" : "text-gray-500 hover:text-gray-700"}`}>
                {t.label}
              </Link>
            ))}
          </div>

          <div className="card p-6">
            <h2 className="section-title text-lg mb-1">Staff action log</h2>
            <p className="text-xs text-gray-400 mb-4">Every seller verification, dispute resolution, account status change, role change, request update, and payout sent — most recent 200.</p>
            {log && log.length > 0 ? (
              <div className="space-y-3">
                {(log as AuditRow[]).map((row) => (
                  <div key={row.id} className="flex items-start justify-between gap-3 border-b border-gray-50 last:border-0 pb-3 last:pb-0 text-sm">
                    <div className="min-w-0">
                      <p className="text-gray-900">
                        <span className="font-medium">{row.actor_name ?? row.actor_email}</span>
                        {row.actor_role === "manager" && <span className="badge bg-blue-100 text-blue-700 ml-1.5">manager</span>}
                        {" "}{ACTION_LABELS[row.action] ?? row.action}
                        {" "}<span className="text-gray-500">— {describeTarget(row)}</span>
                      </p>
                      {row.details && !Array.isArray(row.details.user_ids) && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{JSON.stringify(row.details)}</p>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 shrink-0">{timeAgo(row.created_at)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-gray-400">
                <ScrollText className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm">No staff actions logged yet.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
