"use client";

import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/common/empty-state";
import Breadcrumb from "@/components/common/breadcrumb";
import { GitCompareArrows, X, ShoppingCart } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { getImageUrl } from "@/lib/utils";

export default function ComparePage() {
  const { data: compareProducts, isLoading } = useQuery({
    queryKey: ["compare"],
    queryFn: () =>
      api.get("/compare").then((res) => res.data.data.products ?? []),
  });

  if (isLoading) {
    return (
      <div className="container py-8">
        <Skeleton className="h-8 w-48 mb-8" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  if (!compareProducts?.length) {
    return (
      <div className="container py-16">
        <EmptyState
          icon={<GitCompareArrows className="h-12 w-12" />}
          title="No products to compare"
          description="Add products to compare their features side by side."
          action={
            <Button asChild>
              <Link href="/products">Browse Products</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="container py-8"
    >
      <Breadcrumb
        items={[{ label: "Home", href: "/" }, { label: "Compare Products" }]}
      />

      <h1 className="text-3xl font-bold mt-8 mb-6">Compare Products</h1>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="text-left p-4 border-b w-48">Product</th>
              {compareProducts.map((product: any) => (
                <th key={product._id} className="p-4 border-b text-center">
                  <div className="relative">
                    <button className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                      <X className="h-3 w-3" />
                    </button>
                    <div className="relative aspect-square mb-3 overflow-hidden rounded-lg">
                      <Image
                        src={product.images?.[0] ? getImageUrl(product.images[0]) : "/placeholder.png"}
                        alt={product.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <h3 className="font-medium text-sm">{product.name}</h3>
                    <p className="text-primary font-bold mt-1">
                      Rs {product.price.toLocaleString()}
                    </p>
                    <Button size="sm" className="mt-2 w-full" asChild>
                      <Link href={`/products/${product.slug}`}>
                        <ShoppingCart className="h-4 w-4 mr-1" />
                        View
                      </Link>
                    </Button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              { key: "Rating", field: "rating" },
              { key: "Stock", field: "stock" },
              { key: "Available Sizes", field: "sizes" },
              { key: "Available Colors", field: "colors" },
            ].map((row) => (
              <tr key={row.key}>
                <td className="p-4 border-b font-medium text-muted-foreground">
                  {row.key}
                </td>
                {compareProducts.map((product: any) => (
                  <td key={product._id} className="p-4 border-b text-center">
                      {row.field === "category"
                        ? product.category?.name
                      : row.field === "rating"
                      ? `${product.rating || 0} / 5`
                      : row.field === "stock"
                      ? product.stock > 0
                        ? `${product.stock} available`
                        : "Out of stock"
                      : row.field === "sizes"
                      ? product.variants
                          ?.map((v: any) => v.size)
                          .filter((v: any, i: number, a: any[]) => a.indexOf(v) === i)
                          .join(", ") || "N/A"
                      : product.variants
                          ?.map((v: any) => v.color)
                          .filter((v: any, i: number, a: any[]) => a.indexOf(v) === i)
                          .join(", ") || "N/A"}
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <td className="p-4 border-b font-medium text-muted-foreground">
                Description
              </td>
              {compareProducts.map((product: any) => (
                <td
                  key={product._id}
                  className="p-4 border-b text-center text-sm"
                >
                  {product.description?.substring(0, 100)}...
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
