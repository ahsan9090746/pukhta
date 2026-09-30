"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { X, Minus, Plus } from "lucide-react";
import { useCartStore } from "@/stores/cart-store";
import { getImageUrl } from "@/lib/utils";
import { normalizeSizeLabel } from "@/lib/shoe-sizes";
import { richTextToPlainText } from "@/lib/rich-text";
import { Product } from "@/types";
import { toast } from "sonner";

interface ChooseOptionsDrawerProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ChooseOptionsDrawer({
  product,
  open,
  onOpenChange,
}: ChooseOptionsDrawerProps) {
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);
  const [size, setSize] = useState<string>("");
  const [quantity, setQuantity] = useState(1);

  const sizes: string[] = useMemo(() => {
    // The plain `sizes` array is often empty — every size really lives on the
    // variants, so merge both sources and de-duplicate.
    const fromVariants = (product?.variants ?? [])
      .map((v: any) => v.size)
      .filter(Boolean);
    return Array.from(new Set<string>([...(product?.sizes ?? []), ...fromVariants]));
  }, [product]);

  /** Stock available for one size (summed across its variants). */
  const stockForSize = (target: string) => {
    const variants = product?.variants ?? [];
    if (!variants.length) return product?.stock ?? 0;
    return variants
      .filter((v: any) => v.size === target)
      .reduce((sum: number, v: any) => sum + (Number(v?.stock) || 0), 0);
  };

  // Reset selections whenever a new product is opened (first in-stock size wins)
  useEffect(() => {
    if (open && product) {
      const firstInStock = sizes.find((s) => stockForSize(s) > 0);
      setSize(firstInStock ?? sizes[0] ?? "");
      setQuantity(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, product?._id]);

  // Lock body scroll while the drawer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [open]);

  // Mount flag for portal (avoid SSR issues)
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const outOfStock =
    product &&
    (typeof product.stock === "number"
      ? product.stock === 0
      : (product.variants?.reduce((sum: number, v: any) => sum + (v.stock || 0), 0) ?? 1) === 0);

  const handleAddToCart = () => {
    if (!product) return false;
    if (sizes.length && !size) {
      toast.error("Please select a size");
      return false;
    }
    if (sizes.length && stockForSize(size) <= 0) {
      toast.error("Selected size is out of stock");
      return false;
    }

    const variant = (product.variants || []).find((v: any) => v.size === size);

    addItem({
      _id: `${product._id}-${size}`,
      product: {
        _id: product._id,
        name: product.name,
        slug: product.slug,
        images: product.images,
      },
      variantId: variant?._id,
      size,
      color: variant?.color || "",
      quantity,
      price: product.price,
    });
    return true;
  };

  const onAddToCart = () => {
    if (handleAddToCart()) {
      toast.success("Added to cart", { description: product?.name });
      onOpenChange(false);
    }
  };

  const onBuyNow = () => {
    if (handleAddToCart()) {
      toast.success("Added to cart", { description: product?.name });
      onOpenChange(false);
      // Login-free checkout — guests can order directly
      router.push("/checkout");
    }
  };

  // Portal: render at document.body level so fixed positioning works exactly
  // like the cart drawer, even when nested inside transformed product cards
  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && product && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm"
            onClick={() => onOpenChange(false)}
          />

          {/* Drawer — follows the active theme: light surface in light mode, dark in dark mode */}
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="fixed right-0 top-0 z-[80] h-full w-full max-w-md border-l bg-background text-foreground shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 h-[72px] border-b shrink-0">
              <h2 className="text-xl font-extrabold uppercase italic tracking-wide">
                Choose Options
              </h2>
              <button
                onClick={() => onOpenChange(false)}
                className="h-9 w-9 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
                aria-label="Close"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-6 flex gap-5">
                {/* Product image */}
                <Link
                  href={`/product/${product.slug}`}
                  onClick={() => onOpenChange(false)}
                  className="relative h-[150px] w-[150px] shrink-0 bg-muted overflow-hidden"
                >
                  <Image
                    src={getImageUrl(product.images?.[0] || "")}
                    alt={product.name}
                    fill
                    sizes="150px"
                    className="object-cover"
                  />
                </Link>

                {/* Name + price + description + view details */}
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/product/${product.slug}`}
                    onClick={() => onOpenChange(false)}
                    className="block font-extrabold uppercase leading-snug text-base hover:text-brand-gold transition-colors"
                  >
                    {product.name}
                  </Link>
                  <p className="mt-2 text-lg font-semibold">
                    Rs.{product.price.toLocaleString()}
                  </p>
                  {(product.shortDescription || product.description) && (
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground line-clamp-2">
                      {richTextToPlainText(product.shortDescription || product.description)}
                    </p>
                  )}
                  <Link
                    href={`/product/${product.slug}`}
                    onClick={() => onOpenChange(false)}
                    className="inline-block mt-3 text-sm underline underline-offset-4 text-muted-foreground hover:text-brand-gold transition-colors"
                  >
                    View details
                  </Link>
                  {outOfStock && (
                    <span className="block mt-3 text-xs font-semibold text-destructive">
                      Out of Stock
                    </span>
                  )}
                </div>
              </div>

              {/* Size boxes — vertical column */}
              {sizes.length > 0 && (
                <div className="px-6 pb-6">
                  <p className="text-xs font-bold uppercase tracking-widest mb-3">
                    Size
                  </p>
                  <div className="flex flex-col gap-2.5">
                    {sizes.map((s: string) => {
                      const inStock = stockForSize(s) > 0;
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => inStock && setSize(s)}
                          disabled={!inStock}
                          aria-pressed={size === s}
                          className={`flex h-12 w-full items-center justify-between border px-3 text-sm font-semibold transition-all ${
                            size === s
                              ? "border-brand-gold bg-brand-gold text-white"
                              : inStock
                                ? "border-border hover:border-brand-gold/60"
                                : "cursor-not-allowed border-border text-muted-foreground"
                          }`}
                        >
                          <span className={inStock ? "" : "line-through"}>
                            {normalizeSizeLabel(s)}
                          </span>
                          {!inStock && (
                            <span className="text-[11px] font-medium uppercase tracking-wide">
                              Out of stock
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Footer — quantity + add to cart */}
            <div className="border-t px-6 py-5 space-y-3 shrink-0">
              <div className="flex items-center gap-4">
                <div className="flex items-center border h-12">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="h-full w-11 flex items-center justify-center hover:bg-muted transition-colors"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-10 text-center text-sm font-bold">{quantity}</span>
                  <button
                    onClick={() => setQuantity((q) => q + 1)}
                    className="h-full w-11 flex items-center justify-center hover:bg-muted transition-colors"
                    aria-label="Increase quantity"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                <button
                  onClick={onAddToCart}
                  disabled={outOfStock}
                  className="flex-1 h-12 bg-brand-gold hover:bg-brand-gold-dark disabled:opacity-40 text-white text-sm font-extrabold uppercase italic tracking-widest transition-colors"
                >
                  Add to Cart
                </button>
              </div>

              <button
                onClick={onBuyNow}
                disabled={outOfStock}
                className="w-full h-12 border border-brand-gold text-brand-gold hover:bg-brand-gold hover:text-white disabled:opacity-40 text-sm font-extrabold uppercase italic tracking-widest transition-colors"
              >
                Buy Now
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}