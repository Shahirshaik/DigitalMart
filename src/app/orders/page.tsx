import Link from "next/link";
import { redirect } from "next/navigation";
import { Package } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Badge } from "@/components/ui/Badge";
import { formatPrice, timeAgo, ESCROW_STATUS_COLORS } from "@/lib/utils";
import type { AccountRole } from "@/types/database";

export const metadata = { title: "My Orders" };

export default async function OrdersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/orders");

  let userRole: AccountRole | null = null;
  {
    const { data } = await supabase.from("users").select("role").eq("id", user.id).single();
    userRole = data?.role ?? null;
  }

  const { data: orders } = await supabase
    .from("orders")
    .select("*, listing:listings(title), course:courses(title), seller:users!orders_seller_id_fkey(full_name)")
    .eq("buyer_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar userRole={userRole} userEmail={user.email ?? null} />

      <main className="flex-1 bg-gray-50">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">My Orders</h1>

          {orders && orders.length > 0 ? (
            <div className="space-y-3">
              {orders.map((o) => (
                <Link key={o.id} href={`/checkout/${o.id}`} className="card p-4 flex items-center justify-between hover:shadow-md transition-all">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {o.item_type === "listing" ? o.listing?.title : o.course?.title}
                    </p>
                    <p className="text-xs text-gray-500">
                      {o.seller?.full_name} · {timeAgo(o.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    <span className="font-semibold text-gray-900">{formatPrice(o.amount, o.currency)}</span>
                    <span className={`badge ${ESCROW_STATUS_COLORS[o.status]}`}>{o.status.replace(/_/g, " ")}</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-24 text-gray-400">
              <Package className="h-10 w-10 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No orders yet</h3>
              <Link href="/listings" className="btn-primary mt-2 inline-flex">Browse Marketplace</Link>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
