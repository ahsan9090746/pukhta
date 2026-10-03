"use client";
// Render on demand - skip static generation so a sleeping backend cannot crash the build.
export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  CheckSquare,
  ChevronRight,
  Heart,
  PackageCheck,
  PackageX,
  ShoppingBag,
  Sparkles,
  Square,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import Breadcrumb from "@/components/common/breadcrumb";
import EmptyState from "@/components/common/empty-state";
import ChooseOptionsDrawer from "@/components/product/choose-options-drawer";
import WishlistItemsGrid from "@/components/wishlist-items-grid";

import { useWishlistStore } from "@/stores/wishlist-store";
import { useCartStore } from "@/stores/cart-store";
import { useUIStore } from "@/stores/ui-store";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { getImageUrl } from "@/lib/utils";
import { Product } from "@/types";

/** Total sellable stock, whether the product tracks `stock` or variants. */
const stockOf = (product: any) =>
  typeof product?.stock === "number"
    ? product.stock
    : (product?.variants || []).reduce(
        (total: number, variant: any) => total + (variant?.stock || 0),
        0
      );

/** Pulls first available in-stock variant/size so 1-click add can succeed. */
const firstAvailableOption = (product: Product) => {
  const variants = product?.variants || [];
  const inStockVariant = variants.find((v: any) => (Number(v?.stock) || 0) > 0);
  if (inStockVariant) {
    return {
      variantId: inStockVariant._id,
      size: inStockVariant.size || "",
      color: inStockVariant.color || "",
    };
  }
  const sizes = product?.sizes || [];
  return {
    variantId: undefined,
    size: sizes[0] || "",
    color: "",
  };
};

