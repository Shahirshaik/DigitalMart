import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { Award, ArrowLeft, ShieldCheck, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { CourseCard } from "@/components/courses/CourseCard";
import { getRecommendedCourses } from "@/lib/recommend";
import type { AccountRole, CourseFull } from "@/types/database";

export const metadata = { title: "Certificate of Completion" };

interface Props { params: Promise<{ id: string }> }

export default async function CertificatePage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/login?next=/courses/${id}/certificate`);

  const [{ data: profile }, { data: course }, { data: enrollment }] = await Promise.all([
    supabase.from("users").select("role, full_name, category, target_field, skill_level").eq("id", user.id).single(),
    supabase.from("courses").select("id, title, seller:users!courses_seller_id_fkey(full_name)").eq("id", id).single(),
    supabase.from("enrollments").select("completed_at").eq("course_id", id).eq("buyer_id", user.id).maybeSingle(),
  ]);

  if (!course || !enrollment?.completed_at) notFound();

  const completedDate = new Date(enrollment.completed_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

  const whatsNext = profile ? await getRecommendedCourses(supabase, profile, id, 2, user.id) : [];
  const nextIds = whatsNext.map((c: any) => c.id);
  const { data: nextStats } = nextIds.length
    ? await supabase.from("v_review_stats").select("*").eq("target_type", "course").in("target_id", nextIds)
    : { data: [] };
  const nextStatsMap = new Map((nextStats ?? []).map((s) => [s.target_id, s]));

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar userRole={profile?.role as AccountRole} userEmail={user.email ?? null} />

      <main className="flex-1 bg-gray-50">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 py-10">
          <Link href={`/courses/${id}/learn`} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-600 mb-6">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to course
          </Link>

          <div className="card p-10 text-center border-2 border-brand-100">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 mx-auto mb-5">
              <Award className="h-8 w-8 text-brand-600" />
            </div>
            <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">Certificate of Completion</p>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">{profile?.full_name ?? "Student"}</h1>
            <p className="text-gray-500 mb-6">has successfully completed</p>
            <h2 className="text-xl font-semibold text-brand-700 mb-6">{course.title}</h2>
            <p className="text-sm text-gray-500 mb-1">Instructed by {(course.seller as any)?.full_name}</p>
            <p className="text-sm text-gray-500 mb-8">Completed on {completedDate}</p>
            <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400">
              <ShieldCheck className="h-3.5 w-3.5" /> Issued by Digital Mart
            </div>
          </div>

          {whatsNext.length > 0 && (
            <div className="mt-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="section-title text-lg">What's next?</h2>
                <Link href="/courses" className="text-sm font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1 shrink-0">
                  See all <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(whatsNext as unknown as CourseFull[]).map((c, i) => {
                  const s = nextStatsMap.get(c.id);
                  return <CourseCard key={c.id} course={c} index={i} rating={s?.avg_rating} reviewCount={s?.review_count} />;
                })}
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
