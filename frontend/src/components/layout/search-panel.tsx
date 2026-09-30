"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Clock3,
  CornerDownLeft,
  Loader2,
  Package,
  Search,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";
import api from "@/lib/api";
import { getImageUrl } from "@/lib/utils";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { useSearchStore } from "@/stores/search-store";
import type { Category, Product } from "@/types";

/** Flattens the category tree into a searchable list that keeps the nesting level. */
const flattenCategories = (nodes: Category[], level = 0) =>
  nodes.flatMap((node) => [
    { ...node, level },
    ...flattenCategories(node.children || [], level + 1),
  ]);

/** One selectable row in the panel — keyboard navigation walks this list. */
interface Option {
  key: string;
  href: string;
  kind: "product" | "category";
  label: string;
  meta?: string;
  price?: number;
  image?: string;
}

interface SearchPanelProps {
  /** Current text in the header input. */
  query: string;
  /** Category suggestions are filtered client-side from the cached tree. */
  categories: Category[];
  onClose: () => void;
  /** Fired when the shopper asks for the full result list. */
  onSearch: (term: string) => void;
  /** Mobile renders the panel inline as a sheet under the field. */
  variant?: "dropdown" | "sheet";
}

/**
 * Live search suggestions.
 *
 * Typing in the header searches the catalogue (name, tags and SKUs) and shows
 * the first matches right under the field, together with matching categories
 * and the shopper's recent searches. Submitting never opens a separate page —
 * it sends the shopper to the existing listing page with `?search=`.
 */
