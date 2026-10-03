import { Suspense } from "react";
import ProductCategoryContent from "@/components/product-category-content";
import type { Category } from "@/types";

// Always render on demand — never prerender at build time, so a sleeping
// backend can't crash `next build` ("Collecting page data").
export const dynamic = "force-dynamic";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";

/**
 * Server-side category lookup so the page's first paint already contains the
 * real title, description, eyebrow and breadcrumb (SEO + no title flash).
 * "new-arrival" is a virtual listing, so there is nothing to fetch for it.
 */
async function fetchCategory(slug: string): Promise<Category | null> {
  if (!slug || slug === "new-arrival") return null;
  try {
    const res = await fetch(`${API_URL}/categories/${encodeURIComponent(slug)}`, {
      cache: "no-store",
      // Fail fast if the backend is asleep instead of hanging the request.
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return (json?.data?.category as Category) || null;
  } catch {
    // Backend unreachable — the client-side query fills everything in.
    return null;
  }
}

interface ProductCategorySlugPageProps {
  params: Promise<{ slug: string }>;
}

export default async function ProductCategorySlugPage({
  params,
}: ProductCategorySlugPageProps) {
  const { slug } = await params;
  const category = await fetchCategory(slug);

  return (
    <Suspense
      fallback={
        <div className="container py-8 text-center">Loading...</div>
      }
    >
      <ProductCategoryContent initialSlug={slug} initialCategory={category} />
    </Suspense>
  );
}
