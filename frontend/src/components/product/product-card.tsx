"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Heart, Eye } from "lucide-react";
import { cn, getImageUrl } from "@/lib/utils";
import { Product } from "@/types";
import QuickViewDialog from "@/components/product/quick-view-dialog";
import { useCartStore } from "@/stores/cart-store";
import { toast } from "sonner";

interface ProductCardProps {
  product: Product;
  viewMode?: "grid" | "list";
  onRemoveFromWishlist?: () => void;
}

export default function ProductCard({
  product,
  viewMode = "grid",
  onRemoveFromWishlist,
}: ProductCardProps) {
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);
  const [hovered, setHovered] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const hasDiscount =
    product.compareAtPrice && product.compareAtPrice > product.price;
  const discountPercentage = hasDiscount
    ? Math.round(
        ((product.compareAtPrice! - product.price) / product.compareAtPrice!) * 100
      )
    : 0;
  const images = product.images?.length ? product.images : [];
  const secondImage = images.length > 1 ? images[1] : null;
  const sizes: string[] =
    product.sizes ?? product.variants?.map((v: any) => v.size).filter(Boolean) ?? [];
  const colors: string[] =
    product.colors ?? product.variants?.map((v: any) => v.color).filter(Boolean) ?? [];
  const defaultSize = sizes.length ? sizes[0] : "";
  const defaultColor = colors.length ? colors[0] : "";
  const outOfStock =
    typeof product.stock === "number"
      ? product.stock === 0
      : (product.variants?.reduce(
          (sum: number, v: any) => sum + (v.stock || 0),
          0
        ) ?? 1) === 0;

  const addToCart = () => {
    addItem({
      _id: `${product._id}-${defaultSize}-${defaultColor}`,
      product: {
        _id: product._id,
        name: product.name,
        slug: product.slug,
        images: product.images,
      },
      size: defaultSize,
      color: defaultColor,
      quantity: 1,
      price: product.price,
    });
    toast.success("Added to cart", { description: product.name });
  };

  const buyNow = () => {
    addToCart();
    router.push("/cart");
  };

  const openQuickView = () => {
    setQuickOpen(true);
  };

  if (viewMode === "list") {
    return (
      <>
        <motion.div
          whileHover={{ y: -2 }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          className="flex gap-4 p-3 border rounded-xl bg-card hover:shadow-gold hover:border-gold/40 transition-all"
        >
          <Link href={`/products/${product.slug}`} className="relative w-28 h-28 rounded-lg overflow-hidden bg-muted shrink-0">
            <Image src={getImageUrl(images[0] || "")} alt={product.name} fill sizes="112px" className={cn("object-cover transition-opacity duration-500", hovered && secondImage ? "opacity-0" : "opacity-100")} />
            {secondImage && (
              <Image src={getImageUrl(secondImage)} alt="" fill sizes="112px" className={cn("object-cover transition-opacity duration-500", hovered ? "opacity-100" : "opacity-0")} />
            )}
            {hasDiscount && (
              <span className="absolute top-1.5 left-1.5 h-6 min-w-[38px] px-1.5 rounded-full bg-gradient-to-r from-gold to-gold-dark text-white text-[11px] font-bold shadow-md ring-1 ring-white/60 dark:ring-white/25 flex items-center justify-center">-{discountPercentage}%</span>
            )}
          </Link>
          <div className="flex-1 min-w-0 flex flex-col">
            <Link href={`/products/${product.slug}`} className="font-medium text-sm line-clamp-2 hover:text-gold-dark transition-colors">{product.name}</Link>
            <div className="mt-auto flex items-end justify-between gap-2">
              <div className="flex items-baseline gap-2">
                <span className="font-bold text-gold-dark">Rs {product.price.toLocaleString()}</span>
                {hasDiscount && <span className="text-xs text-muted-foreground line-through">Rs {product.compareAtPrice!.toLocaleString()}</span>}
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={addToCart} disabled={outOfStock} className="h-8 px-3 rounded-md bg-gold text-white text-xs font-semibold hover:bg-gold-dark transition-colors disabled:opacity-40" title="Add to cart">Add</button>
                <button onClick={buyNow} disabled={outOfStock} className="h-8 px-3 rounded-md bg-foreground text-background text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-40" title="Buy now">Buy</button>
                <button onClick={openQuickView} className="h-8 w-8 rounded-full border flex items-center justify-center text-muted-foreground hover:text-gold-dark hover:border-gold transition-colors" title="Quick view">
                  <Eye className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
        <QuickViewDialog product={product} open={quickOpen} onOpenChange={setQuickOpen} />
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
        <div className="relative aspect-[4/5] rounded-xl overflow-hidden bg-muted ring-1 ring-black/5 hover:ring-2 hover:ring-gold transition-all duration-300">
          <Link href={`/products/${product.slug}`} className="absolute inset-0">
            <Image src={getImageUrl(images[0] || "")} alt={product.name} fill sizes="(max-width: 640px) 50vw, 25vw" className={cn("object-cover transition-all duration-500", hovered && secondImage ? "opacity-0 scale-105" : "opacity-100 scale-100")} />
            {secondImage && (
              <Image src={getImageUrl(secondImage)} alt="" fill sizes="(max-width: 640px) 50vw, 25vw" className={cn("object-cover transition-all duration-500", hovered ? "opacity-100 scale-100" : "opacity-0 scale-105")} />
            )}
          </Link>
          {hasDiscount && (
            <span className="absolute top-2.5 left-2.5 h-8 min-w-[46px] px-2.5 rounded-full bg-gradient-to-r from-gold to-gold-dark text-white text-[13px] font-bold flex items-center justify-center shadow-gold ring-2 ring-white/70 dark:ring-white/25">-{discountPercentage}%</span>
          )}
          {outOfStock && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="bg-white text-black text-xs font-semibold px-3 py-1 rounded-full">Out of Stock</span>
            </div>
          )}
          <div className={cn("absolute top-2.5 right-2.5 flex flex-col gap-1.5 z-10 transition-all duration-300", hovered ? "opacity-100 translate-x-0" : "opacity-0 translate-x-2")}>
            <button onClick={onRemoveFromWishlist} className="h-9 w-9 rounded-full bg-white text-neutral-900 shadow-lg ring-1 ring-black/10 flex items-center justify-center hover:bg-gold hover:text-white dark:bg-neutral-900 dark:text-white dark:ring-white/20 dark:hover:bg-gold dark:hover:text-white transition-colors" title="Wishlist">
              <Heart className="h-4 w-4" />
            </button>
            <button onClick={openQuickView} className="h-9 w-9 rounded-full bg-white text-neutral-900 shadow-lg ring-1 ring-black/10 flex items-center justify-center hover:bg-gold hover:text-white dark:bg-neutral-900 dark:text-white dark:ring-white/20 dark:hover:bg-gold dark:hover:text-white transition-colors" title="Quick view">
              <Eye className="h-4 w-4" />
            </button>
          </div>
          <div className={cn("absolute inset-x-0 bottom-0 grid grid-cols-2 gap-px z-10 transition-all duration-300", hovered ? "translate-y-0 opacity-100" : "translate-y-full opacity-0")}>
            <button onClick={addToCart} disabled={outOfStock} className="h-10 bg-gold text-white text-xs font-semibold tracking-wide flex items-center justify-center gap-1.5 hover:bg-gold-dark transition-colors disabled:opacity-50">
              Add to Cart
            </button>
            <button onClick={buyNow} disabled={outOfStock} className="h-10 bg-foreground text-background text-xs font-semibold tracking-wide flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity disabled:opacity-50">
              Buy Now
            </button>
          </div>
        </div>
        <div className="pt-3 space-y-0.5">
          <Link href={`/products/${product.slug}`} className="block text-[15px] font-medium leading-snug line-clamp-1 hover:text-gold-dark transition-colors">{product.name}</Link>
          <div className="flex items-baseline gap-2 pt-0.5">
            <span className="text-base font-bold text-gold-dark">Rs {product.price.toLocaleString()}</span>
            {hasDiscount && (
              <span className="text-xs text-muted-foreground line-through">Rs {product.compareAtPrice!.toLocaleString()}</span>
            )}
          </div>
        </div>
      </motion.div>
      <QuickViewDialog product={product} open={quickOpen} onOpenChange={setQuickOpen} />
    </>
  );
}

