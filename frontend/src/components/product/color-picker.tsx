"use client";

import { cn } from "@/lib/utils";

interface ColorPickerProps {
  colors: string[];
  selected: string;
  onSelect: (color: string) => void;
}

export default function ColorPicker({
  colors,
  selected,
  onSelect,
}: ColorPickerProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {colors.map((color) => (
        <button
          key={color}
          onClick={() => onSelect(color)}
          className={cn(
            "h-8 w-8 rounded-full border-2 transition-all",
            selected === color
              ? "border-primary ring-2 ring-primary ring-offset-2"
              : "border-gray-200 hover:border-gray-400"
          )}
          style={{ backgroundColor: color }}
          title={color}
        />
      ))}
    </div>
  );
}
