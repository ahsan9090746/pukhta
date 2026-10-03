"use client";
// Render on demand - skip static generation so a sleeping backend cannot crash the build.
export const dynamic = "force-dynamic";

import { Suspense } from "react";
import ProductCategoryContent from "@/components/product-category-content";

/**
 * `/shop` — same listing as `/product-category` (all products) but under its own
 * URL with the "Shop" label. Clicking any category still goes to the original
 * `/product-category/<slug>` routes.
 */
export default function ShopPage() {
  return (
    <Suspense
      fallback={<div className="container py-8 text-center">Loading...</div>}
    >
      <ProductCategoryContent allProductsLabel="Shop" />
    </Suspense>
  );
}
