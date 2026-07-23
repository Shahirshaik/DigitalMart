"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ShieldCheck, GraduationCap, Briefcase, RotateCcw, ArrowRight, ArrowLeft, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { UserCategory, SkillLevel, LearningFormat } from "@/types/database";

const CATEGORY_OPTIONS: { value: UserCategory; label: string; desc: string; icon: typeof GraduationCap }[] = [
  { value: "student", label: "Student", desc: "Currently studying, exploring career direction.", icon: GraduationCap },
  { value: "experienced_professional", label: "Experienced Professional", desc: "Upskilling or switching specialization.", icon: Briefcase },
  { value: "career_gap", label: "Career Gap / Returning", desc: "Re-entering the workforce, needs a refreshed path.", icon: RotateCcw },
];

const SKILL_OPTIONS: { value: SkillLevel; label: string }[] = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

const FORMAT_OPTIONS: { value: LearningFormat; label: string; desc: string }[] = [
  { value: "self_paced", label: "Self-paced course", desc: "Learn on your own schedule" },
  { value: "live_mentorship", label: "Live mentorship", desc: "1:1 or group sessions with a mentor" },
  { value: "guided_path", label: "Guided path", desc: "A structured, ordered curriculum" },
];

const STEPS = ["Category", "Skill Level", "Target Field", "Format"];

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [category, setCategory] = useState<UserCategory | null>(null);
  const [skillLevel, setSkillLevel] = useState<SkillLevel | null>(null);
  const [targetField, setTargetField] = useState("");
  const [format, setFormat] = useState<LearningFormat | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const canAdvance =
    (step === 0 && category !== null) ||
    (step === 1 && skillLevel !== null) ||
    (step === 2 && targetField.trim().length > 0) ||
    (step === 3 && format !== null);

  const handleNext = () => {
    if (step < STEPS.length - 1) { setStep(step + 1); return; }
    handleSubmit();
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Session expired — please sign in again."); setLoading(false); return; }

    const { error: updateError } = await supabase.from("users").update({
      category,
      skill_level: skillLevel,
      target_field: targetField.trim(),
      preferred_format: format,
      onboarding_completed_at: new Date().toISOString(),
    }).eq("id", user.id);

    if (updateError) { setError(updateError.message); setLoading(false); return; }
    router.push("/");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center px-4 py-12">
      <div className="flex items-center gap-2 mb-8">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600">
          <ShieldCheck className="h-4 w-4 text-white" />
        </div>
        <span className="text-xl font-bold text-gray-900">Digital<span className="text-brand-600">Mart</span></span>
      </div>

      <div className="w-full max-w-xl">
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((label, i) => (
            <div key={label} className="flex-1">
              <div className={`h-1.5 rounded-full ${i <= step ? "bg-brand-600" : "bg-gray-200"}`} />
              <p className={`text-xs mt-1.5 ${i <= step ? "text-brand-700 font-medium" : "text-gray-400"}`}>{label}</p>
            </div>
          ))}
        </div>

        <div className="card p-8 animate-fade-in" key={step}>
          {step === 0 && (
            <>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Where are you right now?</h1>
              <p className="text-sm text-gray-500 mb-6">
                This drives recommendations — it never restricts what you can browse or buy.
              </p>
              <div className="space-y-3">
                {CATEGORY_OPTIONS.map((opt) => (
                  <button key={opt.value} type="button" onClick={() => setCategory(opt.value)}
                    className={`option-card w-full flex items-start gap-4 ${category === opt.value ? "option-card-selected" : ""}`}>
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${category === opt.value ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-500"}`}>
                      <opt.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{opt.label}</p>
                      <p className="text-sm text-gray-500">{opt.desc}</p>
                    </div>
                    {category === opt.value && <Check className="h-5 w-5 text-brand-600 ml-auto shrink-0" />}
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Current skill level</h1>
              <p className="text-sm text-gray-500 mb-6">Be honest — this only shapes what's suggested to you.</p>
              <div className="grid grid-cols-3 gap-3">
                {SKILL_OPTIONS.map((opt) => (
                  <button key={opt.value} type="button" onClick={() => setSkillLevel(opt.value)}
                    className={`option-card text-center ${skillLevel === opt.value ? "option-card-selected" : ""}`}>
                    <p className="font-semibold text-gray-900">{opt.label}</p>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Target field or role</h1>
              <p className="text-sm text-gray-500 mb-6">The destination the learning path builds toward.</p>
              <input type="text" value={targetField} onChange={(e) => setTargetField(e.target.value)}
                placeholder="e.g. Data Analyst, UI/UX Design, Cloud Engineering"
                className="input py-3" autoFocus />
            </>
          )}

          {step === 3 && (
            <>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Preferred learning format</h1>
              <p className="text-sm text-gray-500 mb-6">How do you like to learn?</p>
              <div className="space-y-3">
                {FORMAT_OPTIONS.map((opt) => (
                  <button key={opt.value} type="button" onClick={() => setFormat(opt.value)}
                    className={`option-card w-full flex items-center justify-between ${format === opt.value ? "option-card-selected" : ""}`}>
                    <div>
                      <p className="font-semibold text-gray-900">{opt.label}</p>
                      <p className="text-sm text-gray-500">{opt.desc}</p>
                    </div>
                    {format === opt.value && <Check className="h-5 w-5 text-brand-600 shrink-0" />}
                  </button>
                ))}
              </div>
            </>
          )}

          {error && (
            <div className="mt-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          <div className="flex items-center justify-between mt-8">
            <button type="button" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}
              className="btn-ghost disabled:opacity-0">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <button type="button" onClick={handleNext} disabled={!canAdvance || loading} className="btn-primary py-2.5 px-5">
              {loading ? "Saving..." : step === STEPS.length - 1 ? "Finish" : "Continue"}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
