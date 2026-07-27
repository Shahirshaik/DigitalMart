import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import type { AccountRole } from "@/types/database";

export const metadata = { title: "About Us" };

export default async function AboutPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let userRole: AccountRole | null = null;
  if (user) {
    const { data } = await supabase.from("users").select("role").eq("id", user.id).single();
    userRole = data?.role ?? null;
  }

  const { data: sections } = await supabase.from("legal_sections").select("*").eq("page", "about").order("sort_order");

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
              <h1 className="text-2xl font-bold text-gray-900 mb-1">About Digital Mart</h1>
              <p className="text-sm text-gray-400">A trust-first digital marketplace, built in India.</p>
            </div>

            {(sections ?? []).map((s) => (
              <section key={s.id} className="space-y-2">
                <h2 className="text-lg font-semibold text-gray-900">{s.heading}</h2>
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{s.body}</p>
              </section>
            ))}

            <div className="pt-2 flex items-center gap-3 flex-wrap">
              <Link href="/listings" className="btn-primary py-2.5 px-5 text-sm">
                Browse the Marketplace <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/dashboard" className="btn-secondary py-2.5 px-5 text-sm">
                Become a Seller
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
