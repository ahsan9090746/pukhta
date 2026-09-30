"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import api from "@/lib/api";
import { Category, Product } from "@/types";
import ProductCard from "@/components/product/product-card";
import Breadcrumb from "@/components/common/breadcrumb";
import CategoryFilters from "@/components/product-category/category-filters";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ArrowLeft, Grid2X2, LayoutGrid, List, SearchX, SlidersHorizontal, Sparkles, X } from "lucide-react";

interface ProductCategoryContentProps {
  initialSlug?: string;
  /**
   * Title for the "browse everything" view. `/product-category` keeps the
   * default; `/shop` passes "Shop" so both URLs behave identically apart from
   * the label and the URL itself.
   */
  allProductsLabel?: string;
  /**
   * Category resolved on the server by the `[slug]` route. It seeds the hero
   * title / eyebrow / subtitle / breadcrumb so the first paint (and the HTML
   * crawlers see) already contains the real category name instead of the
   * generic "All Products" label.
   */
  initialCategory?: Category | null;
}

/** Hero background image supplied from /public by the store owner. */
const HERO_IMAGE = "/product-cat.png";

const PER_PAGE_OPTIONS = [9, 12, 18, 24];

/**
 * Static interface copy only — every piece of *content* (title, subtitle,
 * categories, counts, prices) is read from the API, never hardcoded.
 */
const UI = {
  allProducts: "All Products",
  eyebrow: "Shop by Category",
  newArrivals: "New Arrivals",
  newArrivalsHint: "Check back soon — fresh styles are on the way!",
  sortBy: "Sort by",
  show: "Show",
  showing: "Showing",
  of: "of",
  product: "product",
  products: "products",
  onSale: "On sale",
  inStock: "In stock",
  noProducts: "No products found",
  clearFilters: "Clear all filters",
  viewAll: "View All Products",
  exploreAll: "Explore All Products",
  back: "Back",
  searchResults: "Search results",
  clearSearch: "Clear search",
  searchHint: "matching names, tags and SKUs across the catalogue",
  noSearchResults: "Nothing matched your search",
  trySearchAgain: "Try a different word, or clear the search to browse everything.",
} as const;

const SORT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "default", label: "Default" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "name-asc", label: "Name: A to Z" },
  { value: "newest", label: "Newest first" },
  { value: "best-selling", label: "Best Selling" },
  { value: "top-rated", label: "Top Rated" },
];

/**
 * Query-string `sort` values (used by footer / header quick links and any old
 * `/product?sort=…` links) mapped to this page's toolbar sort keys.
 */
const SORT_PARAM_MAP: Record<string, string> = {
  newest: "newest",
  "-createdAt": "newest",
  "price-asc": "price-asc",
  price: "price-asc",
  "price-desc": "price-desc",
  "-price": "price-desc",
  "name-asc": "name-asc",
  "best-selling": "best-selling",
  "-numReviews": "best-selling",
  "-sold": "best-selling",
  "top-rated": "top-rated",
  "-averageRating": "top-rated",
  "-ratingsAverage": "top-rated",
  "-rating": "top-rated",
};

const resolveSortParam = (value: string | null): string =>
  (value && SORT_PARAM_MAP[value]) || "default";

const stockOf = (p: Product) =>
  typeof p.stock === "number"
    ? p.stock
    : (p.variants?.reduce((s: number, v: any) => s + (v.stock || 0), 0) ?? 0);

const onSaleOf = (p: Product) =>
  !!(p.compareAtPrice && p.compareAtPrice > p.price);

const sizesOf = (p: Product): string[] => {
  const set = new Set<string>();
  (p.sizes || []).forEach((s) => s && set.add(String(s)));
  (p.variants || []).forEach((v: any) => v.size && set.add(String(v.size)));
  return [...set];
};

