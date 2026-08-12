import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { completeMetaConnect } from "@/app/admin/social/actions";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const oauthError = searchParams.get("error_description") || searchParams.get("error");

  const jar = await cookies();
  const expectedState = jar.get("meta_oauth_state")?.value;
  jar.delete("meta_oauth_state");

  if (oauthError) {
    return NextResponse.redirect(new URL(`/admin/social?error=${encodeURIComponent(oauthError)}`, request.url));
  }
  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(new URL("/admin/social?error=Invalid+or+expired+connect+request", request.url));
  }

  try {
    const { connectedCount } = await completeMetaConnect(code);
    return NextResponse.redirect(new URL(`/admin/social?connected=${connectedCount}`, request.url));
  } catch (e) {
    const message = e instanceof Error ? e.message : "Connection failed";
    return NextResponse.redirect(new URL(`/admin/social?error=${encodeURIComponent(message)}`, request.url));
  }
}