export default function WishlistPage() {
  const items = useWishlistStore((state) => state.items);
  const remove = useWishlistStore((state) => state.remove);
  const clear = useWishlistStore((state) => state.clear);
  const addItem = useCartStore((state) => state.addItem);
  const setCartOpen = useUIStore((state) => state.setCartOpen);
  const { format } = useStoreSettings();

  const [mounted, setMounted] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filter, setFilter] = useState<"all" | "in-stock" | "out-of-stock">("all");
  const [drawerProduct, setDrawerProduct] = useState<Product | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Inline notice next to the batch buttons (no popup).
  const [actionNotice, setActionNotice] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const valid = new Set(items.map((i) => i._id));
    setSelectedIds((prev) => prev.filter((id) => valid.has(id)));
  }, [items]);

  const totalValue = items.reduce(
    (sum, product) => sum + (Number(product.price) || 0),
    0
  );
  const inStockCount = items.filter((product) => stockOf(product) > 0).length;
  const outOfStockCount = items.length - inStockCount;

  const filteredItems = useMemo(() => {
    if (filter === "in-stock") return items.filter((p) => stockOf(p) > 0);
    if (filter === "out-of-stock") return items.filter((p) => stockOf(p) <= 0);
    return items;
  }, [items, filter]);

  const allFilteredSelected =
    filteredItems.length > 0 &&
    filteredItems.every((item) => selectedIds.includes(item._id));

  const toggleSelect = (id: string) => {
    setActionNotice(null);
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      const filteredSet = new Set(filteredItems.map((i) => i._id));
      setSelectedIds((prev) => prev.filter((id) => !filteredSet.has(id)));
    } else {
      const merged = new Set([...selectedIds, ...filteredItems.map((i) => i._id)]);
      setSelectedIds(Array.from(merged));
    }
  };

  const removeSelected = () => {
    if (!selectedIds.length) return;
    selectedIds.forEach((id) => remove(id));
    setSelectedIds([]);
    // Counts update visibly — no popup needed.
    setActionNotice(null);
  };

  const addSelectedToCart = () => {
    const targetItems = items.filter(
      (p) => selectedIds.includes(p._id) && stockOf(p) > 0
    );
    if (!targetItems.length) {
      setActionNotice({
        ok: false,
        message: "None of the selected items are currently in stock.",
      });
      return;
    }

    targetItems.forEach((product) => {
      const option = firstAvailableOption(product);
      addItem({
        _id: `${product._id}-${option.size || "default"}`,
        product: {
          _id: product._id,
          name: product.name,
          slug: product.slug,
          images: product.images,
        },
        variantId: option.variantId,
        size: option.size,
        color: option.color,
        quantity: 1,
        price: product.price,
      });
    });

    setActionNotice(null);
    // Amazon-style: the cart drawer itself is the confirmation.
    setCartOpen(true);
  };

  const handleOpenOptions = (product: Product) => {
    setDrawerProduct(product);
    setDrawerOpen(true);
  };

  if (!mounted) {
    return (
      <div className="container py-8">
        <Skeleton className="h-8 w-32 mb-8" />
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          {[...Array(4)].map((_, index) => (
            <Skeleton key={index} className="h-96 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="container py-8"
    >
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Wishlist" }]} />

      {/* Header card */}
      <div className="mt-8 overflow-hidden rounded-3xl border border-border/70 bg-card shadow-premium">
        <div className="relative bg-gradient-to-r from-brand-gold/15 via-brand-gold/5 to-transparent px-6 py-8 sm:px-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.28em] text-brand-gold">
                <Sparkles className="h-3.5 w-3.5" />
                Curated Selection
              </p>
              <h1 className="mt-2 font-serif text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                My Wishlist
              </h1>
              <p className="mt-2 max-w-lg text-sm text-muted-foreground leading-relaxed">
                {items.length > 0
                  ? "Your saved luxury footwear, stored securely on this device. Move pieces to your bag, manage in batch, or keep them for later."
                  : "Save your favorite footwear designs to revisit, compare, and order whenever you are ready."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button asChild variant="outline" className="h-11 rounded-full border-border/70 hover:border-brand-gold hover:text-brand-gold">
                <Link href="/product-category">
                  <ShoppingBag className="mr-2 h-4 w-4" />
                  Explore Catalog
                </Link>
              </Button>

              {items.length > 0 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      className="h-11 rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Clear all
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Clear your entire wishlist?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will remove all {items.length}{" "}
                        {items.length === 1 ? "item" : "items"} currently saved on
                        this device. You can always add them back anytime from the
                        catalog.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Keep wishlist</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => {
                          clear();
                          setSelectedIds([]);
                          // The empty state below is the confirmation.
                          setActionNotice(null);
                        }}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Clear all
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
        </div>

        {items.length > 0 && (
          <div className="grid grid-cols-3 divide-x divide-border/60 border-t border-border/60 bg-muted/20">
            <Stat label="Saved pairs" value={String(items.length)} />
            <Stat label="Total value" value={format(totalValue)} />
            <Stat
              label="In stock"
              value={`${inStockCount} / ${items.length}`}
              accent={inStockCount > 0 ? "text-emerald-600 dark:text-emerald-400" : undefined}
            />
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-border/80 bg-card p-12 text-center">
          <EmptyState
            icon={
              <span className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-gold/10 ring-1 ring-brand-gold/30">
                <Heart className="h-9 w-9 text-brand-gold" />
              </span>
            }
            title="Your wishlist is empty"
            description="You haven't saved any pairs yet. Tap the heart icon on any product card or detail page to curate your personal collection."
            action={
              <Button
                asChild
                className="h-11 rounded-full bg-brand-gold px-8 font-semibold text-white shadow-gold hover:bg-brand-gold-dark hover:shadow-gold-lg"
              >
                <Link href="/product-category" className="flex items-center gap-2">
                  Discover Products
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            }
          />
        </div>
      ) : (
        <>
          {/* Action & Filter Bar */}
          <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-border/60 bg-card/60 p-4 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={toggleSelectAll}
                className="h-9 gap-2 text-xs font-semibold text-foreground hover:text-brand-gold"
              >
                {allFilteredSelected ? (
                  <CheckSquare className="h-4 w-4 text-brand-gold" />
                ) : (
                  <Square className="h-4 w-4 text-muted-foreground" />
                )}
                {allFilteredSelected ? "Deselect all" : "Select all"}
              </Button>

              <div className="h-4 w-px bg-border" />

              {/* Status pill filters */}
              <div className="flex items-center gap-1 rounded-full bg-muted/60 p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setFilter("all")}
                  className={`rounded-full px-3 py-1 font-medium transition-colors ${
                    filter === "all"
                      ? "bg-background text-brand-gold shadow-sm font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  All ({items.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilter("in-stock")}
                  className={`rounded-full px-3 py-1 font-medium transition-colors ${
                    filter === "in-stock"
                      ? "bg-background text-brand-gold shadow-sm font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  In stock ({inStockCount})
                </button>
                {outOfStockCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setFilter("out-of-stock")}
                    className={`rounded-full px-3 py-1 font-medium transition-colors ${
                      filter === "out-of-stock"
                        ? "bg-background text-brand-gold shadow-sm font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Out of stock ({outOfStockCount})
                  </button>
                )}
              </div>
            </div>

            {/* Batch Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {selectedIds.length > 0 && (
                <>
                  <span className="text-xs text-muted-foreground">
                    <strong className="text-foreground">{selectedIds.length}</strong>{" "}
                    selected
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    onClick={addSelectedToCart}
                    className="h-9 rounded-full bg-brand-gold px-4 text-xs font-semibold text-white shadow-gold hover:bg-brand-gold-dark"
                  >
                    <ShoppingBag className="mr-1.5 h-3.5 w-3.5" />
                    Move to Bag
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={removeSelected}
                    className="h-9 rounded-full border-destructive/40 text-xs font-medium text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    Remove
                  </Button>
                </>
              )}
              {actionNotice && !actionNotice.ok && (
                <p role="alert" className="w-full text-xs font-medium text-destructive">
                  {actionNotice.message}
                </p>
              )}
            </div>
          </div>

          {/* Grid of Wishlist Items */}
          <WishlistItemsGrid
            items={filteredItems}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onRemove={remove}
            onOpenOptions={handleOpenOptions}
            formatPrice={format}
            stockOf={stockOf}
          />

          <div className="mt-12 rounded-3xl border border-brand-gold/30 bg-gradient-to-r from-brand-gold/15 via-brand-gold/5 to-transparent p-6 sm:p-8">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <p className="font-serif text-xl font-bold text-foreground">
                  Ready to complete your look?
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Browse the full collection and discover matching shoes and accessories.
                </p>
              </div>
              <Button
                asChild
                className="h-11 rounded-full bg-brand-gold px-7 font-semibold text-white shadow-gold hover:bg-brand-gold-dark"
              >
                <Link href="/product-category" className="flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4" />
                  Continue Shopping
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Slide-out variant drawer for individual items */}
      <ChooseOptionsDrawer
        product={drawerProduct}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </motion.div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="px-3 py-4 text-center sm:px-6">
      <p className={`font-serif text-xl font-bold sm:text-2xl ${accent ?? "text-brand-gold"}`}>
        {value}
      </p>
      <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
    </div>
  );
}
