import Link from "next/link";
import { redirect } from "next/navigation";
import { Inbox, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { formatPrice, timeAgo, ESCROW_STATUS_COLORS } from "@/lib/utils";
import { confirmAndReleaseOrder } from "@/app/checkout/actions";
import type { AccountRole } from "@/types/database";

export const metadata = { title: "Orders Dashboard" };

export default async function SellerOrdersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/dashboard/orders");

  let userRole: AccountRole | null = null;
  {
    const { data } = await supabase.from("users").select("role, is_seller").eq("id", user.id).single();
    userRole = data?.role ?? null;
    if (!data?.is_seller && data?.role !== "admin") redirect("/");
  }

  const { data: orders } = await supabase
    .from("orders")
    .select("*, listing:listings(title), course:courses(title), buyer:users!orders_buyer_id_fkey(full_name)")
    .eq("seller_id", user.id)
    .order("created_at", { ascending: false });

  const pending = (orders ?? []).filter((o) => o.status === "held");
  const rest = (orders ?? []).filter((o) => o.status !== "held");

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar userRole={userRole} userEmail={user.email ?? null} />

      <main className="flex-1 bg-gray-50">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Orders Dashboard</h1>
          <p className="text-sm text-gray-500 mb-6">
            When a buyer marks an order paid, check your UPI app for the payment, then confirm here.
          </p>

          {pending.length > 0 && (
            <div className="mb-8">
              <h2 className="section-title text-lg mb-3">Awaiting your confirmation ({pending.length})</h2>
              <div className="space-y-3">
                {pending.map((o) => (
                  <div key={o.id} className="card p-4 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {o.item_type === "listing" ? o.listing?.title : o.course?.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {o.buyer?.full_name} · {formatPrice(o.amount, o.currency)} · marked paid {timeAgo(o.updated_at)}
                      </p>
                    </div>
                    <form action={confirmAndReleaseOrder.bind(null, o.id)} className="shrink-0">
                      <button type="submit" className="btn-primary py-2 px-4 text-sm">
                        <CheckCircle2 className="h-4 w-4" /> Confirm & Release
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h2 className="section-title text-lg mb-3">All orders</h2>
            {rest.length > 0 || pending.length > 0 ? (
              <div className="space-y-2">
                {(orders ?? []).map((o) => (
                  <Link key={o.id} href={`/checkout/${o.id}`} className="card p-3.5 flex items-center justify-between hover:shadow-md transition-all">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {o.item_type === "listing" ? o.listing?.title : o.course?.title}
                      </p>
                      <p className="text-xs text-gray-500">{o.buyer?.full_name} · {timeAgo(o.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-4">
                      <span className="text-sm font-semibold text-gray-800">{formatPrice(o.amount, o.currency)}</span>
                      <span className={`badge ${ESCROW_STATUS_COLORS[o.status]}`}>{o.status.replace(/_/g, " ")}</span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 text-gray-400">
                <Inbox className="h-10 w-10 mx-auto mb-4" />
                <p>No orders yet.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
