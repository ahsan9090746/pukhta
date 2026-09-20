"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X, Minus, Plus, ShoppingCart, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useCartStore } from "@/stores/cart-store";
import { getImageUrl } from "@/lib/utils";
import { Product } from "@/types";
import { toast } from "sonner";

interface QuickViewDialogProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function QuickViewDialog({ product, open, onOpenChange }: QuickViewDialogProps) {
  const addItem = useCartStore((s) => s.addItem);
  const router = useRouter();
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [qty, setQty] = useState(1);

  if (!product) return null;

  const hasDiscount = product.compareAtPrice && product.compareAtPrice > product.price;
  const discountPct = hasDiscount
    ? Math.round(((product.compareAtPrice! - product.price) / product.compareAtPrice!) * 100)
    : 0;
  const images = product.images?.length ? product.images : [""];
  const sizes: string[] = product.sizes ?? product.variants?.map((v: any) => v.size).filter(Boolean) ?? [];
  const colors: string[] = product.colors ?? product.variants?.map((v: any) => v.color).filter(Boolean) ?? [];
  const stock =
    typeof product.stock === "number"
      ? product.stock
      : (product.variants?.reduce(
          (sum: number, v: any) => sum + (v.stock || 0),
          0
        ) ?? 0);

  const resetAndClose = (o: boolean) => {
    if (!o) {
      setSelectedImage(0);
      setSelectedSize("");
      setSelectedColor("");
      setQty(1);
    }
    onOpenChange(o);
  };

  const handleAddToCart = (goToCart: boolean = false) => {
    if (sizes.length > 0 && !selectedSize) {
      toast.error("Please select a size");
      return;
    }
    if (colors.length > 0 && !selectedColor) {
      toast.error("Please select a color");
      return;
    }
    const variant = (product.variants || []).find(
      (v: any) => (v.size || "") === selectedSize
    );
    addItem({
      _id: `${product._id}-${selectedSize}-${selectedColor}`,
      product: { _id: product._id, name: product.name, slug: product.slug, images: product.images },
      variantId: variant?._id,
      size: selectedSize,
      color: selectedColor,
      quantity: qty,
      price: product.price,
    });
    toast.success(goToCart ? "Added — taking you to cart" : "Added to cart", { description: product.name });
    if (goToCart) {
      router.push("/cart");
    } else {
      resetAndClose(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        <DialogTitle className="sr-only">{product.name} — Quick View</DialogTitle>
        <button
          onClick={() => resetAndClose(false)}
          className="absolute top-3 right-3 z-20 h-8 w-8 rounded-full bg-background/90 border shadow flex items-center justify-center hover:bg-muted transition-colors"
          aria-label="Close quick view"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="grid md:grid-cols-2">
          {/* Image side */}
          <div className="relative aspect-square bg-muted">
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedImage}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="absolute inset-0"
              >
                <Image
                  src={getImageUrl(images[selectedImage] || "")}
                  alt={product.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 384px"
                  className="object-cover"
                />
              </motion.div>
            </AnimatePresence>
            {hasDiscount && (
              <Badge className="absolute top-3 left-3 bg-gold text-white hover:bg-gold">
                -{discountPct}%
              </Badge>
            )}
            {images.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
                {images.slice(0, 5).map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={`relative h-10 w-10 rounded-md overflow-hidden border-2 transition-all ${
                      selectedImage === i ? "border-gold" : "border-white/60 opacity-70 hover:opacity-100"
                    }`}
                  >
                    <Image src={getImageUrl(img)} alt="" fill sizes="40px" className="object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details side */}
          <div className="p-6 md:p-8 space-y-4">
            <h3 className="text-xl font-bold leading-snug">{product.name}</h3>

            <div className="flex items-baseline gap-3">
              <span className="text-2xl font-bold text-gold-dark">Rs {product.price.toLocaleString()}</span>
              {hasDiscount && (
                <span className="text-muted-foreground line-through">
                  Rs {product.compareAtPrice!.toLocaleString()}
                </span>
              )}
            </div>

            {stock > 0 ? (
              <p className="text-sm text-green-600">In stock</p>
            ) : (
              <p className="text-sm text-destructive">Out of stock</p>
            )}

            {sizes.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Size</p>
                <div className="flex flex-wrap gap-2">
                  {sizes.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSelectedSize(s)}
                      className={`min-w-[44px] h-9 px-2 rounded-md border text-sm font-medium transition-all ${
                        selectedSize === s
                          ? "bg-foreground text-background border-foreground"
                          : "border-input hover:border-foreground"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {colors.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Color</p>
                <div className="flex flex-wrap gap-2">
                  {colors.map((c) => (
                    <button
                      key={c}
                      onClick={() => setSelectedColor(c)}
                      className={`h-9 px-3 rounded-md border text-sm capitalize transition-all ${
                        selectedColor === c
                          ? "bg-foreground text-background border-foreground"
                          : "border-input hover:border-foreground"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Qty + Add to cart */}
            <div className="flex items-center gap-3 pt-2">
              <div className="flex items-center border rounded-md">
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="h-10 w-10 flex items-center justify-center hover:bg-muted"
                  aria-label="Decrease quantity"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-10 text-center font-medium">{qty}</span>
                <button
                  onClick={() => setQty((q) => q + 1)}
                  className="h-10 w-10 flex items-center justify-center hover:bg-muted"
                  aria-label="Increase quantity"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 grid grid-cols-2 gap-2">
                <Button
                  onClick={() => handleAddToCart(false)}
                  disabled={stock === 0}
                  className="h-10 bg-gold hover:bg-gold-dark text-white"
                >
                  <ShoppingCart className="h-4 w-4 mr-1.5" />
                  {stock === 0 ? "Out of Stock" : "Add to Cart"}
                </Button>
                <Button
                  onClick={() => handleAddToCart(true)}
                  disabled={stock === 0}
                  className="h-10 bg-foreground text-background hover:opacity-90"
                >
                  Buy Now
                </Button>
              </div>
            </div>

            <Link
              href={`/products/${product.slug}`}
              onClick={() => resetAndClose(false)}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-gold-dark transition-colors pt-1"
            >
              View full details
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}