import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { updateListing } from "@/app/dashboard/actions";
import type { AccountRole } from "@/types/database";

export const metadata = { title: "Edit Listing" };

interface Props { params: Promise<{ id: string }> }

export default async function EditListingPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/login?next=/dashboard/listings/${id}/edit`);

  const { data: profile } = await supabase.from("users").select("role, is_seller").eq("id", user.id).single();
  if (!profile?.is_seller && profile?.role !== "admin") redirect("/");

  const [{ data: listing }, { data: categories }] = await Promise.all([
    supabase.from("listings").select("*").eq("id", id).eq("seller_id", user.id).single(),
    supabase.from("listing_categories").select("*").eq("is_active", true).order("sort_order"),
  ]);

  if (!listing) notFound();

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar userRole={profile?.role as AccountRole} userEmail={user.email ?? null} />

      <main className="flex-1 bg-gray-50">
        <div className="mx-auto max-w-xl px-4 sm:px-6 py-10">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Listing</h1>

          <form action={updateListing.bind(null, listing.id)} className="card p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input name="title" required maxLength={120} defaultValue={listing.title} className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea name="description" rows={4} defaultValue={listing.description ?? ""} className="input" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select name="category_id" required defaultValue={listing.category_id} className="input">
                  {(categories ?? []).map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹, 0 = free)</label>
                <input name="price" type="number" min={0} step="1" required defaultValue={listing.price} className="input" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Delivery method</label>
                <select name="delivery_method" className="input" defaultValue={listing.delivery_method}>
                  <option value="manual_delivery">Manual (you deliver after payment)</option>
                  <option value="auto_key">Instant key/code</option>
                  <option value="download_link">Download link</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stock (optional)</label>
                <input name="stock_count" type="number" min={0} step="1" defaultValue={listing.stock_count ?? ""} placeholder="Unlimited" className="input" />
              </div>
            </div>
            <button type="submit" className="btn-primary w-full py-3">Save Changes</button>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
}
