import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { getSupportContact } from "@/lib/siteContent";
import type { AccountRole } from "@/types/database";

export const metadata = { title: "Privacy Policy" };

export default async function PrivacyPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let userRole: AccountRole | null = null;
  if (user) {
    const { data } = await supabase.from("users").select("role").eq("id", user.id).single();
    userRole = data?.role ?? null;
  }

  const [{ data: sections }, { email }] = await Promise.all([
    supabase.from("legal_sections").select("*").eq("page", "privacy").order("sort_order"),
    getSupportContact(),
  ]);

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
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Privacy Policy</h1>
              <p className="text-sm text-gray-400">Last updated: 24 July 2026</p>
            </div>

            {(sections ?? []).map((s) => (
              <section key={s.id} className="space-y-2">
                <h2 className="text-lg font-semibold text-gray-900">{s.heading}</h2>
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                  {s.body.replace("digitalmartbuysell@gmail.com", email)}
                </p>
              </section>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
