import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Users, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { timeAgo, buildWhatsAppLink } from "@/lib/utils";
import { updateLeadStatus } from "./actions";
import type { AccountRole, LeadStatus } from "@/types/database";

export const metadata = { title: "Leads" };

const STATUS_LABELS: Record<LeadStatus, string> = { new: "New", contacted: "Contacted", converted: "Converted" };
const STATUS_COLORS: Record<LeadStatus, string> = {
  new: "bg-blue-100 text-blue-800",
  contacted: "bg-yellow-100 text-yellow-800",
  converted: "bg-green-100 text-green-800",
};
const NEXT_STATUS: Record<LeadStatus, LeadStatus | null> = { new: "contacted", contacted: "converted", converted: null };

export default async function LeadsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/dashboard/leads");

  const { data: profile } = await supabase.from("users").select("role, is_seller").eq("id", user.id).single();
  if (!profile?.is_seller && profile?.role !== "admin") redirect("/");

  const { data: leads } = await supabase
    .from("leads")
    .select("*, buyer:users!leads_buyer_id_fkey(full_name, email, phone, whatsapp_enabled), course:courses(title)")
    .eq("seller_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar userRole={profile?.role as AccountRole} userEmail={user.email ?? null} />

      <main className="flex-1 bg-gray-50">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10">
          <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-600 mb-4">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Leads</h1>
          <p className="text-sm text-gray-500 mb-6">
            People who clicked "Connect on WhatsApp" on one of your courses — follow up and track them here.
          </p>

          {leads && leads.length > 0 ? (
            <div className="space-y-3">
              {leads.map((lead) => {
                const buyer = lead.buyer as any;
                const waLink = buyer?.phone && buyer?.whatsapp_enabled
                  ? buildWhatsAppLink(buyer.phone, `Hi ${buyer.full_name ?? ""}, thanks for your interest in ${(lead.course as any)?.title ?? "my course"}!`)
                  : null;
                const next = NEXT_STATUS[lead.status as LeadStatus];
                return (
                  <div key={lead.id} className="card p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{buyer?.full_name ?? "A student"}</p>
                        <p className="text-xs text-gray-500 truncate">
                          Interested in {(lead.course as any)?.title ?? "a course"} · {timeAgo(lead.created_at)}
                        </p>
                      </div>
                      <span className={`badge shrink-0 ${STATUS_COLORS[lead.status as LeadStatus]}`}>{STATUS_LABELS[lead.status as LeadStatus]}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {waLink && (
                        <a href={waLink} target="_blank" rel="noopener noreferrer" className="btn-ghost py-1.5 px-3 text-xs">
                          <MessageCircle className="h-3.5 w-3.5" /> Message on WhatsApp
                        </a>
                      )}
                      {next && (
                        <form action={updateLeadStatus.bind(null, lead.id, next)}>
                          <button type="submit" className="btn-secondary py-1.5 px-3 text-xs">
                            Mark {STATUS_LABELS[next]}
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-24 text-gray-400">
              <Users className="h-10 w-10 mx-auto mb-4" />
              <p>No leads yet — they'll show up here when someone clicks "Connect on WhatsApp" on one of your courses.</p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
