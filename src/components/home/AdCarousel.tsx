"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ArrowRight, Megaphone } from "lucide-react";

export interface Slide {
  id: string;
  title: string;
  description: string;
  cta_label: string;
  link_url: string;
  image_url: string | null;
  image_url_mobile: string | null;
  is_gold: boolean;
}

const GRADIENTS = [
  "from-brand-800 via-brand-600 to-blue-600",
  "from-blue-600 via-brand-600 to-indigo-700",
  "from-trust-600 via-teal-600 to-emerald-700",
];

interface Props { slides: Slide[] }

export function AdCarousel({ slides }: Props) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (slides.length < 2) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  if (slides.length === 0) return null;

  const go = (next: number) => setIndex((next + slides.length) % slides.length);

  return (
    <section className="relative overflow-hidden">
      <div className="relative h-64 sm:h-72">
        {slides.map((slide, i) => {
          const hasText = Boolean(slide.title || slide.description);
          const desktopImg = slide.image_url || slide.image_url_mobile;
          const mobileImg = slide.image_url_mobile || slide.image_url;
          const hasImage = Boolean(desktopImg || mobileImg);
          return (
            <div
              key={slide.id}
              className={`absolute inset-0 ${hasImage ? "bg-gray-950" : `bg-gradient-to-br ${GRADIENTS[i % GRADIENTS.length]}`} transition-opacity duration-700 ${i === index ? "opacity-100" : "opacity-0 pointer-events-none"}`}
            >
              {hasImage ? (
                <>
                  {/* Separate mobile vs desktop/tablet crop — a wide banner image and a
                      tall phone viewport rarely look right from a single source image.
                      Shown uncropped (object-contain), since an uploaded ad creative
                      often carries its own baked-in text/layout. */}
                  {mobileImg && <img src={mobileImg} alt="" className="absolute inset-0 h-full w-full object-contain sm:hidden" />}
                  {desktopImg && <img src={desktopImg} alt="" className="absolute inset-0 h-full w-full object-contain hidden sm:block" />}
                  {/* Bottom scrim keeps the CTA legible over any image content behind it. */}
                  <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/70 to-transparent" />
                </>
              ) : (
                <Megaphone className="absolute -right-8 -bottom-8 h-56 w-56 sm:h-64 sm:w-64 text-white/10 -rotate-12" strokeWidth={1} />
              )}
              <div className={`relative mx-auto max-w-6xl h-full px-12 sm:px-16 flex text-white ${
                hasImage
                  ? "items-end justify-center pb-4"
                  : "flex-col md:flex-row items-center justify-center md:justify-between gap-4 text-center md:text-left"
              }`}>
                <div className={`flex flex-col items-center ${hasImage ? "" : "md:items-start max-w-xl"}`}>
                  {hasText && <h2 className="text-2xl sm:text-3xl font-extrabold mb-2">{slide.title}</h2>}
                  {hasText && <p className="text-sm sm:text-base text-white/85 mb-5">{slide.description}</p>}
                  <Link href={slide.link_url} className={slide.is_gold
                    ? "btn-primary bg-gold-400 text-brand-900 hover:bg-gold-300 font-bold py-2.5 px-5"
                    : "btn-primary bg-white text-brand-700 hover:bg-blue-50 py-2.5 px-5"}>
                    {slide.cta_label} <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {slides.length > 1 && (
        <>
          <button onClick={() => go(index - 1)} aria-label="Previous slide"
            className="absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button onClick={() => go(index + 1)} aria-label="Next slide"
            className="absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors">
            <ChevronRight className="h-5 w-5" />
          </button>

          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2">
            {slides.map((slide, i) => (
              <button key={slide.id} onClick={() => go(i)} aria-label={`Go to slide ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${i === index ? "w-6 bg-white" : "w-1.5 bg-white/50"}`} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
