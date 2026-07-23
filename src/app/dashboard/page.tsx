import Link from "next/link";
import { redirect } from "next/navigation";
import { Package, GraduationCap, Users, Inbox, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import type { AccountRole } from "@/types/database";

export const metadata = { title: "Seller Dashboard" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/dashboard");

  const { data: profile } = await supabase.from("users").select("role, is_seller, full_name").eq("id", user.id).single();
  if (!profile?.is_seller && profile?.role !== "admin") redirect("/");

  const [{ count: listingCount }, { count: courseCount }, { count: pendingOrders }, { data: followerRow }] = await Promise.all([
    supabase.from("listings").select("*", { count: "exact", head: true }).eq("seller_id", user.id),
    supabase.from("courses").select("*", { count: "exact", head: true }).eq("seller_id", user.id),
    supabase.from("orders").select("*", { count: "exact", head: true }).eq("seller_id", user.id).eq("status", "held"),
    supabase.from("v_seller_follower_counts").select("follower_count").eq("seller_id", user.id).maybeSingle(),
  ]);

  const STATS = [
    { icon: Package, label: "Listings", value: listingCount ?? 0, href: "/dashboard/listings" },
    { icon: GraduationCap, label: "Courses", value: courseCount ?? 0, href: "/dashboard/courses" },
    { icon: Users, label: "Followers", value: followerRow?.follower_count ?? 0, href: `/sellers/${user.id}` },
    { icon: Inbox, label: "Awaiting confirmation", value: pendingOrders ?? 0, href: "/dashboard/orders" },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar userRole={profile?.role as AccountRole} userEmail={user.email ?? null} />

      <main className="flex-1 bg-gray-50">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Seller Dashboard</h1>
          <p className="text-sm text-gray-500 mb-8">Welcome back, {profile?.full_name ?? "seller"}. Post what you have to sell or give away.</p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {STATS.map((s) => (
              <Link key={s.label} href={s.href} className="card p-4 text-center hover:-translate-y-0.5">
                <s.icon className="h-5 w-5 mx-auto mb-2 text-brand-600" />
                <p className="text-xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </Link>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="card p-5">
              <h2 className="font-bold text-gray-900 mb-1">Digital Assets & Software</h2>
              <p className="text-sm text-gray-500 mb-4">Software keys, subscriptions, game accounts, social growth services, guides — paid or free.</p>
              <Link href="/dashboard/listings/new" className="btn-primary py-2 px-4 text-sm"><Plus className="h-4 w-4" /> New Listing</Link>
            </div>
            <div className="card p-5">
              <h2 className="font-bold text-gray-900 mb-1">Courses</h2>
              <p className="text-sm text-gray-500 mb-4">Share what you know — a paid course or a free guided path.</p>
              <Link href="/dashboard/courses/new" className="btn-primary py-2 px-4 text-sm"><Plus className="h-4 w-4" /> New Course</Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
