"use client";

import { motion } from "framer-motion";
import {
  BadgeCheck,
  Check,
  ClipboardCheck,
  Home,
  MapPin,
  Package,
  Truck,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Stage {
  key: string;
  label: string;
  hint: string;
  icon: LucideIcon;
}

/** Same order as the backend enum (`order.model.ts` → orderStatus). */
const STAGES: Stage[] = [
  { key: "pending", label: "Placed", hint: "We received it", icon: ClipboardCheck },
  { key: "confirmed", label: "Confirmed", hint: "Order verified", icon: BadgeCheck },
  { key: "processing", label: "Processing", hint: "Being packed", icon: Package },
  { key: "shipped", label: "Shipped", hint: "With the courier", icon: Truck },
  {
    key: "out_for_delivery",
    label: "Out for Delivery",
    hint: "Arriving today",
    icon: MapPin,
  },
  { key: "delivered", label: "Delivered", hint: "Enjoy your order", icon: Home },
];

interface OrderTimelineProps {
  /** `orderStatus` from the API. */
  status: string;
  className?: string;
}

/**
 * Fulfilment timeline — vertical on phones, horizontal from `md` up. Stages the
 * order has already passed are gold with a check mark, the current stage pulses
 * softly and everything still to come stays muted.
 */
export default function OrderTimeline({ status, className }: OrderTimelineProps) {
  const cancelled = status === "cancelled";
  const currentIndex = STAGES.findIndex((stage) => stage.key === status);
  const activeIndex = currentIndex < 0 ? 0 : currentIndex;

  return (
    <div className={className}>
      {cancelled && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div>
            <p className="text-sm font-semibold text-destructive">
              This order was cancelled
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              If you did not request this, contact us and we will sort it out
              right away.
            </p>
          </div>
        </div>
      )}

      <ol className="flex flex-col md:flex-row md:items-start">
        {STAGES.map((stage, index) => {
          const done = index < activeIndex;
          const active = index === activeIndex && !cancelled;
          const reached = done || active;
          const Icon = stage.icon;

          return (
            <li
              key={stage.key}
              className="relative flex flex-1 gap-4 pb-7 last:pb-0 md:flex-col md:items-center md:gap-0 md:pb-0 md:text-center"
            >
              {index > 0 && (
                <>
                  {/* vertical rail (phones) */}
                  <span
                    className={cn(
                      "absolute -top-7 left-[19px] h-7 w-[2px] md:hidden",
                      reached ? "bg-brand-gold" : "bg-border"
                    )}
                  />
                  {/* horizontal rail (desktop) */}
                  <span
                    className={cn(
                      "absolute left-0 top-5 hidden h-[2px] w-1/2 md:block",
                      reached ? "bg-brand-gold" : "bg-border"
                    )}
                  />
                </>
              )}

              <span
                className={cn(
                  "relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-300",
                  done &&
                    "border-brand-gold bg-gradient-to-br from-brand-gold to-brand-gold-dark text-white shadow-gold",
                  active &&
                    "border-brand-gold bg-background text-brand-gold ring-4 ring-brand-gold/15",
                  !done &&
                    !active &&
                    "border-border bg-muted text-muted-foreground"
                )}
              >
                {done ? (
                  <Check className="h-4.5 w-4.5" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
                {active && (
                  <motion.span
                    className="absolute inset-0 rounded-full border border-brand-gold/50"
                    animate={{ scale: [1, 1.45], opacity: [0.6, 0] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
                  />
                )}
              </span>

              <span className="min-w-0 md:mt-3">
                <span
                  className={cn(
                    "block text-[13px] font-semibold leading-tight",
                    active ? "text-brand-gold" : "text-foreground",
                    !done && !active && "text-muted-foreground"
                  )}
                >
                  {stage.label}
                </span>
                <span className="mt-0.5 block text-[11px] text-muted-foreground">
                  {stage.hint}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
