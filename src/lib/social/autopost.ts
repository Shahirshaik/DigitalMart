import { createServiceClient } from "@/lib/supabase/service";
import { formatPrice } from "@/lib/utils";

// Called right after a seller publishes a listing. Uses the service-role
// client because the seller's own session has no RLS access to
// social_accounts/social_posts (admin-only tables) — this is the one place
// those tables are written to from a non-admin request path, and it only
// ever inserts a row scoped to the listing that was just created.
export async function queueAutoListingPost(listing: { id: string; title: string; price: number; currency: string; imageUrl: string | null }) {
  try {
    const supabase = createServiceClient();

    const { data: setting } = await supabase.from("site_content").select("value")
      .eq("key", "social_auto_post_new_listings").maybeSingle();
    if (setting?.value !== "true") return;

    const { data: accounts } = await supabase.from("social_accounts").select("id, platform").eq("is_active", true);
    if (!accounts || accounts.length === 0) return;

    // Instagram has no text-only post — skip it entirely when there's no photo.
    const targets = accounts.filter((a) => a.platform === "facebook" || listing.imageUrl);
    if (targets.length === 0) return;

    const caption = `New on Digital Mart: ${listing.title} — ${formatPrice(listing.price, listing.currency)}\n\nGrab it before it's gone.`;

    await supabase.from("social_posts").insert(targets.map((a) => ({
      account_id: a.id,
      platform: a.platform,
      caption,
      image_url: listing.imageUrl,
      status: "scheduled",
      scheduled_for: new Date().toISOString(),
      source: "auto_listing",
      related_listing_id: listing.id,
    })));
  } catch {
    // Never let a social-posting failure break listing creation.
  }
}
