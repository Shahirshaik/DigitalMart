"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { ShieldCheck, Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";

  const handleLogin = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) { setError(authError.message); setLoading(false); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("users").select("role, onboarding_completed_at").eq("id", user.id).single();
      if (profile?.role === "admin") { router.push("/admin"); router.refresh(); return; }
      if (!profile?.onboarding_completed_at) { router.push("/onboarding"); router.refresh(); return; }
    }
    router.push(next);
    router.refresh();
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 hero-gradient flex-col justify-center px-16 text-white">
        <Link href="/" className="flex items-center gap-3 mb-12">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
            <ShieldCheck className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold">Digital Mart</span>
        </Link>
        <h2 className="text-4xl font-extrabold mb-4">Welcome back!</h2>
        <p className="text-blue-100 text-lg leading-relaxed max-w-sm">
          Sign in to manage listings, courses, and orders — all escrow-protected.
        </p>
        <div className="mt-10 space-y-3">
          {["Buy & sell digital goods", "Track escrow-protected orders", "Grow with courses & referrals"].map((f) => (
            <div key={f} className="flex items-center gap-3">
              <div className="h-5 w-5 rounded-full bg-white/20 flex items-center justify-center">
                <ArrowRight className="h-3 w-3" />
              </div>
              <span className="text-blue-100 text-sm">{f}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-gray-50">
        <div className="w-full max-w-md">
          <div className="text-center mb-8 lg:hidden">
            <Link href="/" className="inline-flex items-center gap-2 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600">
                <ShieldCheck className="h-4 w-4 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">Digital<span className="text-brand-600">Mart</span></span>
            </Link>
          </div>
          <div className="card p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Sign in</h1>
            <p className="text-sm text-gray-500 mb-6">Enter your credentials to continue</p>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com" className="input pl-10" />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium text-gray-700">Password</label>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input type={showPass ? "text" : "password"} required value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Your password" className="input pl-10 pr-10" />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
              )}
              <button type="submit" disabled={loading} className="btn-primary w-full py-3">
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>
            <p className="mt-6 text-center text-sm text-gray-500">
              No account?{" "}
              <Link href="/auth/signup" className="font-semibold text-brand-600 hover:text-brand-700">Sign up free</Link>
            </p>
          </div>
          <p className="text-center text-xs text-gray-400 mt-4">
            <Link href="/" className="hover:text-gray-600">← Back to Digital Mart</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}
