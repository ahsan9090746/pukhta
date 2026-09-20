"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X, Minus, Plus, Trash2, ShoppingBag, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/stores/cart-store";
import { useAuthStore } from "@/stores/auth-store";
import { getImageUrl } from "@/lib/utils";

interface CartDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CartDrawer({ open, onOpenChange }: CartDrawerProps) {
  const router = useRouter();
  const { items, updateQuantity, removeItem } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  const subtotal = items.reduce(
    (total, item) => total + (item.price || 0) * (item.quantity || 0),
    0
  );

  // Lock body scroll while the drawer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [open]);

  const goToCheckout = () => {
    onOpenChange(false);
    // Login-free checkout — guests can order directly
    router.push("/checkout");
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm"
            onClick={() => onOpenChange(false)}
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="fixed right-0 top-0 z-[80] h-full w-full max-w-md bg-background shadow-2xl flex flex-col"
          >
            <div className="flex items-center justify-between px-5 h-16 border-b shrink-0">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-gold" />
                <h2 className="font-semibold text-lg">Your Cart</h2>
                <span className="text-sm text-muted-foreground">({items.length})</span>
              </div>
              <button
                onClick={() => onOpenChange(false)}
                className="h-9 w-9 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
                aria-label="Close cart"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {items.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
                <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
                  <ShoppingBag className="h-9 w-9 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-lg">Your cart is empty</h3>
                <p className="text-sm text-muted-foreground">
                  Add some products to get started!
                </p>
                <Button
                  asChild
                  className="bg-gold hover:bg-gold-dark text-white"
                  onClick={() => onOpenChange(false)}
                >
                  <Link href="/products">Start Shopping</Link>
                </Button>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                  {items.map((item) => (
                    <motion.div
                      key={item._id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex gap-3 p-2.5 rounded-xl border bg-card"
                    >
                      <Link
                        href={`/products/${item.product?.slug}`}
                        onClick={() => onOpenChange(false)}
                        className="relative h-20 w-20 rounded-lg overflow-hidden bg-muted shrink-0"
                      >
                        <Image
                          src={getImageUrl(item.product?.images?.[0] || "")}
                          alt={item.product?.name || "Product"}
                          fill
                          sizes="80px"
                          className="object-cover"
                        />
                      </Link>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <Link
                            href={`/products/${item.product?.slug}`}
                            onClick={() => onOpenChange(false)}
                            className="text-sm font-medium line-clamp-1 hover:text-gold-dark transition-colors"
                          >
                            {item.product?.name || "Product"}
                          </Link>
                          <button
                            onClick={() => removeItem(item._id)}
                            className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                            title="Remove item"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          {item.size && (
                            <span className="text-[11px] px-1.5 py-0.5 rounded bg-muted">Size: {item.size}</span>
                          )}
                          {item.color && (
                            <span className="text-[11px] px-1.5 py-0.5 rounded bg-muted capitalize">{item.color}</span>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center border rounded-md">
                            <button
                              onClick={() => updateQuantity(item._id, Math.max(1, item.quantity - 1))}
                              className="h-7 w-7 flex items-center justify-center hover:bg-muted"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="w-7 text-center text-sm font-medium">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item._id, item.quantity + 1)}
                              className="h-7 w-7 flex items-center justify-center hover:bg-muted"
                              aria-label="Increase quantity"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                          <span className="text-sm font-bold text-gold-dark">
                            Rs {((item.price || 0) * (item.quantity || 0)).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="border-t px-5 py-4 space-y-3 bg-card shrink-0">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-bold text-gold-dark">Rs {subtotal.toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Delivery: Free on all orders
                  </p>
                  <Button
                    onClick={goToCheckout}
                    className="w-full h-11 bg-gold hover:bg-gold-dark text-white font-semibold"
                  >
                    <ShoppingBag className="h-4 w-4 mr-2" />
                    Checkout
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      onOpenChange(false);
                      router.push("/cart");
                    }}
                    className="w-full h-10"
                  >
                    View Full Cart
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                  {!isAuthenticated && (
                    <p className="text-[11px] text-muted-foreground text-center">
                      You will need to login at checkout — your cart is saved.
                    </p>
                  )}
                </div>
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}