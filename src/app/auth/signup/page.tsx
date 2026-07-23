"use client";

import Link from "next/link";
import { useState } from "react";
import { ShieldCheck, Mail, Lock, User, Phone, Eye, EyeOff, CheckCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function SignUpPage() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", confirm: "" });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSignUp = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (form.password !== form.confirm) { setError("Passwords do not match"); return; }
    if (form.password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { full_name: form.name, phone: form.phone } },
    });
    if (authError) { setError(authError.message); setLoading(false); return; }
    if (!data.session) {
      // Email confirmation required before the `users` row can be inserted client-side by RLS
      setSuccess(true);
      setLoading(false);
      return;
    }
    setSuccess(true);
    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="card p-10 max-w-md w-full text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Check your email!</h2>
          <p className="text-gray-500 mb-6">
            We sent a confirmation link to <strong>{form.email}</strong>. Once confirmed, sign in
            to tell us a bit about your goals.
          </p>
          <Link href="/auth/login" className="btn-primary w-full justify-center py-3">
            Go to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 hero-gradient flex-col justify-center px-16 text-white">
        <Link href="/" className="flex items-center gap-3 mb-12">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
            <ShieldCheck className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold">Digital Mart</span>
        </Link>
        <h2 className="text-4xl font-extrabold mb-4">Join Digital Mart today</h2>
        <p className="text-blue-100 text-lg max-w-sm">
          Free to join. Buy or sell digital goods and courses — every order is escrow-protected.
        </p>
        <div className="mt-10 grid grid-cols-2 gap-4">
          {[
            { icon: "🔒", title: "Escrow Protected", desc: "Funds held till confirmed" },
            { icon: "🎓", title: "Guided Learning", desc: "A path built for you" },
            { icon: "🆓", title: "One Account", desc: "Buy & sell together" },
            { icon: "⚡", title: "Fast Setup", desc: "Live in 60 sec" },
          ].map((f) => (
            <div key={f.title} className="rounded-xl bg-white/10 p-4 backdrop-blur border border-white/10">
              <div className="text-2xl mb-2">{f.icon}</div>
              <p className="font-semibold text-sm">{f.title}</p>
              <p className="text-blue-100 text-xs">{f.desc}</p>
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
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Create account</h1>
            <p className="text-sm text-gray-500 mb-6">Free and takes less than a minute</p>
            <form onSubmit={handleSignUp} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input type="text" required value={form.name} onChange={set("name")}
                    placeholder="Your full name" className="input pl-10" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input type="email" required value={form.email} onChange={set("email")}
                    placeholder="you@example.com" className="input pl-10" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Phone (optional)</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input type="tel" value={form.phone} onChange={set("phone")}
                    placeholder="+91 98765 43210" className="input pl-10" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input type={showPass ? "text" : "password"} required value={form.password} onChange={set("password")}
                    placeholder="Min 6 characters" className="input pl-10 pr-10" />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input type="password" required value={form.confirm} onChange={set("confirm")}
                    placeholder="Repeat password" className="input pl-10" />
                </div>
              </div>
              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
              )}
              <button type="submit" disabled={loading} className="btn-primary w-full py-3">
                {loading ? "Creating account..." : "Create Free Account"}
              </button>
              <p className="text-xs text-center text-gray-400">
                By signing up you agree to our{" "}
                <Link href="/terms" className="text-brand-600 hover:underline">Terms</Link> and{" "}
                <Link href="/privacy" className="text-brand-600 hover:underline">Privacy Policy</Link>
              </p>
            </form>
            <p className="mt-6 text-center text-sm text-gray-500">
              Already have an account?{" "}
              <Link href="/auth/login" className="font-semibold text-brand-600 hover:text-brand-700">Sign in</Link>
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
