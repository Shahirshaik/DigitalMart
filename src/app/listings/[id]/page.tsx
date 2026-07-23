import Link from "next/link";
import { notFound } from "next/navigation";
import { Zap, ShieldAlert, ShieldCheck, Smartphone, MessageCircle, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { RatingStars } from "@/components/ui/RatingStars";
import { Badge } from "@/components/ui/Badge";
import { formatPrice, CATEGORY_ICONS, DELIVERY_LABELS, timeAgo, buildWhatsAppLink } from "@/lib/utils";
import { createListingOrder } from "@/app/checkout/actions";
import type { AccountRole } from "@/types/database";

interface Props { params: Promise<{ id: string }> }

export default async function ListingDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  let userRole: AccountRole | null = null;
  if (user) {
    const { data } = await supabase.from("users").select("role").eq("id", user.id).single();
    userRole = data?.role ?? null;
  }

  const { data: listing } = await supabase
    .from("listings")
    .select("*, category:listing_categories(*), seller:users!listings_seller_id_fkey(id, full_name, is_seller, seller_verified_at, phone, whatsapp_enabled)")
    .eq("id", id)
    .eq("status", "active")
    .single();

  if (!listing) notFound();

  const [{ data: stats }, { data: badges }, { data: similar }] = await Promise.all([
    supabase.from("v_review_stats").select("*").eq("target_type", "listing").eq("target_id", id).maybeSingle(),
    supabase.from("seller_badges").select("badge").eq("seller_id", listing.seller_id),
    supabase.from("listings")
      .select("id, title, price, currency")
      .eq("category_id", listing.category_id)
      .eq("status", "active")
      .neq("id", id)
      .limit(4),
  ]);

  const icon = CATEGORY_ICONS[listing.category?.slug ?? "other"] ?? "📦";
  const whatsappLink = listing.seller?.phone && listing.seller?.whatsapp_enabled
    ? buildWhatsAppLink(listing.seller.phone, `Hi, I'm interested in your listing "${listing.title}" on Digital Mart.`)
    : null;

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar userRole={userRole} userEmail={user?.email ?? null} />

      <main className="flex-1 bg-gray-50">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-6">
          <Link href="/listings" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-600 mb-4">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to marketplace
          </Link>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              <div className="card overflow-hidden">
                <div className="h-56 bg-gradient-to-br from-brand-400 to-trust-500 flex items-center justify-center">
                  {listing.images?.[0] ? (
                    <img src={listing.images[0]} alt={listing.title} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-7xl">{icon}</span>
                  )}
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="brand">{listing.category?.name}</Badge>
                    {listing.delivery_method === "auto_key" && (
                      <Badge variant="trust" className="flex items-center gap-1"><Zap className="h-3 w-3" /> Instant Delivery</Badge>
                    )}
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">{listing.title}</h1>
                  <RatingStars rating={stats?.avg_rating ?? null} count={stats?.review_count} size="md" />
                  <p className="text-gray-600 leading-relaxed mt-4 whitespace-pre-line">{listing.description}</p>

                  {listing.resale_restricted && (
                    <div className="mt-5 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 flex gap-3">
                      <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-sm text-amber-800">
                        This license is <strong>resale-restricted</strong> by the original publisher. Review the
                        terms before purchasing — Digital Mart facilitates the transaction, but doesn't guarantee
                        the license terms.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {similar && similar.length > 0 && (
                <div>
                  <h2 className="section-title text-lg mb-3">More in {listing.category?.name}</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {similar.map((s) => (
                      <Link key={s.id} href={`/listings/${s.id}`} className="card p-3 hover:shadow-md transition-all">
                        <p className="text-sm font-medium text-gray-800 line-clamp-2 mb-1">{s.title}</p>
                        <p className="text-sm font-bold text-brand-600">{formatPrice(s.price, s.currency)}</p>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="card p-6 sticky top-20">
                <p className="text-3xl font-extrabold text-gray-900 mb-1">{formatPrice(listing.price, listing.currency)}</p>
                <p className="text-xs text-gray-500 mb-4">{DELIVERY_LABELS[listing.delivery_method]}</p>

                {listing.stock_count != null && (
                  <p className="text-xs text-gray-500 mb-4">{listing.stock_count} left in stock</p>
                )}

                {user?.id === listing.seller_id ? (
                  <p className="text-center text-sm text-gray-400 py-3 mb-2">This is your own listing.</p>
                ) : (
                  <form action={createListingOrder.bind(null, listing.id)}>
                    <button type="submit" className="btn-primary w-full py-3 mb-2">
                      Buy Now — Pay via UPI
                    </button>
                  </form>
                )}
                {whatsappLink ? (
                  <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="btn-secondary w-full py-2.5">
                    <MessageCircle className="h-4 w-4" /> Message Seller on WhatsApp
                  </a>
                ) : (
                  <button disabled title="This seller isn't reachable on WhatsApp" className="btn-secondary w-full py-2.5">
                    <MessageCircle className="h-4 w-4" /> Message Seller
                  </button>
                )}

                <div className="mt-5 pt-5 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-500">
                  <Smartphone className="h-4 w-4 text-trust-600 shrink-0" />
                  Manual UPI payment — you confirm you've paid, the seller confirms receipt and delivers.
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Digital Mart isn't responsible for conversations or agreements made outside the app.
                </p>
              </div>

              <Link href={`/sellers/${listing.seller_id}`} className="card p-5 block hover:shadow-md transition-all">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Sold by</p>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-brand-700 font-bold shrink-0">
                    {listing.seller?.full_name?.[0]?.toUpperCase() ?? "S"}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{listing.seller?.full_name}</p>
                    {listing.seller?.seller_verified_at && (
                      <span className="text-xs text-trust-700 flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Verified Seller</span>
                    )}
                  </div>
                </div>
                {badges && badges.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {badges.map((b) => <Badge key={b.badge} variant="trust">{b.badge.replace(/_/g, " ")}</Badge>)}
                  </div>
                )}
              </Link>

              <p className="text-xs text-gray-400 text-center">Listed {timeAgo(listing.created_at)}</p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
