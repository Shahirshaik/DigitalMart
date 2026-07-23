import Link from "next/link";
import { Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { CourseCard } from "@/components/courses/CourseCard";
import type { AccountRole, CourseFull } from "@/types/database";

interface Props { searchParams: Promise<{ q?: string; page?: string }> }

export const metadata = { title: "Courses & Mentorship" };

export default async function CoursesPage({ searchParams }: Props) {
  const params = await searchParams;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  let userRole: AccountRole | null = null;
  if (user) {
    const { data } = await supabase.from("users").select("role").eq("id", user.id).single();
    userRole = data?.role ?? null;
  }

  const page = Number(params.page ?? 1);
  const limit = 24;
  const offset = (page - 1) * limit;

  let query = supabase
    .from("courses")
    .select("*, seller:users!courses_seller_id_fkey(id, full_name)", { count: "exact" })
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (params.q) query = query.ilike("title", `%${params.q}%`);

  const { data: courses, count } = await query;
  const totalPages = Math.ceil((count ?? 0) / limit);

  const courseIds = (courses ?? []).map((c) => c.id);
  const [{ data: stats }, { data: enrollCounts }] = await Promise.all([
    courseIds.length
      ? supabase.from("v_review_stats").select("*").eq("target_type", "course").in("target_id", courseIds)
      : Promise.resolve({ data: [] }),
    courseIds.length
      ? supabase.from("v_course_enrollment_counts").select("*").in("course_id", courseIds)
      : Promise.resolve({ data: [] }),
  ]);
  const statsMap = new Map((stats ?? []).map((s) => [s.target_id, s]));
  const enrollMap = new Map((enrollCounts ?? []).map((e) => [e.course_id, e.enrollment_count]));

  const buildUrl = (extra: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { q: params.q, ...extra };
    Object.entries(merged).forEach(([k, v]) => { if (v) p.set(k, v); });
    return `/courses?${p.toString()}`;
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar userRole={userRole} userEmail={user?.email ?? null} />

      <main className="flex-1 bg-gray-50">
        <div className="bg-white border-b border-gray-100">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6">
            <div className="mb-4">
              <h1 className="text-2xl font-bold text-gray-900">Courses & Mentorship</h1>
              <p className="text-sm text-gray-500">{count ?? 0} courses to build your next career move</p>
            </div>
            <form method="GET" action="/courses" className="flex gap-2 max-w-lg">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input name="q" defaultValue={params.q} placeholder="Search courses..." className="input pl-10" />
              </div>
              <button type="submit" className="btn-primary px-5">Search</button>
            </form>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6">
          {courses && courses.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
                {(courses as unknown as CourseFull[]).map((c, i) => {
                  const s = statsMap.get(c.id);
                  return (
                    <CourseCard key={c.id} course={c} index={i}
                      rating={s?.avg_rating} reviewCount={s?.review_count}
                      enrollCount={enrollMap.get(c.id) ?? 0} />
                  );
                })}
              </div>
              {totalPages > 1 && (
                <div className="mt-8 flex justify-center gap-2">
                  {page > 1 && <Link href={buildUrl({ page: String(page - 1) })} className="btn-secondary px-4">Prev</Link>}
                  <span className="flex items-center px-4 text-sm text-gray-500">Page {page} of {totalPages}</span>
                  {page < totalPages && <Link href={buildUrl({ page: String(page + 1) })} className="btn-secondary px-4">Next</Link>}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-24 text-gray-400">
              <p className="text-5xl mb-4">🎓</p>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No courses found</h3>
              <p className="text-sm">Try a different search</p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
