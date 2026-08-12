"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import {
  buildMetaOAuthUrl, exchangeCodeForUserToken, exchangeForLongLivedUserToken, fetchManagedPages,
  publishFacebookPost, publishInstagramPost,
} from "@/lib/social/meta";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/admin/social");
  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/");
  return { supabase, user };
}

function callbackUrl() {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://digitalmart-tau.vercel.app";
  return `${base.replace(/\/$/, "")}/api/social/callback`;
}

// Kicks off the Meta OAuth flow. The `state` is a one-time token stashed in a
// short-lived cookie so the callback can verify the redirect actually came
// from this request (basic CSRF protection on the OAuth handshake).
export async function startMetaConnect() {
  await requireAdmin();

  let url: string;
  try {
    const state = randomUUID();
    const jar = await cookies();
    jar.set("meta_oauth_state", state, { httpOnly: true, secure: true, maxAge: 600, path: "/" });
    url = buildMetaOAuthUrl(callbackUrl(), state);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Connect is not configured yet";
    redirect(`/admin/social?error=${encodeURIComponent(message)}`);
  }
  redirect(url);
}

// Called by the OAuth callback route once Meta hands back a `code`. Exchanges
// it for a long-lived user token, then saves one row per managed Page (and,
// where linked, one more for that Page's Instagram Business account).
export async function completeMetaConnect(code: string) {
  const { supabase, user } = await requireAdmin();

  const shortLived = await exchangeCodeForUserToken(code, callbackUrl());
  const longLived = await exchangeForLongLivedUserToken(shortLived);
  const pages = await fetchManagedPages(longLived);

  for (const page of pages) {
    await supabase.from("social_accounts").upsert({
      platform: "facebook",
      account_label: page.name,
      page_id: page.id,
      access_token: page.accessToken,
      connected_by: user.id,
      is_active: true,
    }, { onConflict: "platform,page_id" });

    if (page.instagramBusinessAccountId) {
      await supabase.from("social_accounts").upsert({
        platform: "instagram",
        account_label: `${page.name} (Instagram)`,
        page_id: page.id,
        ig_user_id: page.instagramBusinessAccountId,
        access_token: page.accessToken,
        connected_by: user.id,
        is_active: true,
      }, { onConflict: "platform,page_id" });
    }
  }

  revalidatePath("/admin/social");
  return { connectedCount: pages.length };
}

export async function disconnectAccount(accountId: string) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("social_accounts").update({ is_active: false }).eq("id", accountId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/social");
}

export async function composePost(formData: FormData) {
  const { supabase, user } = await requireAdmin();

  const accountId = String(formData.get("account_id") ?? "");
  const caption = String(formData.get("caption") ?? "").trim();
  const imageUrl = (formData.get("image_url") as string) || null;
  const scheduledForRaw = String(formData.get("scheduled_for") ?? "");
  const postNow = formData.get("post_now") === "on";

  if (!accountId || !caption) throw new Error("Account and caption are required");

  const { data: account } = await supabase.from("social_accounts").select("*").eq("id", accountId).single();
  if (!account) throw new Error("Account not found");
  if (account.platform === "instagram" && !imageUrl) {
    throw new Error("Instagram posts require an image — there's no text-only post via the API");
  }

  const { data: post, error } = await supabase.from("social_posts").insert({
    account_id: accountId,
    platform: account.platform,
    caption,
    image_url: imageUrl,
    status: scheduledForRaw ? "scheduled" : "draft",
    scheduled_for: scheduledForRaw || null,
    source: "manual",
    created_by: user.id,
  }).select("*").single();
  if (error || !post) throw new Error(error?.message ?? "Could not create post");

  if (postNow) {
    await publishPostNow(post.id);
  }

  revalidatePath("/admin/social");
}

export async function publishPostNow(postId: string) {
  const { supabase } = await requireAdmin();

  const { data: post } = await supabase.from("social_posts").select("*, account:social_accounts(*)").eq("id", postId).single();
  if (!post) throw new Error("Post not found");
  const account = post.account as any;
  if (!account || !account.is_active) throw new Error("Account is not connected");

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
    }).eq("id", postId);
  } catch (e) {
    await supabase.from("social_posts").update({
      status: "failed", error_message: e instanceof Error ? e.message : "Unknown error",
    }).eq("id", postId);
    throw e;
  }

  revalidatePath("/admin/social");
}

export async function deletePost(postId: string) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("social_posts").delete().eq("id", postId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/social");
}

export async function setAutoPostSetting(formData: FormData) {
  const { supabase } = await requireAdmin();
  const enabled = formData.get("auto_post_new_listings") === "on";
  const { error } = await supabase.from("site_content")
    .upsert({ key: "social_auto_post_new_listings", value: enabled ? "true" : "false" }, { onConflict: "key" });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/social");
}
