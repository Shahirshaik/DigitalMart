"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ShieldCheck, Menu, X, User, LogOut, ChevronDown, LayoutDashboard, Package, Inbox, Store, Bell, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { timeAgo } from "@/lib/utils";
import type { AccountRole } from "@/types/database";

interface Props {
  userRole?: AccountRole | null;
  userEmail?: string | null;
}

interface NotificationRow {
  id: string;
  title: string;
  body: string | null;
  is_read: boolean;
  link_type: string | null;
  link_id: string | null;
  created_at: string;
}

const NAV_LINKS = [
  { href: "/listings", label: "Marketplace" },
  { href: "/courses",  label: "Courses" },
];

function notificationHref(n: NotificationRow): string {
  if (n.link_type === "order" && n.link_id) return `/checkout/${n.link_id}`;
  if (n.link_type === "course" && n.link_id) return `/courses/${n.link_id}`;
  if (n.link_type === "wallet") return "/wallet";
  return "/orders";
}

export function Navbar({ userRole, userEmail }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    if (!userEmail) return;
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data } = await supabase
        .from("notifications")
        .select("id, title, body, is_read, link_type, link_id, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(15);
      if (!cancelled && data) setNotifications(data);
    })();
    return () => { cancelled = true; };
  }, [userEmail]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAllRead = async () => {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await supabase.from("notifications").update({ is_read: true }).in("id", unreadIds);
  };

  const handleNotificationClick = async (n: NotificationRow) => {
    setNotifOpen(false);
    if (!n.is_read) {
      setNotifications((prev) => prev.map((row) => (row.id === n.id ? { ...row, is_read: true } : row)));
      await supabase.from("notifications").update({ is_read: true }).eq("id", n.id);
    }
    router.push(notificationHref(n));
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex h-14 items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
              <ShieldCheck className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm sm:text-base font-bold text-gray-900">
              Digital<span className="text-brand-600">Mart</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="nav-link">
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {userEmail && (
              <div className="relative">
                <button onClick={() => setNotifOpen(!notifOpen)}
                  aria-label="Notifications"
                  className="relative flex items-center justify-center rounded-xl bg-gray-100 p-2.5 text-gray-600 hover:bg-gray-200 transition-colors">
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setNotifOpen(false)} />
                    <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-2xl bg-white border border-gray-100 shadow-xl py-2 z-20">
                      <div className="flex items-center justify-between px-4 pb-2">
                        <p className="text-sm font-semibold text-gray-900">Notifications</p>
                        {unreadCount > 0 && (
                          <button onClick={markAllRead} className="text-xs text-brand-600 hover:underline">
                            Mark all read
                          </button>
                        )}
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <p className="px-4 py-6 text-center text-sm text-gray-400">No notifications yet.</p>
                        ) : (
                          notifications.map((n) => (
                            <button key={n.id} onClick={() => handleNotificationClick(n)}
                              className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-gray-50 ${!n.is_read ? "bg-brand-50/60" : ""}`}>
                              <p className="font-medium text-gray-900 flex items-center gap-1.5">
                                {!n.is_read && <span className="h-1.5 w-1.5 rounded-full bg-brand-600 shrink-0" />}
                                {n.title}
                              </p>
                              {n.body && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>}
                              <p className="text-[11px] text-gray-400 mt-1">{timeAgo(n.created_at)}</p>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {userEmail ? (
              <div className="relative">
                <button onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-1.5 rounded-xl bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:block max-w-[100px] truncate">{userEmail.split("@")[0]}</span>
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>

                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                    <div className="absolute right-0 mt-2 w-52 rounded-2xl bg-white border border-gray-100 shadow-xl py-1.5 z-20">
                      {userRole === "admin" && (
                        <Link href="/admin" onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-brand-50 hover:text-brand-700 transition-colors">
                          <LayoutDashboard className="h-4 w-4" /> Admin Panel
                        </Link>
                      )}
                      <Link href="/dashboard" onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                        <Store className="h-4 w-4" /> Seller Dashboard
                      </Link>
                      <Link href="/orders" onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                        <Package className="h-4 w-4" /> My Orders
                      </Link>
                      <Link href="/dashboard/orders" onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                        <Inbox className="h-4 w-4" /> Seller Orders
                      </Link>
                      <Link href="/wallet" onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                        <Wallet className="h-4 w-4" /> Wallet &amp; Referrals
                      </Link>
                      <Link href="/profile" onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                        <User className="h-4 w-4" /> My Profile
                      </Link>
                      <hr className="my-1 border-gray-100" />
                      <button onClick={handleSignOut}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                        <LogOut className="h-4 w-4" /> Sign Out
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/auth/login" className="btn-ghost text-sm py-2">Sign In</Link>
                <Link href="/auth/signup" className="btn-primary text-sm py-2 px-3">Sign Up</Link>
              </div>
            )}

            <button onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden rounded-lg p-2 text-gray-600 hover:bg-gray-100 transition-colors">
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden pb-3 pt-1 border-t border-gray-100 space-y-0.5">
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)}
                className="block rounded-xl px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-brand-50 hover:text-brand-700 transition-colors">
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}
