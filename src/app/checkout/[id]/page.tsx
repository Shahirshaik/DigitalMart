import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import QRCode from "qrcode";
import { CheckCircle2, Clock, ShieldAlert, Copy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { formatPrice } from "@/lib/utils";
import { buildUpiLink, UPI_ID, UPI_PAYEE_NAME } from "@/lib/payment";
import { markOrderPaid } from "../actions";
import type { AccountRole } from "@/types/database";

interface Props { params: Promise<{ id: string }> }

export default async function CheckoutPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/login?next=/checkout/${id}`);

  let userRole: AccountRole | null = null;
  {
    const { data } = await supabase.from("users").select("role").eq("id", user.id).single();
    userRole = data?.role ?? null;
  }

  const { data: order } = await supabase
    .from("orders")
    .select("*, listing:listings(id, title), course:courses(id, title), seller:users!orders_seller_id_fkey(full_name), buyer:users!orders_buyer_id_fkey(full_name)")
    .eq("id", id)
    .single();

  if (!order) notFound();
  if (order.buyer_id !== user.id && order.seller_id !== user.id) notFound();

  const itemTitle = order.item_type === "listing" ? order.listing?.title : order.course?.title;
  const upiLink = buildUpiLink(order.amount, `DigitalMart ${id.slice(0, 8)}`);
  const qrDataUrl = await QRCode.toDataURL(upiLink, { width: 260, margin: 1 });

  const isBuyer = order.buyer_id === user.id;

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar userRole={userRole} userEmail={user.email ?? null} />

      <main className="flex-1 bg-gray-50">
        <div className="mx-auto max-w-lg px-4 sm:px-6 py-10">
          <div className="card p-6 mb-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
              {order.item_type === "listing" ? "Listing" : "Course"}
            </p>
            <h1 className="text-xl font-bold text-gray-900 mb-1">{itemTitle}</h1>
            <p className="text-sm text-gray-500">
              {isBuyer ? `Sold by ${order.seller?.full_name}` : `Buyer: ${order.buyer?.full_name}`}
            </p>
            <p className="text-3xl font-extrabold text-gray-900 mt-3">{formatPrice(order.amount, order.currency)}</p>
          </div>

          {order.status === "pending_payment" && isBuyer && (
            <div className="card p-6 text-center">
              <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 flex gap-3 text-left mb-5">
                <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">
                  This is a <strong>manual UPI payment</strong> — pay the seller directly, then click
                  "I've Paid" below. The seller confirms receipt and delivers the item; there's no
                  automated escrow or payment verification yet.
                </p>
              </div>

              <img src={qrDataUrl} alt="UPI QR code" className="mx-auto rounded-xl border border-gray-100" />
              <p className="text-sm text-gray-500 mt-4">Scan with any UPI app, or pay to:</p>
              <p className="font-mono text-lg font-semibold text-gray-900 mt-1">{UPI_ID}</p>
              <p className="text-sm text-gray-500">{UPI_PAYEE_NAME}</p>

              <form action={markOrderPaid.bind(null, id)} className="mt-6">
                <button type="submit" className="btn-primary w-full py-3">
                  <CheckCircle2 className="h-4 w-4" /> I've Paid
                </button>
              </form>
            </div>
          )}

          {order.status === "held" && (
            <div className="card p-6 text-center">
              <Clock className="h-8 w-8 text-amber-500 mx-auto mb-3" />
              <h2 className="font-semibold text-gray-900 mb-1">
                {isBuyer ? "Waiting for seller to confirm" : "Payment marked as paid"}
              </h2>
              <p className="text-sm text-gray-500">
                {isBuyer
                  ? "The seller will confirm they've received your payment and deliver the item. This is manual, so it may take a little while."
                  : "The buyer marked this as paid. Check your UPI app, then confirm and deliver from your orders dashboard."}
              </p>
              {!isBuyer && (
                <Link href="/dashboard/orders" className="btn-primary mt-4 inline-flex">Go to Orders Dashboard</Link>
              )}
            </div>
          )}

          {(order.status === "confirmed" || order.status === "released") && (
            <div className="card p-6 text-center">
              <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-3" />
              <h2 className="font-semibold text-gray-900 mb-1">Payment confirmed</h2>
              <p className="text-sm text-gray-500">
                {isBuyer
                  ? "The seller has confirmed your payment. They'll deliver the item to you directly (email or the contact details you shared)."
                  : "You've confirmed and released this order."}
              </p>
            </div>
          )}

          {(order.status === "cancelled" || order.status === "refunded") && (
            <div className="card p-6 text-center text-gray-500">
              This order was {order.status}.
            </div>
          )}

          <p className="text-xs text-gray-400 text-center mt-4 flex items-center justify-center gap-1">
            <Copy className="h-3 w-3" /> Order ID: {id}
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
