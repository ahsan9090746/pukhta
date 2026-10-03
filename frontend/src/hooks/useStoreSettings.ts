"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import type { Settings } from "@/types";

/**
 * Store settings shared by the bag / checkout / tracking flows.
 *
 * Reads the same `site-settings` React Query key the rest of the storefront
 * uses, so nothing is fetched twice and the currency, contact details and
 * shipping rules always come from the API instead of being hardcoded.
 */
export function useStoreSettings() {
  const { data: settings, isLoading } = useQuery({
    queryKey: ["site-settings"],
    queryFn: () =>
      api.get("/settings").then((res) => res.data.data.settings as Settings),
    staleTime: 5 * 60 * 1000,
  });

  const currency = settings?.currency || "PKR";

  return {
    settings,
    isLoading,
    currency,
    /** Currency-aware price formatting (en-PK renders as "Rs 4,499"). */
    format: (amount: number) => formatCurrency(Number(amount) || 0, currency),
    storePhone: settings?.storePhone || "",
    storeEmail: settings?.storeEmail || "",
    shippingCost: Number(settings?.shippingCost) || 0,
    freeShippingThreshold: Number(settings?.freeShippingThreshold) || 0,
  };
}

export default useStoreSettings;
