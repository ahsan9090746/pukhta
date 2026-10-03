"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Heart, Minus, Plus, Trash2 } from "lucide-react";
import { cn, getImageUrl } from "@/lib/utils";
import { useStoreSettings } from "@/hooks/useStoreSettings";

interface CartItemProps {
  item: any;
  onUpdateQuantity: (quantity: number) => void;
  onRemove: () => void;
  /** Saves the line back to the wishlist before removing it. */
  onMoveToWishlist?: () => void;
  isUpdating?: boolean;
}

/**
 * Premium bag row: product image, chosen size/colour, unit + line price and a
 * gold-trimmed quantity stepper. The parent wraps it in `AnimatePresence` so
 * removing a line slides out smoothly.
 */
export default function CartItem({
  item,
  onUpdateQuantity,
  onRemove,
  onMoveToWishlist,
  isUpdating = false,
}: CartItemProps) {
  const { format } = useStoreSettings();

  const product = item.product || {};
  const price = Number(item.price) || 0;
  const quantity = Number(item.quantity) || 1;
  const lineTotal = price * quantity;
  const compareAt = Number(product.compareAtPrice) || 0;
  const hasDiscount = compareAt > price;
  const discount = hasDiscount
    ? Math.round(((compareAt - price) / compareAt) * 100)
    : 0;
  const image = product.images?.[0] || product.thumbnail || "";
  const hasVariants = Boolean(item.size || item.color);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -28, marginBottom: 0, transition: { duration: 0.25 } }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={cn(
        "group relative overflow-hidden rounded-2xl border bg-card p-3.5 transition-shadow duration-300 hover:shadow-gold sm:p-4",
        isUpdating && "opacity-60"
      )}
    >
      <span className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-brand-gold/60 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="flex gap-4">
        <Link
          href={product.slug ? `/product/${product.slug}` : "/shop"}
          className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-muted ring-1 ring-black/5 sm:h-28 sm:w-28"
        >
          <Image
            src={getImageUrl(image)}
            alt={product.name || "Product"}
            fill
            sizes="112px"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
          {hasDiscount && (
            <span className="absolute left-1.5 top-1.5 rounded-full bg-gradient-to-r from-brand-gold to-brand-gold-dark px-2 py-0.5 text-[10px] font-bold text-white shadow-gold">
              -{discount}%
            </span>
          )}
        </Link>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Link
                href={product.slug ? `/product/${product.slug}` : "/shop"}
                className="line-clamp-2 text-[15px] font-medium leading-snug transition-colors hover:text-brand-gold"
              >
                {product.name}
              </Link>

              {hasVariants && (
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  {item.size && (
                    <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
                      {item.size}
                    </span>
                  )}
                  {item.color && (
                    <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
                      {item.color}
                    </span>
                  )}
                </div>
              )}

              <p className="mt-2 text-[13px] text-muted-foreground">
                <span className="font-semibold text-foreground">
                  {format(price)}
                </span>{" "}
                each
              </p>
            </div>

            <div className="shrink-0 text-right">
              <p className="text-base font-bold text-brand-gold">
                {format(lineTotal)}
              </p>
              {hasDiscount && (
                <p className="text-[11px] text-muted-foreground line-through">
                  {format(compareAt * quantity)}
                </p>
              )}
            </div>
          </div>

          <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-3.5">
            <div className="inline-flex items-center gap-0.5 rounded-full border p-0.5">
              <button
                type="button"
                aria-label="Decrease quantity"
                onClick={() => onUpdateQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
                className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-brand-gold/10 hover:text-brand-gold disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground sm:h-8 sm:w-8"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="w-9 text-center text-sm font-semibold tabular-nums">
                {quantity}
              </span>
              <button
                type="button"
                aria-label="Increase quantity"
                onClick={() => onUpdateQuantity(quantity + 1)}
                className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-brand-gold/10 hover:text-brand-gold sm:h-8 sm:w-8"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-1">
              {onMoveToWishlist && (
                <button
                  type="button"
                  onClick={onMoveToWishlist}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-brand-gold/10 hover:text-brand-gold sm:px-2.5 sm:py-1.5"
                >
                  <Heart className="h-3.5 w-3.5" />
                  Save
                </button>
              )}
              <button
                type="button"
                onClick={onRemove}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive sm:px-2.5 sm:py-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
