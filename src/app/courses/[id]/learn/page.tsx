import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, Circle, Award } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { markLessonComplete } from "@/app/courses/actions";
import type { AccountRole } from "@/types/database";

export const metadata = { title: "Learning" };

interface Props { params: Promise<{ id: string }> }

export default async function LearnPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/login?next=/courses/${id}/learn`);

  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();

  const [{ data: course }, { data: enrollment }] = await Promise.all([
    supabase.from("courses").select("id, title").eq("id", id).single(),
    supabase.from("enrollments").select("*").eq("course_id", id).eq("buyer_id", user.id).maybeSingle(),
  ]);

  if (!course) notFound();
  if (!enrollment) redirect(`/courses/${id}`);

  const { data: modules } = await supabase
    .from("course_modules").select("*, lessons:course_lessons(*)")
    .eq("course_id", id).order("sort_order");

  const { data: progressRows } = await supabase
    .from("lesson_progress").select("lesson_id").eq("enrollment_id", enrollment.id);
  const doneLessonIds = new Set((progressRows ?? []).map((p) => p.lesson_id));

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar userRole={profile?.role as AccountRole} userEmail={user.email ?? null} />

      <main className="flex-1 bg-gray-50">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 py-10">
          <Link href={`/courses/${id}`} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-600 mb-4">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to course
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">{course.title}</h1>

          <div className="card p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-700">Your progress</p>
              <p className="text-sm font-semibold text-brand-600">{enrollment.progress_pct}%</p>
            </div>
            <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full bg-brand-600 rounded-full" style={{ width: `${enrollment.progress_pct}%` }} />
            </div>
            {enrollment.completed_at && (
              <Link href={`/courses/${id}/certificate`} className="btn-secondary w-full py-2.5 mt-4">
                <Award className="h-4 w-4" /> View Certificate
              </Link>
            )}
          </div>

          <div className="space-y-4">
            {(modules ?? []).map((m: any, mi: number) => (
              <div key={m.id} className="card p-5">
                <p className="font-semibold text-gray-900 mb-3">{mi + 1}. {m.title}</p>
                <ul className="space-y-2">
                  {(m.lessons ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order).map((l: any) => {
                    const done = doneLessonIds.has(l.id);
                    return (
                      <li key={l.id} className="flex items-center justify-between gap-3 text-sm">
                        <span className="flex items-center gap-2 text-gray-700 min-w-0">
                          {done ? <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" /> : <Circle className="h-4 w-4 text-gray-300 shrink-0" />}
                          <span className="truncate">{l.title}</span>
                          {l.video_url && (
                            <a href={l.video_url} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline shrink-0 text-xs">Watch</a>
                          )}
                        </span>
                        {!done && (
                          <form action={markLessonComplete.bind(null, id, l.id)} className="shrink-0">
                            <button type="submit" className="btn-ghost py-1.5 px-3 text-xs">Mark Complete</button>
                          </form>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
            {(!modules || modules.length === 0) && (
              <div className="text-center py-16 text-gray-400 text-sm">
                The instructor hasn't added any lessons yet — check back soon.
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
