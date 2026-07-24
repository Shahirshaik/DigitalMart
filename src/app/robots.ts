import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://digitalmart-tau.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/admin", "/wallet", "/checkout", "/orders", "/onboarding", "/api"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
