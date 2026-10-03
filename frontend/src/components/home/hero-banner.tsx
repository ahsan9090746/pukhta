"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import Image from "next/image";
import { getImageUrl } from "@/lib/utils";
import { EASE_OUT } from "@/components/common/reveal";

interface HeroBannerProps {
  banners: any[];
  loading: boolean;
}

/** How long one slide stays on screen before the next one drifts in. */
const AUTO_ADVANCE_MS = 7000;
/** Horizontal travel (px) that counts as a swipe on touch devices. */
const SWIPE_THRESHOLD_PX = 55;

/**
 * Normalizes legacy banner links so banners saved before the route rename keep
 * working: "/products/<slug>" -> "/product/<slug>", the old bare "/products"
 * shop link -> "/product-category" and the old "/categories/<slug>" -> the
 * live "/product-category/<slug>" listing.
 */
const normalizeBannerLink = (link?: string) =>
  (link || "")
    .replace(/^\/products\//, "/product/")
    .replace(/^\/products\/?(?=[?#]|$)/, "/product-category")
    .replace(/^\/categories\//, "/product-category/");

/** Slides enter from the side they travel from and cross-fade with the previous one. */
const slideVariants = {
  enter: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? 90 : -90,
    scale: 1.02,
  }),
  center: { opacity: 1, x: 0, scale: 1 },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? -70 : 70,
    scale: 0.995,
  }),
};

export default function HeroBanner({ banners, loading }: HeroBannerProps) {
  const reducedMotion = useReducedMotion();
  const [[current, direction], setSlide] = useState<[number, number]>([0, 1]);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);
  const [progress, setProgress] = useState(0);

  const progressRef = useRef(0);
  const touchStartX = useRef<number | null>(null);
  const total = banners.length;
  const isPaused = paused || hovered || tabHidden;

  const goTo = useCallback(
    (next: number, dir?: number) => {
      if (total === 0) return;
      const target = ((next % total) + total) % total;
      setSlide(([previous]) => [target, dir ?? (target >= previous ? 1 : -1)]);
    },
    [total]
  );

  const next = useCallback(() => goTo(current + 1, 1), [current, goTo]);
  const previous = useCallback(() => goTo(current - 1, -1), [current, goTo]);

  // Autoplay runs on requestAnimationFrame so the progress rail, the hover pause
  // and the pause/play button always stay perfectly in sync.
  useEffect(() => {
    if (reducedMotion || isPaused || total <= 1) return;

    let frame = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const delta = now - last;
      last = now;
      progressRef.current += delta / AUTO_ADVANCE_MS;

      if (progressRef.current >= 1) {
        progressRef.current = 0;
        setProgress(0);
        setSlide(([index]) => [(index + 1) % total, 1]);
      } else {
        setProgress(progressRef.current);
      }
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [isPaused, reducedMotion, total, current]);

  // A manually chosen slide restarts the timer
  useEffect(() => {
    progressRef.current = 0;
    setProgress(0);
  }, [current]);

  // Never animate while the tab sits in the background
  useEffect(() => {
    const onVisibility = () => setTabHidden(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  // Keep the index in range when the list shrinks (banner deleted/hidden)
  useEffect(() => {
    if (total > 0 && current >= total) setSlide([0, -1]);
  }, [current, total]);

  if (loading) {
    return (
      <Skeleton className="aspect-[3/5] w-full rounded-none md:aspect-[2/1]" />
    );
  }

  if (!total) {
    return (
      <div className="relative flex aspect-[3/5] w-full items-center overflow-hidden bg-gradient-to-br from-brand-black via-brand-charcoal to-brand-black md:aspect-[2/1]">
        <div className="container text-white">
          <div className="max-w-xl">
            <h1 className="banner-content-fade text-5xl font-bold mb-4 md:text-6xl">
              Premium Footwear
            </h1>
            <p className="banner-content-fade banner-delay-1 text-xl text-gray-300 mb-8">
              Discover the latest collection of premium shoes
            </p>
            <div className="banner-content-fade banner-delay-2">
              <Button asChild size="lg" className="bg-brand-gold hover:bg-brand-gold-dark text-white border-0">
                <Link href="/product-category">Shop Now</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const banner = banners[current];
  const link = normalizeBannerLink(banner?.link) || "/product-category";
  const desktopImage = banner?.image || banner?.mobileImage || "";
  const mobileImage = banner?.mobileImage || banner?.image || "";
  // Alt text keeps the banner accessible/SEO-friendly even though no visible
  // copy is rendered over the artwork.
  const altText = banner?.altText || banner?.title || "Banner";

  // The frame is intentionally a little shorter than the uploaded artwork's 16:9
  // so the banner is less tall; `object-cover` then trims only the empty top and
  // bottom margins of the image, so the full width of the artwork stays visible.
  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured collections"
      tabIndex={0}
      className="group relative aspect-[3/5] w-full overflow-hidden bg-brand-black outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/60 md:aspect-[2/1]"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      onTouchStart={(event) => {
        touchStartX.current = event.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        if (touchStartX.current == null) return;
        const delta = (event.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
        touchStartX.current = null;
        if (Math.abs(delta) < SWIPE_THRESHOLD_PX) return;
        if (delta < 0) next();
        else previous();
      }}
      onKeyDown={(event) => {
        if (event.key === "ArrowRight") {
          event.preventDefault();
          next();
        }
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          previous();
        }
      }}
    >
      <AnimatePresence initial={false} custom={direction}>
        <motion.div
          key={banner?._id || current}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.8, ease: EASE_OUT }}
          className="absolute inset-0"
        >
          <Link
            href={link}
            aria-label={altText}
            className="relative block h-full w-full cursor-pointer"
          >
            {/* Slow Ken Burns drift gives the still artwork a cinematic feel.
                Kept very subtle (1 -> 1.04) so the banner image is barely zoomed
                out and the whole artwork, headline included, stays visible. */}
            <motion.div
              className="absolute inset-0"
              initial={reducedMotion ? false : { scale: 1 }}
              animate={reducedMotion ? {} : { scale: 1.04 }}
              transition={{ duration: AUTO_ADVANCE_MS / 1000 + 3, ease: "linear" }}
            >
              {desktopImage && (
                <Image
                  src={getImageUrl(desktopImage)}
                  alt={altText}
                  fill
                  sizes="100vw"
                  priority
                  className="hidden object-cover object-center md:block"
                />
              )}
              {mobileImage && (
                <Image
                  src={getImageUrl(mobileImage)}
                  alt={altText}
                  fill
                  sizes="100vw"
                  priority
                  className="object-cover object-center md:hidden"
                />
              )}
            </motion.div>

            {/* Soft vignette keeps light photography readable without copy on top */}
            <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-black/10" />
          </Link>
        </motion.div>
      </AnimatePresence>

      {total > 1 && (
        <>
          <button
            type="button"
            onClick={previous}
            aria-label="Previous banner"
            className="absolute left-3 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/25 text-white opacity-0 backdrop-blur-md transition-all duration-300 hover:scale-105 hover:border-brand-gold hover:bg-brand-gold group-hover:opacity-100 focus-visible:opacity-100 sm:left-5 sm:opacity-100"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Next banner"
            className="absolute right-3 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/25 text-white opacity-0 backdrop-blur-md transition-all duration-300 hover:scale-105 hover:border-brand-gold hover:bg-brand-gold group-hover:opacity-100 focus-visible:opacity-100 sm:right-5 sm:opacity-100"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          {/* Dots, progress and the pause/play control share one bar */}
          <div className="absolute inset-x-0 bottom-5 z-20 flex items-center justify-center gap-4">
            <div className="flex items-center gap-2 rounded-full border border-white/15 bg-black/30 px-3 py-2 backdrop-blur-md">
              {banners.map((item, index) => (
                <button
                  key={item?._id || index}
                  type="button"
                  onClick={() => goTo(index)}
                  aria-label={`Go to banner ${index + 1}`}
                  aria-current={index === current}
                  className={`relative h-1.5 overflow-hidden rounded-full transition-all duration-500 ${
                    index === current ? "w-9 bg-white/25" : "w-1.5 bg-white/45 hover:bg-white/80"
                  }`}
                >
                  {index === current && (
                    <span
                      className="absolute inset-y-0 left-0 rounded-full bg-brand-gold"
                      style={{ width: `${Math.min(progress, 1) * 100}%` }}
                    />
                  )}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setPaused((value) => !value)}
                aria-label={paused ? "Play slideshow" : "Pause slideshow"}
                className="ml-1 flex h-6 w-6 items-center justify-center rounded-full text-white/80 transition-colors hover:text-brand-gold"
              >
                {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          {/* Whole-slide autoplay rail */}
          {!reducedMotion && (
            <div className="absolute inset-x-0 bottom-0 z-20 h-[3px] bg-white/10">
              <div
                className="h-full bg-gradient-to-r from-brand-gold/80 to-brand-gold"
                style={{ width: `${Math.min(progress, 1) * 100}%` }}
              />
            </div>
          )}

          <span className="sr-only" aria-live="polite">
            Slide {current + 1} of {total}
          </span>
        </>
      )}
    </div>
  );
}
