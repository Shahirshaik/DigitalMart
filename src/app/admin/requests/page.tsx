import Link from "next/link";
import { redirect } from "next/navigation";
import { MessageSquarePlus, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { timeAgo, buildWhatsAppLink } from "@/lib/utils";
import { getSupportContact } from "@/lib/siteContent";
import { updateProductRequestStatus } from "../actions";
import type { AccountRole, ProductRequestStatus } from "@/types/database";

export const metadata = { title: "Product Requests | Admin" };

const STATUS_OPTIONS: ProductRequestStatus[] = ["new", "contacted", "fulfilled", "declined"];

export default async function AdminRequestsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/admin/requests");
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

  const { data: requests } = await supabase.from("v_admin_product_requests").select("*");
  const { whatsappNumber } = await getSupportContact();

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
                className={`px-4 py-2.5 text-sm font-medium shrink-0 ${t.href === "/admin/requests" ? "text-brand-600 border-b-2 border-brand-600" : "text-gray-500 hover:text-gray-700"}`}>
                {t.label}
              </Link>
            ))}
          </div>

          <div className="card p-6">
            <h2 className="section-title text-lg mb-4">Product &amp; course requests ({requests?.length ?? 0})</h2>
            {requests && requests.length > 0 ? (
              <div className="space-y-5">
                {requests.map((r) => {
                  const waLink = r.requester_phone
                    ? buildWhatsAppLink(r.requester_phone, `Hi ${r.requester_name}, following up on your request for "${r.title}" on DigitalMart.`)
                    : buildWhatsAppLink(whatsappNumber, `Follow-up on request "${r.title}" from ${r.requester_name} (${r.requester_email})`);
                  return (
                    <div key={r.id} className="border-b border-gray-100 last:border-0 pb-5 last:pb-0">
                      <div className="flex items-center justify-between gap-3 mb-1">
                        <p className="text-sm font-semibold text-gray-900 truncate">{r.title}</p>
                        <span className={`badge shrink-0 ${
                          r.status === "new" ? "bg-gray-100 text-gray-600"
                          : r.status === "contacted" ? "bg-blue-100 text-blue-700"
                          : r.status === "fulfilled" ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-700"}`}>
                          {r.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-1.5">{r.description}</p>
                      <p className="text-xs text-gray-400 mb-3">
                        {r.requester_name} · {r.requester_email} · requested {timeAgo(r.created_at)}
                      </p>

                      <div className="flex items-center gap-2 flex-wrap">
                        {waLink && (
                          <a href={waLink} target="_blank" rel="noopener noreferrer" className="btn-ghost py-1.5 px-3 text-xs">
                            <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                          </a>
                        )}
                        {STATUS_OPTIONS.filter((s) => s !== r.status).map((s) => (
                          <form key={s} action={updateProductRequestStatus.bind(null, r.id, s, r.admin_notes ?? "")}>
                            <button type="submit" className="btn-secondary py-1.5 px-3 text-xs capitalize">
                              Mark {s}
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
                <MessageSquarePlus className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm">No product requests yet.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
