"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
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
        .get(`/products?category=${category._id}&isActive=true&limit=12`)
        .then((res) => res.data.data.data ?? []),
  });

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

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-80 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (!items.length) return null;

  const step = 100 / perView;

  return (
    <>
      {/* Clickable category heading — navigates to the category's products */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-center mb-10"
      >
        <Link
          href={`/categories/${category.slug}`}
          className="group inline-flex flex-col items-center gap-1"
        >
          <span className="text-[11px] uppercase tracking-[0.35em] text-gold-dark dark:text-gold">
            {items.length} {items.length === 1 ? "Product" : "Products"}
          </span>
          <span className="relative text-3xl font-bold pb-2">
            {category.name}
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-24 bg-gradient-to-r from-transparent via-gold to-transparent transition-all duration-500 group-hover:w-44" />
          </span>
          <span className="mt-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground group-hover:text-gold-dark transition-colors duration-300">
            View all products
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1.5" />
          </span>
        </Link>
      </motion.div>

      <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Arrows */}
      <button
        onClick={prev}
        aria-label="Previous products"
        className="absolute -left-3 md:-left-5 top-1/3 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-background/95 border shadow-md flex items-center justify-center text-foreground/70 hover:text-gold-dark hover:border-gold hover:shadow-gold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        disabled={index === 0}
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        onClick={next}
        aria-label="Next products"
        className="absolute -right-3 md:-right-5 top-1/3 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-background/95 border shadow-md flex items-center justify-center text-foreground/70 hover:text-gold-dark hover:border-gold hover:shadow-gold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
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
          {items.map((product) => (
            <div
              key={product._id}
              className="shrink-0 px-2.5"
              style={{ width: `${step}%` }}
            >
              <div className="h-full rounded-xl border bg-card p-3 hover:shadow-gold hover:border-gold/40 transition-all duration-300">
                <ProductCard product={product} />
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Dots */}
      {maxIndex > 0 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          {Array.from({ length: maxIndex + 1 }).map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === index
                  ? "w-7 bg-foreground"
                  : "w-2 bg-foreground/20 hover:bg-foreground/40"
              }`}
            />
          ))}
        </div>
      )}
    </div>
    </>
  );
}

export default function CategoryShowcase({ categories }: CategoryShowcaseProps) {
  const items = Array.isArray(categories) ? categories.slice(0, MAX_SECTIONS) : [];
  if (!items.length) return null;

  return (
    <div className="space-y-20">
      {items.map((category) => (
        <section key={category._id} className="container">
          <CategoryCarousel category={category} />
        </section>
      ))}
    </div>
  );
}