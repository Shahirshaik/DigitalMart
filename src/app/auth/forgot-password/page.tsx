"use client";

import Link from "next/link";
import { useState } from "react";
import { Mail, CheckCircle, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { LogoMark } from "@/components/ui/Logo";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
    });
    if (resetError) { setError(resetError.message); setLoading(false); return; }
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
            If an account exists for <strong>{email}</strong>, we've sent a link to reset your password.
          </p>
          <Link href="/auth/login" className="btn-primary w-full justify-center py-3">
            Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <LogoMark size={36} />
            <span className="text-xl font-bold text-gray-900">Digital<span className="text-brand-600">Mart</span></span>
          </Link>
        </div>
        <div className="card p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Reset your password</h1>
          <p className="text-sm text-gray-500 mb-6">
            Enter the email you signed up with and we'll send you a link to set a new password.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com" className="input pl-10" />
              </div>
            </div>
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
            )}
            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
          </form>
        </div>
        <p className="text-center text-xs text-gray-400 mt-4">
          <Link href="/auth/login" className="hover:text-gray-600 inline-flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" /> Back to Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
