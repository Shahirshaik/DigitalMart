import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Pencil, Package } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { formatPrice, LISTING_STATUS_COLORS } from "@/lib/utils";
import { toggleListingStatus } from "@/app/dashboard/actions";
import type { AccountRole } from "@/types/database";

export const metadata = { title: "My Listings" };

export default async function MyListingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/dashboard/listings");

  const { data: profile } = await supabase.from("users").select("role, is_seller").eq("id", user.id).single();
  const isAdmin = profile?.role === "admin";
  if (!profile?.is_seller && !isAdmin) redirect("/");

  let listingsQuery = supabase
    .from("listings").select("*, category:listing_categories(*), seller:users!listings_seller_id_fkey(full_name)")
    .order("created_at", { ascending: false });
  if (!isAdmin) listingsQuery = listingsQuery.eq("seller_id", user.id);
  const { data: listings } = await listingsQuery;

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar userRole={profile?.role as AccountRole} userEmail={user.email ?? null} />

      <main className="flex-1 bg-gray-50">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{isAdmin ? "All Listings" : "My Listings"}</h1>
              <p className="text-sm text-gray-500">
                {isAdmin
                  ? "Every listing on the platform — edit price, images, or details for any seller."
                  : "Digital assets, software, subscriptions — paid or free (set price to 0)."}
              </p>
            </div>
            <Link href="/dashboard/listings/new" className="btn-primary py-2 px-4 text-sm shrink-0"><Plus className="h-4 w-4" /> New</Link>
          </div>

          {listings && listings.length > 0 ? (
            <div className="space-y-3">
              {listings.map((l) => (
                <div key={l.id} className="card p-4 flex items-center gap-3">
                  <span className="text-2xl shrink-0">{l.category?.icon ?? "📦"}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 truncate">{l.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-sm font-semibold text-brand-600">{formatPrice(l.price, l.currency)}</span>
                      <span className={`badge ${LISTING_STATUS_COLORS[l.status]}`}>{l.status}</span>
                      {isAdmin && <span className="text-xs text-gray-400">· {(l.seller as any)?.full_name}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Link href={`/dashboard/listings/${l.id}/edit`} className="btn-ghost py-2 px-3 text-sm"><Pencil className="h-3.5 w-3.5" /> Edit</Link>
                    <form action={toggleListingStatus.bind(null, l.id, l.status === "active" ? "draft" : "active")}>
                      <button type="submit" className="btn-secondary py-2 px-3 text-sm">
                        {l.status === "active" ? "Unpublish" : "Publish"}
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-24 text-gray-400">
              <Package className="h-10 w-10 mx-auto mb-4" />
              <p className="mb-4">You haven&apos;t posted anything yet.</p>
              <Link href="/dashboard/listings/new" className="btn-primary mx-auto inline-flex">Post your first listing</Link>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
