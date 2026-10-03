"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Package, Truck } from "lucide-react";
import { cn, getImageUrl } from "@/lib/utils";
import { useStoreSettings } from "@/hooks/useStoreSettings";

export interface OrderSummaryLine {
  id: string;
  name: string;
  image?: string;
  quantity: number;
  price: number;
  size?: string;
  color?: string;
}

interface OrderSummaryProps {
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  /** Rendered as a scrollable list when provided (checkout + confirmation). */
  items?: OrderSummaryLine[];
  coupon?: string;
  className?: string;
  /** Extra content under the totals (coupon code, payment note, …). */
  children?: React.ReactNode;
}

/**
 * Sticky order summary for the checkout flow — shows every line that is about
 * to be ordered, then the money breakdown, always with server-calculated
 * numbers passed down from the page.
 */
export default function OrderSummary({
  subtotal,
  discount,
  shipping,
  total,
  items,
  coupon,
  className,
  children,
}: OrderSummaryProps) {
  const { format } = useStoreSettings();
  const count = (items || []).reduce((sum, line) => sum + line.quantity, 0);

  return (
    <div
      className={cn(
        "lg:sticky lg:top-24 overflow-hidden rounded-2xl border bg-card shadow-premium",
        className
      )}
    >
      <div className="border-b bg-gradient-to-r from-brand-gold/10 via-transparent to-transparent px-6 py-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-brand-gold">
          Your Order
        </p>
        <h2 className="mt-1 font-serif text-2xl">
          {count > 0
            ? `${count} ${count === 1 ? "item" : "items"}`
            : "Order summary"}
        </h2>
      </div>

      {items && items.length > 0 && (
        <div className="max-h-64 space-y-3 overflow-y-auto border-b px-6 py-5">
          {items.map((line) => (
            <div key={line.id} className="flex items-center gap-3">
              <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-muted ring-1 ring-black/5">
                {line.image ? (
                  <Image
                    src={getImageUrl(line.image)}
                    alt={line.name}
                    fill
                    sizes="56px"
                    className="object-cover"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center">
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </span>
                )}
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-gold px-1 text-[10px] font-bold text-white shadow-gold">
                  {line.quantity}
                </span>
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium">
                  {line.name}
                </span>
                {(line.size || line.color) && (
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">
                    {[line.size, line.color].filter(Boolean).join(" · ")}
                  </span>
                )}
              </span>

              <span className="shrink-0 text-sm font-semibold">
                {format(line.price * line.quantity)}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-4 px-6 py-5">
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium">{format(subtotal)}</span>
          </div>
          {discount > 0 && (
            <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
              <span>Discount</span>
              <span className="font-medium">− {format(discount)}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Shipping</span>
            <span className={cn("font-medium", shipping === 0 && "text-brand-gold")}>
              {shipping === 0 ? "Free" : format(shipping)}
            </span>
          </div>
        </div>

        {/* Free shipping is permanent — every order ships free */}
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          <Truck className="h-4 w-4 shrink-0" />
          Free shipping on every order
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

        <div className="flex items-baseline justify-between">
          <span className="font-serif text-lg">Total</span>
          <motion.span
            key={total}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="text-2xl font-bold text-brand-gold"
          >
            {format(total)}
          </motion.span>
        </div>

        {coupon && (
          <p className="rounded-xl border border-brand-gold/30 bg-brand-gold/5 px-3 py-2 text-[11px] font-semibold text-brand-gold">
            Coupon applied: {coupon}
          </p>
        )}

        {children}
      </div>
    </div>
  );
}
