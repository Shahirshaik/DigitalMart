import Link from "next/link";
import { MessageSquarePlus, Clock, CheckCircle2, XCircle, PhoneCall } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { getSupportContact } from "@/lib/siteContent";
import { buildWhatsAppLink, timeAgo } from "@/lib/utils";
import { submitProductRequest } from "./actions";
import type { AccountRole, ProductRequestStatus } from "@/types/database";

export const metadata = { title: "Request a Product or Course" };

const STATUS_META: Record<ProductRequestStatus, { label: string; className: string; icon: typeof Clock }> = {
  new:        { label: "Received",     className: "bg-gray-100 text-gray-600",  icon: Clock },
  contacted:  { label: "We contacted you", className: "bg-blue-100 text-blue-700", icon: PhoneCall },
  fulfilled:  { label: "Fulfilled",    className: "bg-green-100 text-green-800", icon: CheckCircle2 },
  declined:   { label: "Declined",     className: "bg-red-100 text-red-700",    icon: XCircle },
};

export default async function RequestsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("users").select("role").eq("id", user.id).single()
    : { data: null };

  const { data: myRequests } = user
    ? await supabase.from("product_requests").select("*").eq("requester_id", user.id).order("created_at", { ascending: false })
    : { data: null };

  const { whatsappNumber } = await getSupportContact();
  const waLink = buildWhatsAppLink(whatsappNumber, "Hi, I'd like to request a product or software on DigitalMart.");

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar userRole={profile?.role as AccountRole} userEmail={user?.email ?? null} />

      <main className="flex-1 bg-gray-50">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 py-10">
          <div className="flex items-center gap-2 mb-1">
            <MessageSquarePlus className="h-6 w-6 text-brand-600" />
            <h1 className="text-2xl font-bold text-gray-900">Request a Product or Course</h1>
          </div>
          <p className="text-sm text-gray-500 mb-6">
            Can't find the software, product, or course you're looking for? Tell us what you need and our team will
            reach out to you directly.
          </p>

          {user ? (
            <form action={submitProductRequest} className="card p-6 mb-8 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">What are you looking for?</label>
                <input name="title" required maxLength={120} placeholder="e.g. Canva Pro account, a React course, a logo design tool"
                  className="input" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Tell us more</label>
                <textarea name="description" required rows={4} placeholder="Any details that'll help us find or source it for you — budget, use case, deadline, etc."
                  className="input" />
              </div>
              <button type="submit" className="btn-primary w-full py-2.5">
                <MessageSquarePlus className="h-4 w-4" /> Submit Request
              </button>
            </form>
          ) : (
            <div className="card p-6 mb-8 text-center">
              <p className="text-sm text-gray-600 mb-3">Sign in to submit a request — we'll track it and follow up with you.</p>
              <Link href="/auth/login?next=/requests" className="btn-primary py-2 px-4 inline-flex">Sign In</Link>
            </div>
          )}

          {waLink && (
            <a href={waLink} target="_blank" rel="noopener noreferrer"
              className="btn-ghost w-full py-2.5 mb-8 justify-center">
              Prefer WhatsApp? Message us directly
            </a>
          )}

          {user && myRequests && myRequests.length > 0 && (
            <div className="card p-6">
              <h2 className="section-title text-lg mb-4">Your requests</h2>
              <div className="space-y-4">
                {myRequests.map((r) => {
                  const meta = STATUS_META[r.status as ProductRequestStatus] ?? STATUS_META.new;
                  const StatusIcon = meta.icon;
                  return (
                    <div key={r.id} className="border-b border-gray-100 last:border-0 pb-4 last:pb-0">
                      <div className="flex items-center justify-between gap-3 mb-1">
                        <p className="text-sm font-semibold text-gray-900 truncate">{r.title}</p>
                        <span className={`badge shrink-0 flex items-center gap-1 ${meta.className}`}>
                          <StatusIcon className="h-3 w-3" /> {meta.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">{r.description}</p>
                      <p className="text-xs text-gray-400">Submitted {timeAgo(r.created_at)}</p>
                      {r.admin_notes && (
                        <p className="text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-1.5 mt-2">
                          {r.admin_notes}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
