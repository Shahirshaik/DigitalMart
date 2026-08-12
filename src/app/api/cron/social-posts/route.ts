import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { publishFacebookPost, publishInstagramPost } from "@/lib/social/meta";

// Runs once daily (see vercel.json) and publishes every post whose
// scheduled_for time has passed. On the Hobby plan Vercel Cron can't run more
// often than daily, so "scheduled for 2pm" effectively means "goes out on
// the next daily run," not at that exact minute.
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 500 });
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { data: due, error } = await supabase
    .from("social_posts")
    .select("*, account:social_accounts(*)")
    .eq("status", "scheduled")
    .lte("scheduled_for", new Date().toISOString());
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let posted = 0;
  let failed = 0;

  for (const post of due ?? []) {
    const account = post.account as any;
    if (!account || !account.is_active) {
      await supabase.from("social_posts").update({ status: "failed", error_message: "Account not connected" }).eq("id", post.id);
      failed++;
      continue;
    }
    try {
      const externalId = account.platform === "instagram"
        ? await publishInstagramPost({
            igUserId: account.ig_user_id,
            accessToken: account.access_token,
            caption: post.caption,
            imageUrl: post.image_url,
          })
        : await publishFacebookPost({
            pageId: account.page_id,
            accessToken: account.access_token,
            caption: post.caption,
            imageUrl: post.image_url,
          });
      await supabase.from("social_posts").update({
        status: "posted", posted_at: new Date().toISOString(), external_post_id: externalId, error_message: null,
      }).eq("id", post.id);
      posted++;
    } catch (e) {
      await supabase.from("social_posts").update({
        status: "failed", error_message: e instanceof Error ? e.message : "Unknown error",
      }).eq("id", post.id);
      failed++;
    }
  }

  return NextResponse.json({ posted, failed, total: due?.length ?? 0 });
}
