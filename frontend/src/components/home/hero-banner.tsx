"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import Image from "next/image";
import { getImageUrl } from "@/lib/utils";

interface HeroBannerProps {
  banners: any[];
  loading: boolean;
}

export default function HeroBanner({ banners, loading }: HeroBannerProps) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % banners.length);
    }, 5001);
    return () => clearInterval(timer);
  }, [banners.length]);

  if (loading) {
    return <Skeleton className="h-[85vh] min-h-[500px] max-h-[800px] w-full rounded-none" />;
  }

  if (!banners.length) {
    return (
      <div className="relative h-[85vh] min-h-[500px] max-h-[800px] w-full bg-gradient-to-r from-brand-black to-brand-charcoal flex items-center">
        <div className="container text-white">
          <div className="max-w-xl">
            <h1 className="banner-content-fade text-5xl md:text-6xl font-bold mb-4">
              Premium Footwear
            </h1>
            <p className="banner-content-fade banner-delay-1 text-xl text-gray-300 mb-8">
              Discover the latest collection of premium shoes
            </p>
            <div className="banner-content-fade banner-delay-2">
              <Button asChild size="lg" className="bg-white text-black hover:bg-gray-100">
                <Link href="/products">Shop Now</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-[85vh] min-h-[500px] max-h-[800px] w-full overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0"
        >
          {banners[current]?.image && (
            <Image
              src={getImageUrl(banners[current].image)}
              alt={banners[current].title || "Banner"}
              fill
              className="object-cover"
              priority
            />
          )}
          <div className="absolute inset-0 flex items-center">
            <div className="container h-full flex items-center">
              <div className="text-white max-w-2xl [text-shadow:0_2px_12px_rgba(0,0,0,0.55)]">
                <h1 className="banner-content-fade text-4xl md:text-5xl lg:text-6xl font-bold mb-4 [text-shadow:0_2px_16px_rgba(0,0,0,0.6)]">
                  {banners[current]?.title || "Welcome to StepUp"}
                </h1>
                <p className="banner-content-fade banner-delay-1 text-lg md:text-xl text-gray-100 mb-8 [text-shadow:0_1px_10px_rgba(0,0,0,0.6)]">
                  {banners[current]?.subtitle || "Premium footwear for every occasion"}
                </p>
                <div className="banner-content-fade banner-delay-2">
                  <Button asChild size="lg" className="h-12 px-8 text-base font-semibold">
                    <Link href={banners[current]?.link || "/products"}>
                      Shop Now
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {banners.length > 1 && (
        <>
          <button
            onClick={() =>
              setCurrent((prev) => (prev - 1 + banners.length) % banners.length)
            }
            className="absolute left-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => setCurrent((prev) => (prev + 1) % banners.length)}
            className="absolute right-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`h-2 rounded-full transition-all ${
                  i === current ? "w-8 bg-white" : "w-2 bg-white/50"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
