"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function markLessonComplete(courseId: string, lessonId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/login?next=/courses/${courseId}/learn`);

  const { data: enrollment } = await supabase.from("enrollments")
    .select("id").eq("course_id", courseId).eq("buyer_id", user.id).single();
  if (!enrollment) throw new Error("Not enrolled in this course");

  const { error } = await supabase.from("lesson_progress").insert({
    enrollment_id: enrollment.id,
    lesson_id: lessonId,
  });
  if (error && !error.message.toLowerCase().includes("duplicate")) throw new Error(error.message);

  const { data: moduleRows } = await supabase.from("course_modules").select("id").eq("course_id", courseId);
  const moduleIds = (moduleRows ?? []).map((m) => m.id);
  const { count: totalLessons } = moduleIds.length
    ? await supabase.from("course_lessons").select("*", { count: "exact", head: true }).in("module_id", moduleIds)
    : { count: 0 };
  const { count: doneLessons } = await supabase
    .from("lesson_progress").select("*", { count: "exact", head: true }).eq("enrollment_id", enrollment.id);

  const total = totalLessons ?? 0;
  const done = doneLessons ?? 0;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const isComplete = total > 0 && done >= total;

  await supabase.from("enrollments").update({
    progress_pct: pct,
    completed_at: isComplete ? new Date().toISOString() : null,
  }).eq("id", enrollment.id);

  revalidatePath(`/courses/${courseId}/learn`);
  revalidatePath(`/courses/${courseId}`);
}
