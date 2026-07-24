import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, PlayCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { createModule, createLesson } from "@/app/dashboard/actions";
import type { AccountRole } from "@/types/database";

export const metadata = { title: "Manage Curriculum" };

interface Props { params: Promise<{ id: string }> }

export default async function CurriculumPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/login?next=/dashboard/courses/${id}/curriculum`);

  const { data: profile } = await supabase.from("users").select("role, is_seller").eq("id", user.id).single();
  if (!profile?.is_seller && profile?.role !== "admin") redirect("/");

  const { data: course } = await supabase.from("courses").select("id, title, seller_id").eq("id", id).eq("seller_id", user.id).single();
  if (!course) notFound();

  const { data: modules } = await supabase
    .from("course_modules").select("*, lessons:course_lessons(*)")
    .eq("course_id", id).order("sort_order");

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar userRole={profile?.role as AccountRole} userEmail={user.email ?? null} />

      <main className="flex-1 bg-gray-50">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 py-10">
          <Link href="/dashboard/courses" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-600 mb-4">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to My Courses
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Manage Curriculum</h1>
          <p className="text-sm text-gray-500 mb-6">{course.title}</p>

          <div className="space-y-4 mb-6">
            {(modules ?? []).map((m: any, mi: number) => (
              <div key={m.id} className="card p-5">
                <p className="font-semibold text-gray-900 mb-3">{mi + 1}. {m.title}</p>
                {m.lessons && m.lessons.length > 0 && (
                  <ul className="space-y-1.5 mb-4">
                    {m.lessons.sort((a: any, b: any) => a.sort_order - b.sort_order).map((l: any) => (
                      <li key={l.id} className="flex items-center gap-2 text-sm text-gray-600">
                        <PlayCircle className="h-3.5 w-3.5 text-gray-300 shrink-0" />
                        {l.title}
                        {l.duration_seconds && <span className="text-xs text-gray-400">· {Math.round(l.duration_seconds / 60)} min</span>}
                      </li>
                    ))}
                  </ul>
                )}
                <form action={createLesson.bind(null, id, m.id)} className="flex flex-col sm:flex-row gap-2">
                  <input name="title" required placeholder="Lesson title" className="input flex-1" />
                  <input name="video_url" placeholder="Video embed URL (optional)" className="input flex-1" />
                  <input name="duration_minutes" type="number" min={0} placeholder="Min" className="input w-full sm:w-20" />
                  <button type="submit" className="btn-secondary py-2.5 px-4 text-sm shrink-0">Add Lesson</button>
                </form>
              </div>
            ))}
          </div>

          <div className="card p-5">
            <p className="font-semibold text-gray-900 mb-3">Add a Module</p>
            <form action={createModule.bind(null, id)} className="flex gap-2">
              <input name="title" required placeholder="e.g. Getting Started" className="input flex-1" />
              <button type="submit" className="btn-primary py-2.5 px-4 text-sm shrink-0">Add Module</button>
            </form>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
