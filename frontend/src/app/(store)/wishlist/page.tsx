"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import ProductCard from "@/components/product/product-card";
import EmptyState from "@/components/common/empty-state";
import Breadcrumb from "@/components/common/breadcrumb";
import { toast } from "sonner";
import { Heart, ShoppingCart } from "lucide-react";

export default function WishlistPage() {
  const queryClient = useQueryClient();

  const { data: wishlist, isLoading } = useQuery({
    queryKey: ["wishlist"],
    queryFn: () =>
      api.get("/wishlist").then((res) => res.data.data.wishlist?.products ?? []),
  });

  const removeFromWishlistMutation = useMutation({
    mutationFn: (productId: string) => api.delete(`/wishlist/${productId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
      toast.success("Removed from wishlist");
    },
  });

  const moveToCartMutation = useMutation({
    mutationFn: (productId: string) =>
      api.post("/cart/items", { productId, quantity: 1 }),
    onSuccess: (_, productId) => {
      removeFromWishlistMutation.mutate(productId);
      toast.success("Moved to cart");
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
  });

  if (isLoading) {
    return (
      <div className="container py-8">
        <Skeleton className="h-8 w-32 mb-8" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-96 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!wishlist?.length) {
    return (
      <div className="container py-16">
        <EmptyState
          icon={<Heart className="h-12 w-12" />}
          title="Your wishlist is empty"
          description="Save your favorite items to buy them later."
          action={
            <Button asChild>
              <Link href="/products">Discover Products</Link>
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
        items={[{ label: "Home", href: "/" }, { label: "Wishlist" }]}
      />

      <h1 className="text-3xl font-bold mt-8 mb-6">My Wishlist</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {wishlist.map((product: any) => (
          <motion.div
            key={product._id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <ProductCard
              product={product}
              onRemoveFromWishlist={() =>
                removeFromWishlistMutation.mutate(product._id)
              }
            />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
