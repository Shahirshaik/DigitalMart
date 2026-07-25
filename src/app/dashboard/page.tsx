import Link from "next/link";
import { redirect } from "next/navigation";
import { Package, GraduationCap, Users, Inbox, Plus, Wallet, UserPlus, Store, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { formatMoney } from "@/lib/utils";
import { becomeSeller } from "./actions";
import type { AccountRole } from "@/types/database";

export const metadata = { title: "Seller Dashboard" };

const SELLER_PERKS = [
  "Free to list — a fee only applies once you make a sale",
  "Get paid directly via UPI, no gateway holding your money",
  "Your listing goes straight in front of everyone browsing",
];

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/dashboard");

  const { data: profile } = await supabase.from("users").select("role, is_seller, full_name").eq("id", user.id).single();

  if (!profile?.is_seller && profile?.role !== "admin") {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar userRole={profile?.role as AccountRole} userEmail={user.email ?? null} />
        <main className="flex-1 bg-gray-50 flex items-center">
          <div className="mx-auto max-w-lg px-4 sm:px-6 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gold-100 mx-auto mb-5">
              <Store className="h-8 w-8 text-gold-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Become a seller</h1>
            <p className="text-gray-500 mb-6">
              {profile?.full_name?.split(" ")[0] ?? "You"}, you're one click away from turning what you
              know or own into income on Digital Mart.
            </p>
            <ul className="text-left space-y-2.5 mb-8 mx-auto max-w-sm">
              {SELLER_PERKS.map((perk) => (
                <li key={perk} className="flex items-start gap-2.5 text-sm text-gray-600">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-gold-400 shrink-0" /> {perk}
                </li>
              ))}
            </ul>
            <form action={becomeSeller.bind(null, "/dashboard")}>
              <button type="submit" className="btn-primary bg-gold-400 text-brand-900 hover:bg-gold-300 font-bold py-3 px-6 mx-auto">
                Become a Seller <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const [{ count: listingCount }, { count: courseCount }, { count: pendingOrders }, { data: followerRow }, { data: payouts }, { count: newLeadCount }] = await Promise.all([
    supabase.from("listings").select("*", { count: "exact", head: true }).eq("seller_id", user.id),
    supabase.from("courses").select("*", { count: "exact", head: true }).eq("seller_id", user.id),
    supabase.from("orders").select("*", { count: "exact", head: true }).eq("seller_id", user.id).eq("status", "held"),
    supabase.from("v_seller_follower_counts").select("follower_count").eq("seller_id", user.id).maybeSingle(),
    supabase.from("v_seller_payouts").select("lifetime_earnings").eq("seller_id", user.id).maybeSingle(),
    supabase.from("leads").select("*", { count: "exact", head: true }).eq("seller_id", user.id).eq("status", "new"),
  ]);

  const STATS = [
    { icon: Package, label: "Listings", value: listingCount ?? 0, href: "/dashboard/listings" },
    { icon: GraduationCap, label: "Courses", value: courseCount ?? 0, href: "/dashboard/courses" },
    { icon: Users, label: "Followers", value: followerRow?.follower_count ?? 0, href: `/sellers/${user.id}` },
    { icon: Inbox, label: "Awaiting confirmation", value: pendingOrders ?? 0, href: "/dashboard/orders" },
    { icon: UserPlus, label: "New leads", value: newLeadCount ?? 0, href: "/dashboard/leads" },
    { icon: Wallet, label: "Lifetime earnings", value: formatMoney(Number(payouts?.lifetime_earnings ?? 0)), href: "/dashboard/payouts" },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar userRole={profile?.role as AccountRole} userEmail={user.email ?? null} />

      <main className="flex-1 bg-gray-50">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Seller Dashboard</h1>
          <p className="text-sm text-gray-500 mb-8">Welcome back, {profile?.full_name ?? "seller"}. Post what you have to sell or give away.</p>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
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
