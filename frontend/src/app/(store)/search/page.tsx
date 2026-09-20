"use client";

import { Suspense, useState } from "react";
import { motion } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Product } from "@/types";
import ProductCard from "@/components/product/product-card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import Breadcrumb from "@/components/common/breadcrumb";
import { Search } from "lucide-react";

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="container py-8 text-center">Loading...</div>}>
      <SearchContent />
    </Suspense>
  );
}

function SearchContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQuery);

  const { data: results, isLoading } = useQuery({
    queryKey: ["search", query],
    queryFn: () =>
      api.get(`/products?search=${query}&limit=50`).then((res) => res.data.data),
    enabled: query.length >= 2,
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="container py-8"
    >
      <Breadcrumb
        items={[{ label: "Home", href: "/" }, { label: "Search" }]}
      />

      <div className="max-w-2xl mx-auto mt-8 mb-12">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search for products..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-12 h-14 text-lg"
            autoFocus
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-96 rounded-xl" />
          ))}
        </div>
      ) : query.length < 2 ? (
        <div className="text-center py-16">
          <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold">Start typing to search</h3>
          <p className="text-muted-foreground">
            Search for sneakers, boots, sandals, and more
          </p>
        </div>
      ) : results?.data?.length === 0 ? (
        <div className="text-center py-16">
          <h3 className="text-lg font-semibold">No results found</h3>
          <p className="text-muted-foreground">
            Try different keywords or check your spelling
          </p>
        </div>
      ) : (
        <>
          <p className="text-muted-foreground mb-6">
            {results?.pagination?.total || 0} results for &quot;{query}&quot;
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {results?.data?.map((product: Product) => (
              <motion.div
                key={product._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <ProductCard product={product} />
              </motion.div>
            ))}
          </div>
        </>
      )}
    </motion.div>
  );
}
