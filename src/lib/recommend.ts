import type { SupabaseClient } from "@supabase/supabase-js";

interface Profile {
  category?: string | null;
  target_field?: string | null;
  skill_level?: string | null;
}

const STOPWORDS = new Set(["and", "the", "for", "with", "from", "into", "a", "an", "of", "to", "in", "on"]);

function tokenize(text: string): string[] {
  return text.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

// Rules-based v1: score active courses by keyword overlap between the
// buyer's free-text target_field and each course's title/description, then
// backfill with the most-viewed active courses so the section is never
// sparse — target_field is user-typed free text (no fixed taxonomy), so an
// exact-match lookup table would miss too often (e.g. "Cybersecurity" vs
// "Cyber Security").
export async function getRecommendedCourses(
  supabase: SupabaseClient,
  profile: Profile,
  excludeCourseId?: string,
  limit = 4,
  excludeSellerId?: string
) {
  const { data: courses } = await supabase
    .from("courses")
    .select("*, seller:users!courses_seller_id_fkey(id, full_name)")
    .eq("status", "active")
    .order("view_count", { ascending: false });

  const pool = (courses ?? []).filter((c: any) => c.id !== excludeCourseId && c.seller_id !== excludeSellerId);
  const queryTokens = tokenize(profile.target_field ?? "");

  const scored = pool.map((c: any) => {
    const courseTokens = new Set(tokenize(`${c.title} ${c.description ?? ""}`));
    const overlap = queryTokens.filter((t) => courseTokens.has(t)).length;
    return { course: c, score: overlap };
  });

  scored.sort((a, b) => b.score - a.score);
  const matched = scored.filter((s) => s.score > 0).slice(0, limit);
  if (matched.length >= limit) return matched.map((s) => s.course);

  const matchedIds = new Set(matched.map((s) => s.course.id));
  const fallback = pool.filter((c: any) => !matchedIds.has(c.id)).slice(0, limit - matched.length);
  return [...matched.map((s) => s.course), ...fallback];
}
