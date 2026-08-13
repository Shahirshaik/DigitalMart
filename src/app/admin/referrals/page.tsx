import Link from "next/link";
import { redirect } from "next/navigation";
import { Handshake, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { timeAgo, buildWhatsAppLink } from "@/lib/utils";
import { updateInstituteReferralStatus } from "../actions";
import type { AccountRole } from "@/types/database";

export const metadata = { title: "Partner Referrals | Admin" };

type ReferralStatus = "new" | "contacted" | "enrolled" | "commission_paid";
const STATUS_OPTIONS: ReferralStatus[] = ["new", "contacted", "enrolled", "commission_paid"];
const STATUS_LABELS: Record<ReferralStatus, string> = {
  new: "New", contacted: "Contacted", enrolled: "Enrolled", commission_paid: "Commission Paid",
};
const STATUS_COLORS: Record<ReferralStatus, string> = {
  new: "bg-gray-100 text-gray-600",
  contacted: "bg-blue-100 text-blue-700",
  enrolled: "bg-green-100 text-green-800",
  commission_paid: "bg-gold-100 text-gold-700",
};

export default async function AdminReferralsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/admin/referrals");
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
    { href: "/admin/team", label: "Team" },
    { href: "/admin/audit", label: "Audit Log" },
  ];

  const { data: referrals } = await supabase.from("institute_referrals").select("*").order("created_at", { ascending: false });

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
                className={`px-4 py-2.5 text-sm font-medium shrink-0 ${t.href === "/admin/referrals" ? "text-brand-600 border-b-2 border-brand-600" : "text-gray-500 hover:text-gray-700"}`}>
                {t.label}
              </Link>
            ))}
          </div>

          <div className="card p-6">
            <h2 className="section-title text-lg mb-4">Institute &amp; candidate referrals ({referrals?.length ?? 0})</h2>
            {referrals && referrals.length > 0 ? (
              <div className="space-y-5">
                {referrals.map((r) => {
                  const status = r.status as ReferralStatus;
                  const waLink = buildWhatsAppLink(r.candidate_phone, `Hi ${r.candidate_name}, this is Digital Mart — ${r.institute_name} referred you for "${r.course_interest}". Let's get you started!`);
                  const contactWaLink = buildWhatsAppLink(r.contact_phone, `Hi ${r.contact_name}, this is Digital Mart following up on the referral for ${r.candidate_name} (${r.course_interest}).`);
                  return (
                    <div key={r.id} className="border-b border-gray-100 last:border-0 pb-5 last:pb-0">
                      <div className="flex items-center justify-between gap-3 mb-1.5">
                        <p className="text-sm font-semibold text-gray-900 truncate">{r.candidate_name} — {r.course_interest}</p>
                        <span className={`badge shrink-0 ${STATUS_COLORS[status]}`}>{STATUS_LABELS[status]}</span>
                      </div>
                      <p className="text-xs text-gray-500 mb-1">
                        Candidate: {r.candidate_phone} · via <span className="font-medium">{r.institute_name}</span> ({r.contact_name}, {r.contact_phone})
                      </p>
                      {r.notes && <p className="text-sm text-gray-600 mb-1.5">{r.notes}</p>}
                      <p className="text-xs text-gray-400 mb-3">Submitted {timeAgo(r.created_at)}</p>

                      <div className="flex items-center gap-2 flex-wrap">
                        {waLink && (
                          <a href={waLink} target="_blank" rel="noopener noreferrer" className="btn-ghost py-1.5 px-3 text-xs">
                            <MessageCircle className="h-3.5 w-3.5" /> WhatsApp candidate
                          </a>
                        )}
                        {contactWaLink && (
                          <a href={contactWaLink} target="_blank" rel="noopener noreferrer" className="btn-ghost py-1.5 px-3 text-xs">
                            <MessageCircle className="h-3.5 w-3.5" /> WhatsApp institute
                          </a>
                        )}
                        {STATUS_OPTIONS.filter((s) => s !== status).map((s) => (
                          <form key={s} action={updateInstituteReferralStatus.bind(null, r.id, s)}>
                            <button type="submit" className="btn-secondary py-1.5 px-3 text-xs">
                              Mark {STATUS_LABELS[s]}
                            </button>
                          </form>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-10 text-gray-400">
                <Handshake className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm">No partner referrals yet.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
