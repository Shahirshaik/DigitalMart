import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { updateCourse } from "@/app/dashboard/actions";
import { ImageUploader } from "@/components/ui/ImageUploader";
import type { AccountRole } from "@/types/database";

export const metadata = { title: "Edit Course" };

interface Props { params: Promise<{ id: string }> }

export default async function EditCoursePage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/login?next=/dashboard/courses/${id}/edit`);

  const { data: profile } = await supabase.from("users").select("role, is_seller").eq("id", user.id).single();
  const isAdmin = profile?.role === "admin";
  if (!profile?.is_seller && !isAdmin) redirect("/");

  let courseQuery = supabase.from("courses").select("*").eq("id", id);
  if (!isAdmin) courseQuery = courseQuery.eq("seller_id", user.id);
  const { data: course } = await courseQuery.single();

  if (!course) notFound();

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar userRole={profile?.role as AccountRole} userEmail={user.email ?? null} />

      <main className="flex-1 bg-gray-50">
        <div className="mx-auto max-w-xl px-4 sm:px-6 py-10">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Course</h1>

          <form action={updateCourse.bind(null, course.id)} className="card p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input name="title" required maxLength={120} defaultValue={course.title} className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea name="description" rows={4} defaultValue={course.description ?? ""} className="input" />
            </div>
            <ImageUploader name="thumbnail_url" defaultValue={course.thumbnail_url} label="Course thumbnail (optional)" />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹, 0 = free)</label>
              <input name="price" type="number" min={0} step="1" required defaultValue={course.price} className="input" />
            </div>
            <button type="submit" className="btn-primary w-full py-3">Save Changes</button>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
}
