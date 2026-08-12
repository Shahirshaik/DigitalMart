import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { ShoppingCart, Trash2, Package, GraduationCap } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { formatPrice } from "@/lib/utils";
import { removeFromCart, checkoutCart } from "./actions";
import type { AccountRole } from "@/types/database";

export const metadata = { title: "Your Cart" };

export default async function CartPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/cart");

  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();

  const { data: items } = await supabase.from("cart_items")
    .select(`
      id, item_type, added_at,
      listing:listings(id, title, price, currency, images, seller_id, seller:users!listings_seller_id_fkey(full_name)),
      course:courses(id, title, price, currency, thumbnail_url, seller_id, seller:users!courses_seller_id_fkey(full_name))
    `)
    .eq("user_id", user.id)
    .order("added_at", { ascending: false });

  const rows = (items ?? []).map((item) => {
    const source: any = item.item_type === "listing" ? item.listing : item.course;
    return {
      cartItemId: item.id,
      itemType: item.item_type,
      title: source?.title ?? "Item no longer available",
      price: Number(source?.price ?? 0),
      currency: source?.currency ?? "INR",
      image: item.item_type === "listing" ? source?.images?.[0] : source?.thumbnail_url,
      sellerId: source?.seller_id,
      sellerName: source?.seller?.full_name ?? "Seller",
    };
  });

  const groupedBySeller = rows.reduce<Record<string, typeof rows>>((acc, row) => {
    const key = row.sellerId ?? "unknown";
    (acc[key] ??= []).push(row);
    return acc;
  }, {});

  const total = rows.reduce((sum, r) => sum + r.price, 0);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar userRole={profile?.role as AccountRole} userEmail={user.email ?? null} />

      <main className="flex-1 bg-gray-50">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 py-10">
          <div className="flex items-center gap-2 mb-6">
            <ShoppingCart className="h-6 w-6 text-brand-600" />
            <h1 className="text-2xl font-bold text-gray-900">Your Cart</h1>
          </div>

          {rows.length === 0 ? (
            <div className="card p-10 text-center text-gray-400">
              <ShoppingCart className="h-8 w-8 mx-auto mb-3" />
              <p className="text-sm mb-4">Your cart is empty.</p>
              <div className="flex items-center justify-center gap-3">
                <Link href="/listings" className="btn-primary py-2 px-4 text-sm">Browse Marketplace</Link>
                <Link href="/courses" className="btn-secondary py-2 px-4 text-sm">Browse Courses</Link>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-4 mb-6">
                {Object.entries(groupedBySeller).map(([sellerId, sellerItems]) => (
                  <div key={sellerId} className="card p-5">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Sold by {sellerItems[0].sellerName}</p>
                    <div className="space-y-3">
                      {sellerItems.map((row) => (
                        <div key={row.cartItemId} className="flex items-center gap-3">
                          <div className="relative h-14 w-14 shrink-0 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden">
                            {row.image ? (
                              <Image src={row.image} alt={row.title} fill sizes="56px" className="object-cover" />
                            ) : row.itemType === "listing" ? (
                              <Package className="h-5 w-5 text-gray-300" />
                            ) : (
                              <GraduationCap className="h-5 w-5 text-gray-300" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 truncate">{row.title}</p>
                            <p className="text-xs text-gray-400">{row.itemType === "listing" ? "Listing" : "Course"}</p>
                          </div>
                          <p className="text-sm font-semibold text-gray-900 shrink-0">{formatPrice(row.price, row.currency)}</p>
                          <form action={removeFromCart.bind(null, row.cartItemId)} className="shrink-0">
                            <button type="submit" className="text-gray-300 hover:text-red-500">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </form>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-gray-700">Total ({rows.length} item{rows.length > 1 ? "s" : ""})</span>
                  <span className="text-2xl font-extrabold text-gray-900">{formatPrice(total, "INR")}</span>
                </div>
                <p className="text-xs text-gray-400 mb-4">
                  You'll pay once for everything above via a single UPI transfer. Each seller still confirms
                  and delivers their own item independently.
                </p>
                <form action={checkoutCart}>
                  <button type="submit" className="btn-primary w-full py-3">Checkout All</button>
                </form>
              </div>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
