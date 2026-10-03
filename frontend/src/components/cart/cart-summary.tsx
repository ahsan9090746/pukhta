"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Lock, ShoppingBag, Tag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useStoreSettings } from "@/hooks/useStoreSettings";

interface CartSummaryProps {
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  coupon?: string;
  itemCount?: number;
  isApplyingCoupon?: boolean;
  onApplyCoupon?: (code: string) => void;
  onRemoveCoupon?: () => void;
  /** Small note rendered under the CTA (e.g. the guest-cart hint). */
  note?: React.ReactNode;
  className?: string;
}

/** Premium order summary used on the bag page. */
export default function CartSummary({
  subtotal,
  discount,
  shipping,
  total,
  coupon,
  itemCount,
  isApplyingCoupon = false,
  onApplyCoupon,
  onRemoveCoupon,
  note,
  className,
}: CartSummaryProps) {
  const { format } = useStoreSettings();
  const [couponCode, setCouponCode] = useState("");

  const handleApplyCoupon = (event: React.FormEvent) => {
    event.preventDefault();
    const code = couponCode.trim();
    if (!code || !onApplyCoupon) return;
    onApplyCoupon(code);
    setCouponCode("");
  };

  return (
    <div
      className={cn(
        "lg:sticky lg:top-24 overflow-hidden rounded-2xl border bg-card shadow-premium",
        className
      )}
    >
      <div className="border-b bg-gradient-to-r from-brand-gold/10 via-transparent to-transparent px-6 py-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-brand-gold">
          Order Summary
        </p>
        <h2 className="mt-1 font-serif text-2xl">
          {typeof itemCount === "number" && itemCount > 0
            ? `${itemCount} ${itemCount === 1 ? "item" : "items"}`
            : "Your total"}
        </h2>
      </div>

      <div className="space-y-4 px-6 py-5">
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium">{format(subtotal)}</span>
          </div>

          {discount > 0 && (
            <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
              <span className="flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5" />
                Discount
              </span>
              <span className="font-medium">− {format(discount)}</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Shipping</span>
            <span
              className={cn(
                "font-medium",
                shipping === 0 && "text-brand-gold"
              )}
            >
              {shipping === 0 ? "Free" : format(shipping)}
            </span>
          </div>
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

        <div className="flex items-baseline justify-between">
          <span className="font-serif text-lg">Total</span>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={total}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="text-2xl font-bold text-brand-gold"
            >
              {format(total)}
            </motion.span>
          </AnimatePresence>
        </div>

        {onApplyCoupon && !coupon && (
          <form onSubmit={handleApplyCoupon} className="flex gap-2">
            <Input
              placeholder="Coupon code"
              value={couponCode}
              onChange={(event) => setCouponCode(event.target.value)}
              className="h-10"
            />
            <Button
              type="submit"
              variant="outline"
              className="h-10 shrink-0"
              disabled={isApplyingCoupon}
            >
              {isApplyingCoupon ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Apply"
              )}
            </Button>
          </form>
        )}

        {coupon && (
          <div className="flex items-center justify-between rounded-xl border border-brand-gold/30 bg-brand-gold/5 px-3 py-2">
            <span className="flex items-center gap-2 text-xs font-semibold text-brand-gold">
              <Tag className="h-3.5 w-3.5" />
              {coupon}
            </span>
            {onRemoveCoupon && (
              <button
                type="button"
                onClick={onRemoveCoupon}
                aria-label="Remove coupon"
                className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}

        <Button
          asChild
          size="lg"
          className="h-12 w-full bg-brand-gold text-sm font-semibold uppercase tracking-wide text-white hover:bg-brand-gold-dark"
        >
          <Link href="/checkout">
            <ShoppingBag className="mr-2 h-4 w-4" />
            Proceed to Checkout
          </Link>
        </Button>

        <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
          <Lock className="h-3 w-3" />
          Secure checkout · no account needed
        </p>

        {note && <div className="text-[11px] text-muted-foreground">{note}</div>}
      </div>
    </div>
  );
}
