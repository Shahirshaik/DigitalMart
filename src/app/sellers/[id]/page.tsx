import { notFound } from "next/navigation";
import { ShieldCheck, BadgeCheck, Zap, Clock, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { RatingStars } from "@/components/ui/RatingStars";
import { ListingCard } from "@/components/listings/ListingCard";
import { CourseCard } from "@/components/courses/CourseCard";
import { timeAgo } from "@/lib/utils";
import { followSeller, unfollowSeller } from "@/app/dashboard/actions";
import type { AccountRole } from "@/types/database";

const BADGE_LABELS: Record<string, { label: string; icon: typeof BadgeCheck }> = {
  verified_id: { label: "Verified ID", icon: BadgeCheck },
  top_seller: { label: "Top Seller", icon: ShieldCheck },
  fast_responder: { label: "Fast Responder", icon: Zap },
};

interface Props { params: Promise<{ id: string }> }

export default async function SellerProfilePage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  let userRole: AccountRole | null = null;
  if (user) {
    const { data } = await supabase.from("users").select("role").eq("id", user.id).single();
    userRole = data?.role ?? null;
  }

  const { data: seller } = await supabase
    .from("users").select("*").eq("id", id).eq("is_seller", true).single();

  if (!seller) notFound();

  const [{ data: listings }, { data: courses }, { data: badges }, { data: stats }, { data: followerRow }, { data: myFollow }] = await Promise.all([
    supabase.from("listings").select("*, category:listing_categories(*), seller:users!listings_seller_id_fkey(id, full_name)")
      .eq("seller_id", id).eq("status", "active").order("created_at", { ascending: false }).limit(6),
    supabase.from("courses").select("*, seller:users!courses_seller_id_fkey(id, full_name)")
      .eq("seller_id", id).eq("status", "active").order("created_at", { ascending: false }).limit(6),
    supabase.from("seller_badges").select("badge").eq("seller_id", id),
    supabase.from("v_review_stats").select("*").eq("target_type", "seller").eq("target_id", id).maybeSingle(),
    supabase.from("v_seller_follower_counts").select("follower_count").eq("seller_id", id).maybeSingle(),
    user ? supabase.from("followers").select("id").eq("follower_id", user.id).eq("seller_id", id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const isFollowing = !!myFollow;
  const followerCount = followerRow?.follower_count ?? 0;

  const listingIds = (listings ?? []).map((l) => l.id);
  const courseIds = (courses ?? []).map((c) => c.id);
  const [{ data: listingStats }, { data: courseStats }, { data: enrollCounts }] = await Promise.all([
    listingIds.length ? supabase.from("v_review_stats").select("*").eq("target_type", "listing").in("target_id", listingIds) : Promise.resolve({ data: [] }),
    courseIds.length ? supabase.from("v_review_stats").select("*").eq("target_type", "course").in("target_id", courseIds) : Promise.resolve({ data: [] }),
    courseIds.length ? supabase.from("v_course_enrollment_counts").select("*").in("course_id", courseIds) : Promise.resolve({ data: [] }),
  ]);
  const listingStatsMap = new Map((listingStats ?? []).map((s) => [s.target_id, s]));
  const courseStatsMap = new Map((courseStats ?? []).map((s) => [s.target_id, s]));
  const enrollMap = new Map((enrollCounts ?? []).map((e) => [e.course_id, e.enrollment_count]));

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar userRole={userRole} userEmail={user?.email ?? null} />

      <main className="flex-1 bg-gray-50">
        <div className="hero-gradient">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 py-12">
            <div className="flex items-center gap-5">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/15 backdrop-blur text-white text-3xl font-bold border border-white/20">
                {seller.full_name?.[0]?.toUpperCase() ?? "S"}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-bold text-white">{seller.full_name}</h1>
                  {seller.seller_verified_at && (
                    <span className="badge bg-white/15 text-white flex items-center gap-1 border border-white/20">
                      <ShieldCheck className="h-3 w-3" /> Verified Seller
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  <RatingStars rating={stats?.avg_rating ?? null} count={stats?.review_count} size="md" />
                  <span className="flex items-center gap-1 text-sm text-blue-100">
                    <Clock className="h-3.5 w-3.5" /> Joined {timeAgo(seller.created_at)}
                  </span>
                  <span className="flex items-center gap-1 text-sm text-blue-100">
                    <Users className="h-3.5 w-3.5" /> {followerCount} follower{followerCount === 1 ? "" : "s"}
                  </span>
                </div>
              </div>
              {user && user.id !== id && (
                <form action={(isFollowing ? unfollowSeller : followSeller).bind(null, id)} className="ml-auto shrink-0">
                  <button type="submit" className={isFollowing ? "btn-ghost text-white hover:bg-white/10 py-2 px-4" : "btn-primary bg-white text-brand-700 hover:bg-blue-50 py-2 px-4"}>
                    {isFollowing ? "Following" : "+ Follow"}
                  </button>
                </form>
              )}
            </div>
            {seller.bio && <p className="text-blue-100 mt-5 max-w-2xl">{seller.bio}</p>}
            {badges && badges.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {badges.map((b) => {
                  const meta = BADGE_LABELS[b.badge];
                  const Icon = meta?.icon ?? BadgeCheck;
                  return (
                    <span key={b.badge} className="badge bg-white/15 text-white flex items-center gap-1 border border-white/20">
                      <Icon className="h-3 w-3" /> {meta?.label ?? b.badge}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10 space-y-10">
          {listings && listings.length > 0 && (
            <div>
              <h2 className="section-title text-lg mb-4">Listings</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {listings.map((l, i) => {
                  const s = listingStatsMap.get(l.id);
                  return <ListingCard key={l.id} listing={l as any} index={i} rating={s?.avg_rating} reviewCount={s?.review_count} />;
                })}
              </div>
            </div>
          )}

          {courses && courses.length > 0 && (
            <div>
              <h2 className="section-title text-lg mb-4">Courses</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {courses.map((c, i) => {
                  const s = courseStatsMap.get(c.id);
                  return <CourseCard key={c.id} course={c as any} index={i} rating={s?.avg_rating} reviewCount={s?.review_count} enrollCount={enrollMap.get(c.id) ?? 0} />;
                })}
              </div>
            </div>
          )}

          {(!listings || listings.length === 0) && (!courses || courses.length === 0) && (
            <p className="text-center text-gray-400 py-12">This seller has no active listings or courses right now.</p>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
