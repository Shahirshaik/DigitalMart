"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createListingOrder(listingId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/login?next=/listings/${listingId}`);

  const { data: listing } = await supabase
    .from("listings").select("id, seller_id, price, currency, status")
    .eq("id", listingId).eq("status", "active").single();
  if (!listing) throw new Error("Listing not found");
  if (listing.seller_id === user.id) throw new Error("You can't buy your own listing");

  const { data: order, error } = await supabase.from("orders").insert({
    buyer_id: user.id,
    seller_id: listing.seller_id,
    item_type: "listing",
    listing_id: listing.id,
    amount: listing.price,
    currency: listing.currency,
  }).select("id").single();

  if (error || !order) throw new Error(error?.message ?? "Could not create order");
  redirect(`/checkout/${order.id}`);
}

export async function createCourseOrder(courseId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/login?next=/courses/${courseId}`);

  const { data: course } = await supabase
    .from("courses").select("id, seller_id, price, currency, status")
    .eq("id", courseId).eq("status", "active").single();
  if (!course) throw new Error("Course not found");
  if (course.seller_id === user.id) throw new Error("You can't enroll in your own course");

  const { data: order, error } = await supabase.from("orders").insert({
    buyer_id: user.id,
    seller_id: course.seller_id,
    item_type: "course",
    course_id: course.id,
    amount: course.price,
    currency: course.currency,
  }).select("id").single();

  if (error || !order) throw new Error(error?.message ?? "Could not create order");
  redirect(`/checkout/${order.id}`);
}

export async function markOrderPaid(orderId: string, formData: FormData) {
  const supabase = await createClient();
  const utrReference = String(formData.get("utr_reference") ?? "").trim();
  const paymentScreenshotUrl = (formData.get("payment_screenshot_url") as string) || null;
  if (!utrReference) throw new Error("Please enter your UPI transaction reference (UTR) before continuing.");

  const { error } = await supabase.from("orders")
    .update({ status: "held", utr_reference: utrReference, payment_screenshot_url: paymentScreenshotUrl })
    .eq("id", orderId)
    .eq("status", "pending_payment");
  if (error) throw new Error(error.message);
  revalidatePath(`/checkout/${orderId}`);
  revalidatePath("/orders");
}

export async function confirmAndReleaseOrder(orderId: string) {
  const supabase = await createClient();
  const { error: e1 } = await supabase.from("orders")
    .update({ status: "confirmed" }).eq("id", orderId).eq("status", "held");
  if (e1) throw new Error(e1.message);

  const { data: order, error: e2 } = await supabase.from("orders")
    .update({ status: "released" }).eq("id", orderId).eq("status", "confirmed")
    .select("item_type, course_id, buyer_id").single();
  if (e2) throw new Error(e2.message);

  if (order?.item_type === "course" && order.course_id) {
    await supabase.from("enrollments").insert({
      course_id: order.course_id,
      buyer_id: order.buyer_id,
    });
  }

  revalidatePath("/dashboard/orders");
  revalidatePath(`/checkout/${orderId}`);
  revalidatePath("/orders");
}

export async function raiseDispute(orderId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/login?next=/checkout/${orderId}`);

  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) throw new Error("Please describe the issue");

  const { error: disputeError } = await supabase.from("disputes").insert({
    order_id: orderId,
    opened_by: user.id,
    reason,
  });
  if (disputeError) throw new Error(disputeError.message);

  const { error: orderError } = await supabase.from("orders")
    .update({ status: "disputed" }).eq("id", orderId).eq("status", "held");
  if (orderError) throw new Error(orderError.message);

  revalidatePath(`/checkout/${orderId}`);
  revalidatePath("/orders");
  revalidatePath("/dashboard/orders");
}

export async function submitReview(
  orderId: string,
  targetType: "listing" | "course",
  targetId: string,
  formData: FormData
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/login?next=/checkout/${orderId}`);

  const rating = Number(formData.get("rating") ?? 0);
  const comment = String(formData.get("comment") ?? "").trim();
  if (rating < 1 || rating > 5) throw new Error("Rating must be between 1 and 5");

  const { error } = await supabase.from("reviews").insert({
    order_id: orderId,
    reviewer_id: user.id,
    target_type: targetType,
    target_id: targetId,
    rating,
    comment: comment || null,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/checkout/${orderId}`);
  revalidatePath(`/${targetType}s/${targetId}`);
}
