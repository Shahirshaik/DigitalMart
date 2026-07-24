import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://digitalmart-tau.vercel.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient();

  const [{ data: listings }, { data: courses }, { data: sellers }] = await Promise.all([
    supabase.from("listings").select("id, updated_at").eq("status", "active"),
    supabase.from("courses").select("id, updated_at").eq("status", "active"),
    supabase.from("users").select("id, updated_at").eq("is_seller", true),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/listings`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${SITE_URL}/courses`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${SITE_URL}/terms`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/privacy`, changeFrequency: "yearly", priority: 0.3 },
  ];

  const listingRoutes: MetadataRoute.Sitemap = (listings ?? []).map((l) => ({
    url: `${SITE_URL}/listings/${l.id}`,
    lastModified: l.updated_at ?? undefined,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const courseRoutes: MetadataRoute.Sitemap = (courses ?? []).map((c) => ({
    url: `${SITE_URL}/courses/${c.id}`,
    lastModified: c.updated_at ?? undefined,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const sellerRoutes: MetadataRoute.Sitemap = (sellers ?? []).map((s) => ({
    url: `${SITE_URL}/sellers/${s.id}`,
    lastModified: s.updated_at ?? undefined,
    changeFrequency: "weekly",
    priority: 0.5,
  }));

  return [...staticRoutes, ...listingRoutes, ...courseRoutes, ...sellerRoutes];
}
