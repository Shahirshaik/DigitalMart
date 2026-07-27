import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import QRCode from "qrcode";
import { CheckCircle2, Clock, ShieldAlert, Copy, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { RatingInput } from "@/components/ui/RatingInput";
import { formatPrice, buildWhatsAppLink } from "@/lib/utils";
import { buildUpiLink, UPI_ID, UPI_PAYEE_NAME } from "@/lib/payment";
import { getSupportContact } from "@/lib/siteContent";
import { markOrderPaid, raiseDispute, submitReview } from "../actions";
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
    .select("*, listing:listings(id, title), course:courses(id, title), seller:users!orders_seller_id_fkey(full_name, phone), buyer:users!orders_buyer_id_fkey(full_name, phone)")
    .eq("id", id)
    .single();

  if (!order) notFound();
  const isAdmin = userRole === "admin";
  if (order.buyer_id !== user.id && order.seller_id !== user.id && !isAdmin) notFound();

  const itemTitle = order.item_type === "listing" ? order.listing?.title : order.course?.title;
  const upiLink = buildUpiLink(order.amount, `DigitalMart ${id.slice(0, 8)}`);
  const qrDataUrl = await QRCode.toDataURL(upiLink, { width: 260, margin: 1 });

  const isBuyer = order.buyer_id === user.id;
  const targetId = order.item_type === "listing" ? order.listing?.id : order.course?.id;

  const buyerWaLink = order.buyer?.phone
    ? buildWhatsAppLink(order.buyer.phone, `Hi ${order.buyer?.full_name}, this is Digital Mart following up on your order (${id.slice(0, 8)}) for "${itemTitle}".`)
    : null;
  const sellerWaLink = order.seller?.phone
    ? buildWhatsAppLink(order.seller.phone, `Hi ${order.seller?.full_name}, this is Digital Mart following up on order (${id.slice(0, 8)}) for "${itemTitle}".`)
    : null;

  const { whatsappNumber: supportWhatsAppNumber } = await getSupportContact();

  const [{ data: existingReview }, { data: dispute }] = await Promise.all([
    isBuyer && targetId
      ? supabase.from("reviews").select("id").eq("order_id", id).eq("reviewer_id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
    order.status === "disputed" || order.status === "held"
      ? supabase.from("disputes").select("*").eq("order_id", id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

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

          {isAdmin && !isBuyer && order.seller_id !== user.id && (
            <div className="card p-4 mb-4 bg-brand-50/40 border-brand-100">
              <p className="text-xs font-semibold text-brand-700 uppercase tracking-wide mb-2">Admin — order {id.slice(0, 8)}</p>
              <p className="text-sm text-gray-700 mb-1">Buyer: {order.buyer?.full_name}</p>
              <p className="text-sm text-gray-700 mb-3">Seller: {order.seller?.full_name}</p>
              <div className="flex items-center gap-2 flex-wrap">
                {buyerWaLink && (
                  <a href={buyerWaLink} target="_blank" rel="noopener noreferrer" className="btn-ghost py-1.5 px-3 text-xs">
                    <MessageCircle className="h-3.5 w-3.5" /> WhatsApp buyer
                  </a>
                )}
                {sellerWaLink && (
                  <a href={sellerWaLink} target="_blank" rel="noopener noreferrer" className="btn-ghost py-1.5 px-3 text-xs">
                    <MessageCircle className="h-3.5 w-3.5" /> WhatsApp seller
                  </a>
                )}
                {!buyerWaLink && !sellerWaLink && (
                  <p className="text-xs text-gray-400">Neither party has shared a phone number.</p>
                )}
              </div>
            </div>
          )}

          {order.status === "pending_payment" && isBuyer && (
            <div className="card p-6 text-center">
              <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 flex gap-3 text-left mb-5">
                <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">
                  This is a <strong>manual UPI payment</strong> — pay Digital Mart's collection UPI ID
                  below, then click "I've Paid". We hold your payment reference until the seller
                  confirms and delivers, then forward the seller their share separately — there's no
                  automated payment verification yet.
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
                  ? "The seller will confirm your payment was received by Digital Mart and deliver the item. This is manual, so it may take a little while."
                  : "The buyer marked this as paid to Digital Mart's collection account. Confirm and deliver from your orders dashboard — your earnings (after our platform fee) will land in your wallet once it's released."}
              </p>
              {!isBuyer && (
                <Link href="/dashboard/orders" className="btn-primary mt-4 inline-flex">Go to Orders Dashboard</Link>
              )}
              {order.confirm_deadline && (
                <p className="text-xs text-gray-400 mt-3">
                  Auto-confirms on {new Date(order.confirm_deadline).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} if no dispute is raised.
                </p>
              )}
              {isBuyer && (() => {
                const nudgeLink = buildWhatsAppLink(
                  supportWhatsAppNumber,
                  `Hi, I just paid for order ${id.slice(0, 8)} ("${itemTitle}") — could you help speed up confirmation?`
                );
                return nudgeLink && (
                  <a href={nudgeLink} target="_blank" rel="noopener noreferrer" className="btn-ghost mt-4 inline-flex text-xs py-2 px-3">
                    <MessageCircle className="h-3.5 w-3.5" /> Nudge us on WhatsApp
                  </a>
                );
              })()}
              {isBuyer && (
                <details className="mt-5 text-left">
                  <summary className="text-sm text-red-600 cursor-pointer hover:underline text-center">Report a problem with this order</summary>
                  <form action={raiseDispute.bind(null, id)} className="mt-3 space-y-2">
                    <textarea name="reason" required rows={3} placeholder="What went wrong?" className="input" />
                    <button type="submit" className="btn-secondary w-full py-2.5 text-sm">Raise Dispute</button>
                  </form>
                </details>
              )}
            </div>
          )}

          {order.status === "disputed" && (
            <div className="card p-6 text-center">
              <ShieldAlert className="h-8 w-8 text-red-500 mx-auto mb-3" />
              <h2 className="font-semibold text-gray-900 mb-1">Dispute open</h2>
              <p className="text-sm text-gray-500 mb-4">
                This order is under review by Digital Mart. {dispute?.reason && <span className="block mt-2 italic">"{dispute.reason}"</span>}
              </p>
              {(() => {
                const bridgeLink = buildWhatsAppLink(
                  supportWhatsAppNumber,
                  `Hi, I'd like help resolving a dispute on order ${id}. ${dispute?.reason ? `Reason: "${dispute.reason}"` : ""}`
                );
                return bridgeLink && (
                  <a href={bridgeLink} target="_blank" rel="noopener noreferrer" className="btn-secondary mx-auto inline-flex">
                    <MessageCircle className="h-4 w-4" /> Message Digital Mart on WhatsApp
                  </a>
                );
              })()}
              <p className="text-xs text-gray-400 mt-3">
                Digital Mart mediates disputes directly — message us with any proof (screenshots,
                payment confirmation) and we'll help sort this out between both of you.
              </p>
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

          {isBuyer && (order.status === "confirmed" || order.status === "released") && targetId && (
            existingReview ? (
              <div className="card p-6 text-center text-sm text-gray-500 mt-4">You've already reviewed this order. Thanks!</div>
            ) : (
              <div className="card p-6 mt-4">
                <h2 className="font-semibold text-gray-900 mb-3">Leave a review</h2>
                <form action={submitReview.bind(null, id, order.item_type, targetId)} className="space-y-3">
                  <RatingInput />
                  <textarea name="comment" rows={3} placeholder="How was it? (optional)" className="input" />
                  <button type="submit" className="btn-primary w-full py-2.5">Submit Review</button>
                </form>
              </div>
            )
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
