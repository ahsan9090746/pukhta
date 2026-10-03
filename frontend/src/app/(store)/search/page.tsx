"use client";
// Render on demand - skip static generation so a sleeping backend cannot crash the build.
export const dynamic = "force-dynamic";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Legacy `/search?q=` route.
 *
 * Search results now render inside the normal listing page
 * (`/product-category` or `/shop`), so shoppers never leave the catalogue and
 * keep the same filters, sorting and view modes. This route only exists so old
 * links and bookmarks keep working — it forwards the query to that page.
 */
export default function SearchRedirectPage() {
  return (
    <Suspense fallback={<SearchRedirectSkeleton />}>
      <SearchRedirect />
    </Suspense>
  );
}

function SearchRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const query = (searchParams.get("q") || searchParams.get("search") || "").trim();
    router.replace(
      query
        ? `/product-category?search=${encodeURIComponent(query)}`
        : "/product-category"
    );
  }, [router, searchParams]);

  return <SearchRedirectSkeleton />;
}

function SearchRedirectSkeleton() {
  return (
    <div className="container py-16">
      <Skeleton className="mx-auto h-10 w-64" />
      <div className="mt-8 grid grid-cols-2 gap-6 md:grid-cols-4">
        {[...Array(8)].map((_, index) => (
          <Skeleton key={index} className="h-96 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
