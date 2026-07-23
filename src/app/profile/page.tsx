import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { updateProfile } from "@/app/profile/actions";
import type { AccountRole } from "@/types/database";

export const metadata = { title: "My Profile" };

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/profile");

  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single();

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar userRole={profile?.role as AccountRole} userEmail={user.email ?? null} />

      <main className="flex-1 bg-gray-50">
        <div className="mx-auto max-w-xl px-4 sm:px-6 py-10">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">My Profile</h1>
          <p className="text-sm text-gray-500 mb-6">Your phone number is only shared with buyers/sellers if you turn on WhatsApp contact below.</p>

          <form action={updateProfile} className="card p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input name="full_name" defaultValue={profile?.full_name ?? ""} className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input value={user.email ?? ""} disabled className="input opacity-60" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input name="phone" type="tel" defaultValue={profile?.phone ?? ""} placeholder="+91 98765 43210" className="input" />
            </div>
            {profile?.is_seller && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                <textarea name="bio" rows={3} defaultValue={profile?.bio ?? ""} className="input" />
              </div>
            )}

            <label className="flex items-start gap-3 rounded-xl border border-gray-200 p-4 cursor-pointer">
              <input type="checkbox" name="whatsapp_enabled" defaultChecked={profile?.whatsapp_enabled ?? true}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-100" />
              <span>
                <span className="block text-sm font-medium text-gray-900">Let buyers connect with me on WhatsApp</span>
                <span className="block text-xs text-gray-500 mt-0.5">
                  Shows a "Connect on WhatsApp" button using your phone number above, visible to anyone viewing
                  your listings or courses. Turn this off to stop receiving WhatsApp contact — buyers can still
                  pay you through Digital Mart's checkout.
                </span>
              </span>
            </label>

            <button type="submit" className="btn-primary w-full py-3">Save Changes</button>
          </form>

          <p className="text-xs text-gray-400 mt-4 text-center">
            Digital Mart isn't responsible for conversations or agreements made outside the app.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
