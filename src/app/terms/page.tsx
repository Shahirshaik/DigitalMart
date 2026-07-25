import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import type { AccountRole } from "@/types/database";

export const metadata = { title: "Terms of Service" };

export default async function TermsPage() {
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
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Terms of Service</h1>
              <p className="text-sm text-gray-400">Last updated: 24 July 2026</p>
            </div>

            <section className="space-y-2">
              <h2 className="text-lg font-semibold text-gray-900">1. What Digital Mart is</h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                Digital Mart is a marketplace that connects buyers and sellers of digital products —
                software keys, subscriptions, digital guides, and creator-led courses. We provide the
                listing, ordering, and payment-confirmation infrastructure. We are not a party to the
                underlying sale between buyer and seller.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-semibold text-gray-900">2. Manual UPI payments &amp; wallet payouts</h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                Payments on Digital Mart are manual. When you check out, you pay Digital Mart's UPI
                collection account and mark the order as paid. The seller confirms receipt of your
                payment and releases the item. There is no automated payment gateway, and no automated
                verification that a payment actually happened — the "paid" and "confirmed" steps are
                self-reported by buyer and seller. Orders auto-confirm a set number of days after
                payment is marked if the seller doesn't respond and no dispute is raised, to avoid
                orders being stuck indefinitely. Once released, the seller's earnings (after our
                platform fee) are added to their in-app wallet balance. Sellers can request a
                withdrawal of their wallet balance at any time; Digital Mart is notified and manually
                sends the payment to the seller's UPI ID.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-semibold text-gray-900">3. Disputes</h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                If a payment or delivery issue arises, buyers can raise a dispute from their order page
                before the order auto-confirms. Digital Mart is not responsible for resolving payment
                disputes between buyer and seller that occur outside the app (e.g. over WhatsApp or in
                person), but we will make a reasonable effort to help mediate disputes raised through the
                platform.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-semibold text-gray-900">4. Seller responsibilities</h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                Sellers are responsible for the accuracy of their listings, for delivering what was
                promised, and for confirming payment receipt in good faith. Misrepresenting a product,
                accepting payment without delivering, or repeated disputes may result in listing removal
                or account suspension.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-semibold text-gray-900">5. Buyer responsibilities</h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                Buyers should only mark an order as paid after actually completing the UPI payment, and
                should raise a dispute promptly if something goes wrong rather than after the auto-confirm
                window has passed.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-semibold text-gray-900">6. Reviews</h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                Buyers may leave one rating and review per completed order. Reviews should reflect a
                genuine transaction experience.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-semibold text-gray-900">7. Changes to these terms</h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                We may update these terms as the platform evolves. Continued use of Digital Mart after an
                update means you accept the revised terms.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-semibold text-gray-900">8. Contact</h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                Questions about these terms can be sent to{" "}
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
