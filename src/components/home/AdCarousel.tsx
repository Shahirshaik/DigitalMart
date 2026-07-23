"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ChevronLeft, ChevronRight, ArrowRight, ShieldCheck, GraduationCap, Store,
  type LucideIcon,
} from "lucide-react";

interface Slide {
  title: string;
  desc: string;
  cta: string;
  href: string;
  gradient: string;
  Icon: LucideIcon;
}

const SLIDES: Slide[] = [
  {
    title: "Escrow-Backed Trust on Every Order",
    desc: "Your payment is held until you confirm delivery — no risk buying from strangers online.",
    cta: "Browse Marketplace",
    href: "/listings",
    gradient: "from-blue-600 via-brand-600 to-indigo-700",
    Icon: ShieldCheck,
  },
  {
    title: "Learn In-Demand Skills",
    desc: "Courses and guided paths from verified instructors, at a fraction of institute pricing.",
    cta: "Explore Courses",
    href: "/courses",
    gradient: "from-trust-600 via-teal-600 to-emerald-700",
    Icon: GraduationCap,
  },
  {
    title: "Sell What You Know or Own",
    desc: "Post software keys, subscriptions, or a course in minutes — free to list, paid only when you sell.",
    cta: "Start Selling",
    href: "/dashboard",
    gradient: "from-violet-600 via-indigo-600 to-brand-700",
    Icon: Store,
  },
];

export function AdCarousel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % SLIDES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const go = (next: number) => setIndex((next + SLIDES.length) % SLIDES.length);

  return (
    <section className="relative overflow-hidden">
      <div className="relative h-64 sm:h-72">
        {SLIDES.map((slide, i) => (
          <div
            key={slide.title}
            className={`absolute inset-0 bg-gradient-to-br ${slide.gradient} transition-opacity duration-700 ${i === index ? "opacity-100" : "opacity-0 pointer-events-none"}`}
          >
            <slide.Icon className="absolute -right-8 -bottom-8 h-56 w-56 sm:h-64 sm:w-64 text-white/10 -rotate-12" strokeWidth={1} />
            <div className="relative mx-auto max-w-6xl h-full px-12 sm:px-16 flex flex-col md:flex-row items-center justify-center md:justify-between gap-4 text-center md:text-left text-white">
              <div className="flex flex-col items-center md:items-start max-w-xl">
                <h2 className="text-2xl sm:text-3xl font-extrabold mb-2">{slide.title}</h2>
                <p className="text-sm sm:text-base text-white/85 mb-5">{slide.desc}</p>
                <Link href={slide.href} className="btn-primary bg-white text-brand-700 hover:bg-blue-50 py-2.5 px-5">
                  {slide.cta} <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="hidden sm:flex h-28 w-28 shrink-0 items-center justify-center rounded-3xl bg-white/15 backdrop-blur">
                <slide.Icon className="h-14 w-14 text-white" strokeWidth={1.5} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <button onClick={() => go(index - 1)} aria-label="Previous slide"
        className="absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors">
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button onClick={() => go(index + 1)} aria-label="Next slide"
        className="absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors">
        <ChevronRight className="h-5 w-5" />
      </button>

      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2">
        {SLIDES.map((slide, i) => (
          <button key={slide.title} onClick={() => go(i)} aria-label={`Go to slide ${i + 1}`}
            className={`h-1.5 rounded-full transition-all ${i === index ? "w-6 bg-white" : "w-1.5 bg-white/50"}`} />
        ))}
      </div>
    </section>
  );
}
