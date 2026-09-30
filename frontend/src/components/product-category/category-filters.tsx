"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Category, Product } from "@/types";
import { cn, getImageUrl } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Baby,
  ChevronDown,
  Footprints,
  Gem,
  Layers,
  LayoutGrid,
  Ruler,
  Shirt,
  ShoppingBag,
  Sparkles,
  Star,
  Tag,
  Wallet,
  type LucideIcon,
} from "lucide-react";

/** Static interface copy for the sidebar (never category/product content). */
const LABELS = {
  categories: "Categories",
  priceRange: "Price Range",
  sizes: "Sizes",
  topRated: "Top Rated Products",
  newArrivals: "New Arrivals",
  filter: "Filter",
  clearFilters: "Clear all filters",
  from: "Min",
  to: "Max",
  noRatings: "No rated products yet",
  expand: "Expand",
  collapse: "Collapse",
} as const;

/**
 * Icon per category derived from its name — no per-category hardcoding, so any
 * category an admin creates still gets a sensible glyph (falls back to `Tag`).
 */
const ICON_RULES: Array<[RegExp, LucideIcon]> = [
  [/foot|shoe|sandal|chappal|chappl|boot|sneaker|slipper|kheri/i, Footprints],
  [/kid|child|baby|infant|junior/i, Baby],
  [/accessor|jewel|watch|bag|belt|cap|hat|glass|sunglass|perfume/i, Gem],
  [/shirt|kameez|kurta|polo|blouse|tshirt|t-shirt/i, Shirt],
  [/wear|cloth|apparel|fashion|dress|jean|pant|trouser/i, ShoppingBag],
];

const categoryIcon = (name: string): LucideIcon =>
  ICON_RULES.find(([pattern]) => pattern.test(name))?.[1] ?? Tag;

/** Parent id of a category — tolerates an unpopulated (string) parent. */
const parentIdOf = (category: Category): string | null => {
  const parent = category.parent as unknown as Category | string | null | undefined;
  if (!parent) return null;
  return typeof parent === "string" ? parent : parent._id || null;
};

/* ------------------------------------------------------------------ */
/*  Small building blocks                                             */
/* ------------------------------------------------------------------ */

interface FilterPanelProps {
  title: string;
  icon: LucideIcon;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

/** Collapsible, card-styled filter group used for every sidebar section. */
function FilterPanel({ title, icon: Icon, defaultOpen = true, children }: FilterPanelProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-4 py-3.5 text-left"
      >
        <span className="flex items-center gap-2.5 text-sm font-bold uppercase tracking-wide">
          <Icon className="h-4 w-4 text-brand-gold" />
          {title}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>
      {open && (
        <div className="animate-in fade-in slide-in-from-top-1 px-4 pb-4 duration-200">
          {children}
        </div>
      )}
    </div>
  );
}

interface CategoryRowProps {
  label: string;
  icon: LucideIcon;
  count?: number;
  image?: string;
  active?: boolean;
  indent?: boolean;
  /** Shows the expand/collapse arrow (only when the category has children). */
  hasChildren?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
  onClick: () => void;
}

function CategoryRow({
  label,
  icon: Icon,
  count,
  image,
  active,
  indent,
  hasChildren = false,
  expanded = false,
  onToggle,
  onClick,
}: CategoryRowProps) {
  return (
    <div
      className={cn(
        "group flex w-full items-center gap-1.5 rounded-xl border transition-colors",
        indent
          ? hasChildren
            ? "py-1.5 pl-2.5 pr-1"
            : "py-1.5 pl-2.5 pr-2"
          : hasChildren
          ? "py-2 pl-2.5 pr-1.5"
          : "py-2 px-2.5",
        active
          ? "border-brand-gold bg-brand-gold text-white shadow-gold"
          : "border-transparent hover:border-brand-gold/30 hover:bg-muted"
      )}
    >
      <button
        type="button"
        onClick={onClick}
        aria-current={active ? "page" : undefined}
        className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
      >
        <span
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-lg",
            active
              ? "bg-white/20 text-white"
              : "bg-muted text-muted-foreground group-hover:text-brand-gold"
          )}
        >
          {image ? (
            <Image
              src={getImageUrl(image)}
              alt=""
              width={28}
              height={28}
              className="h-7 w-7 object-cover"
            />
          ) : (
            <Icon className="h-3.5 w-3.5" />
          )}
        </span>
        <span
          className={cn(
            "min-w-0 flex-1 truncate font-medium",
            indent ? "text-[13px]" : "text-sm"
          )}
        >
          {label}
        </span>

        {typeof count === "number" && (
          <span
            className={cn(
              "shrink-0 text-[11px] font-semibold tabular-nums",
              active ? "text-white/80" : "text-muted-foreground"
            )}
          >
            ({count})
          </span>
        )}
      </button>

      {hasChildren && (
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-label={`${expanded ? LABELS.collapse : LABELS.expand} ${label}`}
          className={cn(
            "flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-colors",
            active
              ? "text-white/80 hover:bg-white/20 hover:text-white"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 transition-transform duration-200",
              expanded && "rotate-180"
            )}
          />
        </button>
      )}
    </div>
  );
}

