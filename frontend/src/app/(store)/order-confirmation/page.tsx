"use client";
// Render on demand - skip static generation so a sleeping backend cannot crash the build.
export const dynamic = "force-dynamic";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Check,
  Copy,
  CreditCard,
  Mail,
  PackageSearch,
  Phone,
  ShoppingBag,
  Truck,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import OrderSuccessAnimation from "@/components/checkout/order-success-animation";
import Breadcrumb from "@/components/common/breadcrumb";
import EmptyState from "@/components/common/empty-state";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import SupportCard from "@/components/common/support-card";
import {
  BANK_DETAILS,
  PAYMENT_LABELS,
  PAYMENT_METHOD_BANK_DEPOSIT,
  copyText,
} from "@/lib/payment";

interface PlacedOrderLine {
  name: string;
  quantity: number;
  price: number;
}

interface PlacedOrder {
  orderNumber: string;
  total: number;
  itemCount?: number;
  paymentMethod?: string;
  email?: string;
  items?: PlacedOrderLine[];
}

const STORAGE_KEY = "order-confirmation";

/** What happens after the order is placed — process facts, no promises. */
const NEXT_STEPS = [
  {
    icon: Phone,
    title: "Confirmation call",
    text: "Our team confirms your order and address.",
  },
  {
    icon: CreditCard,
    title: "Payment",
    text: "Pay cash on delivery, or via bank deposit if you chose it.",
  },
  {
    icon: Truck,
    title: "Dispatch & tracking",
    text: "Track every step with your order code.",
  },
];

