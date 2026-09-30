"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  subtitle?: string;
  badge?: string;
  children: React.ReactNode;
  className?: string;
  align?: "center" | "left";
}

export default function SectionHeader({
  subtitle,
  badge,
  children,
  className,
  align = "center",
}: SectionHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "relative",
        align === "center" && "text-center",
        className
      )}
    >
      {/* Gold decorative accent */}
      <div
        className={cn(
          "flex items-center gap-3 mb-4",
          align === "center" && "justify-center"
        )}
      >
        <span className="h-px w-8 bg-gradient-to-r from-transparent to-brand-gold/60" />
        <span className="text-[11px] uppercase tracking-[0.3em] font-semibold text-brand-gold">
          {badge || "\u00A0"}
        </span>
        <span className="h-px w-8 bg-gradient-to-l from-transparent to-brand-gold/60" />
      </div>

      {/* Main heading */}
      <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-brand-gold">
        {children}
      </h2>

      {/* Subtitle */}
      {subtitle && (
        <p className="mt-3 text-muted-foreground text-sm sm:text-base max-w-lg mx-auto leading-relaxed">
          {subtitle}
        </p>
      )}

      {/* Bottom decorative line */}
      <div
        className={cn(
          "mt-4 h-0.5 w-12 bg-brand-gold/40 rounded-full",
          align === "center" && "mx-auto"
        )}
      />
    </motion.div>
  );
}