export default function ProductCategoryContent({
  initialSlug,
  allProductsLabel = UI.allProducts,
  initialCategory = null,
}: ProductCategoryContentProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  /**
   * Both `/product-category` and `/shop` render this component, so "browse
   * everything" navigation always returns to whichever root the visitor is on.
   */
  const rootPath = pathname?.startsWith("/shop") ? "/shop" : "/product-category";

  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: () =>
      api.get("/categories?limit=50").then((res) => res.data.data.data ?? []),
  });

  const { data: newArrivalsCount } = useQuery({
    queryKey: ["new-arrivals-count"],
    queryFn: () =>
      api
        .get("/products?isNewArrival=true&isActive=true&limit=1")
        .then((res) => res.data.data.pagination?.total ?? 0),
  });

  // Store settings drive the hero subtitle and the currency used by the sidebar.
  const { data: settings } = useQuery({
    queryKey: ["site-settings"],
    queryFn: () => api.get("/settings").then((res) => res.data.data.settings),
    staleTime: 5 * 60 * 1000,
  });

  const currency = settings?.currency || "PKR";

  const items = Array.isArray(categories) ? categories : [];
  const parentCategories = items.filter((c: Category) => !c.parent);

  const activeSlug = initialSlug || searchParams.get("sub") || null;

  /**
   * `?search=` renders live results on this same listing page — the header
   * suggestions send shoppers here instead of to a separate search route.
   */
  const searchQuery = (searchParams.get("search") || "").trim();
  const isSearching = searchQuery.length >= 2;

  /**
   * Prefers the live category list and falls back to the server-fetched
   * category so the hero is correct on the very first paint.
   */
  const currentCategory = useMemo(() => {
    if (!activeSlug || activeSlug === "new-arrival") return null;
    return (
      items.find((c: Category) => c.slug === activeSlug) ||
      (initialCategory?.slug === activeSlug ? initialCategory : null)
    );
  }, [items, activeSlug, initialCategory]);

  const currentCategoryId = currentCategory?._id || null;

  const subcategories = currentCategoryId
    ? items.filter(
        (c: Category) =>
          c.parent?._id === currentCategoryId || c.parent === currentCategoryId
      )
    : [];

  /** Direct parent of the active category — drives the eyebrow + breadcrumb. */
  const parentCategory = currentCategory?.parent || null;
  const parentOfSub = parentCategory
    ? items.find((c: Category) => c._id === parentCategory._id) || parentCategory
    : null;

  const [activeTab, setActiveTab] = useState<"all" | "new-arrival">(
    initialSlug === "new-arrival" ? "new-arrival" : "all"
  );

  useEffect(() => {
    setActiveTab(
      isSearching ? "all" : initialSlug === "new-arrival" ? "new-arrival" : "all"
    );
  }, [initialSlug, isSearching]);

  // ---------- toolbar / filter state (moved up for use in productsApiUrl) ----------
  const [viewMode, setViewMode] = useState<"grid" | "compact" | "list">("grid");
  const [perPage, setPerPage] = useState(12);
  const [sort, setSort] = useState(() => resolveSortParam(searchParams.get("sort")));
  const [page, setPage] = useState(1);

  /** `null` = the slider simply mirrors the data bounds until it is touched. */
  const [priceDraft, setPriceDraft] = useState<[number, number] | null>(null);
  const [appliedPrice, setAppliedPrice] = useState<{
    min: number | null;
    max: number | null;
  }>({ min: null, max: null });
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [onSaleOnly, setOnSaleOnly] = useState(
    () => searchParams.get("sale") === "1"
  );
  const [inStockOnly, setInStockOnly] = useState(false);

  const productsApiUrl = isSearching
    ? `/products?search=${encodeURIComponent(searchQuery)}&isActive=true&page=${page}&limit=${perPage}&sort=${sort}${appliedPrice.min != null ? `&minPrice=${appliedPrice.min}` : ''}${appliedPrice.max != null ? `&maxPrice=${appliedPrice.max}` : ''}${selectedSizes.length ? `&sizes=${selectedSizes.join(',')}` : ''}${onSaleOnly ? '&onSale=true' : ''}${inStockOnly ? '&inStock=true' : ''}`
    : activeTab === "new-arrival"
    ? `/products/new-arrivals?limit=${perPage}&page=${page}&sort=${sort}${appliedPrice.min != null ? `&minPrice=${appliedPrice.min}` : ''}${appliedPrice.max != null ? `&maxPrice=${appliedPrice.max}` : ''}${selectedSizes.length ? `&sizes=${selectedSizes.join(',')}` : ''}${onSaleOnly ? '&onSale=true' : ''}${inStockOnly ? '&inStock=true' : ''}`
    : currentCategoryId
    ? `/products?categories=${currentCategoryId}&isActive=true&page=${page}&limit=${perPage}&sort=${sort}${appliedPrice.min != null ? `&minPrice=${appliedPrice.min}` : ''}${appliedPrice.max != null ? `&maxPrice=${appliedPrice.max}` : ''}${selectedSizes.length ? `&sizes=${selectedSizes.join(',')}` : ''}${onSaleOnly ? '&onSale=true' : ''}${inStockOnly ? '&inStock=true' : ''}`
    : `/products?isActive=true&page=${page}&limit=${perPage}&sort=${sort}${appliedPrice.min != null ? `&minPrice=${appliedPrice.min}` : ''}${appliedPrice.max != null ? `&maxPrice=${appliedPrice.max}` : ''}${selectedSizes.length ? `&sizes=${selectedSizes.join(',')}` : ''}${onSaleOnly ? '&onSale=true' : ''}${inStockOnly ? '&inStock=true' : ''}`;

  const productsQueryKey = isSearching
    ? ["search-products", searchQuery]
    : activeTab === "new-arrival"
    ? ["new-arrivals"]
    : currentCategoryId
    ? ["category-products", currentCategoryId]
    : ["all-products"];

  const { data: productsResponse, isLoading: productsLoading } = useQuery({
    queryKey: [...productsQueryKey, page, perPage, sort, appliedPrice, selectedSizes, onSaleOnly, inStockOnly],
    queryFn: () =>
      api.get(productsApiUrl).then((res) => res.data.data),
  });

  const productList = Array.isArray(productsResponse) ? productsResponse : (productsResponse?.data ?? []);
  const pagination = productsResponse?.pagination || { total: 0, pages: 1 };
  const totalPages = pagination.pages || 1;
  const currentPage = Math.min(page, totalPages);
  const totalProducts = pagination.total || 0;
  const visibleProducts = productList;
  const showingFrom = totalProducts ? (currentPage - 1) * perPage + 1 : 0;
  const showingTo = Math.min(currentPage * perPage, totalProducts);

  // ---------- derived data (for filter UI) ----------
  const priceBounds = useMemo(() => {
    if (!productList.length) return { min: 0, max: 0 };
    const prices = productList.map((p: Product) => p.price);
    return {
      min: Math.floor(Math.min(...prices)),
      max: Math.ceil(Math.max(...prices)),
    };
  }, [productList]);

  const sliderMax = Math.max(priceBounds.max, priceBounds.min + 1);
  const priceRange = priceDraft ?? [priceBounds.min, sliderMax];

  const sizeCounts = useMemo(() => {
    const map = new Map<string, number>();
    productList.forEach((p: Product) => {
      new Set(sizesOf(p)).forEach((s) => map.set(s, (map.get(s) || 0) + 1));
    });
    return [...map.entries()].sort((a, b) =>
      a[0].localeCompare(b[0], undefined, { numeric: true })
    );
  }, [productList]);

  /** Mobile-only slide-in filter sidebar (the desktop <aside> starts at lg). */
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Lock body scroll while the mobile filter drawer is open
  useEffect(() => {
    if (!filtersOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [filtersOpen]);

  // Keep sort / "on sale" filter in sync when the URL changes (?sort=…, ?sale=1)
  useEffect(() => {
    setSort(resolveSortParam(searchParams.get("sort")));
    setOnSaleOnly(searchParams.get("sale") === "1");
  }, [searchParams]);

  // Switching category or tab (or starting a new search) clears the filter set
  useEffect(() => {
    setPriceDraft(null);
    setAppliedPrice({ min: null, max: null });
    setSelectedSizes([]);
    setInStockOnly(false);
  }, [initialSlug, activeTab, searchQuery]);

  // Reset to first page whenever scope or filters change
  useEffect(() => {
    setPage(1);
  }, [
    activeTab,
    initialSlug,
    searchQuery,
    perPage,
    sort,
    appliedPrice,
    selectedSizes,
    onSaleOnly,
    inStockOnly,
  ]);

  /** Highest-rated products of the *current* scope (dataset, not hardcoded). */
  const topRated = useMemo(
    () =>
      [...productList]
        .filter((p: Product) => (p.rating ?? 0) > 0)
        .sort(
          (a, b) =>
            (b.rating ?? 0) - (a.rating ?? 0) ||
            (b.reviewCount ?? 0) - (a.reviewCount ?? 0)
        )
        .slice(0, 4),
    [productList]
  );

  // ---------- navigation ----------
  const navigateTo = (slug: string) => router.push(`/product-category/${slug}`);
  const handleNewArrival = () => router.push("/product-category/new-arrival");
  const handleShowAll = () => router.push(rootPath);
  /** Leaves the search results and returns to the full catalogue. */
  const clearSearch = () => router.push(rootPath);
  const handleBack = () => {
    if (parentOfSub) navigateTo(parentOfSub.slug);
    else router.push(rootPath);
  };

  // ---------- hero / breadcrumb (all content comes from the API) ----------
  const heroTitle = isSearching
    ? `“${searchQuery}”`
    : activeTab === "new-arrival"
    ? UI.newArrivals
    : currentCategory?.name || allProductsLabel;

  const heroEyebrow = isSearching
    ? UI.searchResults
    : activeTab === "new-arrival"
    ? UI.newArrivals
    : parentOfSub?.name || UI.eyebrow;

  const heroSubtitle = isSearching
    ? `${totalProducts} ${
        totalProducts === 1 ? UI.product : UI.products
      } ${UI.searchHint}`
    : (currentCategory?.description || settings?.storeDescription || "").trim();

  const breadcrumbItems = isSearching
    ? [
        { label: "Home", href: "/" },
        { label: allProductsLabel, href: rootPath },
        { label: UI.searchResults },
      ]
    : currentCategory
    ? [
        { label: "Home", href: "/" },
        ...(parentOfSub
          ? [{ label: parentOfSub.name, href: `/product-category/${parentOfSub.slug}` }]
          : [{ label: allProductsLabel, href: rootPath }]),
        { label: currentCategory.name },
      ]
    : activeTab === "new-arrival"
    ? [{ label: "Home", href: "/" }, { label: UI.newArrivals }]
    : [{ label: "Home", href: "/" }, { label: allProductsLabel }];

  const hasActiveFilters =
    appliedPrice.min != null ||
    appliedPrice.max != null ||
    selectedSizes.length > 0 ||
    onSaleOnly ||
    inStockOnly;

  const applyPrice = () => {
    const lo = Math.min(Math.max(priceRange[0], priceBounds.min), sliderMax);
    const hi = Math.min(Math.max(priceRange[1], lo), sliderMax);
    setPriceDraft([lo, hi]);
    setAppliedPrice({
      min: lo <= priceBounds.min ? null : lo,
      max: hi >= sliderMax ? null : hi,
    });
  };

  const clearFilters = () => {
    setPriceDraft(null);
    setAppliedPrice({ min: null, max: null });
    setSelectedSizes([]);
    setOnSaleOnly(false);
    setInStockOnly(false);
    setSort("default");
  };

  const toggleSize = (size: string) =>
    setSelectedSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    );

  const gridClass =
    viewMode === "grid"
      ? "grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6"
      : viewMode === "compact"
      ? "grid grid-cols-2 md:grid-cols-3 gap-6"
      : "space-y-4";

  /** Shared by the desktop <aside> and the mobile slide-in drawer. */
  const filterProps = {
    items,
    parentCategories,
    categoriesLoading,
    allProductsLabel,
    newArrivalsCount,
    currentCategoryId,
    activeTab,
    currency,
    priceBounds,
    priceRange,
    appliedPrice,
    onPriceRangeChange: setPriceDraft,
    onApplyPrice: applyPrice,
    sizeCounts,
    selectedSizes,
    onToggleSize: toggleSize,
    topRated,
    hasActiveFilters,
    onClearFilters: clearFilters,
    onNavigateCategory: navigateTo,
    onShowAll: handleShowAll,
    onShowNewArrivals: handleNewArrival,
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* ---------- Hero — owner-supplied background + live category data ---------- */}
      <section className="relative overflow-hidden bg-brand-black">
        <Image
          src={HERO_IMAGE}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-black/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

        <div className="relative container py-12 md:py-20">
          <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <div className="flex items-center gap-3">
                {(currentCategory || activeTab === "new-arrival") && (
                  <button
                    onClick={handleBack}
                    aria-label={UI.back}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white transition-colors hover:border-brand-gold hover:bg-brand-gold"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                )}
                <span className="flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-[0.28em] text-brand-gold sm:text-xs">
                  <span className="hidden h-px w-8 bg-brand-gold/50 sm:block" />
                  {heroEyebrow}
                </span>
              </div>

              <h1 className="mt-3 break-words font-serif text-4xl leading-[1.05] text-white drop-shadow-sm sm:text-5xl md:text-6xl">
                {heroTitle}
              </h1>

              {heroSubtitle && (
                <p className="mt-4 line-clamp-2 max-w-xl text-sm text-white/70 md:text-base">
                  {heroSubtitle}
                </p>
              )}

              {isSearching && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-xs font-semibold text-white backdrop-blur-sm transition-colors hover:border-brand-gold hover:bg-brand-gold"
                >
                  <SearchX className="h-3.5 w-3.5" />
                  {UI.clearSearch}
                </button>
              )}

              {!isSearching && subcategories.length > 0 && (
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  {subcategories.map((sub: Category) => (
                    <button
                      key={sub._id}
                      onClick={() => navigateTo(sub.slug)}
                      className="rounded-full border border-white/25 bg-white/5 px-3.5 py-1.5 text-xs font-medium text-white/90 backdrop-blur-sm transition-colors hover:border-brand-gold hover:bg-brand-gold hover:text-white"
                    >
                      {sub.name}
                      <span className="ml-1.5 text-white/50">
                        {sub.activeProductCount ?? sub.productCount ?? 0}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="md:pb-1">
              <Breadcrumb items={breadcrumbItems} variant="inverted" />
            </div>
          </div>
        </div>
      </section>

      <div className="container py-8">
        <div className="flex flex-col gap-8 lg:flex-row">
          {/* ---------- Sidebar ---------- */}
          <aside className="hidden w-full shrink-0 lg:block lg:w-72">
            <div className="lg:sticky lg:top-24">
              <CategoryFilters {...filterProps} />
            </div>
          </aside>

          {/* ---------- Main ---------- */}
          <main className="min-w-0 flex-1">
            {/* Toolbar: view modes + availability pills | result count | sort */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b pb-4">
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Mobile/tablet: opens the slide-in filter sidebar (lg+ uses the <aside>) */}
                <button
                  type="button"
                  onClick={() => setFiltersOpen(true)}
                  className="inline-flex h-9 items-center gap-2 rounded-full border border-border/70 bg-card px-4 text-sm font-semibold shadow-sm transition-colors hover:border-brand-gold hover:text-brand-gold lg:hidden"
                >
                  <SlidersHorizontal className="h-4 w-4 text-brand-gold" />
                  Filters
                  {hasActiveFilters && (
                    <span className="h-2 w-2 rounded-full bg-brand-gold" />
                  )}
                </button>

                <div className="flex items-center gap-0.5 rounded-lg border p-0.5">
                  <button
                    onClick={() => setViewMode("grid")}
                    aria-label="Large grid"
                    title="Large grid"
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded transition-colors",
                      viewMode === "grid"
                        ? "bg-brand-gold text-white"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setViewMode("compact")}
                    aria-label="Compact grid"
                    title="Compact grid"
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded transition-colors",
                      viewMode === "compact"
                        ? "bg-brand-gold text-white"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Grid2X2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    aria-label="List view"
                    title="List view"
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded transition-colors",
                      viewMode === "list"
                        ? "bg-brand-gold text-white"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>

                <button
                  onClick={() => setOnSaleOnly((value) => !value)}
                  aria-pressed={onSaleOnly}
                  className={cn(
                    "h-8 rounded-full border px-3.5 text-xs font-medium transition-colors",
                    onSaleOnly
                      ? "border-brand-gold bg-brand-gold/10 text-brand-gold"
                      : "text-muted-foreground hover:border-brand-gold/40 hover:text-foreground"
                  )}
                >
                  {UI.onSale}
                </button>
                <button
                  onClick={() => setInStockOnly((value) => !value)}
                  aria-pressed={inStockOnly}
                  className={cn(
                    "h-8 rounded-full border px-3.5 text-xs font-medium transition-colors",
                    inStockOnly
                      ? "border-brand-gold bg-brand-gold/10 text-brand-gold"
                      : "text-muted-foreground hover:border-brand-gold/40 hover:text-foreground"
                  )}
                >
                  {UI.inStock}
                </button>
              </div>

              {!productsLoading && (
                <p className="order-last w-full text-sm text-muted-foreground sm:order-none sm:w-auto">
                  {UI.showing}{" "}
                  <span className="font-semibold text-foreground">
                    {showingFrom}-{showingTo}
                  </span>{" "}
                  {UI.of}{" "}
                  <span className="font-semibold text-foreground">
                    {totalProducts}
                  </span>{" "}
                  {totalProducts === 1 ? UI.product : UI.products}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <div className="hidden items-center gap-1.5 text-sm text-muted-foreground lg:flex">
                  <span className="mr-1">{UI.show} :</span>
                  {PER_PAGE_OPTIONS.map((option) => (
                    <button
                      key={option}
                      onClick={() => setPerPage(option)}
                      className={`px-1 transition-colors ${
                        perPage === option
                          ? "font-bold text-foreground underline underline-offset-4"
                          : "hover:text-foreground"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <span className="hidden text-sm text-muted-foreground sm:inline">
                    {UI.sortBy}:
                  </span>
                  <Select value={sort} onValueChange={setSort}>
                    <SelectTrigger className="h-9 w-[190px] text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SORT_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Products */}
            {productsLoading || categoriesLoading ? (
              <div className={gridClass}>
                {[...Array(Math.min(perPage, 12))].map((_, index) => (
                  <Skeleton
                    key={index}
                    className={viewMode === "list" ? "h-32 rounded-xl" : "h-96 rounded-xl"}
                  />
                ))}
              </div>
            ) : totalProducts === 0 ? (
              <div className="py-16 text-center">
                {isSearching ? (
                  <>
                    <SearchX className="mx-auto mb-4 h-12 w-12 text-brand-gold/40" />
                    <h3 className="text-lg font-semibold">{UI.noSearchResults}</h3>
                    <p className="mb-6 text-muted-foreground">{UI.trySearchAgain}</p>
                    <div className="flex flex-wrap items-center justify-center gap-3">
                      <Button
                        onClick={clearSearch}
                        className="bg-brand-gold font-semibold text-white hover:bg-brand-gold-dark"
                      >
                        {UI.clearSearch}
                      </Button>
                      {hasActiveFilters && (
                        <Button variant="outline" onClick={clearFilters}>
                          {UI.clearFilters}
                        </Button>
                      )}
                    </div>
                  </>
                ) : activeTab === "new-arrival" ? (
                  <>
                    <Sparkles className="mx-auto mb-4 h-12 w-12 text-brand-gold/40" />
                    <h3 className="text-lg font-semibold">{UI.newArrivals}</h3>
                    <p className="mb-6 text-muted-foreground">{UI.newArrivalsHint}</p>
                    <Button
                      onClick={handleShowAll}
                      className="bg-brand-gold font-semibold text-white hover:bg-brand-gold-dark"
                    >
                      {UI.exploreAll}
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="mb-4 text-lg text-muted-foreground">{UI.noProducts}</p>
                    {hasActiveFilters ? (
                      <Button onClick={clearFilters}>{UI.clearFilters}</Button>
                    ) : (
                      <Button onClick={handleShowAll}>{UI.viewAll}</Button>
                    )}
                  </>
                )}
              </div>
            ) : (
              <>
                <div className={gridClass}>
                  {visibleProducts.map((product: Product, index: number) => (
                    <motion.div
                      key={product._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.4,
                        delay: Math.min((index % perPage) * 0.04, 0.4),
                      }}
                    >
                      <ProductCard
                        product={product}
                        viewMode={viewMode === "list" ? "list" : "grid"}
                        showSku
                      />
                    </motion.div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-10 flex items-center justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(
                        (p) =>
                          p === 1 ||
                          p === totalPages ||
                          Math.abs(p - currentPage) <= 2
                      )
                      .reduce<(number | string)[]>((acc, p, i, arr) => {
                        if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("...");
                        acc.push(p);
                        return acc;
                      }, [])
                      .map((p, i) =>
                        typeof p === "string" ? (
                          <span key={`dots-${i}`} className="px-1 text-muted-foreground">
                            ...
                          </span>
                        ) : (
                          <Button
                            key={p}
                            variant={currentPage === p ? "default" : "outline"}
                            size="icon"
                            className="h-8 w-8 text-sm"
                            onClick={() => setPage(p)}
                          >
                            {p}
                          </Button>
                        )
                      )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>

      {/* ---------- Mobile: slide-in filter sidebar (desktop keeps the <aside>) ---------- */}
      <AnimatePresence>
        {filtersOpen && (
          <div className="fixed inset-0 z-[60] lg:hidden">
            <motion.button
              type="button"
              aria-label="Close filters"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setFiltersOpen(false)}
              className="absolute inset-0 h-full w-full cursor-default bg-black/55 backdrop-blur-[2px]"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-y-0 left-0 flex w-[88%] max-w-sm flex-col bg-background shadow-2xl"
            >
              {/* Header */}
              <div className="flex h-14 shrink-0 items-center justify-between border-b px-4">
                <span className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide">
                  <SlidersHorizontal className="h-4 w-4 text-brand-gold" />
                  Filters
                </span>
                <button
                  type="button"
                  onClick={() => setFiltersOpen(false)}
                  className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                  Close
                </button>
              </div>

              {/* Scrollable filter content — identical to the desktop sidebar */}
              <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">
                <CategoryFilters {...filterProps} />
              </div>

              {/* Footer actions (safe-area aware for notched phones) */}
              <div className="flex shrink-0 gap-3 border-t bg-background px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  disabled={!hasActiveFilters}
                  className="flex-1 font-semibold"
                >
                  Clear
                </Button>
                <Button
                  onClick={() => setFiltersOpen(false)}
                  className="flex-1 bg-brand-gold font-semibold text-white hover:bg-brand-gold-dark"
                >
                  Show {totalProducts}{" "}
                  {totalProducts === 1 ? UI.product : UI.products}
                </Button>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
