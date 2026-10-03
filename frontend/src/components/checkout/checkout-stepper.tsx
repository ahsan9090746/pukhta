"use client";

import { motion } from "framer-motion";
import { Check, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CheckoutStep {
  id: number;
  label: string;
  hint: string;
  icon: LucideIcon;
}

interface CheckoutStepperProps {
  steps: CheckoutStep[];
  /** Id of the step currently shown. */
  current: number;
  /** Lets the shopper jump back to a step they already completed. */
  onStepClick?: (step: number) => void;
  className?: string;
}

/** Gold progress stepper used across the checkout flow. */
export default function CheckoutStepper({
  steps,
  current,
  onStepClick,
  className,
}: CheckoutStepperProps) {
  const progress =
    steps.length > 1 ? ((current - 1) / (steps.length - 1)) * 100 : 0;

  return (
    <div
      className={cn(
        "relative rounded-2xl border bg-card px-4 py-5 shadow-premium sm:px-8",
        className
      )}
    >
      {/* Rail sits behind the circles and fills as the shopper advances */}
      <div className="absolute left-[12%] right-[12%] top-[42px] hidden h-[2px] rounded-full bg-border sm:block">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-brand-gold to-brand-gold-dark"
          initial={false}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        />
      </div>

      <ol className="relative flex items-start justify-between gap-2">
        {steps.map((step) => {
          const done = step.id < current;
          const active = step.id === current;
          const Icon = step.icon;
          const canJump = done && !!onStepClick;

          return (
            <li key={step.id} className="flex flex-1 justify-center">
              <button
                type="button"
                disabled={!canJump}
                onClick={() => canJump && onStepClick?.(step.id)}
                aria-current={active ? "step" : undefined}
                className={cn(
                  "group flex w-full flex-col items-center gap-2.5 text-center",
                  canJump ? "cursor-pointer" : "cursor-default"
                )}
              >
                <span
                  className={cn(
                    "relative flex h-11 w-11 items-center justify-center rounded-full border-2 transition-all duration-300",
                    done &&
                      "border-brand-gold bg-gradient-to-br from-brand-gold to-brand-gold-dark text-white shadow-gold",
                    active &&
                      "border-brand-gold bg-background text-brand-gold ring-4 ring-brand-gold/15",
                    !done && !active && "border-border bg-muted text-muted-foreground",
                    canJump && "group-hover:scale-105"
                  )}
                >
                  {done ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <Icon className="h-4.5 w-4.5" />
                  )}
                  {active && (
                    <span className="absolute inset-0 rounded-full border border-brand-gold/40 animate-gold-pulse" />
                  )}
                </span>

                <span className="min-w-0">
                  <span
                    className={cn(
                      "block text-[13px] font-semibold leading-tight transition-colors",
                      active ? "text-brand-gold" : "text-foreground",
                      !done && !active && "text-muted-foreground"
                    )}
                  >
                    {step.label}
                  </span>
                  <span className="mt-0.5 hidden text-[11px] text-muted-foreground sm:block">
                    {step.hint}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
