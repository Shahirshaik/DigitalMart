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

  // Protect /admin — admin only
  if (path.startsWith("/admin")) {
    if (!user) {
      return NextResponse.redirect(new URL("/auth/login?next=/admin", request.url));
    }
    const { data: profile } = await supabase
      .from("users").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // Protect /onboarding — must be logged in
  if (path.startsWith("/onboarding") && !user) {
    return NextResponse.redirect(new URL("/auth/login?next=/onboarding", request.url));
  }

  // Redirect logged-in users away from auth pages
  if (path.startsWith("/auth/") && user) {
    const { data: profile } = await supabase
      .from("users").select("role, onboarding_completed_at").eq("id", user.id).single();
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
