"use client";

import { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import api from "@/lib/api";

function ShortCard({
  short,
  onOpen,
}: {
  short: ShortItem;
  onOpen: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [shouldPlay, setShouldPlay] = useState(false);

  // Auto-play only when visible in viewport
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      ([entry]) => setShouldPlay(entry.isIntersecting),
      { threshold: 0.2 }
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (shouldPlay) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [shouldPlay]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;
  }, []);

  return (
    <div
      className="relative aspect-[9/16] w-[44vw] sm:w-[200px] lg:w-[210px] shrink-0 rounded-2xl overflow-hidden bg-foreground shadow-lg hover:shadow-gold-lg transition-all duration-300 cursor-pointer group hover:-translate-y-1.5"
      onClick={onOpen}
    >
      <video
        ref={videoRef}
        src={short.video}
        muted
        loop
        playsInline
        preload="metadata"
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
      />

      {/* Bottom gradient + target label */}
      {(short.product || short.category) && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-8">
          <p className="text-white text-xs font-medium truncate">
            {short.product?.name || short.category?.name}
          </p>
        </div>
      )}
    </div>
  );
}

interface ShortItem {
  _id: string;
  video: string;
  category?: { _id: string; name: string; slug: string } | null;
  product?: { _id: string; name: string; slug: string } | null;
  sortOrder: number;
}

/** Minimum shorts required for the homepage section to appear */
export const REQUIRED_SHORTS = 5;

export default function ShortsSection() {
  const router = useRouter();

  const { data: shorts, isLoading } = useQuery({
    queryKey: ["shorts"],
    queryFn: () => api.get("/shorts").then((res) => res.data.data.shorts ?? []),
  });

  const getTargetUrl = (short: ShortItem) => {
    if (short.product?.slug) return `/product/${short.product.slug}`;
    if (short.category?.slug) return `/product-category/${short.category.slug}`;
    return "/product-category";
  };

  // Mobile finger-swipe support: pause auto marquee while touching + let the
  // viewport scroll natively (desktop stays overflow-hidden, untouched).
  const viewportRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const suppressClick = useRef(false);

  const setTrackPaused = (paused: boolean) => {
    const track = viewportRef.current?.querySelector(
      ".shorts-marquee-track"
    ) as HTMLElement | null;
    if (track) track.style.animationPlayState = paused ? "paused" : "running";
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? 0;
    suppressClick.current = false;
    setTrackPaused(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const x = e.touches[0]?.clientX ?? 0;
    if (Math.abs(x - touchStartX.current) > 10) {
      suppressClick.current = true;
    }
  };

  const handleTouchEnd = () => {
    setTrackPaused(false);
    // Keep suppressing the tap-click that follows a swipe, then release it
    if (suppressClick.current) {
      window.setTimeout(() => {
        suppressClick.current = false;
      }, 200);
    }
  };

  // Show skeletons while loading, hide only when fewer than minimum
  if (!isLoading && (!shorts || shorts.length < REQUIRED_SHORTS)) return null;

  // Duplicate list for a seamless infinite marquee loop (same as reviews)
  const loopShorts: ShortItem[] = shorts ? [...shorts, ...shorts] : [];

  return (
    <section className="bg-background py-14 overflow-hidden">
      <div className="container">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-10"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="h-px w-8 bg-gradient-to-r from-transparent to-brand-gold/60" />
            <span className="text-[11px] uppercase tracking-[0.3em] font-semibold text-brand-gold">
              Shorts
            </span>
            <span className="h-px w-8 bg-gradient-to-l from-transparent to-brand-gold/60" />
          </div>

          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-brand-gold">
            Watch Our Story
          </h2>

          <div className="mt-4 h-0.5 w-12 bg-brand-gold/40 rounded-full mx-auto" />
        </motion.div>
      </div>

      {/* Marquee — same animation style as customer reviews */}
      {isLoading ? (
        <div className="container">
          <div className="flex gap-3 sm:gap-4 overflow-hidden">
            {[...Array(5)].map((_, i) => (
              <Skeleton
                key={i}
                className="aspect-[9/16] w-[44vw] sm:w-[200px] lg:w-[210px] shrink-0 rounded-2xl"
              />
            ))}
          </div>
        </div>
      ) : (
        <div
          className="group relative"
          onMouseEnter={(e) => {
            // Touch devices fire emulated mouse events after every tap —
            // ignore them so the loop never gets stuck paused on mobile.
            // (Desktop hover-pause stays exactly as before.)
            if (window.matchMedia?.("(hover: none)").matches) return;
            const track = e.currentTarget.querySelector(
              ".shorts-marquee-track"
            ) as HTMLElement;
            if (track) track.style.animationPlayState = "paused";
          }}
          onMouseLeave={(e) => {
            if (window.matchMedia?.("(hover: none)").matches) return;
            const track = e.currentTarget.querySelector(
              ".shorts-marquee-track"
            ) as HTMLElement;
            if (track) track.style.animationPlayState = "running";
          }}
        >
          {/* Fade edges */}
          <div className="absolute left-0 top-0 bottom-0 w-8 sm:w-16 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-8 sm:w-16 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

          {/* Mobile: native finger swipe (overflow-x-auto). Desktop: locked marquee. */}
          <div
            ref={viewportRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
            className="overflow-x-auto px-4 sm:overflow-hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            <div
              className="shorts-marquee-track flex w-max gap-3 pr-3 sm:gap-4 sm:pr-4 will-change-transform"
              onClickCapture={(e) => {
                if (suppressClick.current) {
                  e.stopPropagation();
                  e.preventDefault();
                }
              }}
            >
              {loopShorts.map((short: ShortItem, index: number) => (
                <ShortCard
                  key={`${short._id}-${index}`}
                  short={short}
                  onOpen={() => router.push(getTargetUrl(short))}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .shorts-marquee-track {
          animation: shorts-marquee 40s linear infinite;
        }
        @keyframes shorts-marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </section>
  );
}
