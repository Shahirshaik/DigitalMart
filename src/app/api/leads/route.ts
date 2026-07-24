import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ skipped: true }, { status: 200 });

  const { sellerId, courseId } = await request.json();
  if (!sellerId || !courseId) return NextResponse.json({ error: "missing sellerId/courseId" }, { status: 400 });
  if (sellerId === user.id) return NextResponse.json({ skipped: true }, { status: 200 });

  // Plain insert, not upsert: an upsert compiles to INSERT ... ON CONFLICT
  // DO UPDATE, which Postgres RLS requires an UPDATE policy for even when
  // no conflict occurs — buyers only have INSERT rights on leads, not
  // UPDATE (only the seller can change a lead's status). A repeat click
  // just hits the unique constraint, which we treat as a no-op.
  const { error } = await supabase.from("leads")
    .insert({ seller_id: sellerId, buyer_id: user.id, course_id: courseId });
  if (error && !error.message.toLowerCase().includes("duplicate")) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
