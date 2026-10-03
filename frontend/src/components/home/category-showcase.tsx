"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { getImageUrl } from "@/lib/utils";
import { isRichText, sanitizeRichText } from "@/lib/rich-text";
import { Category, Product } from "@/types";
import ProductCard from "@/components/product/product-card";

interface CategoryShowcaseProps {
  categories: Category[];
}

const AUTOPLAY_MS = 5000;
const MAX_SECTIONS = 6;

function CategoryCarousel({ category }: { category: Category }) {
  const [index, setIndex] = useState(0);
  const [perView, setPerView] = useState(4);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const { data: products, isLoading } = useQuery({
    queryKey: ["category-products", category._id],
    queryFn: () =>
      api
        .get(`/products?categories=${category._id}&isActive=true&limit=12`)
        .then((res) => res.data.data.data ?? []),
  });

  useEffect(() => {
    const compute = () => {
      const w = window.innerWidth;
      // Phones & tablets show a swipeable pair; laptops 3; wide desktops 4.
      if (w < 1024) setPerView(2);
      else if (w < 1280) setPerView(3);
      else setPerView(4);
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, []);

  const items: Product[] = Array.isArray(products) ? products : [];
  const maxIndex = Math.max(0, items.length - perView);

  useEffect(() => {
    setIndex((i) => Math.min(i, maxIndex));
  }, [maxIndex]);

  const next = useCallback(() => {
    setIndex((i) => (i >= maxIndex ? 0 : i + 1));
  }, [maxIndex]);

  const prev = useCallback(() => {
    setIndex((i) => (i <= 0 ? maxIndex : i - 1));
  }, [maxIndex]);

  useEffect(() => {
    if (paused || maxIndex === 0) return;
    const timer = setInterval(next, AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [paused, maxIndex, next]);

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

  const hasHeaderMedia = Boolean(category.image || category.description);

  if (isLoading) {
    return (
      <div className="-mx-8 rounded-none bg-brand-cream px-8 py-3 ring-0 dark:bg-brand-dark md:mx-0 md:rounded-3xl md:px-8 md:py-4 md:ring-1 md:ring-brand-gold/25 md:dark:ring-white/10">
        <div className="flex items-center gap-4 mb-4 animate-pulse">
          <div className="hidden md:flex h-20 w-72 rounded-2xl bg-brand-black/5 dark:bg-white/5" />
          <div className="flex-1 flex flex-col items-center gap-2">
            <div className="h-3 w-24 rounded bg-brand-black/10 dark:bg-white/10" />
            <div className="h-8 w-48 rounded bg-brand-black/10 dark:bg-white/10" />
          </div>
          <div className="hidden md:block h-4 w-20 rounded bg-brand-black/10 dark:bg-white/10" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-80 rounded-xl bg-brand-black/5 dark:bg-white/5 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!items.length) return null;

  const step = 100 / perView;

  return (
    <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="relative -mx-8 overflow-hidden rounded-none bg-brand-cream ring-0 shadow-none dark:bg-brand-dark md:mx-0 md:rounded-3xl md:ring-1 md:ring-brand-gold/25 md:shadow-premium-lg md:dark:ring-white/10"
    >
      {/* Decorative gold top edge */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-px bg-gradient-to-r from-transparent via-brand-gold/60 to-transparent" />

      {/* ── Category header: image + description | title | view all ── */}
      <div className="relative grid items-center gap-x-4 gap-y-2 px-8 pt-3 pb-1.5 md:grid-cols-[1fr_auto_1fr] md:px-8">
        {/* Left — category image with description */}
        {hasHeaderMedia ? (
          <div className="hidden md:flex items-center gap-4 bg-white ring-1 ring-brand-gold/20 shadow-premium rounded-2xl p-3 max-w-md dark:bg-white/[0.04] dark:ring-white/10 dark:shadow-none">
            {category.image && (
              <Link
                href={`/product-category/${category.slug}`}
                className="relative h-[76px] w-32 shrink-0 rounded-xl overflow-hidden ring-1 ring-brand-gold/30 dark:ring-white/15"
                title={category.name}
              >
                <Image
                  src={getImageUrl(category.image)}
                  alt={category.name}
                  fill
                  sizes="128px"
                  className="object-cover"
                />
              </Link>
            )}
            {category.description &&
              (isRichText(category.description) ? (
                <div
                  className="text-[13px] leading-relaxed text-neutral-600 dark:text-white/70 line-clamp-3 pr-2 [&_a]:underline [&_p]:my-0 [&_strong]:font-semibold"
                  dangerouslySetInnerHTML={{ __html: sanitizeRichText(category.description) }}
                />
              ) : (
                <p className="text-[13px] leading-relaxed text-neutral-600 dark:text-white/70 line-clamp-3 pr-2">
                  {category.description}
                </p>
              ))}
          </div>
        ) : (
          <div className="hidden md:block" />
        )}

        {/* Center — product count + category name */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="text-center"
        >
          <Link
            href={`/product-category/${category.slug}`}
            className="group inline-flex flex-col items-center gap-1.5"
          >
            <span className="text-[11px] font-semibold uppercase tracking-[0.35em] text-brand-gold">
              {items.length} {items.length === 1 ? "Product" : "Products"}
            </span>
            <span className="font-serif text-3xl md:text-4xl font-bold tracking-tight text-brand-black dark:text-white transition-colors duration-300 group-hover:text-brand-gold-dark dark:group-hover:text-brand-gold-light">
              {category.name}
            </span>
            <span className="mt-1 h-px w-20 bg-gradient-to-r from-transparent via-brand-gold to-transparent transition-all duration-500 group-hover:w-32" />
          </Link>
        </motion.div>

        {/* Right — view all */}
        <div className="flex md:justify-end justify-center md:pr-1">
          <Link
            href={`/product-category/${category.slug}`}
            className="group inline-flex items-center gap-1.5 text-sm text-neutral-600 dark:text-white/70 hover:text-brand-gold-dark dark:hover:text-brand-gold transition-colors duration-300"
          >
            View All
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1.5" />
          </Link>
        </div>
      </div>

      {/* ── Products carousel ── */}
      <div
        className="relative px-[26px] pb-2 md:px-8"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* Arrows */}
        <button
          onClick={prev}
          aria-label="Previous products"
          className="absolute left-1.5 md:left-2.5 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-white border border-brand-gold/30 shadow-premium hidden items-center justify-center md:flex text-brand-black/70 hover:bg-brand-gold hover:border-brand-gold hover:text-white hover:shadow-gold transition-all disabled:opacity-30 disabled:cursor-not-allowed dark:bg-white/10 dark:border-white/15 dark:shadow-none dark:text-white/80 dark:hover:text-white"
          disabled={index === 0}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          onClick={next}
          aria-label="Next products"
          className="absolute right-1.5 md:right-2.5 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-white border border-brand-gold/30 shadow-premium hidden items-center justify-center md:flex text-brand-black/70 hover:bg-brand-gold hover:border-brand-gold hover:text-white hover:shadow-gold transition-all disabled:opacity-30 disabled:cursor-not-allowed dark:bg-white/10 dark:border-white/15 dark:shadow-none dark:text-white/80 dark:hover:text-white"
          disabled={index >= maxIndex}
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        {/* Sliding track */}
        <div className="overflow-hidden py-1">
          <motion.div
            className="flex"
            animate={{ x: `-${index * step}%` }}
            transition={{ type: "tween", duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            {items.map((product, i) => (
              <motion.div
                key={product._id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ delay: (i % perView) * 0.05, duration: 0.4 }}
                className="shrink-0 px-1.5 md:px-2"
                style={{ width: `${step}%` }}
              >
                <ProductCard product={product} />
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Dots */}
        {maxIndex > 0 && (
          <div className="mt-2.5 flex items-center justify-center gap-2">
            {Array.from({ length: maxIndex + 1 }).map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === index
                    ? "w-6 bg-brand-gold"
                    : "w-2 bg-brand-black/20 hover:bg-brand-black/40 dark:bg-white/25 dark:hover:bg-white/50"
                }`}
              />
            ))}
          </div>
        )}
      </div>
      </motion.div>
    );
}

export default function CategoryShowcase({ categories }: CategoryShowcaseProps) {
  const items = Array.isArray(categories) ? categories.slice(0, MAX_SECTIONS) : [];
  if (!items.length) return null;

  return (
    <div className="space-y-3 md:space-y-4">
      {items.map((category) => (
        <motion.section
          key={category._id}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="container"
        >
          <CategoryCarousel category={category} />
        </motion.section>
      ))}
    </div>
  );
}