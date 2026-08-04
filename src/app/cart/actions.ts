"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";

export async function addListingToCart(listingId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/login?next=/listings/${listingId}`);

  const { data: listing } = await supabase.from("listings").select("id, seller_id, status").eq("id", listingId).eq("status", "active").single();
  if (!listing) throw new Error("Listing not found");
  if (listing.seller_id === user.id) throw new Error("You can't add your own listing to cart");

  const { error } = await supabase.from("cart_items")
    .upsert({ user_id: user.id, item_type: "listing", listing_id: listingId }, { onConflict: "user_id,listing_id" });
  if (error) throw new Error(error.message);

  revalidatePath("/cart");
  redirect("/cart");
}

export async function addCourseToCart(courseId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/login?next=/courses/${courseId}`);

  const { data: course } = await supabase.from("courses").select("id, seller_id, status").eq("id", courseId).eq("status", "active").single();
  if (!course) throw new Error("Course not found");
  if (course.seller_id === user.id) throw new Error("You can't add your own course to cart");

  const { error } = await supabase.from("cart_items")
    .upsert({ user_id: user.id, item_type: "course", course_id: courseId }, { onConflict: "user_id,course_id" });
  if (error) throw new Error(error.message);

  revalidatePath("/cart");
  redirect("/cart");
}

export async function removeFromCart(cartItemId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/cart");

  const { error } = await supabase.from("cart_items").delete().eq("id", cartItemId).eq("user_id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/cart");
}

// Creates one order per cart item (each seller/item pair still confirms and
// releases independently, same as a direct Buy Now purchase) but stamps them
// all with a shared checkout_batch_id so the buyer pays once for the combined
// total and submits one UTR/screenshot that applies to every order in the batch.
export async function checkoutCart() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/cart");

  const { data: items } = await supabase.from("cart_items")
    .select("*, listing:listings(id, seller_id, price, currency, status), course:courses(id, seller_id, price, currency, status)")
    .eq("user_id", user.id);

  if (!items || items.length === 0) throw new Error("Your cart is empty");

  const batchId = randomUUID();
  const rows = items.map((item) => {
    const source = item.item_type === "listing" ? item.listing : item.course;
    if (!source || source.status !== "active") throw new Error("One of the items in your cart is no longer available");
    return {
      buyer_id: user.id,
      seller_id: source.seller_id,
      item_type: item.item_type,
      listing_id: item.item_type === "listing" ? source.id : null,
      course_id: item.item_type === "course" ? source.id : null,
      amount: source.price,
      currency: source.currency,
      checkout_batch_id: batchId,
    };
  });

  const { error: insertError } = await supabase.from("orders").insert(rows);
  if (insertError) throw new Error(insertError.message);

  const { error: clearError } = await supabase.from("cart_items").delete().eq("user_id", user.id);
  if (clearError) throw new Error(clearError.message);

  redirect(`/cart/checkout/${batchId}`);
}

export async function markBatchPaid(batchId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/cart");

  const utrReference = String(formData.get("utr_reference") ?? "").trim();
  const paymentScreenshotUrl = (formData.get("payment_screenshot_url") as string) || null;
  if (!utrReference) throw new Error("Please enter your UPI transaction reference (UTR) before continuing.");

  const { error } = await supabase.from("orders")
    .update({ status: "held", utr_reference: utrReference, payment_screenshot_url: paymentScreenshotUrl })
    .eq("checkout_batch_id", batchId)
    .eq("buyer_id", user.id)
    .eq("status", "pending_payment");
  if (error) throw new Error(error.message);

  revalidatePath(`/cart/checkout/${batchId}`);
  revalidatePath("/orders");
}
