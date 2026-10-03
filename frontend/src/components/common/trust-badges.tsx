"use client";

import { Banknote, PackageSearch, ShieldCheck, Truck } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrustBadgesProps {
  /** `grid` for sidebars, `strip` for a full-width band under a page header. */
  variant?: "grid" | "strip";
  className?: string;
}

/**
 * Small reassurance block used by the bag, checkout and tracking pages.
 * Every line states something the store actually does — nothing invented.
 */
export default function TrustBadges({
  variant = "grid",
  className,
}: TrustBadgesProps) {
  const badges = [
    {
      icon: ShieldCheck,
      title: "Guest checkout",
      note: "No account needed",
    },
    {
      icon: Truck,
      title: "Free shipping",
      note: "On every order",
    },
    {
      icon: Banknote,
      title: "Cash on Delivery",
      note: "Pay when it arrives",
    },
    {
      icon: PackageSearch,
      title: "Track anytime",
      note: "With your order code",
    },
  ];

  if (variant === "strip") {
    return (
      <div
        className={cn(
          "grid grid-cols-2 gap-3 rounded-2xl border bg-card p-4 md:grid-cols-4",
          className
        )}
      >
        {badges.map(({ icon: Icon, title, note }) => (
          <div key={title} className="flex items-start gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-gold/10 text-brand-gold">
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold leading-tight">{title}</p>
              <p className="text-[11px] text-muted-foreground">{note}</p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("space-y-3 rounded-2xl border bg-card p-5", className)}>
      {badges.map(({ icon: Icon, title, note }) => (
        <div key={title} className="flex items-start gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-gold/10 text-brand-gold">
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold leading-tight">{title}</p>
            <p className="text-[11px] text-muted-foreground">{note}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
