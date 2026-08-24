import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ListingCard } from "@/components/listings/ListingCard";
import { CourseCard } from "@/components/courses/CourseCard";
import { AdCarousel } from "@/components/home/AdCarousel";
import { ArrowRight, Search } from "lucide-react";
import type { AccountRole, ListingCategory, ListingFull, CourseFull } from "@/types/database";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let userRole: AccountRole | null = null;
  if (user) {
    const { data } = await supabase.from("users").select("role").eq("id", user.id).single();
    userRole = data?.role ?? null;
  }

  const [
    { data: categories },
    { data: featuredListings },
    { data: featuredCourses },
    { data: contentRows },
    { data: slideRows },
  ] = await Promise.all([
    supabase.from("listing_categories").select("*").eq("is_active", true).order("sort_order"),
    supabase.from("listings")
      .select("*, category:listing_categories(*), seller:users!listings_seller_id_fkey(id, full_name)")
      .eq("status", "active").order("created_at", { ascending: false }).limit(8),
    supabase.from("courses")
      .select("*, seller:users!courses_seller_id_fkey(id, full_name)")
      .eq("status", "active").order("view_count", { ascending: false }).limit(4),
    supabase.from("site_content").select("*"),
    supabase.from("ad_slides").select("*").eq("is_active", true).order("sort_order"),
  ]);

  const content = Object.fromEntries((contentRows ?? []).map((r) => [r.key, r.value]));
  const slides = (slideRows ?? []).map((s) => ({
    id: s.id, title: s.title, description: s.description, cta_label: s.cta_label,
    link_url: s.link_url, image_url: s.image_url, image_url_mobile: s.image_url_mobile, is_gold: s.is_gold,
  }));

  const listingIds = (featuredListings ?? []).map((l) => l.id);
  const courseIds = (featuredCourses ?? []).map((c) => c.id);
  const [{ data: listingStats }, { data: courseStats }] = await Promise.all([
    listingIds.length ? supabase.from("v_review_stats").select("*").eq("target_type", "listing").in("target_id", listingIds) : Promise.resolve({ data: [] }),
    courseIds.length ? supabase.from("v_review_stats").select("*").eq("target_type", "course").in("target_id", courseIds) : Promise.resolve({ data: [] }),
  ]);
  const listingStatsMap = new Map((listingStats ?? []).map((s) => [s.target_id, s]));
  const courseStatsMap = new Map((courseStats ?? []).map((s) => [s.target_id, s]));

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar userRole={userRole} userEmail={user?.email ?? null} />

      <form action="/listings" method="GET" className="md:hidden bg-white border-b border-gray-100 px-4 py-2.5">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input name="q" placeholder="Search listings and courses..." className="input pl-10 py-2.5 text-sm" />
        </div>
      </form>

      <AdCarousel slides={slides} />

      <section className="md:hidden bg-white pt-4 pb-1">
        <div className="px-4 flex gap-4 overflow-x-auto scrollbar-hide">
          {(categories as ListingCategory[] | null)?.map((c) => (
            <Link key={c.slug} href={`/listings?category=${c.slug}`}
              className="flex flex-col items-center gap-1.5 shrink-0 w-16">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-2xl">
                {c.icon ?? "📦"}
              </span>
              <span className="text-[11px] font-medium text-gray-700 text-center leading-tight">{c.name}</span>
            </Link>
          ))}
        </div>
      </section>

      <main className="flex-1">
        {featuredListings && featuredListings.length > 0 && (
          <section className="bg-white">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-16">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="section-title">Latest Listings</h2>
                  <p className="text-gray-500 text-sm mt-1">Freshly posted by sellers on the marketplace</p>
                </div>
                <Link href="/listings" className="text-sm font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1 shrink-0">
                  Search & Filter <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
                {(featuredListings as unknown as ListingFull[]).map((l, i) => {
                  const s = listingStatsMap.get(l.id);
                  return <ListingCard key={l.id} listing={l} index={i} rating={s?.avg_rating} reviewCount={s?.review_count} />;
                })}
              </div>
            </div>
          </section>
        )}

        <section className="hero-gradient text-white">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 py-20 text-center relative">
            <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight mb-4">
              {content.hero_headline_main}<br className="hidden sm:block" />{" "}
              <span className="text-gold-300">{content.hero_headline_accent}</span>
            </h1>
            <p className="text-blue-100 text-lg max-w-2xl mx-auto mb-8">
              {content.hero_subtext}
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Link href="/dashboard" className="btn-primary bg-gold-400 text-brand-900 hover:bg-gold-300 py-3 px-6 font-bold">
                {content.hero_cta_primary_label} <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/listings" className="btn-ghost text-white hover:bg-white/10 py-3 px-6">
                {content.hero_cta_secondary_label}
              </Link>
            </div>
          </div>
        </section>

        {featuredCourses && featuredCourses.length > 0 && (
          <section className="mx-auto max-w-6xl px-4 sm:px-6 py-16">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="section-title">Learn from top-rated instructors</h2>
                <p className="text-gray-500 text-sm mt-1">Guided paths toward your next role</p>
              </div>
              <Link href="/courses" className="text-sm font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1 shrink-0">
                See all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
              {(featuredCourses as unknown as CourseFull[]).map((c, i) => {
                const s = courseStatsMap.get(c.id);
                return <CourseCard key={c.id} course={c} index={i} rating={s?.avg_rating} reviewCount={s?.review_count} />;
              })}
            </div>
          </section>
        )}

        <section className="bg-white border-y border-gray-100">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16">
            <h2 className="section-title text-center mb-2">What's on Digital Mart</h2>
            <p className="text-gray-500 text-center mb-10">Browse by category, or list your own.</p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              {(categories as ListingCategory[] | null)?.map((c) => (
                <Link key={c.slug} href={`/listings?category=${c.slug}`} className="card p-5 text-center hover:-translate-y-0.5 block">
                  <p className="text-2xl mb-2.5">
                    {c.icon ?? "📦"}
                  </p>
                  <p className="text-sm font-medium text-gray-700">{c.name}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
