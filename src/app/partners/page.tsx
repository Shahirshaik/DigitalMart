import Link from "next/link";
import { ArrowLeft, Handshake, CheckCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { submitInstituteReferral } from "./actions";
import type { AccountRole } from "@/types/database";

export const metadata = { title: "Partner With Us" };

interface Props { searchParams: Promise<{ submitted?: string }> }

export default async function PartnersPage({ searchParams }: Props) {
  const { submitted } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let userRole: AccountRole | null = null;
  if (user) {
    const { data } = await supabase.from("users").select("role").eq("id", user.id).single();
    userRole = data?.role ?? null;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar userRole={userRole} userEmail={user?.email ?? null} />

      <main className="flex-1 bg-gray-50">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 py-10">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-600 mb-6">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Digital Mart
          </Link>

          <div className="flex items-center gap-2 mb-1">
            <Handshake className="h-6 w-6 text-brand-600" />
            <h1 className="text-2xl font-bold text-gray-900">Partner With Us</h1>
          </div>
          <p className="text-sm text-gray-500 mb-6">
            Training institutes and career mentors — refer candidates into our courses and we'll track
            them through to enrollment together.
          </p>

          {submitted === "1" && (
            <div className="card p-4 mb-6 bg-green-50 border-green-200 flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
              <p className="text-sm text-green-800">
                Thanks! We've received the candidate's details and will be in touch soon.
              </p>
            </div>
          )}

          <form action={submitInstituteReferral} className="card p-6 space-y-4">
            <h2 className="section-title text-base mb-1">Your details</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Institute / Organization Name *</label>
                <input name="institute_name" required className="input" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Your Name *</label>
                <input name="contact_name" required className="input" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Your Phone Number *</label>
              <input name="contact_phone" type="tel" required placeholder="+91 98765 43210" className="input" />
            </div>

            <hr className="border-gray-100" />
            <h2 className="section-title text-base mb-1">Candidate details</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Candidate Name *</label>
                <input name="candidate_name" required className="input" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Candidate Phone Number *</label>
                <input name="candidate_phone" type="tel" required placeholder="+91 98765 43210" className="input" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Course / Training Interest *</label>
              <input name="course_interest" required placeholder="e.g. Digital Marketing, Full Stack Development" className="input" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Notes (optional)</label>
              <textarea name="notes" rows={3} className="input" />
            </div>

            <button type="submit" className="btn-primary w-full py-3">Submit Referral</button>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
}
