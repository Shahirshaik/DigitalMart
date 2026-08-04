import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import QRCode from "qrcode";
import { CheckCircle2, ShieldAlert, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ReceiptUploader } from "@/components/ui/ReceiptUploader";
import { formatPrice } from "@/lib/utils";
import { buildUpiLink, buildPhonePeLink, buildPaytmLink, buildGPayLink } from "@/lib/payment";
import { getPaymentCollectionInfo } from "@/lib/siteContent";
import { markBatchPaid } from "../../actions";
import type { AccountRole } from "@/types/database";

interface Props { params: Promise<{ batchId: string }> }

const STATUS_LABELS: Record<string, string> = {
  pending_payment: "Awaiting payment",
  held: "Waiting for seller",
  confirmed: "Confirmed",
  released: "Delivered",
  disputed: "Disputed",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

export default async function BatchCheckoutPage({ params }: Props) {
  const { batchId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/login?next=/cart/checkout/${batchId}`);

  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();

  const { data: orders } = await supabase
    .from("orders")
    .select("*, listing:listings(id, title), course:courses(id, title), seller:users!orders_seller_id_fkey(full_name)")
    .eq("checkout_batch_id", batchId)
    .eq("buyer_id", user.id)
    .order("created_at");

  if (!orders || orders.length === 0) notFound();

  const pending = orders.filter((o) => o.status === "pending_payment");
  const total = orders.reduce((sum, o) => sum + Number(o.amount), 0);
  const currency = orders[0].currency;

  let qrDataUrl: string | null = null;
  let upiId = "", payeeName = "", phonePeLink = "", paytmLink = "", gPayLink = "", upiLink = "";
  if (pending.length > 0) {
    const info = await getPaymentCollectionInfo();
    upiId = info.upiId;
    payeeName = info.payeeName;
    const note = `DigitalMart ${batchId.slice(0, 8)}`;
    upiLink = buildUpiLink(upiId, payeeName, total, note);
    qrDataUrl = await QRCode.toDataURL(upiLink, { width: 260, margin: 1 });
    phonePeLink = buildPhonePeLink(upiId, payeeName, total, note);
    paytmLink = buildPaytmLink(upiId, payeeName, total, note);
    gPayLink = buildGPayLink(upiId, payeeName, total, note);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar userRole={profile?.role as AccountRole} userEmail={user.email ?? null} />

      <main className="flex-1 bg-gray-50">
        <div className="mx-auto max-w-lg px-4 sm:px-6 py-10">
          <div className="card p-6 mb-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Cart checkout — {orders.length} item{orders.length > 1 ? "s" : ""}</p>
            <div className="space-y-2 mb-3">
              {orders.map((o) => (
                <div key={o.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 truncate">
                    {o.item_type === "listing" ? o.listing?.title : o.course?.title}
                    <span className="text-gray-400"> · {o.seller?.full_name}</span>
                  </span>
                  <span className="shrink-0 ml-2 text-gray-500">{STATUS_LABELS[o.status] ?? o.status}</span>
                </div>
              ))}
            </div>
            <p className="text-3xl font-extrabold text-gray-900 mt-2">{formatPrice(total, currency)}</p>
          </div>

          {pending.length > 0 ? (
            <div className="card p-6 text-center">
              <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 flex gap-3 text-left mb-5">
                <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">
                  Pay the total above once — it covers every item in this order. Each seller still
                  confirms and delivers their own item independently.
                </p>
              </div>

              <p className="text-sm font-medium text-gray-700 mb-3">On your phone? Pay directly with:</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
                <a href={phonePeLink} className="flex items-center justify-center gap-1.5 rounded-xl py-2.5 px-2 text-sm font-semibold text-white" style={{ backgroundColor: "#5f259f" }}>PhonePe</a>
                <a href={gPayLink} className="flex items-center justify-center gap-1.5 rounded-xl py-2.5 px-2 text-sm font-semibold text-white" style={{ backgroundColor: "#1f2937" }}>Google Pay</a>
                <a href={paytmLink} className="flex items-center justify-center gap-1.5 rounded-xl py-2.5 px-2 text-sm font-semibold text-white" style={{ backgroundColor: "#00baf2" }}>Paytm</a>
                <a href={upiLink} className="flex items-center justify-center gap-1.5 rounded-xl py-2.5 px-2 text-sm font-semibold text-white bg-brand-600">Other UPI App</a>
              </div>

              {qrDataUrl && <img src={qrDataUrl} alt="UPI QR code" className="mx-auto rounded-xl border border-gray-100" />}
              <p className="text-sm text-gray-500 mt-4">Or scan the QR code, or pay to:</p>
              <p className="font-mono text-lg font-semibold text-gray-900 mt-1">{upiId}</p>
              <p className="text-sm text-gray-500">{payeeName}</p>

              <form action={markBatchPaid.bind(null, batchId)} className="mt-6 space-y-3 text-left">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">UPI Transaction Reference (UTR) *</label>
                  <input name="utr_reference" required placeholder="12-digit reference from your UPI app" className="input font-mono" />
                </div>
                <ReceiptUploader name="payment_screenshot_url" referenceId={batchId} />
                <button type="submit" className="btn-primary w-full py-3">
                  <CheckCircle2 className="h-4 w-4" /> I've Paid
                </button>
              </form>
            </div>
          ) : (
            <div className="card p-6 text-center">
              <Clock className="h-8 w-8 text-amber-500 mx-auto mb-3" />
              <h2 className="font-semibold text-gray-900 mb-1">Payment submitted</h2>
              <p className="text-sm text-gray-500 mb-4">
                Each item above will update independently as its seller confirms. Track them all from My Orders.
              </p>
              <Link href="/orders" className="btn-primary inline-flex">Go to My Orders</Link>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
