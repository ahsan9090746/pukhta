"use client";

import { motion } from "framer-motion";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Category, Product } from "@/types";
import { getImageUrl } from "@/lib/utils";
import ProductCard from "@/components/product/product-card";
import Breadcrumb from "@/components/common/breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

export default function CategoryPage() {
  const params = useParams();

  const { data: category, isLoading: categoryLoading } = useQuery({
    queryKey: ["category", params.slug],
    queryFn: () =>
      api.get(`/categories/${params.slug}`).then((res) => res.data.data.category),
  });

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ["category-products", params.slug],
    queryFn: () =>
      api
        .get(`/products?category=${category?._id}&limit=50`)
        .then((res) => res.data.data.data ?? []),
    enabled: !!category?._id,
  });

  if (categoryLoading) {
    return (
      <div className="container py-8">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-4 w-64 mb-8" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-96 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="container py-16 text-center">
        <h1 className="text-2xl font-bold">Category not found</h1>
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
        items={[
          { label: "Home", href: "/" },
          { label: "Categories", href: "/categories" },
          { label: category.name },
        ]}
      />

      <div className="mt-8 mb-12">
        <h1 className="text-3xl font-bold">{category.name}</h1>
        {category.description && (
          <p className="text-muted-foreground mt-2">{category.description}</p>
        )}
      </div>

      {category.subcategories?.length > 0 && (
        <div className="mb-12">
          <h2 className="text-xl font-semibold mb-4">Subcategories</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {category.subcategories.map((sub: Category) => (
              <Link
                key={sub._id}
                href={`/categories/${sub.slug}`}
                className="group p-4 rounded-xl border hover:shadow-premium transition-all"
              >
                <div className="aspect-square rounded-lg bg-muted mb-3 overflow-hidden">
                  {sub.image && (
                    <img
                      src={getImageUrl(sub.image)}
                      alt={sub.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  )}
                </div>
                <h3 className="font-medium">{sub.name}</h3>
              </Link>
            ))}
          </div>
        </div>
      )}

      {productsLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-96 rounded-xl" />
          ))}
        </div>
      ) : products?.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground">
            No products found in this category
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {products?.map((product: Product) => (
            <motion.div
              key={product._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <ProductCard product={product} />
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
