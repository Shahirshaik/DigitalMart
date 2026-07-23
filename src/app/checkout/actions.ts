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

export async function markOrderPaid(orderId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("orders")
    .update({ status: "held" })
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

  const { error: e2 } = await supabase.from("orders")
    .update({ status: "released" }).eq("id", orderId).eq("status", "confirmed");
  if (e2) throw new Error(e2.message);

  revalidatePath("/dashboard/orders");
  revalidatePath(`/checkout/${orderId}`);
  revalidatePath("/orders");
}
