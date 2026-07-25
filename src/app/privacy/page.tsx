import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
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

            <section className="space-y-2">
              <h2 className="text-lg font-semibold text-gray-900">1. What we collect</h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                When you create an account, we collect your name, email address, and the details you
                choose to add to your profile (bio, phone number, category/skill preferences). When you
                list an item or course, we store the listing content you provide. When you place an
                order, we store the order, amount, and status so both parties can track it.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-semibold text-gray-900">2. Payment information</h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                Digital Mart does not collect or store your bank details, UPI PIN, or card information.
                Buyers pay into Digital Mart's own UPI collection account. Once a sale is released, the
                seller's share (after our platform fee) is added to their in-app wallet balance. If
                you're a seller, the UPI ID you provide is stored only so we know where to send your
                withdrawal once you request one — we never store your PIN or full bank details. We also
                store the order status you and the other party report.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-semibold text-gray-900">3. Phone number &amp; WhatsApp</h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                If you're a seller and choose to enable WhatsApp contact, your phone number is shown to
                interested buyers as a WhatsApp link so they can reach you directly. This is opt-in and can
                be turned off from your profile at any time. We do not share your phone number anywhere
                else.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-semibold text-gray-900">4. How we use your data</h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                We use your data to operate the marketplace: showing your listings, processing orders,
                calculating ratings, tracking course progress and enrollment, and displaying your public
                seller profile. We do not sell your personal data to third parties.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-semibold text-gray-900">5. Data retention</h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                We retain account and order data for as long as your account is active, and as needed to
                resolve disputes or meet legal obligations. You can request account deletion by contacting
                us.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-semibold text-gray-900">6. Your rights</h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                You can view and update most of your profile information directly from your account. To
                request a copy of your data or have your account deleted, email us using the address
                below.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-semibold text-gray-900">7. Contact</h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                Privacy questions or requests can be sent to{" "}
                <a href="mailto:digitalmartbuysell@gmail.com" className="text-brand-600 hover:underline">
                  digitalmartbuysell@gmail.com
                </a>.
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
