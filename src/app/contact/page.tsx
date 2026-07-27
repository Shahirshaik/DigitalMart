import Link from "next/link";
import { ArrowLeft, MessageCircle, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { getSupportContact } from "@/lib/siteContent";
import { buildWhatsAppLink } from "@/lib/utils";
import type { AccountRole } from "@/types/database";

export const metadata = { title: "Contact Us" };

export default async function ContactPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let userRole: AccountRole | null = null;
  if (user) {
    const { data } = await supabase.from("users").select("role").eq("id", user.id).single();
    userRole = data?.role ?? null;
  }

  const [{ data: sections }, { whatsappNumber, email }] = await Promise.all([
    supabase.from("legal_sections").select("*").eq("page", "contact").order("sort_order"),
    getSupportContact(),
  ]);
  const waLink = buildWhatsAppLink(whatsappNumber, "Hi, I have a question about Digital Mart.");

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar userRole={userRole} userEmail={user?.email ?? null} />

      <main className="flex-1 bg-gray-50">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-600 mb-6">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Digital Mart
          </Link>

          <div className="card p-8 space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Contact Us</h1>
              <p className="text-sm text-gray-400">We're a real team, not a bot — reach us directly.</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              {waLink && (
                <a href={waLink} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-xl border border-gray-200 p-4 hover:border-brand-300 hover:bg-brand-50/40 transition-colors">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 text-green-700 shrink-0">
                    <MessageCircle className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">WhatsApp</p>
                    <p className="text-xs text-gray-500 truncate">{whatsappNumber}</p>
                  </div>
                </a>
              )}
              <a href={`mailto:${email}`}
                className="flex items-center gap-3 rounded-xl border border-gray-200 p-4 hover:border-brand-300 hover:bg-brand-50/40 transition-colors">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700 shrink-0">
                  <Mail className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">Email</p>
                  <p className="text-xs text-gray-500 truncate">{email}</p>
                </div>
              </a>
            </div>

            {(sections ?? []).map((s) => (
              <section key={s.id} className="space-y-2">
                <h2 className="text-lg font-semibold text-gray-900">{s.heading}</h2>
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{s.body}</p>
              </section>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
