"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  Share2,
  ZoomIn,
} from "lucide-react";
import { toast } from "sonner";
import { getImageUrl, cn } from "@/lib/utils";

interface ProductGalleryProps {
  images: string[];
  /** Used for the share sheet and as image alt text. */
  productName?: string;
  /** Shows a "SALE -x%" badge on the main image when greater than 0. */
  discountPercent?: number;
  isNew?: boolean;
  isOutOfStock?: boolean;
  /** Pass both props to render the wishlist button over the image. */
  isWishlisted?: boolean;
  onWishlistToggle?: () => void;
}

export default function ProductGallery({
  images,
  productName = "Product image",
  discountPercent = 0,
  isNew = false,
  isOutOfStock = false,
  isWishlisted = false,
  onWishlistToggle,
}: ProductGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 50, y: 50 });

  const list = images.length ? images : [""];
  const safeIndex = Math.min(selectedIndex, list.length - 1);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMousePosition({ x, y });
  };

  const prev = () => setSelectedIndex((i) => (i <= 0 ? list.length - 1 : i - 1));
  const next = () => setSelectedIndex((i) => (i >= list.length - 1 ? 0 : i + 1));

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      prev();
    }
    if (e.key === "ArrowRight") {
      e.preventDefault();
      next();
    }
  };

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: productName, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success("Product link copied");
    } catch {
      // Sharing was cancelled — nothing to do.
    }
  };

  return (
    <div className="flex flex-col-reverse gap-3 md:flex-row md:gap-4">
      {/* Thumbnails — horizontal strip on mobile, vertical column on desktop */}
      <div className="flex shrink-0 gap-2 overflow-x-auto pb-1 md:w-20 md:flex-col md:overflow-visible md:pb-0">
        {list.map((image, index) => (
          <button
            key={index}
            type="button"
            onClick={() => setSelectedIndex(index)}
            aria-label={`View image ${index + 1}`}
            className={cn(
              "relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 bg-muted transition-all",
              safeIndex === index
                ? "border-brand-gold shadow-gold"
                : "border-transparent hover:border-muted-foreground/40"
            )}
          >
            <Image
              src={getImageUrl(image)}
              alt={`${productName} thumbnail ${index + 1}`}
              fill
              sizes="64px"
              className="object-cover"
            />
          </button>
        ))}
      </div>

      {/* Main image */}
      <div className="group relative min-w-0 flex-1">
        <div
          tabIndex={0}
          onKeyDown={handleKeyDown}
          onMouseMove={handleMouseMove}
          onMouseEnter={() => setIsZoomed(true)}
          onMouseLeave={() => setIsZoomed(false)}
          aria-label={`${productName} gallery`}
          className={cn(
            "relative aspect-square overflow-hidden rounded-2xl bg-muted outline-none ring-brand-gold/40 focus-visible:ring-2",
            !isOutOfStock && "cursor-crosshair"
          )}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={safeIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative h-full w-full"
            >
              <Image
                src={getImageUrl(list[safeIndex] || "")}
                alt={productName}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 45vw"
                className="object-cover transition-transform duration-200"
                style={
                  isZoomed && !isOutOfStock
                    ? {
                        transform: "scale(2)",
                        transformOrigin: `${mousePosition.x}% ${mousePosition.y}%`,
                      }
                    : {}
                }
              />
            </motion.div>
          </AnimatePresence>

          {/* Badges */}
          <div className="absolute left-4 top-4 flex flex-col items-start gap-2">
            {discountPercent > 0 && (
              <span className="rounded-full bg-red-600 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white shadow-sm">
                Sale -{discountPercent}%
              </span>
            )}
            {isNew && (
              <span className="rounded-full bg-brand-black px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-brand-gold shadow-sm">
                New
              </span>
            )}
            {isOutOfStock && (
              <span className="rounded-full bg-foreground/85 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-background shadow-sm">
                Out of stock
              </span>
            )}
          </div>

          {/* Image counter + zoom hint */}
          <div className="pointer-events-none absolute bottom-4 left-4 flex items-center gap-2">
            <span className="rounded-full bg-background/85 px-2.5 py-1 text-[11px] font-semibold text-foreground shadow-sm backdrop-blur">
              {safeIndex + 1} / {list.length}
            </span>
            <span className="hidden items-center gap-1 rounded-full bg-background/85 px-2.5 py-1 text-[11px] font-medium text-muted-foreground shadow-sm backdrop-blur sm:inline-flex">
              <ZoomIn className="h-3 w-3" /> Hover to zoom
            </span>
          </div>

          {/* Wishlist + share */}
          {(onWishlistToggle || isWishlisted) && (
            <div className="absolute bottom-4 right-4 flex items-center gap-2">
              {onWishlistToggle && (
                <button
                  type="button"
                  onClick={onWishlistToggle}
                  aria-label="Toggle wishlist"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-background/90 text-muted-foreground shadow-sm backdrop-blur transition-colors hover:text-brand-gold"
                >
                  <Heart
                    className={cn(
                      "h-4 w-4",
                      isWishlisted && "fill-brand-gold text-brand-gold"
                    )}
                  />
                </button>
              )}
              <button
                type="button"
                onClick={handleShare}
                aria-label="Share this product"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-background/90 text-muted-foreground shadow-sm backdrop-blur transition-colors hover:text-brand-gold"
              >
                <Share2 className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Desktop arrows */}
          {list.length > 1 && (
            <>
              <button
                type="button"
                onClick={prev}
                aria-label="Previous image"
                className="absolute left-3 top-1/2 hidden -translate-y-1/2 items-center justify-center rounded-full bg-background/90 p-2 text-muted-foreground opacity-0 shadow-sm backdrop-blur transition-all hover:text-brand-gold group-hover:opacity-100 md:flex"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={next}
                aria-label="Next image"
                className="absolute right-3 top-1/2 hidden -translate-y-1/2 items-center justify-center rounded-full bg-background/90 p-2 text-muted-foreground opacity-0 shadow-sm backdrop-blur transition-all hover:text-brand-gold group-hover:opacity-100 md:flex"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </>
          )}
        </div>


        {/* Mobile prev / next */}
        {list.length > 1 && (
          <div className="mt-3 flex items-center justify-center gap-2 md:hidden">
            <button
              type="button"
              onClick={prev}
              aria-label="Previous image"
              className="flex h-8 w-9 items-center justify-center rounded-md border bg-background text-muted-foreground transition-colors hover:border-brand-gold hover:text-brand-gold"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Next image"
              className="flex h-8 w-9 items-center justify-center rounded-md border bg-background text-muted-foreground transition-colors hover:border-brand-gold hover:text-brand-gold"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

