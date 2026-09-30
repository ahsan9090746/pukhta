"use client";

import { useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface OrderSuccessAnimationProps {
  open: boolean;
  orderNumber?: string;
  amount?: number;
  formatAmount?: (amount: number) => string;
  /** How long the celebration stays on screen before fading out. */
  duration?: number;
  /** Fired after `duration` — used to redirect to the confirmation page. */
  onComplete?: () => void;
  className?: string;
}

const CONFETTI_COLORS = ["#bfa46f", "#d4be8a", "#8c6c3c", "#faf6ed", "#ffffff"];

/**
 * Order-placed celebration: a gold ring with a drawn check mark, a soft glow
 * pulse and a confetti burst. Purely decorative — it never blocks the order
 * from being placed (the API call has already succeeded before it opens).
 */
export default function OrderSuccessAnimation({
  open,
  orderNumber,
  amount,
  formatAmount,
  duration = 2300,
  onComplete,
  className,
}: OrderSuccessAnimationProps) {
  // Built once so the burst stays identical across re-renders.
  const confetti = useMemo(
    () =>
      Array.from({ length: 30 }).map((_, index) => {
        const angle = (index / 30) * Math.PI * 2;
        const spread = 80 + (index % 7) * 24;
        return {
          id: index,
          x: Math.cos(angle) * spread,
          y: Math.sin(angle) * spread - 30,
          rotate: (index % 2 ? 1 : -1) * (200 + index * 14),
          delay: 0.05 + (index % 6) * 0.05,
          duration: 1.2 + (index % 5) * 0.18,
          color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
          size: index % 3 === 0 ? 10 : 7,
        };
      }),
    []
  );

  useEffect(() => {
    if (!open || !onComplete) return;
    const timer = setTimeout(onComplete, duration);
    return () => clearTimeout(timer);
  }, [open, duration, onComplete]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="status"
          aria-live="polite"
          className={cn(
            "fixed inset-0 z-[120] flex items-center justify-center overflow-hidden bg-brand-black/95 backdrop-blur-sm",
            className
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
        >
          <motion.div
            className="pointer-events-none absolute h-[580px] w-[580px] rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(191,164,111,0.30) 0%, transparent 65%)",
            }}
            animate={{ scale: [0.85, 1.08, 1], opacity: [0.45, 1, 0.7] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          />

          <div className="pointer-events-none absolute left-1/2 top-1/2">
            {confetti.map((piece) => (
              <motion.span
                key={piece.id}
                className="absolute rounded-[2px]"
                style={{
                  width: piece.size,
                  height: piece.size,
                  backgroundColor: piece.color,
                }}
                initial={{ x: 0, y: 0, opacity: 0, scale: 0.4, rotate: 0 }}
                animate={{
                  x: piece.x,
                  y: [0, piece.y, piece.y + 260],
                  opacity: [0, 1, 1, 0],
                  scale: [0.4, 1, 0.9],
                  rotate: piece.rotate,
                }}
                transition={{
                  duration: piece.duration + 0.9,
                  delay: piece.delay,
                  ease: "easeOut",
                }}
              />
            ))}
          </div>

          <div className="relative z-10 flex flex-col items-center px-6 text-center">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 190, damping: 16 }}
              className="relative flex h-28 w-28 items-center justify-center rounded-full border border-brand-gold/40 bg-white/5 shadow-gold-lg"
            >
              <motion.span
                className="absolute inset-0 rounded-full border-2 border-brand-gold/30"
                animate={{ scale: [1, 1.4], opacity: [0.7, 0] }}
                transition={{ duration: 1.9, repeat: Infinity, ease: "easeOut" }}
              />
              <svg viewBox="0 0 52 52" className="h-14 w-14" aria-hidden="true">
                <motion.path
                  d="M14 27.5l8.5 8.5L39 18"
                  fill="none"
                  stroke="#bfa46f"
                  strokeWidth={4}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.75, delay: 0.35, ease: "easeInOut" }}
                />
              </svg>
            </motion.div>

            <motion.p
              className="mt-7 text-[11px] font-bold uppercase tracking-[0.3em] text-brand-gold"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              Order Confirmed
            </motion.p>

            <motion.h2
              className="mt-2 font-serif text-3xl text-white sm:text-4xl"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              Thank you for your order
            </motion.h2>

            {orderNumber && (
              <motion.div
                className="mt-5 rounded-full border border-white/15 bg-white/5 px-5 py-2 text-sm text-white/80"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.75 }}
              >
                <span className="text-white/50">Order </span>
                <span className="font-semibold tracking-wide text-brand-gold">
                  {orderNumber}
                </span>
                {typeof amount === "number" && amount > 0 && formatAmount && (
                  <span className="text-white/50"> · {formatAmount(amount)}</span>
                )}
              </motion.div>
            )}

            <motion.p
              className="mt-6 text-[11px] uppercase tracking-[0.22em] text-white/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
            >
              Preparing your confirmation…
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
