"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { trackEvent } from "@/lib/analytics";

/**
 * Records one page_view event per storefront route change.
 * Rendered inside AppShell (store pages only) — the admin panel is not tracked.
 */
export default function PageViewTracker() {
  const pathname = usePathname();
  const lastTracked = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) return;
    if (lastTracked.current === pathname) return;

    lastTracked.current = pathname;
    trackEvent("page_view", { path: pathname });
  }, [pathname]);

  return null;
}