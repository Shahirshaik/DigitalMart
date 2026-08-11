import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options as any)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  const isAuthPath = path.startsWith("/auth/");
  const isResetPasswordPath = path.startsWith("/auth/reset-password");
  const isAdminPath = path.startsWith("/admin");

  // Every check below reads the same row — fetch it once instead of once per check,
  // since this middleware runs on every navigation for every logged-in user.
  let profile: { role: string | null; is_active: boolean | null; onboarding_completed_at: string | null } | null = null;
  if (user && ((!isAuthPath && path !== "/") || isAdminPath || (isAuthPath && !isResetPasswordPath))) {
    const { data } = await supabase
      .from("users").select("role, is_active, onboarding_completed_at").eq("id", user.id).single();
    profile = data;
  }

  // Deactivated accounts are signed out and blocked everywhere except the
  // sign-in flow itself, so a suspicious/banned user can't keep using the app.
  if (user && !isAuthPath && path !== "/" && profile?.is_active === false) {
    await supabase.auth.signOut();
    const resp = NextResponse.redirect(new URL("/auth/login?deactivated=1", request.url));
    supabaseResponse.cookies.getAll().forEach((c) => resp.cookies.set(c.name, c.value));
    return resp;
  }

  // Protect /admin — admin and manager
  if (isAdminPath) {
    if (!user) {
      return NextResponse.redirect(new URL("/auth/login?next=/admin", request.url));
    }
    if (profile?.role !== "admin" && profile?.role !== "manager") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // Protect /onboarding — must be logged in
  if (path.startsWith("/onboarding") && !user) {
    return NextResponse.redirect(new URL("/auth/login?next=/onboarding", request.url));
  }

  // Redirect logged-in users away from auth pages — except reset-password,
  // which a logged-in user lands on right after clicking a recovery link and
  // must be allowed to complete.
  if (isAuthPath && user && !isResetPasswordPath) {
    if (profile?.role === "admin") return NextResponse.redirect(new URL("/admin", request.url));
    if (!profile?.onboarding_completed_at) return NextResponse.redirect(new URL("/onboarding", request.url));
    return NextResponse.redirect(new URL("/", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|icons/).*)",
  ],
};
