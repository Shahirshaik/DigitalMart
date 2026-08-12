// Meta Graph API client — OAuth connect flow + Facebook Page / Instagram
// Business publishing. Requires META_APP_ID and META_APP_SECRET (from a Meta
// Developer App with the Facebook Login + Instagram products added).
//
// Docs: https://developers.facebook.com/docs/pages/publishing
//       https://developers.facebook.com/docs/instagram-api/guides/content-publishing

const GRAPH_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

const REQUIRED_SCOPES = [
  "pages_show_list",
  "pages_manage_posts",
  "pages_read_engagement",
  "instagram_basic",
  "instagram_content_publish",
].join(",");

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

export function buildMetaOAuthUrl(redirectUri: string, state: string): string {
  const appId = requireEnv("META_APP_ID");
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    state,
    scope: REQUIRED_SCOPES,
    response_type: "code",
  });
  return `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth?${params.toString()}`;
}

async function graphGet(path: string, params: Record<string, string>) {
  const url = `${GRAPH_BASE}${path}?${new URLSearchParams(params).toString()}`;
  const res = await fetch(url);
  const body = await res.json();
  if (!res.ok || body.error) throw new Error(body.error?.message ?? `Graph API GET ${path} failed`);
  return body;
}

async function graphPost(path: string, params: Record<string, string>) {
  const url = `${GRAPH_BASE}${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params).toString(),
  });
  const body = await res.json();
  if (!res.ok || body.error) throw new Error(body.error?.message ?? `Graph API POST ${path} failed`);
  return body;
}

// Step 1 of the OAuth flow: the `code` from the callback query string exchanges
// for a short-lived user access token (~1-2 hours).
export async function exchangeCodeForUserToken(code: string, redirectUri: string): Promise<string> {
  const appId = requireEnv("META_APP_ID");
  const appSecret = requireEnv("META_APP_SECRET");
  const body = await graphGet("/oauth/access_token", {
    client_id: appId,
    client_secret: appSecret,
    redirect_uri: redirectUri,
    code,
  });
  return body.access_token as string;
}

// Step 2: exchange the short-lived token for a long-lived one (~60 days).
export async function exchangeForLongLivedUserToken(shortLivedToken: string): Promise<string> {
  const appId = requireEnv("META_APP_ID");
  const appSecret = requireEnv("META_APP_SECRET");
  const body = await graphGet("/oauth/access_token", {
    grant_type: "fb_exchange_token",
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: shortLivedToken,
  });
  return body.access_token as string;
}

export interface ManagedPage {
  id: string;
  name: string;
  accessToken: string;
  instagramBusinessAccountId: string | null;
}

// Step 3: list every Facebook Page the connecting user manages, with each
// Page's own access token (these inherit the long-lived user token's expiry
// and are what we actually store/use for posting) and its linked Instagram
// Business Account ID, if any.
export async function fetchManagedPages(longLivedUserToken: string): Promise<ManagedPage[]> {
  const body = await graphGet("/me/accounts", {
    access_token: longLivedUserToken,
    fields: "id,name,access_token,instagram_business_account",
  });
  return (body.data ?? []).map((p: any) => ({
    id: p.id,
    name: p.name,
    accessToken: p.access_token,
    instagramBusinessAccountId: p.instagram_business_account?.id ?? null,
  }));
}

export async function publishFacebookPost(params: {
  pageId: string;
  accessToken: string;
  caption: string;
  imageUrl?: string | null;
}): Promise<string> {
  const { pageId, accessToken, caption, imageUrl } = params;
  if (imageUrl) {
    const body = await graphPost(`/${pageId}/photos`, {
      url: imageUrl,
      caption,
      access_token: accessToken,
    });
    return body.post_id ?? body.id;
  }
  const body = await graphPost(`/${pageId}/feed`, {
    message: caption,
    access_token: accessToken,
  });
  return body.id;
}

// Instagram publishing is a two-step "container" flow and requires an image —
// there is no text-only post via the API.
export async function publishInstagramPost(params: {
  igUserId: string;
  accessToken: string;
  caption: string;
  imageUrl: string;
}): Promise<string> {
  const { igUserId, accessToken, caption, imageUrl } = params;
  const container = await graphPost(`/${igUserId}/media`, {
    image_url: imageUrl,
    caption,
    access_token: accessToken,
  });
  const published = await graphPost(`/${igUserId}/media_publish`, {
    creation_id: container.id,
    access_token: accessToken,
  });
  return published.id;
}
