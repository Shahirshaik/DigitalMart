import Link from "next/link";
import { notFound } from "next/navigation";
import { ShieldCheck, Smartphone, PlayCircle, Users, Award, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { RatingStars } from "@/components/ui/RatingStars";
import { formatPrice, timeAgo } from "@/lib/utils";
import { createCourseOrder } from "@/app/checkout/actions";
import type { AccountRole } from "@/types/database";

interface Props { params: Promise<{ id: string }> }

export default async function CourseDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  let userRole: AccountRole | null = null;
  if (user) {
    const { data } = await supabase.from("users").select("role").eq("id", user.id).single();
    userRole = data?.role ?? null;
  }

  const { data: course } = await supabase
    .from("courses")
    .select("*, seller:users!courses_seller_id_fkey(id, full_name, is_seller, seller_verified_at, bio)")
    .eq("id", id)
    .eq("status", "active")
    .single();

  if (!course) notFound();

  const [{ data: modules }, { data: stats }, { data: enrollRow }, { data: reviews }] = await Promise.all([
    supabase.from("course_modules").select("*, lessons:course_lessons(*)").eq("course_id", id).order("sort_order"),
    supabase.from("v_review_stats").select("*").eq("target_type", "course").eq("target_id", id).maybeSingle(),
    supabase.from("v_course_enrollment_counts").select("*").eq("course_id", id).maybeSingle(),
    supabase.from("reviews").select("rating, comment, created_at, reviewer:users!reviews_reviewer_id_fkey(full_name)")
      .eq("target_type", "course").eq("target_id", id).order("created_at", { ascending: false }).limit(6),
  ]);
  const enrollCount = enrollRow?.enrollment_count ?? 0;

  const lessonCount = (modules ?? []).reduce((sum, m) => sum + (m.lessons?.length ?? 0), 0);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar userRole={userRole} userEmail={user?.email ?? null} />

      <main className="flex-1 bg-gray-50">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-6">
          <Link href="/courses" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-600 mb-4">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to courses
          </Link>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              <div className="card overflow-hidden">
                <div className="h-52 bg-gradient-to-br from-indigo-400 to-brand-600 flex items-center justify-center">
                  {course.thumbnail_url
                    ? <img src={course.thumbnail_url} alt={course.title} className="h-full w-full object-cover" />
                    : <PlayCircle className="h-14 w-14 text-white/90" />}
                </div>
                <div className="p-6">
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">{course.title}</h1>
                  <div className="flex items-center gap-4 mb-4">
                    <RatingStars rating={stats?.avg_rating ?? null} count={stats?.review_count} size="md" />
                    <span className="flex items-center gap-1 text-sm text-gray-500">
                      <Users className="h-4 w-4" /> {enrollCount ?? 0} enrolled
                    </span>
                  </div>
                  <p className="text-gray-600 leading-relaxed whitespace-pre-line">{course.description}</p>
                </div>
              </div>

              <div className="card p-6">
                <h2 className="section-title text-lg mb-4">Curriculum</h2>
                <div className="space-y-4">
                  {(modules ?? []).map((m, mi) => (
                    <div key={m.id}>
                      <p className="font-semibold text-gray-800 mb-2">{mi + 1}. {m.title}</p>
                      <ul className="space-y-1.5 pl-4">
                        {(m.lessons ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order).map((l: any) => (
                          <li key={l.id} className="flex items-center gap-2 text-sm text-gray-500">
                            <PlayCircle className="h-3.5 w-3.5 text-gray-300 shrink-0" />
                            {l.title}
                            {l.duration_seconds && <span className="text-xs text-gray-400">· {Math.round(l.duration_seconds / 60)} min</span>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-4">{(modules ?? []).length} modules · {lessonCount} lessons</p>
              </div>

              {reviews && reviews.length > 0 && (
                <div className="card p-6">
                  <h2 className="section-title text-lg mb-4">Student Reviews</h2>
                  <div className="space-y-4">
                    {reviews.map((r, i) => (
                      <div key={i} className="border-b border-gray-50 last:border-0 pb-4 last:pb-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium text-gray-800 text-sm">{(r.reviewer as any)?.full_name ?? "Student"}</p>
                          <RatingStars rating={r.rating} />
                        </div>
                        {r.comment && <p className="text-sm text-gray-600">{r.comment}</p>}
                        <p className="text-xs text-gray-400 mt-1">{timeAgo(r.created_at)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="card p-6 sticky top-20">
                <p className="text-3xl font-extrabold text-gray-900 mb-1">{formatPrice(course.price, course.currency)}</p>
                <p className="text-xs text-gray-500 mb-4 flex items-center gap-1">
                  <Award className="h-3.5 w-3.5" /> Certificate on completion
                </p>
                {user?.id === course.seller_id ? (
                  <p className="text-center text-sm text-gray-400 py-3 mb-2">This is your own course.</p>
                ) : (
                  <form action={createCourseOrder.bind(null, course.id)}>
                    <button type="submit" className="btn-primary w-full py-3 mb-2">Enroll — Pay via UPI</button>
                  </form>
                )}
                <div className="mt-5 pt-5 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-500">
                  <Smartphone className="h-4 w-4 text-trust-600 shrink-0" />
                  Manual UPI payment — you confirm you've paid, the seller confirms receipt and unlocks access.
                </div>
              </div>

              <Link href={`/sellers/${course.seller_id}`} className="card p-5 block hover:shadow-md transition-all">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Instructor</p>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-brand-700 font-bold shrink-0">
                    {course.seller?.full_name?.[0]?.toUpperCase() ?? "I"}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{course.seller?.full_name}</p>
                    {course.seller?.seller_verified_at && (
                      <span className="text-xs text-trust-700 flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Verified</span>
                    )}
                  </div>
                </div>
                {course.seller?.bio && <p className="text-sm text-gray-500 mt-3 line-clamp-3">{course.seller.bio}</p>}
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
