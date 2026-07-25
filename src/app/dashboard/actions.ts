"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requireSeller() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/dashboard");
  const { data: profile } = await supabase.from("users").select("is_seller, role").eq("id", user.id).single();
  if (!profile?.is_seller && profile?.role !== "admin") redirect("/");
  return { supabase, user, isAdmin: profile?.role === "admin" };
}

// Self-serve seller conversion — no approval gate for MVP. seller_verified_at
// (the "Verified" badge) stays a separate, admin-granted trust signal on top
// of this.
export async function becomeSeller(next = "/dashboard/listings/new") {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/login?next=/dashboard`);

  const { error } = await supabase.from("users").update({ is_seller: true }).eq("id", user.id);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  redirect(next);
}

export async function createListing(formData: FormData) {
  const { supabase, user } = await requireSeller();

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const price = Number(formData.get("price") ?? 0);
  const category_id = String(formData.get("category_id") ?? "");
  const delivery_method = String(formData.get("delivery_method") ?? "manual_delivery");
  const stockRaw = String(formData.get("stock_count") ?? "");
  const stock_count = stockRaw ? Number(stockRaw) : null;
  const image_url = String(formData.get("image_url") ?? "").trim();

  if (!title || !category_id || price < 0) throw new Error("Missing required fields");

  const { data, error } = await supabase.from("listings").insert({
    seller_id: user.id,
    category_id,
    title,
    description: description || null,
    price,
    delivery_method,
    stock_count,
    images: image_url ? [image_url] : null,
    status: "active",
  }).select("id").single();

  if (error || !data) throw new Error(error?.message ?? "Could not create listing");
  revalidatePath("/dashboard/listings");
  redirect("/dashboard/listings");
}

export async function updateListing(listingId: string, formData: FormData) {
  const { supabase, user, isAdmin } = await requireSeller();

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const price = Number(formData.get("price") ?? 0);
  const category_id = String(formData.get("category_id") ?? "");
  const delivery_method = String(formData.get("delivery_method") ?? "manual_delivery");
  const stockRaw = String(formData.get("stock_count") ?? "");
  const stock_count = stockRaw ? Number(stockRaw) : null;
  const image_url = String(formData.get("image_url") ?? "").trim();

  if (!title || !category_id || price < 0) throw new Error("Missing required fields");

  let query = supabase.from("listings")
    .update({
      title, description: description || null, price, category_id, delivery_method, stock_count,
      images: image_url ? [image_url] : null,
    })
    .eq("id", listingId);
  if (!isAdmin) query = query.eq("seller_id", user.id);
  const { error } = await query;

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/listings");
  redirect("/dashboard/listings");
}

export async function toggleListingStatus(listingId: string, nextStatus: "active" | "draft") {
  const { supabase, user, isAdmin } = await requireSeller();
  let query = supabase.from("listings").update({ status: nextStatus }).eq("id", listingId);
  if (!isAdmin) query = query.eq("seller_id", user.id);
  const { error } = await query;
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/listings");
}

export async function createCourse(formData: FormData) {
  const { supabase, user } = await requireSeller();

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const price = Number(formData.get("price") ?? 0);
  const thumbnail_url = String(formData.get("thumbnail_url") ?? "").trim();

  if (!title || price < 0) throw new Error("Missing required fields");

  const { data, error } = await supabase.from("courses").insert({
    seller_id: user.id,
    title,
    description: description || null,
    price,
    thumbnail_url: thumbnail_url || null,
    status: "active",
  }).select("id").single();

  if (error || !data) throw new Error(error?.message ?? "Could not create course");
  revalidatePath("/dashboard/courses");
  redirect("/dashboard/courses");
}

export async function updateCourse(courseId: string, formData: FormData) {
  const { supabase, user, isAdmin } = await requireSeller();

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const price = Number(formData.get("price") ?? 0);
  const thumbnail_url = String(formData.get("thumbnail_url") ?? "").trim();

  if (!title || price < 0) throw new Error("Missing required fields");

  let query = supabase.from("courses")
    .update({ title, description: description || null, price, thumbnail_url: thumbnail_url || null })
    .eq("id", courseId);
  if (!isAdmin) query = query.eq("seller_id", user.id);
  const { error } = await query;

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/courses");
  redirect("/dashboard/courses");
}

export async function toggleCourseStatus(courseId: string, nextStatus: "active" | "draft") {
  const { supabase, user, isAdmin } = await requireSeller();
  let query = supabase.from("courses").update({ status: nextStatus }).eq("id", courseId);
  if (!isAdmin) query = query.eq("seller_id", user.id);
  const { error } = await query;
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/courses");
}

export async function createModule(courseId: string, formData: FormData) {
  const { supabase } = await requireSeller();

  const title = String(formData.get("title") ?? "").trim();
  if (!title) throw new Error("Module title is required");

  const { count } = await supabase.from("course_modules")
    .select("*", { count: "exact", head: true }).eq("course_id", courseId);

  const { error } = await supabase.from("course_modules").insert({
    course_id: courseId,
    title,
    sort_order: count ?? 0,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/courses/${courseId}/curriculum`);
}

export async function createLesson(courseId: string, moduleId: string, formData: FormData) {
  const { supabase } = await requireSeller();

  const title = String(formData.get("title") ?? "").trim();
  const video_url = String(formData.get("video_url") ?? "").trim();
  const durationRaw = String(formData.get("duration_minutes") ?? "");
  const duration_seconds = durationRaw ? Number(durationRaw) * 60 : null;
  if (!title) throw new Error("Lesson title is required");

  const { count } = await supabase.from("course_lessons")
    .select("*", { count: "exact", head: true }).eq("module_id", moduleId);

  const { error } = await supabase.from("course_lessons").insert({
    module_id: moduleId,
    title,
    video_url: video_url || null,
    duration_seconds,
    sort_order: count ?? 0,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/courses/${courseId}/curriculum`);
}

export async function followSeller(sellerId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/login?next=/sellers/${sellerId}`);
  if (user.id === sellerId) return;

  const { error } = await supabase.from("followers").insert({ follower_id: user.id, seller_id: sellerId });
  if (error && !error.message.includes("duplicate")) throw new Error(error.message);
  revalidatePath(`/sellers/${sellerId}`);
}

export async function unfollowSeller(sellerId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/login?next=/sellers/${sellerId}`);

  const { error } = await supabase.from("followers").delete()
    .eq("follower_id", user.id).eq("seller_id", sellerId);
  if (error) throw new Error(error.message);
  revalidatePath(`/sellers/${sellerId}`);
}
