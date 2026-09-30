"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import ProductCard from "@/components/product/product-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Product } from "@/types";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import SectionHeader from "@/components/home/section-header";

interface FeaturedProductsProps {
  products: Product[];
  loading: boolean;
}

export default function FeaturedProducts({ products, loading }: FeaturedProductsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = direction === "left" ? -300 : 300;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  if (loading) {
    return (
      <section className="container py-16">
        <div className="flex items-center justify-between mb-10">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <div className="flex gap-6 overflow-hidden">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="min-w-[280px] h-96 rounded-xl" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="container py-16">
      <div className="flex items-center justify-between mb-10">
        <SectionHeader
          badge="Editor's Pick"
          align="left"
        >
          Featured Products
        </SectionHeader>
        <div className="flex gap-2 shrink-0 ml-4">
          <Button variant="outline" size="icon" onClick={() => scroll("left")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => scroll("right")}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide"
        style={{ scrollbarWidth: "none" }}
      >
        {products.map((product) => (
          <div key={product._id} className="min-w-[280px] snap-start">
            <ProductCard product={product} />
          </div>
        ))}
      </div>

      <div className="text-center mt-8">
        <Button asChild variant="outline" size="lg">
          <Link href="/product-category">View All Products</Link>
        </Button>
      </div>
    </section>
  );
}
