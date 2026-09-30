"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Heart, Eye, Plus } from "lucide-react";
import { cn, getImageUrl } from "@/lib/utils";
import { Product } from "@/types";
import QuickViewDialog from "@/components/product/quick-view-dialog";
import ChooseOptionsDrawer from "@/components/product/choose-options-drawer";
import { useWishlistStore } from "@/stores/wishlist-store";
import { toast } from "sonner";

interface ProductCardProps {
  product: Product;
  viewMode?: "grid" | "list";
  onRemoveFromWishlist?: () => void;
  /** Show "SKU: xxx" under the product name (used on the product-category page) */
  showSku?: boolean;
}

export default function ProductCard({
  product,
  viewMode = "grid",
  onRemoveFromWishlist,
  showSku = false,
}: ProductCardProps) {
  const [hovered, setHovered] = useState(false);
  const wishlistItems = useWishlistStore((s) => s.items);
  const toggleWishlist = useWishlistStore((s) => s.toggle);
  const wishlisted = wishlistItems.some((p) => p._id === product._id);

  const handleWishlistClick = () => {
    if (onRemoveFromWishlist) {
      onRemoveFromWishlist();
      toast.success("Removed from wishlist");
      return;
    }
    const added = toggleWishlist(product);
    toast.success(added ? "Added to wishlist" : "Removed from wishlist");
  };

  const [quickOpen, setQuickOpen] = useState(false);
  const [chooseOpen, setChooseOpen] = useState(false);
  const hasDiscount =
    product.compareAtPrice && product.compareAtPrice > product.price;
  const discountPercentage = hasDiscount
    ? Math.round(
        ((product.compareAtPrice! - product.price) / product.compareAtPrice!) * 100
      )
    : 0;
  const images = product.images?.length ? product.images : [];
  const secondImage = images.length > 1 ? images[1] : null;
  const outOfStock =
    typeof product.stock === "number"
      ? product.stock === 0
      : (product.variants?.reduce(
          (sum: number, v: any) => sum + (v.stock || 0),
          0
        ) ?? 1) === 0;

  const openQuickView = () => {
    setQuickOpen(true);
  };

  const openChooseOptions = () => {
    setChooseOpen(true);
  };

  if (viewMode === "list") {
    return (
      <>
        <motion.div
          whileHover={{ y: -2 }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          className="flex gap-4 p-3 border rounded-xl bg-card hover:shadow-gold hover:border-brand-gold/40 transition-all duration-300"
        >
          <Link href={`/product/${product.slug}`} className="relative w-28 h-28 rounded-lg overflow-hidden bg-muted shrink-0">
            <Image src={getImageUrl(images[0] || "")} alt={product.name} fill sizes="112px" className={cn("object-cover transition-opacity duration-500", hovered && secondImage ? "opacity-0" : "opacity-100")} />
            {secondImage && (
              <Image src={getImageUrl(secondImage)} alt="" fill sizes="112px" className={cn("object-cover transition-opacity duration-500", hovered ? "opacity-100" : "opacity-0")} />
            )}
            {hasDiscount && (
              <span className="absolute top-1.5 left-1.5 h-5 min-w-[32px] px-1.5 rounded-full bg-gradient-to-r from-brand-gold to-brand-gold-dark text-white text-[10px] font-bold shadow-md flex items-center justify-center md:h-6 md:min-w-[38px] md:text-[11px]">-{discountPercentage}%</span>
            )}
          </Link>
          <div className="flex-1 min-w-0 flex flex-col">
            <Link href={`/product/${product.slug}`} className="font-medium text-sm line-clamp-2 hover:text-brand-gold transition-colors">{product.name}</Link>
            {showSku && product.sku && (
              <p className="text-[11px] text-muted-foreground mt-0.5">
                SKU: <span className="text-brand-gold/80">{product.sku}</span>
              </p>
            )}
            <div className="mt-auto flex items-end justify-between gap-2">
              <div className="flex items-baseline gap-2">
                <span className="font-bold text-brand-gold">Rs {product.price.toLocaleString()}</span>
                {hasDiscount && <span className="text-xs text-muted-foreground line-through">Rs {product.compareAtPrice!.toLocaleString()}</span>}
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={openChooseOptions} disabled={outOfStock} className="h-8 px-3 rounded-md bg-brand-gold text-white text-xs font-semibold hover:bg-brand-gold-dark transition-colors disabled:opacity-40" title="Choose options">Options</button>
                <button onClick={openQuickView} className="h-8 w-8 rounded-full border flex items-center justify-center text-muted-foreground hover:text-brand-gold hover:border-brand-gold transition-colors" title="Quick view">
                  <Eye className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
        <QuickViewDialog product={product} open={quickOpen} onOpenChange={setQuickOpen} />
        <ChooseOptionsDrawer product={product} open={chooseOpen} onOpenChange={setChooseOpen} />
      </>
    );
  }

  return (
    <>
      <motion.div
        whileHover={{ y: -4 }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="group relative"
      >
        <div className="relative aspect-square rounded-xl overflow-hidden bg-muted ring-1 ring-black/5 hover:ring-2 hover:ring-brand-gold transition-all duration-300">
          <Link href={`/product/${product.slug}`} className="absolute inset-0">
            {/* `object-contain` + square frame keeps the whole product in view —
                most uploaded shots are 1:1, which `object-cover` used to crop/zoom. */}
            <Image src={getImageUrl(images[0] || "")} alt={product.name} fill sizes="(max-width: 640px) 50vw, 25vw" className={cn("object-contain transition-all duration-500", hovered && secondImage ? "opacity-0 scale-105" : "opacity-100 scale-100")} />
            {secondImage && (
              <Image src={getImageUrl(secondImage)} alt="" fill sizes="(max-width: 640px) 50vw, 25vw" className={cn("object-contain transition-all duration-500", hovered ? "opacity-100 scale-100" : "opacity-0 scale-105")} />
            )}
          </Link>
          {hasDiscount && (
            /* Discount badge — extra compact on phones, full size from md up */
            <span className="absolute top-1.5 left-1.5 h-5 min-w-[28px] px-1.5 rounded-full bg-gradient-to-r from-brand-gold to-brand-gold-dark text-white text-[10px] font-bold flex items-center justify-center shadow-gold md:top-2.5 md:left-2.5 md:h-8 md:min-w-[46px] md:px-2.5 md:text-[13px]">-{discountPercentage}%</span>
          )}
          {outOfStock && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="bg-white text-black text-xs font-semibold px-3 py-1 rounded-full">Out of Stock</span>
            </div>
          )}
          {/* Mobile-only quick add — bottom-right corner, easy thumb reach.
              From md up the same action lives in the top-right action stack. */}
          <button onClick={openChooseOptions} disabled={outOfStock} className="absolute bottom-2.5 right-2.5 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-brand-gold text-white shadow-lg ring-1 ring-brand-gold/40 hover:bg-brand-gold-dark disabled:opacity-40 transition-colors md:hidden" title="Choose size" aria-label="Choose size">
            <Plus className="h-4 w-4" />
          </button>
          {/* Wishlist / quick view / plus — phones show the plus only (bottom-right),
              so this whole stack is tablet-and-up. */}
          <div className={cn("absolute top-2.5 right-2.5 z-10 hidden flex-col gap-1.5 transition-all duration-300 md:flex", hovered ? "opacity-100 translate-x-0" : "opacity-100 translate-x-0 md:opacity-0 md:translate-x-2")}>
            <button onClick={handleWishlistClick} className="h-9 w-9 rounded-full bg-white text-neutral-900 shadow-lg ring-1 ring-black/10 flex items-center justify-center hover:bg-brand-gold hover:text-white dark:bg-neutral-900 dark:text-white dark:ring-white/20 dark:hover:bg-brand-gold dark:hover:text-white transition-colors" title="Wishlist">
              <Heart className={cn("h-4 w-4", wishlisted && "fill-brand-gold text-brand-gold")} />
            </button>
            <button onClick={openQuickView} className="h-9 w-9 rounded-full bg-white text-neutral-900 shadow-lg ring-1 ring-black/10 flex items-center justify-center hover:bg-brand-gold hover:text-white dark:bg-neutral-900 dark:text-white dark:ring-white/20 dark:hover:bg-brand-gold dark:hover:text-white transition-colors" title="Quick view">
              <Eye className="h-4 w-4" />
            </button>
            {/* Desktop/tablet only — on mobile the plus button sits bottom-right */}
            <button onClick={openChooseOptions} disabled={outOfStock} className="hidden h-9 w-9 rounded-full bg-brand-gold text-white shadow-lg ring-1 ring-brand-gold/40 md:flex items-center justify-center hover:bg-brand-gold-dark disabled:opacity-40 transition-colors" title="Choose size" aria-label="Choose size">
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <div className={cn("absolute inset-x-0 bottom-0 z-10 hidden md:block transition-all duration-300", hovered ? "translate-y-0 opacity-100" : "translate-y-full opacity-0")}>
            <button onClick={openChooseOptions} disabled={outOfStock} className="w-full h-10 bg-brand-gold text-white text-xs font-semibold tracking-wide flex items-center justify-center gap-1.5 hover:bg-brand-gold-dark transition-colors disabled:opacity-50">
              Choose Options
            </button>
          </div>
        </div>
        <div className="pt-3 space-y-0.5">
          <Link href={`/product/${product.slug}`} className="block text-[15px] font-medium leading-snug line-clamp-1 hover:text-brand-gold transition-colors">{product.name}</Link>
          {showSku && product.sku && (
            <p className="text-[11px] text-muted-foreground">
              SKU: <span className="text-brand-gold/80">{product.sku}</span>
            </p>
          )}
          <div className="flex items-baseline gap-2 pt-0.5">
            <span className="text-base font-bold text-brand-gold">Rs {product.price.toLocaleString()}</span>
            {hasDiscount && (
              <span className="text-xs text-muted-foreground line-through">Rs {product.compareAtPrice!.toLocaleString()}</span>
            )}
          </div>
        </div>
      </motion.div>
      <QuickViewDialog product={product} open={quickOpen} onOpenChange={setQuickOpen} />
      <ChooseOptionsDrawer product={product} open={chooseOpen} onOpenChange={setChooseOpen} />
    </>
  );
}
