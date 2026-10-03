"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";

/** Shared luxury easing — decelerating, never bouncy. */
export const EASE_OUT = [0.22, 1, 0.36, 1] as const;

type Direction = "up" | "down" | "left" | "right" | "scale" | "fade";

const buildVariants = (direction: Direction, distance: number): Variants => {
  const hidden: Record<string, number> = { opacity: 0 };

  if (direction === "up") hidden.y = distance;
  if (direction === "down") hidden.y = -distance;
  if (direction === "left") hidden.x = distance;
  if (direction === "right") hidden.x = -distance;
  if (direction === "scale") hidden.scale = 0.94;

  return {
    hidden,
    visible: { opacity: 1, x: 0, y: 0, scale: 1 },
  };
};

interface RevealProps {
  children: React.ReactNode;
  /** Where the element travels in from. */
  direction?: Direction;
  delay?: number;
  duration?: number;
  distance?: number;
  /** How much of the element must be in view before it animates (0-1). */
  amount?: number;
  once?: boolean;
  className?: string;
}

/**
 * Scroll-reveal wrapper used across the storefront.
 *
 * Animates once when the element scrolls into view and automatically falls back
 * to a plain fade (or nothing) when the visitor prefers reduced motion.
 */
export function Reveal({
  children,
  direction = "up",
  delay = 0,
  duration = 0.6,
  distance = 28,
  amount = 0.2,
  once = true,
  className,
}: RevealProps) {
  const reduced = useReducedMotion();

  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      variants={buildVariants(direction, distance)}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount }}
      transition={{ duration, delay, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
}

interface StaggerProps {
  children: React.ReactNode;
  /** Seconds between each child. */
  stagger?: number;
  delayChildren?: number;
  amount?: number;
  once?: boolean;
  className?: string;
}

/** Parent for `StaggerItem` — animates its children one after another. */
export function Stagger({
  children,
  stagger = 0.07,
  delayChildren = 0.05,
  amount = 0.15,
  once = true,
  className,
}: StaggerProps) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      className={className}
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: reduced ? 0 : stagger,
            delayChildren: reduced ? 0 : delayChildren,
          },
        },
      }}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount }}
    >
      {children}
    </motion.div>
  );
}

/** A single element inside a `Stagger` group. */
export function StaggerItem({
  children,
  direction = "up",
  distance = 26,
  duration = 0.55,
  className,
}: {
  children: React.ReactNode;
  direction?: Direction;
  distance?: number;
  duration?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      className={className}
      variants={
        reduced ? { hidden: {}, visible: {} } : buildVariants(direction, distance)
      }
      transition={{ duration, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Subtle vertical parallax — the child drifts as the section scrolls past.
 * Used for hero artwork and section backdrops.
 */
export function ParallaxFloat({
  children,
  className,
  offset = 40,
}: {
  children: React.ReactNode;
  className?: string;
  offset?: number;
}) {
  const reduced = useReducedMotion();

  if (reduced) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={cn(className)}
      initial={{ y: offset, opacity: 0 }}
      whileInView={{ y: 0, opacity: 1 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.9, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
}