/** Compact ★ rating used by the "Top Rated Products" list. */
function Rating({ rating, count }: { rating?: number; count?: number }) {
  if (!rating) return null;
  return (
    <span className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
      <Star className="h-3 w-3 fill-brand-gold text-brand-gold" />
      <span className="font-semibold text-foreground">{rating.toFixed(1)}</span>
      {typeof count === "number" && count > 0 && <span>({count})</span>}
    </span>
  );
}

interface PriceInputProps {
  label: string;
  currency: string;
  value: number;
  onChange: (value: number) => void;
}

/** Number box with the store currency as an inline prefix (price slider ends). */
function PriceInput({ label, currency, value, onChange }: PriceInputProps) {
  return (
    <div className="relative flex-1">
      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase text-muted-foreground">
        {currency}
      </span>
      <Input
        type="number"
        inputMode="numeric"
        min={0}
        value={Number.isFinite(value) ? value : 0}
        aria-label={label}
        onChange={(event) => {
          const next = Number(event.target.value);
          if (Number.isNaN(next)) return;
          onChange(next);
        }}
        className="h-10 pl-11 text-sm"
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sidebar                                                           */
/* ------------------------------------------------------------------ */

export interface CategoryFiltersProps {
  /** Flat category list from GET /categories (includes productCount). */
  items: Category[];
  /** Root categories only — the rows shown in the Categories panel. */
  parentCategories: Category[];
  categoriesLoading: boolean;
  /** "All Products" for /product-category, "Shop" for /shop. */
  allProductsLabel: string;
  newArrivalsCount?: number;
  currentCategoryId: string | null;
  activeTab: "all" | "new-arrival";
  currency: string;
  priceBounds: { min: number; max: number };
  priceRange: [number, number];
  appliedPrice: { min: number | null; max: number | null };
  onPriceRangeChange: (range: [number, number]) => void;
  onApplyPrice: () => void;
  sizeCounts: Array<[string, number]>;
  selectedSizes: string[];
  onToggleSize: (size: string) => void;
  /** Highest-rated products of the current scope (already sorted + sliced). */
  topRated: Product[];
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  onNavigateCategory: (slug: string) => void;
  onShowAll: () => void;
  onShowNewArrivals: () => void;
}

export default function CategoryFilters({
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
  onPriceRangeChange,
  onApplyPrice,
  sizeCounts,
  selectedSizes,
  onToggleSize,
  topRated,
  hasActiveFilters,
  onClearFilters,
  onNavigateCategory,
  onShowAll,
  onShowNewArrivals,
}: CategoryFiltersProps) {
  // Radix requires min < max — guards the "no products loaded yet" case.
  const sliderMax = Math.max(priceBounds.max, priceBounds.min + 1);

  /**
   * Active category + its parent, resolved from the same list the rows are
   * built from, so opening a child keeps its parent branch expanded.
   */
  const currentCategory = items.find((c) => c._id === currentCategoryId) || null;

  /** Branches the visitor has opened (plus the branch of the open category). */
  const [expandedIds, setExpandedIds] = useState<string[]>([]);

  const toggleExpanded = (id: string) =>
    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]
    );

  /** The open category + its ancestors — those branches stay expanded. */
  const expandedChain = useMemo(() => {
    const chain: string[] = currentCategoryId ? [currentCategoryId] : [];
    let node: Category | undefined = currentCategory || undefined;
    for (let guard = 0; node && node.parent && guard < 5; guard += 1) {
      const parentId = parentIdOf(node);
      if (!parentId) break;
      chain.push(parentId);
      node = items.find((c) => c._id === parentId);
    }
    return chain;
  }, [currentCategory, currentCategoryId, items]);

  const expandedKey = expandedChain.join("|");

  useEffect(() => {
    if (!expandedKey) return;
    const chain = expandedKey.split("|");
    setExpandedIds((prev) => {
      const next = [...new Set([...prev, ...chain])];
      // Same reference when nothing changed — avoids a render loop.
      return next.length === prev.length ? prev : next;
    });
  }, [expandedKey]);

  const childrenOf = (id: string) => items.filter((c) => parentIdOf(c) === id);

  /** A category row + its collapsible sub-categories (parent → child → sub). */
  const renderBranch = (category: Category, depth: number) => {
    const children = childrenOf(category._id);
    const expanded = expandedIds.includes(category._id);

    return (
      <div key={category._id}>
        <CategoryRow
          label={category.name}
          icon={categoryIcon(category.name)}
          image={category.image}
          count={category.activeProductCount ?? category.productCount}
          active={category._id === currentCategoryId}
          indent={depth > 0}
          hasChildren={children.length > 0}
          expanded={expanded}
          onToggle={() => toggleExpanded(category._id)}
          onClick={() => onNavigateCategory(category.slug)}
        />
        {children.length > 0 && expanded && (
          <div className={cn("mt-1 space-y-0.5", depth === 0 ? "pl-3" : "pl-4")}>
            {children.map((child) => renderBranch(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const appliedLabel = `${(appliedPrice.min ?? priceBounds.min).toLocaleString()} — ${(
    appliedPrice.max ?? priceBounds.max
  ).toLocaleString()}`;

  return (
    <div className="space-y-5">
      {/* ---------- Categories ---------- */}
      <FilterPanel title={LABELS.categories} icon={LayoutGrid}>
        {categoriesLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, index) => (
              <Skeleton key={index} className="h-9 w-full rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="space-y-1">
            <CategoryRow
              label={allProductsLabel}
              icon={Layers}
              active={!currentCategoryId && activeTab === "all"}
              onClick={onShowAll}
            />
            <CategoryRow
              label={LABELS.newArrivals}
              icon={Sparkles}
              count={newArrivalsCount}
              active={activeTab === "new-arrival"}
              onClick={onShowNewArrivals}
            />

            {parentCategories.length > 0 && <div className="my-2 h-px bg-border" />}

            {parentCategories.map((parent) => renderBranch(parent, 0))}
          </div>
        )}
      </FilterPanel>

      {/* ---------- Price range ---------- */}
      <FilterPanel title={LABELS.priceRange} icon={Wallet}>
        <Slider
          min={priceBounds.min}
          max={sliderMax}
          step={1}
          value={priceRange}
          onValueChange={(value) =>
            onPriceRangeChange([value[0] ?? priceBounds.min, value[1] ?? sliderMax])
          }
          className="my-5"
          aria-label={LABELS.priceRange}
        />
        <div className="flex items-center gap-2">
          <PriceInput
            label={LABELS.from}
            currency={currency}
            value={priceRange[0]}
            onChange={(value) => onPriceRangeChange([value, priceRange[1]])}
          />
          <span className="text-muted-foreground">-</span>
          <PriceInput
            label={LABELS.to}
            currency={currency}
            value={priceRange[1]}
            onChange={(value) => onPriceRangeChange([priceRange[0], value])}
          />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{currency}</span> {appliedLabel}
        </p>
        <Button
          size="sm"
          onClick={onApplyPrice}
          className="mt-3 h-9 w-full bg-brand-gold text-xs font-bold uppercase tracking-wide text-white hover:bg-brand-gold-dark"
        >
          {LABELS.filter}
        </Button>
      </FilterPanel>


      {/* ---------- Sizes (only when the current scope actually has sizes) ---------- */}
      {sizeCounts.length > 0 && (
        <FilterPanel title={LABELS.sizes} icon={Ruler}>
          <div className="space-y-0.5">
            {sizeCounts.map(([size, count]) => (
              <label
                key={size}
                className="flex cursor-pointer items-center justify-between gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted"
              >
                <span className="flex items-center gap-2.5">
                  <Checkbox
                    checked={selectedSizes.includes(size)}
                    onCheckedChange={() => onToggleSize(size)}
                  />
                  <span className="text-sm">{size}</span>
                </span>
                <span className="rounded-full border px-1.5 text-[11px] text-muted-foreground">
                  {count}
                </span>
              </label>
            ))}
          </div>
        </FilterPanel>
      )}

      {/* ---------- Top rated (derived from the current scope) ---------- */}
      <FilterPanel title={LABELS.topRated} icon={Star}>
        {topRated.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">{LABELS.noRatings}</p>
        ) : (
          <div className="space-y-3">
            {topRated.map((product) => (
              <Link
                key={product._id}
                href={`/product/${product.slug}`}
                className="group flex items-center gap-3"
              >
                <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-muted ring-1 ring-black/5">
                  <Image
                    src={getImageUrl(product.images?.[0] || "")}
                    alt={product.name}
                    fill
                    sizes="56px"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-medium transition-colors group-hover:text-brand-gold">
                    {product.name}
                  </span>
                  <span className="mt-0.5 block text-sm font-bold text-brand-gold">
                    {currency} {product.price.toLocaleString()}
                  </span>
                  <Rating rating={product.rating} count={product.reviewCount} />
                </span>
              </Link>
            ))}
          </div>
        )}
      </FilterPanel>

      {hasActiveFilters && (
        <Button
          variant="outline"
          size="sm"
          onClick={onClearFilters}
          className="w-full text-xs font-semibold uppercase tracking-wide"
        >
          {LABELS.clearFilters}
        </Button>
      )}
    </div>
  );
}

