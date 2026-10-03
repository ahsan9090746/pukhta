"use client";
// Render on demand - skip static generation so a sleeping backend cannot crash the build.
export const dynamic = "force-dynamic";

import { Suspense } from "react";
import ProductCategoryContent from "@/components/product-category-content";

export default function ProductCategoryPage() {
  return (
    <Suspense
      fallback={
        <div className="container py-8 text-center">Loading...</div>
      }
    >
      <ProductCategoryContent />
    </Suspense>
  );
}