export default function SearchPanel({
  query,
  categories,
  onClose,
  onSearch,
  variant = "dropdown",
}: SearchPanelProps) {
  const router = useRouter();
  const listRef = useRef<HTMLDivElement>(null);
  const [term, setTerm] = useState("");
  const [active, setActive] = useState(-1);

  const recent = useSearchStore((state) => state.recent);
  const remember = useSearchStore((state) => state.remember);
  const forget = useSearchStore((state) => state.forget);
  const clearRecent = useSearchStore((state) => state.clear);
  const { format } = useStoreSettings();

  // Debounce so typing stays smooth while the API is queried
  useEffect(() => {
    const timer = setTimeout(() => setTerm(query.trim()), 220);
    return () => clearTimeout(timer);
  }, [query]);

  const isSearching = term.length >= 2;

  const { data: products, isFetching } = useQuery({
    queryKey: ["search-suggestions", term],
    queryFn: () =>
      api
        .get(`/products?search=${encodeURIComponent(term)}&isActive=true&limit=6`)
        .then((res) => res.data.data.data ?? []),
    enabled: isSearching,
    staleTime: 30 * 1000,
  });

  const productMatches: Product[] = useMemo(
    () => (isSearching ? ((products as Product[]) || []) : []),
    [products, isSearching]
  );

  const categoryMatches = useMemo(() => {
    if (!isSearching) return [];
    const needle = term.toLowerCase();
    return flattenCategories(categories)
      .filter((category) => category.name.toLowerCase().includes(needle))
      .slice(0, 3);
  }, [categories, term, isSearching]);

  const options = useMemo<Option[]>(() => {
    const rows: Option[] = productMatches.map((product) => ({
      key: `p-${product._id}`,
      href: `/product/${product.slug}`,
      kind: "product" as const,
      label: product.name,
      meta: product.category?.name || product.sku || "",
      price: product.price,
      image: product.images?.[0],
    }));

    categoryMatches.forEach((category) => {
      rows.push({
        key: `c-${category._id}`,
        href: `/product-category/${category.slug}`,
        kind: "category",
        label: category.name,
        meta: category.level === 0 ? "Category" : "Sub-category",
      });
    });

    return rows;
  }, [productMatches, categoryMatches]);

  // Reset the highlight whenever the option list changes
  useEffect(() => setActive(-1), [term, options.length]);

  // Keep the highlighted row visible while arrowing through the list
  useEffect(() => {
    if (active < 0) return;
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const go = (option: Option) => {
    remember(term || option.label);
    onClose();
    router.push(option.href);
  };

  const submitAll = (value: string = term) => {
    const cleaned = value.trim();
    if (cleaned.length < 2) return;
    remember(cleaned);
    onSearch(cleaned);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((prev) => (options.length ? (prev + 1) % options.length : -1));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((prev) => (options.length ? (prev <= 0 ? options.length - 1 : prev - 1) : -1));
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      if (active >= 0 && options[active]) go(options[active]);
      else submitAll();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: variant === "sheet" ? 0 : -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: variant === "sheet" ? 0 : -8 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      onKeyDown={handleKeyDown}
      className={
        variant === "sheet" ? "mt-3 w-full" : "absolute left-0 right-0 top-full z-50 mt-2"
      }
    >
      <div className="overflow-hidden rounded-2xl border border-border/70 bg-popover/95 shadow-premium-lg ring-1 ring-brand-gold/10 backdrop-blur-xl">
        {/* ---------- panel header ---------- */}
        <div className="flex items-center justify-between gap-3 border-b px-4 py-2.5">
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-gold">
            {isSearching ? (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                {productMatches.length} match{productMatches.length === 1 ? "" : "es"}
                {isFetching && <Loader2 className="h-3 w-3 animate-spin" />}
              </>
            ) : (
              <>
                <TrendingUp className="h-3.5 w-3.5" />
                {recent.length ? "Your recent searches" : "Start typing to search"}
              </>
            )}
          </p>
          {isSearching ? (
            <button
              type="button"
              onClick={() => submitAll()}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-brand-gold"
            >
              See all results
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            recent.length > 0 && (
              <button
                type="button"
                onClick={clearRecent}
                className="text-xs font-medium text-muted-foreground transition-colors hover:text-destructive"
              >
                Clear
              </button>
            )
          )}
        </div>

        {/* ---------- results / recents ---------- */}
        <div ref={listRef} className="max-h-[min(62vh,420px)] overflow-y-auto">
          {isSearching ? (
            <>
              {options.length === 0 && !isFetching && (
                <div className="px-4 py-8 text-center">
                  <Package className="mx-auto mb-2 h-8 w-8 text-muted-foreground/60" />
                  <p className="text-sm font-medium">No matches for “{term}”</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Try a different word, or browse the categories below.
                  </p>
                </div>
              )}

              {productMatches.length > 0 && (
                <p className="px-4 pb-1 pt-3 text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
                  Products
                </p>
              )}
              {options
                .map((option, index) => ({ option, index }))
                .filter(({ option }) => option.kind === "product")
                .map(({ option, index }) => (
                  <button
                    key={option.key}
                    type="button"
                    data-index={index}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => go(option)}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      active === index ? "bg-brand-gold/10" : "hover:bg-muted/70"
                    }`}
                  >
                    <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-muted ring-1 ring-black/5">
                      {option.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={getImageUrl(option.image)}
                          alt={option.label}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center">
                          <Package className="h-4 w-4 text-muted-foreground" />
                        </span>
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{option.label}</span>
                      {option.meta && (
                        <span className="block truncate text-[11px] text-muted-foreground">
                          {option.meta}
                        </span>
                      )}
                    </span>
                    {option.price != null && (
                      <span className="shrink-0 text-sm font-semibold text-brand-gold">
                        {format(option.price)}
                      </span>
                    )}
                  </button>
                ))}
              {categoryMatches.length > 0 && (
                <p className="px-4 pb-1 pt-3 text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
                  Categories
                </p>
              )}
              {options
                .map((option, index) => ({ option, index }))
                .filter(({ option }) => option.kind === "category")
                .map(({ option, index }) => (
                  <button
                    key={option.key}
                    type="button"
                    data-index={index}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => go(option)}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      active === index ? "bg-brand-gold/10" : "hover:bg-muted/70"
                    }`}
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-gold/10 text-brand-gold">
                      <Search className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{option.label}</span>
                      <span className="block text-[11px] text-muted-foreground">{option.meta}</span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>
                ))}
            </>
          ) : (
            <div className="p-2">
              {recent.length > 0 ? (
                <ul className="flex flex-col">
                  {recent.map((item) => (
                    <li key={item} className="group flex items-center">
                      <button
                        type="button"
                        onClick={() => submitAll(item)}
                        className="flex flex-1 items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/70"
                      >
                        <Clock3 className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="truncate">{item}</span>
                      </button>
                      <button
                        type="button"
                        aria-label={`Remove ${item} from recent searches`}
                        onClick={() => forget(item)}
                        className="mr-1 rounded-full p-1.5 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100 focus:opacity-100"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="px-3 py-2">
                  <p className="text-xs text-muted-foreground">
                    Search the full collection by name or SKU — matches appear right here, with no
                    separate page.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {flattenCategories(categories)
                      .slice(0, 6)
                      .map((category) => (
                        <Link
                          key={category._id}
                          href={`/product-category/${category.slug}`}
                          onClick={onClose}
                          className="rounded-full border px-3 py-1.5 text-xs font-medium transition-colors hover:border-brand-gold hover:text-brand-gold"
                        >
                          {category.name}
                        </Link>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ---------- keyboard hints ---------- */}
        <div className="flex items-center justify-between gap-3 border-t bg-muted/40 px-4 py-2 text-[11px] text-muted-foreground">
          <span className="hidden items-center gap-1.5 sm:flex">
            <kbd className="rounded border bg-background px-1.5 py-0.5 font-sans text-[10px]">↑</kbd>
            <kbd className="rounded border bg-background px-1.5 py-0.5 font-sans text-[10px]">↓</kbd>
            to browse
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="rounded border bg-background px-1.5 py-0.5 font-sans text-[10px]">Esc</kbd>
            to close
          </span>
          <span className="flex items-center gap-1.5">
            <CornerDownLeft className="h-3 w-3" />
            for all results
          </span>
        </div>
      </div>
    </motion.div>
  );
}
