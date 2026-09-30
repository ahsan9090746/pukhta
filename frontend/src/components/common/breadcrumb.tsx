"use client";

import { Fragment } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  /**
   * Lets the trail wrap instead of squeezing the last item. Used by the product
   * page, where the current item is the (long) product name: it stays on the
   * category line when it fits, otherwise it drops as a whole — bold, small,
   * never broken mid-way — onto its own line below. Off by default so every
   * other breadcrumb renders exactly as before.
   */
  wrap?: boolean;
  /**
   * `inverted` renders the trail for dark backgrounds (e.g. the category page
   * hero image) — white text instead of the theme's muted/foreground colours.
   * Defaults to `default`, so existing usages are untouched.
   */
  variant?: "default" | "inverted";
}

export default function Breadcrumb({
  items,
  wrap = false,
  variant = "default",
}: BreadcrumbProps) {
  const inverted = variant === "inverted";

  return (
    <nav
      className={cn(
        "flex text-sm",
        inverted ? "text-white/60" : "text-muted-foreground",
        wrap ? "flex-wrap items-center gap-y-1" : "items-center"
      )}
    >
      {items.map((item, index) => {
        const isCurrent = index === items.length - 1;

        const node = item.href ? (
          <Link
            href={item.href}
            className={cn(
              "transition-colors",
              inverted ? "hover:text-white" : "hover:text-foreground"
            )}
          >
            {item.label}
          </Link>
        ) : (
          <span
            className={cn(
              inverted ? "font-medium text-white" : "text-foreground",
              wrap && isCurrent && "min-w-0 max-w-full truncate font-semibold"
            )}
          >
            {item.label}
          </span>
        );

        // The current (last) item never carries a trailing separator, so the
        // separator stays at the end of the category row when `wrap` drops the
        // current item — the long product name — onto its own line below.
        if (isCurrent) return <Fragment key={index}>{node}</Fragment>;

        // Label + separator stay one atomic unit: they always fit or wrap
        // together, so a separator can never end up stranded on its own row.
        return (
          <span key={index} className="flex items-center">
            {node}
            <ChevronRight
              className={cn(
                "h-4 w-4 mx-2 shrink-0",
                inverted && "text-white/40"
              )}
            />
          </span>
        );
      })}
    </nav>
  );
}
