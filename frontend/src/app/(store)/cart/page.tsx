"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import CartItem from "@/components/cart/cart-item";
import CartSummary from "@/components/cart/cart-summary";
import EmptyState from "@/components/common/empty-state";
import Breadcrumb from "@/components/common/breadcrumb";
import { useAuthStore } from "@/stores/auth-store";
import { useCartStore } from "@/stores/cart-store";
import { ShoppingCart, ShieldCheck, ShoppingBag } from "lucide-react";

export default function CartPage() {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();
  const {
    items: localItems,
    updateQuantity: localUpdateQuantity,
    removeItem: localRemoveItem,
  } = useCartStore();

  const { data: cart, isLoading } = useQuery({
    queryKey: ["cart"],
    queryFn: () => api.get("/cart").then((res) => res.data.data.cart),
    enabled: isAuthenticated,
  });

  const updateQuantityMutation = useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) =>
      api.patch(`/cart/items/${itemId}`, { quantity }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
  });

  const removeItemMutation = useMutation({
    mutationFn: (itemId: string) => api.delete(`/cart/items/${itemId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
  });

  const applyCouponMutation = useMutation({
    mutationFn: (code: string) =>
      api.post("/cart/coupon", { code }).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
  });

  // Guests use their local (localStorage) cart; logged-in users use the server cart
  const displayItems: any[] = isAuthenticated ? cart?.items ?? [] : localItems;
  const guestSubtotal = localItems.reduce(
    (total, item) => total + (item.price || 0) * (item.quantity || 0),
    0
  );

  if (isAuthenticated && isLoading) {
    return (
      <div className="container py-8">
        <Skeleton className="h-8 w-32 mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!displayItems.length) {
    return (
      <div className="container py-16">
        <EmptyState
          icon={<ShoppingCart className="h-12 w-12" />}
          title="Your cart is empty"
          description="Looks like you haven't added any items to your cart yet."
          action={
            <Button asChild>
              <Link href="/products">Start Shopping</Link>
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
        items={[{ label: "Home", href: "/" }, { label: "Shopping Cart" }]}
      />

      <h1 className="text-3xl font-bold mt-8 mb-6">Shopping Cart</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {displayItems.map((item: any) => (
            <CartItem
              key={item._id}
              item={item}
              onUpdateQuantity={(quantity: number) =>
                isAuthenticated
                  ? updateQuantityMutation.mutate({ itemId: item._id, quantity })
                  : localUpdateQuantity(item._id, quantity)
              }
              onRemove={() =>
                isAuthenticated
                  ? removeItemMutation.mutate(item._id)
                  : localRemoveItem(item._id)
              }
            />
          ))}
        </div>

        <div>
          {isAuthenticated ? (
            <CartSummary
              subtotal={cart?.subtotal || 0}
              discount={cart?.discount || 0}
              shipping={cart?.shipping || 0}
              total={cart?.total || 0}
              coupon={cart?.coupon}
              onApplyCoupon={(code: string) => applyCouponMutation.mutate(code)}
            />
          ) : (
            <div className="rounded-2xl border bg-card p-6 space-y-4 sticky top-24">
              <h3 className="font-semibold text-lg">Order Summary</h3>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Subtotal ({localItems.length} {localItems.length === 1 ? "item" : "items"})
                </span>
                <span className="font-medium">Rs {guestSubtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Shipping</span>
                <span className="text-muted-foreground">Free</span>
              </div>
              <div className="border-t pt-4 flex justify-between items-baseline">
                <span className="font-semibold">Total</span>
                <span className="font-bold text-gold-dark text-lg">
                  Rs {guestSubtotal.toLocaleString()}
                </span>
              </div>
              <Button
                asChild
                className="w-full h-11 bg-gold hover:bg-gold-dark text-white font-semibold"
              >
                <Link href="/checkout">
                  <ShoppingBag className="h-4 w-4 mr-2" />
                  Proceed to Checkout
                </Link>
              </Button>
              <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 mt-0.5 shrink-0 text-gold" />
                Your cart is saved on this device. Checkout as a guest — no
                account needed.
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}