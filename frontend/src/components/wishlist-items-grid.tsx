"use client";

import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Check, PackageCheck, PackageX, ShoppingBag, Square, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getImageUrl } from "@/lib/utils";
import { Product } from "@/types";

interface WishlistItemsGridProps {
  items: Product[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onOpenOptions: (product: Product) => void;
  formatPrice: (price: number) => string;
  stockOf: (product: any) => number;
}
export default function WishlistItemsGrid({
  items,
  selectedIds,
  onToggleSelect,
  onRemove,
  onOpenOptions,
  formatPrice,
  stockOf,
}: WishlistItemsGridProps) {

  return (
    <div className="mt-6 grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 xl:grid-cols-4">
      <AnimatePresence mode="popLayout">
        {items.map((product, index) => {
          const isSelected = selectedIds.includes(product._id);
          const inStock = stockOf(product) > 0;
          const images = product.images?.length ? product.images : [];
          const hasDiscount =
            product.compareAtPrice && product.compareAtPrice > product.price;
          const discount = hasDiscount
            ? Math.round(
                ((product.compareAtPrice! - product.price) /
                  product.compareAtPrice!) *
                  100
              )
            : 0;

          return (
            <motion.div
              key={product._id}
              layout
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.2 } }}
              transition={{
                duration: 0.35,
                delay: Math.min(index * 0.04, 0.25),
              }}
              className={`group relative flex flex-col overflow-hidden rounded-2xl border bg-card transition-all duration-300 hover:border-brand-gold/50 hover:shadow-gold ${
                isSelected ? "ring-2 ring-brand-gold border-brand-gold" : "border-border/60"
              }`}
            >
              {/* Select & Remove top floating pills */}
              <div className="absolute left-2.5 top-2.5 z-20">
                <button
                  type="button"
                  onClick={() => onToggleSelect(product._id)}
                  aria-label={isSelected ? "Deselect item" : "Select item"}
                  className={`flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-md transition-all ${
                    isSelected
                      ? "bg-brand-gold text-white shadow-gold"
                      : "bg-black/40 text-white hover:bg-black/60"
                  }`}
                >
                  {isSelected ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Square className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>

              <div className="absolute right-2.5 top-2.5 z-20">
                <button
                  type="button"
                  onClick={() => {
                    // The card animating out is the confirmation (no popup).
                    onRemove(product._id);
                  }}
                  aria-label="Remove from wishlist"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition-all hover:bg-destructive hover:text-white"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Image Area */}
              <Link
                href={`/product/${product.slug}`}
                className="relative block aspect-[3/4] w-full overflow-hidden bg-muted"
              >
                {images[0] ? (
                  <Image
                    src={getImageUrl(images[0])}
                    alt={product.name}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                    No image
                  </div>
                )}

                {/* Stock badge */}
                <div className="absolute bottom-2.5 left-2.5 flex flex-wrap gap-1">
                  {inStock ? (
                    <span className="flex items-center gap-1 rounded-full bg-emerald-500/90 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-md">
                      <PackageCheck className="h-3 w-3" />
                      In Stock
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 rounded-full bg-zinc-900/90 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-md">
                      <PackageX className="h-3 w-3" />
                      Sold Out
                    </span>
                  )}

                  {hasDiscount && (
                    <span className="rounded-full bg-brand-gold px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                      -{discount}%
                    </span>
                  )}
                </div>
              </Link>

              {/* Details and Actions */}
              <div className="flex flex-1 flex-col p-3.5">
                <Link
                  href={`/product/${product.slug}`}
                  className="text-sm font-semibold leading-snug tracking-tight text-foreground line-clamp-1 hover:text-brand-gold transition-colors"
                >
                  {product.name}
                </Link>

                <div className="mt-1 flex items-baseline gap-2">
                  <span className="font-bold text-brand-gold">
                    {formatPrice(product.price)}
                  </span>
                  {hasDiscount && (
                    <span className="text-xs text-muted-foreground line-through">
                      {formatPrice(product.compareAtPrice!)}
                    </span>
                  )}
                </div>

                <div className="mt-3 pt-2 border-t border-border/50 flex items-center gap-2">
                  <Button
                    type="button"
                    onClick={() => onOpenOptions(product)}
                    disabled={!inStock}
                    size="sm"
                    className="h-9 flex-1 rounded-full bg-brand-gold text-xs font-semibold text-white shadow-gold hover:bg-brand-gold-dark disabled:opacity-40"
                  >
                    <ShoppingBag className="mr-1.5 h-3.5 w-3.5" />
                    {inStock ? "Choose Options" : "Out of Stock"}
                  </Button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
