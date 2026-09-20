"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SizePickerProps {
  sizes: string[];
  selected: string;
  onSelect: (size: string) => void;
  variants?: any[];
}

export default function SizePicker({
  sizes,
  selected,
  onSelect,
  variants = [],
}: SizePickerProps) {
  const getStockForSize = (size: string) => {
    if (!variants.length) return true;
    return variants.some((v) => v.size === size && v.stock > 0);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {sizes.map((size) => {
        const inStock = getStockForSize(size);
        return (
          <Button
            key={size}
            variant={selected === size ? "default" : "outline"}
            size="sm"
            onClick={() => inStock && onSelect(size)}
            disabled={!inStock}
            className={cn(
              "min-w-[60px]",
              !inStock && "line-through opacity-50"
            )}
          >
            {size}
          </Button>
        );
      })}
    </div>
  );
}
