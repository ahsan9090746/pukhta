"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Heart, Lock, ShoppingBag, ShoppingCart, Sparkles } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import CartItem from "@/components/cart/cart-item";
import CartSummary from "@/components/cart/cart-summary";
import TrustBadges from "@/components/common/trust-badges";
import EmptyState from "@/components/common/empty-state";
import Breadcrumb from "@/components/common/breadcrumb";
import { useAuthStore } from "@/stores/auth-store";
import { useCartStore } from "@/stores/cart-store";
import { useWishlistStore } from "@/stores/wishlist-store";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { toast } from "sonner";

export default function CartPage() {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();
  const {
    items: localItems,
    updateQuantity: localUpdateQuantity,
    removeItem: localRemoveItem,
  } = useCartStore();
  const wishlistItems = useWishlistStore((state) => state.items);
  const toggleWishlist = useWishlistStore((state) => state.toggle);
  const { format } = useStoreSettings();

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
  const itemCount = displayItems.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0),
    0
  );

  // `cart.coupon` is populated by the API, so only its code is shown.
  const couponCode =
    typeof cart?.coupon === "string" ? cart.coupon : cart?.coupon?.code || "";

  const handleQuantityChange = (item: any, quantity: number) =>
    isAuthenticated
      ? updateQuantityMutation.mutate({ itemId: item._id, quantity })
      : localUpdateQuantity(item._id, quantity);

  const handleRemove = (item: any) =>
    isAuthenticated
      ? removeItemMutation.mutate(item._id)
      : localRemoveItem(item._id);

  const handleSaveForLater = (item: any) => {
    const product = item.product;
    if (product?._id && !wishlistItems.some((p) => p._id === product._id)) {
      toggleWishlist(product);
    }
    handleRemove(item);
    toast.success("Moved to wishlist");
  };

  if (isAuthenticated && isLoading) {
    return (
      <div className="container py-8">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="mt-8 h-24 w-full rounded-3xl" />
        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-3">
            {[...Array(3)].map((_, index) => (
              <Skeleton key={index} className="h-36 rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!displayItems.length) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="container py-8"
      >
        <Breadcrumb
          items={[{ label: "Home", href: "/" }, { label: "Shopping Cart" }]}
        />
        <div className="mt-8 rounded-3xl border bg-card shadow-premium">
          <EmptyState
            icon={
              <span className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-gold/10 ring-1 ring-brand-gold/30">
                <ShoppingCart className="h-9 w-9 text-brand-gold" />
              </span>
            }
            title="Your bag is empty"
            description="Nothing here yet — explore the collection and add your first pair."
            action={
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Button
                  asChild
                  className="h-11 bg-brand-gold font-semibold text-white hover:bg-brand-gold-dark"
                >
                  <Link href="/shop">Start Shopping</Link>
                </Button>
                <Button asChild variant="outline" className="h-11">
                  <Link href="/wishlist">
                    <Heart className="mr-2 h-4 w-4" />
                    View wishlist
                  </Link>
                </Button>
              </div>
            }
          />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="container pb-28 pt-8 lg:pb-10"
    >
      <Breadcrumb
        items={[{ label: "Home", href: "/" }, { label: "Shopping Cart" }]}
      />

      <div className="mt-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.28em] text-brand-gold">
            <Sparkles className="h-3.5 w-3.5" />
            Your Bag
          </p>
          <h1 className="mt-3 font-serif text-3xl leading-tight sm:text-4xl">
            Shopping Cart
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {itemCount} {itemCount === 1 ? "item" : "items"} ready for checkout ·
            shipping is on us
          </p>
        </div>
        <Button asChild variant="outline" className="h-11">
          <Link href="/shop">
            <ShoppingBag className="mr-2 h-4 w-4" />
            Continue Shopping
          </Link>
        </Button>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {displayItems.map((item: any) => (
              <CartItem
                key={item._id}
                item={item}
                isUpdating={
                  isAuthenticated &&
                  updateQuantityMutation.isPending &&
                  updateQuantityMutation.variables?.itemId === item._id
                }
                onUpdateQuantity={(quantity: number) =>
                  handleQuantityChange(item, quantity)
                }
                onRemove={() => handleRemove(item)}
                onMoveToWishlist={
                  item.product?._id ? () => handleSaveForLater(item) : undefined
                }
              />
            ))}
          </AnimatePresence>

          <div className="flex items-center justify-between rounded-2xl border bg-card px-5 py-4">
            <span className="text-sm text-muted-foreground">
              Subtotal ({itemCount} {itemCount === 1 ? "item" : "items"})
            </span>
            <span className="font-semibold">
              {format(
                isAuthenticated ? Number(cart?.subtotal) || 0 : guestSubtotal
              )}
            </span>
          </div>
        </div>

        <div>
          {isAuthenticated ? (
            <CartSummary
              subtotal={cart?.subtotal || 0}
              discount={cart?.discount || 0}
              shipping={cart?.shipping || 0}
              total={cart?.total || 0}
              coupon={couponCode}
              itemCount={itemCount}
              isApplyingCoupon={applyCouponMutation.isPending}
              onApplyCoupon={(code: string) => applyCouponMutation.mutate(code)}
            />
          ) : (
            <CartSummary
              subtotal={guestSubtotal}
              discount={0}
              shipping={0}
              total={guestSubtotal}
              itemCount={itemCount}
              note={
                <span className="flex items-start gap-1.5">
                  <Lock className="mt-0.5 h-3 w-3 shrink-0 text-brand-gold" />
                  Your bag is saved on this device — checkout as a guest, no
                  account needed.
                </span>
              }
            />
          )}
          <TrustBadges />
        </div>

        {/* Mobile: sticky summary bar so checkout is always one thumb-tap away */}
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-brand-gold/25 bg-background/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-lg lg:hidden">
          <div className="flex items-center gap-3">
            <div className="min-w-0 shrink-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {itemCount} {itemCount === 1 ? "item" : "items"}
              </p>
              <p className="font-serif text-lg font-bold leading-tight text-brand-gold">
                {format(
                  isAuthenticated ? Number(cart?.subtotal) || 0 : guestSubtotal
                )}
              </p>
            </div>
            <Button
              asChild
              className="h-12 flex-1 bg-brand-gold text-sm font-semibold uppercase tracking-wide text-white hover:bg-brand-gold-dark"
            >
              <Link href="/checkout">
                <Lock className="mr-2 h-4 w-4" />
                Checkout
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}