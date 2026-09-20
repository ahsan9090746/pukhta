"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { Category } from "@/types";
import { getImageUrl } from "@/lib/utils";

interface CategoryGridProps {
  categories: Category[];
}

const AUTOPLAY_MS = 4000;

export default function CategoryGrid({ categories }: CategoryGridProps) {
  const items = Array.isArray(categories) ? categories : [];
  const [index, setIndex] = useState(0);
  const [perView, setPerView] = useState(4);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  // Responsive items-per-view (1 mobile / 2 tablet / 3 laptop / 4 desktop)
  useEffect(() => {
    const compute = () => {
      const w = window.innerWidth;
      if (w < 640) setPerView(1);
      else if (w < 1024) setPerView(2);
      else if (w < 1280) setPerView(3);
      else setPerView(4);
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, []);

  const maxIndex = Math.max(0, items.length - perView);

  // Clamp index when perView changes (e.g. resize)
  useEffect(() => {
    setIndex((i) => Math.min(i, maxIndex));
  }, [maxIndex]);

  const next = useCallback(() => {
    setIndex((i) => (i >= maxIndex ? 0 : i + 1));
  }, [maxIndex]);

  const prev = useCallback(() => {
    setIndex((i) => (i <= 0 ? maxIndex : i - 1));
  }, [maxIndex]);

  // Gentle autoplay — pauses on hover and when everything fits on screen
  useEffect(() => {
    if (paused || maxIndex === 0) return;
    const timer = setInterval(next, AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [paused, maxIndex, next]);

  // Touch swipe support
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 50) {
      if (delta < 0) next();
      else prev();
    }
    touchStartX.current = null;
  };

  if (!items.length) return null;

  const step = 100 / perView;

  return (
    <div
      className="relative group/carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Arrows — slim, elegant, theme-styled */}
      <button
        onClick={prev}
        aria-label="Previous category"
        className="absolute -left-3 md:-left-5 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-background/95 border shadow-md flex items-center justify-center text-foreground/70 hover:text-gold-dark hover:border-gold hover:shadow-gold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        disabled={index === 0}
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        onClick={next}
        aria-label="Next category"
        className="absolute -right-3 md:-right-5 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-background/95 border shadow-md flex items-center justify-center text-foreground/70 hover:text-gold-dark hover:border-gold hover:shadow-gold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        disabled={index >= maxIndex}
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      {/* Sliding track */}
      <div className="overflow-hidden px-1 py-2">
        <motion.div
          className="flex"
          animate={{ x: `-${index * step}%` }}
          transition={{ type: "tween", duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          {items.map((category, i) => (
            <div
              key={category._id}
              className="shrink-0 px-2.5"
              style={{ width: `${step}%` }}
            >
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ delay: (i % perView) * 0.08, duration: 0.5 }}
              >
                <Link
                  href={`/categories/${category.slug}`}
                  className="group relative block aspect-[4/5] rounded-2xl overflow-hidden bg-muted ring-1 ring-black/5 hover:ring-2 hover:ring-gold shadow-sm hover:shadow-gold transition-all duration-500"
                >
                  {category.image ? (
                    <Image
                      src={getImageUrl(category.image)}
                      alt={category.name}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-muted to-muted-foreground/20" />
                  )}

                  {/* Premium gradient reveal on hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                  {/* Name + CTA slide-up on hover */}
                  <div className="absolute inset-x-0 bottom-0 p-5 translate-y-8 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500 ease-out">
                    <p className="text-white font-semibold text-lg leading-snug line-clamp-2">
                      {category.name}
                    </p>
                    <span className="mt-1.5 inline-flex items-center gap-1.5 text-gold font-medium text-sm tracking-wide">
                      Shop Now
                      <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                    </span>
                  </div>
                </Link>
              </motion.div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Dots — gold pill for active (premium twist) */}
      {maxIndex > 0 && (
        <div className="mt-5 flex items-center justify-center gap-2">
          {Array.from({ length: maxIndex + 1 }).map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === index
                  ? "w-7 bg-gold"
                  : "w-2 bg-foreground/20 hover:bg-foreground/40"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
