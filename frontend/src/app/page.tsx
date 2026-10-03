"use client";
// Render on demand - skip static generation so a sleeping backend cannot crash the build.
export const dynamic = "force-dynamic";

import HeroBanner from "@/components/home/hero-banner";
import CategoryGrid from "@/components/home/category-grid";
import CategoryShowcase from "@/components/home/category-showcase";
import CustomerReviews from "@/components/home/customer-reviews";
import ShortsSection from "@/components/home/shorts-section";
import SectionHeader from "@/components/home/section-header";
import ProductCard from "@/components/product/product-card";
import { Reveal, Stagger, StaggerItem } from "@/components/common/reveal";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Product } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, ShieldCheck, Truck, RefreshCw, Award } from "lucide-react";
import Link from "next/link";

const PERKS = [
  {
    icon: ShieldCheck,
    title: "100% Authentic",
    subtitle: "Handcrafted luxury footwear",
  },
  {
    icon: Truck,
    title: "Swift Delivery",
    subtitle: "Carefully boxed with tracking",
  },
  {
    icon: RefreshCw,
    title: "Easy Exchange",
    subtitle: "Hassle-free 7-day size swap",
  },
  {
    icon: Award,
    title: "Bespoke Finishing",
    subtitle: "Precision stitch & padded comfort",
  },
];

export default function HomePage() {
  const { data: banners, isLoading: bannersLoading } = useQuery({
    queryKey: ["banners"],
    queryFn: () =>
      api.get("/banners/active").then((res) => res.data.data.banners ?? []),
  });

  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ["home-categories"],
    queryFn: () =>
      api
        .get("/categories/home")
        .then((res) => res.data.data.categories ?? []),
  });

  // Category-wise sections below "Shop by Category" — only admin-selected categories
  const { data: showcaseCategories, isLoading: showcaseLoading } = useQuery({
    queryKey: ["home-showcase"],
    queryFn: () =>
      api
        .get("/categories?isActive=true&showOnHome=true&sort=sortOrder&limit=50")
        .then((res) => res.data.data.data ?? []),
  });

  const { data: newArrivals, isLoading: newLoading } = useQuery({
    queryKey: ["new-arrivals"],
    queryFn: () =>
      api
        .get("/products/new-arrivals?limit=8")
        // The new-arrivals endpoint returns the list as `data` (other product
        // endpoints use `products`) — accept both so the section never breaks.
        .then((res) => res.data.data.data ?? res.data.data.products ?? []),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="flex flex-col">
      <section>
        <HeroBanner banners={banners || []} loading={bannersLoading} />
      </section>

      {/* Trust & Craft Perks Strip — desktop only (hidden on mobile per design review) */}
      <section className="hidden border-b bg-background/60 py-6 backdrop-blur-sm md:block">
        <div className="container">
          <Stagger className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6" stagger={0.08}>
            {PERKS.map((perk) => {
              const Icon = perk.icon;
              return (
                <StaggerItem
                  key={perk.title}
                  className="flex items-center gap-3.5 rounded-2xl border border-border/50 bg-card/60 p-3.5 shadow-sm transition-all duration-300 hover:border-brand-gold/40 hover:shadow-gold"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-gold/10 text-brand-gold">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold tracking-tight text-foreground truncate">
                      {perk.title}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {perk.subtitle}
                    </p>
                  </div>
                </StaggerItem>
              );
            })}
          </Stagger>
        </div>
      </section>

      <section className="container pt-12 pb-4">
        <Reveal>
          <SectionHeader badge="Collections">
            Shop by Category
          </SectionHeader>
        </Reveal>
        {categoriesLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 md:gap-6">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-xl" />
            ))}
          </div>
        ) : (
          <Reveal delay={0.1}>
            <CategoryGrid categories={categories || []} />
          </Reveal>
        )}
      </section>

      {!showcaseLoading && showcaseCategories && showcaseCategories.length > 0 && (
        <section className="pt-2 pb-12">
          <Reveal direction="up" distance={34}>
            <CategoryShowcase categories={showcaseCategories} />
          </Reveal>
        </section>
      )}

      <section className="bg-muted py-14">
        <div className="container">
          <Reveal>
            <SectionHeader
              badge="Just Dropped"
              subtitle="Fresh drops from your favorite brands — check out the latest styles"
            >
              New Arrivals
            </SectionHeader>
          </Reveal>
          {newLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 md:gap-6">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-96 rounded-xl" />
              ))}
            </div>
          ) : !newArrivals || newArrivals.length === 0 ? (
            <div className="text-center py-12">
              <Sparkles className="h-12 w-12 text-brand-gold/40 mx-auto mb-4" />
              <h3 className="text-lg font-semibold">No New Arrivals yet</h3>
              <p className="text-muted-foreground mb-4">
                Check back soon — fresh styles are on the way!
              </p>
              <Button asChild className="bg-brand-gold hover:bg-brand-gold-dark text-white font-semibold">
                <Link href="/product-category">Explore All Products</Link>
              </Button>
            </div>
          ) : (
            <>
              <Stagger className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 md:gap-6" stagger={0.06}>
                {(newArrivals || []).map((product: Product) => (
                  <StaggerItem key={product._id}>
                    <ProductCard product={product} />
                  </StaggerItem>
                ))}
              </Stagger>

              {/* View All Button */}
              <Reveal delay={0.2} className="text-center mt-10">
                <Button
                  asChild
                  size="lg"
                  className="bg-brand-gold hover:bg-brand-gold-dark text-white font-semibold px-8 h-12 rounded-full shadow-gold hover:shadow-gold-lg transition-all"
                >
                  <Link href="/product-category" className="group flex items-center gap-2">
                    View All New Arrivals
                    {newArrivals.length > 0 && (
                      <span className="text-xs bg-white/20 rounded-full px-2 py-0.5">
                        {newArrivals.length}+
                      </span>
                    )}
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </Link>
                </Button>
              </Reveal>
            </>
          )}
        </div>
      </section>

      {/* Customer Reviews */}
      <CustomerReviews />

      {/* Shorts (auto-play videos) */}
      <ShortsSection />
    </div>
  );
}
