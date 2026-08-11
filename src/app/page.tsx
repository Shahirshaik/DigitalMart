import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ListingCard } from "@/components/listings/ListingCard";
import { CourseCard } from "@/components/courses/CourseCard";
import { AdCarousel } from "@/components/home/AdCarousel";
import { ShieldCheck, LayoutGrid, Compass, ArrowRight, Users, Package, GraduationCap, Wallet, Store } from "lucide-react";
import { PERK_ICON_MAP } from "@/lib/perkIcons";
import { getRecommendedCourses } from "@/lib/recommend";
import type { AccountRole, ListingCategory, ListingFull, CourseFull } from "@/types/database";

const PILLARS = [
  {
    icon: ShieldCheck,
    title: "Escrow-Backed Trust",
    desc: "Every transaction is held by the platform until delivery is confirmed — buyers and sellers are both protected.",
    color: "bg-blue-100 text-blue-600",
  },
  {
    icon: LayoutGrid,
    title: "Universal Digital Marketplace",
    desc: "One platform for software keys, subscriptions, guides, and creator-led courses, under one commission model.",
    color: "bg-trust-100 text-trust-700",
  },
  {
    icon: Compass,
    title: "Personalized Guidance",
    desc: "Buyers aren't just shoppers — onboarding maps each one to a career path and a 'what's next' recommendation.",
    color: "bg-indigo-100 text-indigo-600",
  },
];

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let userRole: AccountRole | null = null;
  let profileData: any = null;
  if (user) {
    const { data } = await supabase.from("users")
      .select("role, full_name, category, target_field, skill_level, onboarding_completed_at").eq("id", user.id).single();
    profileData = data;
    userRole = data?.role ?? null;
  }
  const recommendedFor = profileData?.onboarding_completed_at ? (profileData.full_name ?? null) : null;

  const [
    recommendedCourses,
    { data: categories },
    { data: featuredListings },
    { data: featuredCourses },
    { count: memberCount },
    { count: listingCount },
    { count: courseCount },
    { count: sellerCount },
    { data: contentRows },
    { data: slideRows },
    { data: perkRows },
  ] = await Promise.all([
    recommendedFor ? getRecommendedCourses(supabase, profileData, undefined, 4, user!.id) : Promise.resolve([]),
    supabase.from("listing_categories").select("*").eq("is_active", true).order("sort_order"),
    supabase.from("listings")
      .select("*, category:listing_categories(*), seller:users!listings_seller_id_fkey(id, full_name)")
      .eq("status", "active").order("view_count", { ascending: false }).limit(8),
    supabase.from("courses")
      .select("*, seller:users!courses_seller_id_fkey(id, full_name)")
      .eq("status", "active").order("view_count", { ascending: false }).limit(4),
    supabase.from("users").select("*", { count: "exact", head: true }),
    supabase.from("listings").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("courses").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("users").select("*", { count: "exact", head: true }).eq("is_seller", true),
    supabase.from("site_content").select("*"),
    supabase.from("ad_slides").select("*").eq("is_active", true).order("sort_order"),
    supabase.from("homepage_perks").select("*").eq("is_active", true).order("sort_order"),
  ]);

  const content = Object.fromEntries((contentRows ?? []).map((r) => [r.key, r.value]));
  const slides = (slideRows ?? []).map((s) => ({
    id: s.id, title: s.title, description: s.description, cta_label: s.cta_label,
    link_url: s.link_url, image_url: s.image_url, image_url_mobile: s.image_url_mobile, is_gold: s.is_gold,
  }));
  const perks = (perkRows ?? []).map((p) => ({ ...p, Icon: PERK_ICON_MAP[p.icon_name] ?? Wallet }));

  const listingIds = (featuredListings ?? []).map((l) => l.id);
  const courseIds = (featuredCourses ?? []).map((c) => c.id);
  const [{ data: listingStats }, { data: courseStats }] = await Promise.all([
    listingIds.length ? supabase.from("v_review_stats").select("*").eq("target_type", "listing").in("target_id", listingIds) : Promise.resolve({ data: [] }),
    courseIds.length ? supabase.from("v_review_stats").select("*").eq("target_type", "course").in("target_id", courseIds) : Promise.resolve({ data: [] }),
  ]);
  const listingStatsMap = new Map((listingStats ?? []).map((s) => [s.target_id, s]));
  const courseStatsMap = new Map((courseStats ?? []).map((s) => [s.target_id, s]));

  const recommendedIds = recommendedCourses.map((c) => c.id);
  const { data: recommendedStats } = recommendedIds.length
    ? await supabase.from("v_review_stats").select("*").eq("target_type", "course").in("target_id", recommendedIds)
    : { data: [] };
  const recommendedStatsMap = new Map((recommendedStats ?? []).map((s) => [s.target_id, s]));

  const STATS = [
    { icon: Users, label: "Members", value: memberCount ?? 0 },
    { icon: Store, label: "Active Sellers", value: sellerCount ?? 0 },
    { icon: Package, label: "Active Listings", value: listingCount ?? 0 },
    { icon: GraduationCap, label: "Courses", value: courseCount ?? 0 },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar userRole={userRole} userEmail={user?.email ?? null} />
      <AdCarousel slides={slides} />

      <main className="flex-1">
        <section className="hero-gradient text-white">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 py-20 text-center relative">
            <div className="inline-flex items-center gap-2 rounded-full bg-gold-400/20 backdrop-blur px-4 py-1.5 text-xs font-semibold text-gold-200 mb-6 border border-gold-300/30">
              <Wallet className="h-3.5 w-3.5" /> {content.hero_badge_text}
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight mb-4">
              {content.hero_headline_main}<br className="hidden sm:block" />{" "}
              <span className="text-gold-300">{content.hero_headline_accent}</span>
            </h1>
            <p className="text-blue-100 text-lg max-w-2xl mx-auto mb-8">
              {content.hero_subtext}
            </p>
            <div className="flex items-center justify-center gap-3 mb-10 flex-wrap">
              <Link href="/dashboard" className="btn-primary bg-gold-400 text-brand-900 hover:bg-gold-300 py-3 px-6 font-bold">
                {content.hero_cta_primary_label} <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/listings" className="btn-ghost text-white hover:bg-white/10 py-3 px-6">
                {content.hero_cta_secondary_label}
              </Link>
            </div>
            <div className="flex items-center justify-center gap-6 sm:gap-12 flex-wrap">
              {STATS.map((s) => (
                <div key={s.label} className="text-center">
                  <div className="flex items-center justify-center gap-1.5 text-2xl sm:text-3xl font-extrabold">
                    <s.icon className="h-5 w-5 text-gold-300" /> {s.value.toLocaleString("en-IN")}
                  </div>
                  <p className="text-xs text-blue-200 mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-brand-950 text-white">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-14">
            <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
              <div>
                <h2 className="text-2xl font-bold">{content.perks_section_title}</h2>
                <p className="text-blue-200 text-sm mt-1">{content.perks_section_subtitle}</p>
              </div>
              <Link href="/dashboard" className="btn-primary bg-gold-400 text-brand-900 hover:bg-gold-300 font-bold py-2.5 px-5 shrink-0">
                Start Selling <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {perks.map((p) => (
                <div key={p.id} className="rounded-2xl bg-white/5 border border-white/10 p-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-400/15 mb-3">
                    <p.Icon className="h-5 w-5 text-gold-300" />
                  </div>
                  <h3 className="font-bold mb-1">{p.title}</h3>
                  <p className="text-sm text-blue-200 leading-relaxed">{p.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 sm:px-6 py-16">
          <div className="grid sm:grid-cols-3 gap-6">
            {PILLARS.map((p) => (
              <div key={p.title} className="card p-6">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${p.color} mb-4`}>
                  <p.icon className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-gray-900 mb-1.5">{p.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {featuredListings && featuredListings.length > 0 && (
          <section className="bg-white border-y border-gray-100">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="section-title">Popular Listings</h2>
                  <p className="text-gray-500 text-sm mt-1">Trending digital goods on the marketplace right now</p>
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
            <p className="text-gray-500 text-center mb-10">Seven categories, one commission model.</p>
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

        {recommendedFor && recommendedCourses.length > 0 ? (
          <section className="mx-auto max-w-6xl px-4 sm:px-6 py-16">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="section-title">Recommended for you, {recommendedFor.split(" ")[0]}</h2>
                <p className="text-gray-500 text-sm mt-1">Based on where you told us you're headed</p>
              </div>
              <Link href="/courses" className="text-sm font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1 shrink-0">
                See all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
              {(recommendedCourses as unknown as CourseFull[]).map((c, i) => {
                const s = recommendedStatsMap.get(c.id);
                return <CourseCard key={c.id} course={c} index={i} rating={s?.avg_rating} reviewCount={s?.review_count} />;
              })}
            </div>
          </section>
        ) : (
          <section className="mx-auto max-w-3xl px-4 sm:px-6 py-16 text-center">
            <h2 className="section-title mb-3">Not just a shopper — a career path</h2>
            <p className="text-gray-500 mb-8">
              Sign up and tell us where you are — student, upskilling professional, or returning
              after a career gap — and Digital Mart suggests what to learn next.
            </p>
            <Link href="/auth/signup" className="btn-primary py-3 px-6 mx-auto">
              Create Free Account <ArrowRight className="h-4 w-4" />
            </Link>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}
