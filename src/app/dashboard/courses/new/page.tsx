import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { createCourse } from "@/app/dashboard/actions";
import type { AccountRole } from "@/types/database";

export const metadata = { title: "New Course" };

export default async function NewCoursePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/dashboard/courses/new");

  const { data: profile } = await supabase.from("users").select("role, is_seller").eq("id", user.id).single();
  if (!profile?.is_seller && profile?.role !== "admin") redirect("/");

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar userRole={profile?.role as AccountRole} userEmail={user.email ?? null} />

      <main className="flex-1 bg-gray-50">
        <div className="mx-auto max-w-xl px-4 sm:px-6 py-10">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">New Course</h1>
          <p className="text-sm text-gray-500 mb-6">Post a course or guided path. Set price to 0 to offer it free. You can add a full curriculum later.</p>

          <form action={createCourse} className="card p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input name="title" required maxLength={120} placeholder="e.g. Instagram Growth From Scratch" className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea name="description" rows={4} placeholder="What will they learn or get?" className="input" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹, 0 = free)</label>
                <input name="price" type="number" min={0} step="1" required defaultValue={0} className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Thumbnail URL (optional)</label>
                <input name="thumbnail_url" placeholder="https://..." className="input" />
              </div>
            </div>
            <button type="submit" className="btn-primary w-full py-3">Publish Course</button>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
}