export default function OrderConfirmationPage() {
  const { format, settings } = useStoreSettings();
  const [order, setOrder] = useState<PlacedOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [celebrate, setCelebrate] = useState(false);
  const [copied, setCopied] = useState(false);
  // Shown under the code box when auto-copy is blocked by the browser.
  const [copyFailed, setCopyFailed] = useState(false);
  // Which bank field was just copied ("Account Number" / "IBAN" / null).
  const [copiedBankField, setCopiedBankField] = useState<string | null>(null);

  useEffect(() => {
    let orderNumber = "";
    try {
      // The checkout page stores the placed order here right before
      // redirecting. A ?code= query param also works for direct visits.
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as PlacedOrder;
        orderNumber = parsed.orderNumber;
        setOrder(parsed);
      } else {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");
        if (code) {
          orderNumber = code;
          setOrder({ orderNumber: code, total: 0 });
        }
      }
    } catch {
      // Ignore malformed storage data — fall through to the empty state.
    } finally {
      setIsLoading(false);
      // Celebrate once per order: skip it when checkout already played the
      // animation for this exact order a moment ago.
      const celebrated = sessionStorage.getItem("order-celebrated");
      setCelebrate(Boolean(orderNumber) && celebrated !== orderNumber);
    }
  }, []);

  const stopCelebrating = useCallback(() => setCelebrate(false), []);

  const copyOrderCode = async () => {
    if (!order) return;
    if (await copyText(order.orderNumber)) {
      // The button swapping to "Copied" is the confirmation (no popup).
      setCopied(true);
      setCopyFailed(false);
      setTimeout(() => setCopied(false), 2000);
    } else {
      setCopyFailed(true);
    }
  };

  const copyBankField = async (label: string, value: string) => {
    if (await copyText(value)) {
      setCopiedBankField(label);
      setTimeout(() => setCopiedBankField(null), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="container flex min-h-[50vh] items-center justify-center py-16">
        <motion.span
          className="flex h-16 w-16 items-center justify-center rounded-full border border-brand-gold/30"
          animate={{ rotate: 360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
        >
          <span className="h-3 w-3 rounded-full bg-brand-gold" />
        </motion.span>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container py-8">
        <Breadcrumb
          items={[{ label: "Home", href: "/" }, { label: "Order Confirmation" }]}
        />
        <div className="mt-8 rounded-3xl border bg-card shadow-premium">
          <EmptyState
            icon={
              <span className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-gold/10 ring-1 ring-brand-gold/30">
                <PackageSearch className="h-9 w-9 text-brand-gold" />
              </span>
            }
            title="No recent order found"
            description="If you have already placed an order, use your Order Code or Phone Number to track it."
            action={
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Button
                  asChild
                  className="h-11 bg-brand-gold font-semibold text-white hover:bg-brand-gold-dark"
                >
                  <Link href="/track-order">Track My Order</Link>
                </Button>
                <Button asChild variant="outline" className="h-11">
                  <Link href="/shop">Continue Shopping</Link>
                </Button>
              </div>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <>
      <OrderSuccessAnimation
        open={celebrate}
        orderNumber={order.orderNumber}
        amount={order.total}
        formatAmount={format}
        duration={2400}
        onComplete={stopCelebrating}
      />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        // Extra bottom space on phones so the fixed bottom nav never covers
        // the buttons; desktop keeps the old spacing.
        className="container py-8 pb-28 md:pb-8"
      >
        <Breadcrumb
          items={[{ label: "Home", href: "/" }, { label: "Order Confirmation" }]}
        />

        <div className="mx-auto mt-8 max-w-3xl">
          <div className="relative overflow-hidden rounded-3xl border bg-card shadow-premium-lg">
            <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-brand-gold/10 blur-2xl" />

            <div className="bg-gradient-to-r from-brand-gold/12 via-transparent to-transparent px-6 py-8 text-center sm:px-10">
              <motion.span
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 200,
                  damping: 16,
                  delay: 0.15,
                }}
                className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-brand-gold/40 bg-brand-gold/10"
              >
                <Check className="h-9 w-9 text-brand-gold" />
                <motion.span
                  className="absolute inset-0 rounded-full border border-brand-gold/40"
                  animate={{ scale: [1, 1.35], opacity: [0.6, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                />
              </motion.span>

              <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.3em] text-brand-gold">
                Order Confirmed
              </p>
              <h1 className="mt-2 font-serif text-3xl leading-tight sm:text-4xl">
                Thank you for your order
              </h1>
              <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
                Save your order code below — you need it (or your phone number)
                to track the delivery.
              </p>
            </div>

            <div className="border-t px-6 py-6 sm:px-10">
              <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-dashed border-brand-gold/40 bg-brand-gold/[0.04] px-5 py-5 sm:flex-row">
                <div className="text-center sm:text-left">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                    Order Code
                  </p>
                  <p className="mt-1 font-serif text-3xl tracking-wide text-brand-gold">
                    {order.orderNumber}
                  </p>
                </div>
                <Button variant="outline" onClick={copyOrderCode} className="h-10">
                  {copied ? (
                    <>
                      <Check className="mr-2 h-4 w-4 text-emerald-600" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy code
                    </>
                  )}
                </Button>
              </div>
              {copyFailed && (
                <p role="alert" className="mt-2 text-xs text-muted-foreground">
                  Auto-copy is blocked in this browser — long-press the code
                  above to copy it manually.
                </p>
              )}

              <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border p-4">
                  <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                    <Wallet className="h-3.5 w-3.5 text-brand-gold" />
                    Total
                  </p>
                  <p className="mt-1 text-lg font-bold text-brand-gold">
                    {order.total > 0 ? format(order.total) : "—"}
                  </p>
                </div>

                {typeof order.itemCount === "number" && order.itemCount > 0 && (
                  <div className="rounded-2xl border p-4">
                    <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                      <ShoppingBag className="h-3.5 w-3.5 text-brand-gold" />
                      Items
                    </p>
                    <p className="mt-1 text-lg font-bold">{order.itemCount}</p>
                  </div>
                )}

                <div className="rounded-2xl border p-4">
                  <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                    <CreditCard className="h-3.5 w-3.5 text-brand-gold" />
                    Payment
                  </p>
                  <p className="mt-1 text-sm font-bold">
                    {PAYMENT_LABELS[order.paymentMethod || ""] ||
                      order.paymentMethod ||
                      "—"}
                  </p>
                </div>
              </div>

              {order.email && (
                <p className="mt-5 flex items-center justify-center gap-2 text-xs text-muted-foreground sm:justify-start">
                  <Mail className="h-3.5 w-3.5 text-brand-gold" />
                  Order details will be sent to {order.email}
                </p>
              )}

              {order.paymentMethod === PAYMENT_METHOD_BANK_DEPOSIT && (
                <div className="mt-5 space-y-2 rounded-2xl border border-brand-gold/30 bg-brand-gold/[0.04] p-4">
                  <p className="text-sm font-semibold">
                    Complete your bank deposit to {BANK_DETAILS.bank}
                  </p>
                  <dl className="space-y-2 text-sm">
                    {(
                      [
                        ["Account Title", BANK_DETAILS.title, false],
                        ["Account Number", BANK_DETAILS.account, true],
                        ["IBAN", BANK_DETAILS.iban, true],
                      ] as const
                    ).map(([label, value, copyable]) => (
                      <div
                        key={label}
                        className="flex items-center justify-between gap-3 rounded-xl bg-background px-3 py-2"
                      >
                        <div className="min-w-0">
                          <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
                            {label}
                          </dt>
                          <dd className="truncate font-mono font-semibold">
                            {value}
                          </dd>
                        </div>
                        {copyable && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="shrink-0"
                            title={copiedBankField === label ? `${label} copied` : `Copy ${label}`}
                            aria-label={copiedBankField === label ? `${label} copied` : `Copy ${label}`}
                            onClick={() => copyBankField(label, value)}
                          >
                            {copiedBankField === label ? (
                              <Check className="h-4 w-4 text-emerald-600" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    ))}
                  </dl>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Transfer the exact total shown above, then share the receipt
                    screenshot with us so we can dispatch your order quickly.
                  </p>
                </div>
              )}
            </div>
          </div>

          {order.items && order.items.length > 0 && (
            <div className="mt-6 overflow-hidden rounded-3xl border bg-card shadow-premium">
              <div className="border-b px-6 py-4">
                <h2 className="font-serif text-xl">What you ordered</h2>
              </div>
              <div className="divide-y px-6">
                {order.items.map((line, index) => (
                  <div
                    key={`${line.name}-${index}`}
                    className="flex items-center justify-between gap-4 py-3 text-sm"
                  >
                    <span className="min-w-0 truncate">
                      {line.name}{" "}
                      <span className="text-muted-foreground">
                        × {line.quantity}
                      </span>
                    </span>
                    <span className="shrink-0 font-semibold">
                      {format(line.price * line.quantity)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 overflow-hidden rounded-3xl border bg-card shadow-premium">
            <div className="border-b px-6 py-4">
              <h2 className="font-serif text-xl">What happens next</h2>
            </div>
            <div className="grid gap-6 px-6 py-6 sm:grid-cols-3">
              {NEXT_STEPS.map(({ icon: Icon, title, text }, index) => (
                <div key={title}>
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-gold/10 text-brand-gold">
                    <Icon className="h-4 w-4" />
                  </span>
                  <p className="mt-3 text-sm font-semibold">
                    {index + 1}. {title}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {text}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button
              asChild
              className="h-12 bg-brand-gold px-8 font-semibold uppercase tracking-wide text-white hover:bg-brand-gold-dark"
            >
              <Link
                href={`/track-order?code=${encodeURIComponent(order.orderNumber)}`}
              >
                <PackageSearch className="mr-2 h-4 w-4" />
                Track My Order
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-12 px-8">
              <Link href="/shop">
                <ShoppingBag className="mr-2 h-4 w-4" />
                Continue Shopping
              </Link>
            </Button>
          </div>

          <SupportCard
            phone={settings?.storePhone || ""}
            email={settings?.storeEmail || ""}
            orderNumber={order.orderNumber}
            className="mt-6"
          />
        </div>
      </motion.div>
    </>
  );
}
