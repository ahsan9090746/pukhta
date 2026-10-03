"use client";

import Link from "next/link";
import {
  Barcode,
  FolderTree,
  Footprints,
  ListChecks,
  PackageCheck,
  Palette,
} from "lucide-react";
import { Product } from "@/types";
import { formatSizeList } from "@/lib/shoe-sizes";
import { cn } from "@/lib/utils";

interface AdditionalInformationProps {
  product: Product;
}

interface InfoRow {
  key: string;
  label: string;
  value: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
}

/**
 * "Additional Information" tab.
 *
 * Renders a clean spec sheet: Size (with the PK / EU / US conversion), every
 * admin-defined specification, plus SKU, availability, colour and category.
 */
export default function AdditionalInformation({ product }: AdditionalInformationProps) {
  const sizes = [
    ...new Set<string>([
      ...(product.variants?.map((variant: any) => variant.size).filter(Boolean) || []),
      ...(product.sizes || []),
    ]),
  ].filter(Boolean);

  const colors = [
    ...new Set<string>([
      ...(product.variants?.map((variant: any) => variant.color).filter(Boolean) || []),
      ...(product.colors || []),
    ]),
  ].filter(Boolean);

  const rows: InfoRow[] = [];

  if (sizes.length > 0) {
    rows.push({
      key: "size",
      label: "Size",
      value: <span className="font-medium">{formatSizeList(sizes)}</span>,
      icon: Footprints,
    });
  }

  if (colors.length > 0) {
    rows.push({
      key: "color",
      label: "Color",
      value: (
        <span className="flex flex-wrap items-center justify-center gap-2">
          {colors.map((color) => (
            <span key={color} className="inline-flex items-center gap-1.5">
              <span
                className="h-3.5 w-3.5 rounded-full border border-border"
                style={{ backgroundColor: color }}
              />
              {color}
            </span>
          ))}
        </span>
      ),
      icon: Palette,
    });
  }

  (product.specifications || []).forEach((spec, index) => {
    rows.push({
      key: `spec-${index}-${spec.key}`,
      label: spec.key,
      value: <span className="font-medium">{spec.value}</span>,
      icon: ListChecks,
    });
  });

  if (product.sku) {
    rows.push({
      key: "sku",
      label: "SKU",
      value: <span className="font-medium tracking-wide">{product.sku}</span>,
      icon: Barcode,
    });
  }

  rows.push({
    key: "availability",
    label: "Availability",
    value: (
      <span
        className={cn(
          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
          product.stock > 0
            ? "bg-emerald-50 text-emerald-700"
            : "bg-red-50 text-red-600"
        )}
      >
        {product.stock > 0
          ? `In stock${product.stock <= 5 ? ` (only ${product.stock} left)` : ""}`
          : "Out of stock"}
      </span>
    ),
    icon: PackageCheck,
  });

  if (product.categories && product.categories.length > 0) {
    rows.push({
      key: "categories",
      label: "Categories",
      value: (
        <div className="flex flex-wrap gap-2">
          {product.categories.map((cat: any) => (
            <Link
              key={cat._id}
              href={`/product-category/${cat.slug}`}
              className="font-medium text-brand-gold hover:underline"
            >
              {cat.name}
            </Link>
          ))}
        </div>
      ),
      icon: FolderTree,
    });
  }

  if (rows.length === 0) {
    return (
      <p className="mx-auto max-w-3xl text-center text-[15px] text-muted-foreground">
        No additional information available.
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-3xl overflow-hidden rounded-xl border">
      <table className="w-full text-[15px]">
        <tbody>
          {rows.map((row, index) => {
            const RowIcon = row.icon;
            return (
              <tr
                key={row.key}
                className={cn("border-b last:border-b-0", index % 2 === 1 && "bg-muted/40")}
              >
                <th
                  scope="row"
                  className="w-[240px] px-5 py-4 text-center align-middle font-medium text-foreground"
                >
                  <span className="flex items-center justify-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-gold/10 text-brand-gold">
                      <RowIcon className="h-4 w-4" />
                    </span>
                    {row.label}
                  </span>
                </th>
                <td className="px-5 py-4 text-center align-middle text-muted-foreground">
                  {row.value}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
