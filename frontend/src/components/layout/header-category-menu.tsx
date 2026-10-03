"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight } from "lucide-react";
import api from "@/lib/api";
import type { Category } from "@/types";

/** Storefront link for a category (parent, child or sub-category) */
export const categoryHref = (category: Category) =>
  `/product-category/${String(category.slug || "").replace(/^\/+/, "")}`;

/**
 * Public category tree (parents → children → sub-categories) used by the header.
 * Sorted server-side by `sortOrder` / `name`; cached for 5 minutes and shared
 * between the desktop nav and the mobile menu.
 */
export function useCategoryTree() {
  const { data, isLoading } = useQuery({
    queryKey: ["header-category-tree"],
    queryFn: (): Promise<Category[]> =>
      api
        .get("/categories/tree")
        .then((res) => res.data?.data?.categories || [])
        .catch(() => [] as Category[]),
    staleTime: 5 * 60 * 1000,
  });

  return { categories: data || [], isLoading };
}

/**
 * Desktop nav entry for a parent category.
 * Hovering (or keyboard-focusing) it reveals the child categories, and hovering
 * a child reveals its sub-categories in a nested panel.
 */
export function DesktopCategoryNavItem({ category }: { category: Category }) {
  const pathname = usePathname();
  const href = categoryHref(category);
  const active = pathname === href;
  const hasChildren = !!category.children?.length;

  return (
    <li className="group/cat relative">
      <Link
        href={href}
        className={`relative flex items-center gap-1 whitespace-nowrap py-2 text-xs font-semibold uppercase tracking-[0.14em] transition-colors after:absolute after:-bottom-0.5 after:left-0 after:h-px after:w-0 after:bg-brand-gold after:transition-all after:duration-300 hover:after:w-full group-hover/cat:after:w-full ${
          active
            ? "text-brand-gold after:w-full"
            : "text-muted-foreground hover:text-brand-gold group-hover/cat:text-brand-gold"
        }`}
      >
        {category.name}
        {hasChildren && (
          <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 group-hover/cat:rotate-180" />
        )}
      </Link>

      {hasChildren && (
        <div className="pointer-events-none absolute left-0 top-full z-50 translate-y-1 pt-4 opacity-0 transition-all duration-200 ease-out group-hover/cat:pointer-events-auto group-hover/cat:translate-y-0 group-hover/cat:opacity-100 group-focus-within/cat:pointer-events-auto group-focus-within/cat:translate-y-0 group-focus-within/cat:opacity-100">
          {/* No overflow-hidden here: nested child → sub-category panels open to the right */}
          <div className="relative min-w-[268px] rounded-2xl border border-border/70 bg-popover/95 p-2 shadow-premium-lg ring-1 ring-brand-gold/10 backdrop-blur-xl">
            <p className="px-3 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-brand-gold">
              {category.name}
            </p>
            <span className="mx-2 mb-1.5 block h-px bg-gradient-to-r from-brand-gold/50 via-border to-transparent" />
            <ul className="flex flex-col gap-0.5">
              {category.children!.map((child) => (
                <CategoryFlyoutItem key={child._id} category={child} />
              ))}
            </ul>
          </div>
        </div>
      )}
    </li>
  );
}

/** Child / sub-category row inside a fly-out panel (recursive) */
function CategoryFlyoutItem({ category }: { category: Category }) {
  const hasChildren = !!category.children?.length;

  return (
    <li className="group/sub relative">
      <Link
        href={categoryHref(category)}
        className="group/row flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium text-foreground/80 transition-colors duration-150 hover:bg-brand-gold/10 hover:text-brand-gold group-hover/sub:bg-brand-gold/10 group-hover/sub:text-brand-gold"
      >
        <span className="truncate">{category.name}</span>
        {hasChildren ? (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-brand-gold/70 transition-transform duration-200 group-hover/sub:translate-x-0.5" />
        ) : (
          <span className="h-1 w-1 shrink-0 rounded-full bg-transparent transition-colors duration-150 group-hover/row:bg-brand-gold" />
        )}
      </Link>

      {hasChildren && (
        <div className="pointer-events-none absolute left-full -top-2 z-50 translate-x-1 pl-2 opacity-0 transition-all duration-200 ease-out group-hover/sub:pointer-events-auto group-hover/sub:translate-x-0 group-hover/sub:opacity-100 group-focus-within/sub:pointer-events-auto group-focus-within/sub:translate-x-0 group-focus-within/sub:opacity-100">
          {/* Opens to the right of the hovered child row (must not be clipped) */}
          <div className="relative min-w-[248px] rounded-2xl border border-border/70 bg-popover/95 p-2 shadow-premium-lg ring-1 ring-brand-gold/10 backdrop-blur-xl">
            <p className="px-3 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-brand-gold">
              {category.name}
            </p>
            <span className="mx-2 mb-1.5 block h-px bg-gradient-to-r from-brand-gold/50 via-border to-transparent" />
            <ul className="flex flex-col gap-0.5">
              {category.children!.map((child) => (
                <CategoryFlyoutItem key={child._id} category={child} />
              ))}
            </ul>
          </div>
        </div>
      )}
    </li>
  );
}

/** Mobile menu version of the tree — tap the chevron to expand a level */
export function MobileCategoryList({
  categories,
  onNavigate,
}: {
  categories: Category[];
  onNavigate?: () => void;
}) {
  if (!categories.length) return null;

  return (
    <ul className="flex flex-col">
      {categories.map((category) => (
        <MobileCategoryItem
          key={category._id}
          category={category}
          depth={0}
          onNavigate={onNavigate}
        />
      ))}
    </ul>
  );
}

function MobileCategoryItem({
  category,
  depth,
  onNavigate,
}: {
  category: Category;
  depth: number;
  onNavigate?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const hasChildren = !!category.children?.length;
  const indent = depth === 0 ? "pl-4" : "pl-3";

  return (
    <li>
      <div className="flex items-center">
        <Link
          href={categoryHref(category)}
          onClick={onNavigate}
          className={`flex-1 rounded-lg py-2 pr-2 text-sm font-medium transition-colors hover:bg-brand-gold/10 hover:text-brand-gold ${indent}`}
        >
          {category.name}
        </Link>
        {hasChildren && (
          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            aria-expanded={open}
            aria-label={`${open ? "Hide" : "Show"} ${category.name} sub categories`}
            className="rounded-lg p-2 transition-colors hover:bg-brand-gold/10"
          >
            <ChevronDown
              className={`h-4 w-4 transition-transform duration-200 ${
                open ? "rotate-180 text-brand-gold" : ""
              }`}
            />
          </button>
        )}
      </div>

      {hasChildren && open && (
        <ul className="ml-4 flex flex-col border-l border-border/70 pl-1">
          {category.children!.map((child) => (
            <MobileCategoryItem
              key={child._id}
              category={child}
              depth={depth + 1}
              onNavigate={onNavigate}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
