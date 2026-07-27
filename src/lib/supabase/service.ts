import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Service-role client for trusted server-only jobs (e.g. the auto-release cron route).
// Bypasses RLS entirely — never import this into anything reachable from a user request
// without its own authorization check (see src/app/api/cron/auto-release/route.ts).
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
