import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, GraduationCap } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { formatPrice, LISTING_STATUS_COLORS } from "@/lib/utils";
import { toggleCourseStatus } from "@/app/dashboard/actions";
import type { AccountRole } from "@/types/database";

export const metadata = { title: "My Courses" };

export default async function MyCoursesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/dashboard/courses");

  const { data: profile } = await supabase.from("users").select("role, is_seller").eq("id", user.id).single();
  if (!profile?.is_seller && profile?.role !== "admin") redirect("/");

  const { data: courses } = await supabase
    .from("courses").select("*")
    .eq("seller_id", user.id).order("created_at", { ascending: false });

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar userRole={profile?.role as AccountRole} userEmail={user.email ?? null} />

      <main className="flex-1 bg-gray-50">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Courses</h1>
              <p className="text-sm text-gray-500">Share knowledge and guidance — paid or free (set price to 0).</p>
            </div>
            <Link href="/dashboard/courses/new" className="btn-primary py-2 px-4 text-sm shrink-0"><Plus className="h-4 w-4" /> New</Link>
          </div>

          {courses && courses.length > 0 ? (
            <div className="space-y-3">
              {courses.map((c) => (
                <div key={c.id} className="card p-4 flex items-center gap-3">
                  <span className="text-2xl shrink-0">🎓</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 truncate">{c.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-sm font-semibold text-brand-600">{formatPrice(c.price, c.currency)}</span>
                      <span className={`badge ${LISTING_STATUS_COLORS[c.status] ?? "bg-gray-100 text-gray-600"}`}>{c.status}</span>
                    </div>
                  </div>
                  <form action={toggleCourseStatus.bind(null, c.id, c.status === "active" ? "draft" : "active")} className="shrink-0">
                    <button type="submit" className="btn-secondary py-2 px-3 text-sm">
                      {c.status === "active" ? "Unpublish" : "Publish"}
                    </button>
                  </form>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-24 text-gray-400">
              <GraduationCap className="h-10 w-10 mx-auto mb-4" />
              <p className="mb-4">You haven&apos;t posted a course yet.</p>
              <Link href="/dashboard/courses/new" className="btn-primary mx-auto inline-flex">Post your first course</Link>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
