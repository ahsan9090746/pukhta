"use client";

import { cn } from "@/lib/utils";

/**
 * Filter pill shared by the journal and the FAQ centre — "All …" plus one pill
 * per topic, each showing how many entries it holds.
 */
export default function FilterChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[11px] font-bold uppercase tracking-[0.12em] transition-all duration-200",
        active
          ? "border-brand-gold bg-brand-gold text-white shadow-gold"
          : "border-border bg-card text-muted-foreground hover:border-brand-gold/40 hover:text-brand-gold"
      )}
    >
      {label}
      <span
        className={cn(
          "rounded-full px-1.5 py-0.5 text-[10px] leading-none",
          active ? "bg-white/25 text-white" : "bg-muted text-muted-foreground"
        )}
      >
        {count}
      </span>
    </button>
  );
}
