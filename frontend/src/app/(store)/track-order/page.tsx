"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarDays,
  Check,
  Copy,
  CreditCard,
  Loader2,
  MapPin,
  Package,
  PackageSearch,
  Phone,
  Search,
  Sparkles,
  Truck,
} from "lucide-react";
import api from "@/lib/api";
import { cn, getImageUrl } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import OrderTimeline from "@/components/order/order-timeline";
import Breadcrumb from "@/components/common/breadcrumb";
import EmptyState from "@/components/common/empty-state";
import SupportCard from "@/components/common/support-card";
import { copyText } from "@/lib/payment";
import { useStoreSettings } from "@/hooks/useStoreSettings";

interface TrackedOrderItem {
  name: string;
  price: number;
  quantity: number;
  image: string;
}

interface TrackedOrder {
  orderNumber: string;
  orderStatus: string;
  paymentStatus: string;
  paymentMethod: string;
  subtotal: number;
  shipping: number;
  total: number;
  discount?: number;
  createdAt: string;
  updatedAt?: string;
  trackingNumber?: string;
  shippingCarrier?: string;
  items: TrackedOrderItem[];
  shippingAddress: {
    fullName: string;
    phone: string;
    address: string;
    city: string;
    postalCode: string;
    country: string;
  };
}

/** Status → label + soft badge styling (same statuses as order.model.ts). */
const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  pending: {
    label: "Pending",
    className: "border-amber-300/60 bg-amber-50 text-amber-700",
  },
  confirmed: {
    label: "Confirmed",
    className: "border-sky-300/60 bg-sky-50 text-sky-700",
  },
  processing: {
    label: "Processing",
    className: "border-indigo-300/60 bg-indigo-50 text-indigo-700",
  },
  shipped: {
    label: "Shipped",
    className: "border-violet-300/60 bg-violet-50 text-violet-700",
  },
  out_for_delivery: {
    label: "Out for Delivery",
    className: "border-orange-300/60 bg-orange-50 text-orange-700",
  },
  delivered: {
    label: "Delivered",
    className: "border-emerald-300/60 bg-emerald-50 text-emerald-700",
  },
  cancelled: {
    label: "Cancelled",
    className: "border-destructive/30 bg-destructive/5 text-destructive",
  },
};

const PAYMENT_LABELS: Record<string, string> = {
  cod: "Cash on Delivery",
  bank_deposit: "Bank Deposit",
  card: "Credit / Debit Card",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: "Not paid yet",
  paid: "Paid",
  failed: "Payment failed",
  refunded: "Refunded",
};

function StatusPill({ status, className }: { status: string; className?: string }) {
  const style = STATUS_STYLES[status] || {
    label: status,
    className: "border-border bg-muted text-muted-foreground",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold",
        style.className,
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {style.label}
    </span>
  );
}

interface OrderCardProps {
  order: TrackedOrder;
  format: (amount: number) => string;
  index: number;
  storePhone: string;
  storeEmail: string;
}

/** One tracked order: code, fulfilment timeline, items, totals and delivery. */
function OrderCard({
  order,
  format,
  index,
  storePhone,
  storeEmail,
}: OrderCardProps) {
  const [copied, setCopied] = useState(false);
  // Icon swap for the tracking-number copy button (no popup).
  const [trackingCopied, setTrackingCopied] = useState(false);

  const placedOn = new Date(order.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const lastUpdate = order.updatedAt
    ? new Date(order.updatedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  const copyCode = async () => {
    // The icon swapping to a check is the confirmation (no popup).
    if (await copyText(order.orderNumber)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const copyTracking = async () => {
    if (!order.trackingNumber) return;
    if (await copyText(order.trackingNumber)) {
      setTrackingCopied(true);
      setTimeout(() => setTrackingCopied(false), 2000);
    }
  };

  // Storefront-side estimate shown while the order is still on its way —
  // clearly labelled as an estimate, never as a promise from the courier.
  const active =
    order.orderStatus !== "delivered" && order.orderStatus !== "cancelled";
  const estimatedBy = active
    ? new Date(
        new Date(order.createdAt).getTime() + 7 * 24 * 60 * 60 * 1000
      ).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.08, 0.3) }}
      className="overflow-hidden rounded-3xl border bg-card shadow-premium"
    >
      <div className="border-b bg-gradient-to-r from-brand-gold/10 via-transparent to-transparent px-5 py-5 sm:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-brand-gold">
              Order Code
            </p>
            <div className="mt-1.5 flex items-center gap-2">
              <p className="font-serif text-2xl tracking-wide sm:text-3xl">
                {order.orderNumber}
              </p>
              <button
                type="button"
                onClick={copyCode}
                aria-label="Copy order code"
                className="rounded-full border p-1.5 text-muted-foreground transition-colors hover:border-brand-gold/40 hover:text-brand-gold"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
            <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5 text-brand-gold" />
              Placed on {placedOn}
              {lastUpdate && lastUpdate !== placedOn
                ? ` · Updated ${lastUpdate}`
                : ""}
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <StatusPill status={order.orderStatus} />
            <p className="text-lg font-bold text-brand-gold">
              {format(order.total)}
            </p>
            {estimatedBy && (
              <p className="flex items-center gap-1.5 rounded-full border border-brand-gold/30 bg-brand-gold/5 px-3 py-1 text-[11px] font-semibold text-brand-gold">
                <Truck className="h-3 w-3" />
                Estimated by {estimatedBy}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="border-b px-5 py-7 sm:px-8">
        <OrderTimeline status={order.orderStatus} />
      </div>

      {/* Phones: 2-column summary grid; desktop keeps 3 columns. */}
      <div className="grid grid-cols-2 gap-5 border-b px-5 py-6 sm:grid-cols-3 sm:px-8">
        <div className="flex items-start gap-2.5">
          <CreditCard className="mt-0.5 h-4 w-4 shrink-0 text-brand-gold" />
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Payment
            </p>
            <p className="mt-0.5 text-sm font-medium">
              {PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod}
            </p>
            <p className="text-xs text-muted-foreground">
              {PAYMENT_STATUS_LABELS[order.paymentStatus] || order.paymentStatus}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <Package className="mt-0.5 h-4 w-4 shrink-0 text-brand-gold" />
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Items
            </p>
            <p className="mt-0.5 text-sm font-medium">
              {order.items.reduce((sum, item) => sum + item.quantity, 0)} in
              this order
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <Truck
            className={cn(
              "mt-0.5 h-4 w-4 shrink-0",
              order.trackingNumber ? "text-brand-gold" : "text-muted-foreground"
            )}
          />
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Courier Tracking
            </p>
            {order.trackingNumber ? (
              <div className="mt-0.5">
                <button
                  type="button"
                  onClick={copyTracking}
                  aria-label={
                    trackingCopied
                      ? "Tracking number copied"
                      : "Copy tracking number"
                  }
                  className="group flex max-w-full items-center gap-1.5 text-left"
                >
                  <span className="truncate text-sm font-semibold group-hover:text-brand-gold">
                    {order.trackingNumber}
                  </span>
                  {trackingCopied ? (
                    <Check className="h-3 w-3 shrink-0 text-emerald-600" />
                  ) : (
                    <Copy className="h-3 w-3 shrink-0 text-muted-foreground group-hover:text-brand-gold" />
                  )}
                </button>
                <p className="text-xs text-muted-foreground">
                  {order.shippingCarrier || "With our courier partner"}
                </p>
              </div>
            ) : (
              <p className="mt-0.5 text-sm text-muted-foreground">
                Number appears once it ships
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 px-5 py-6 sm:gap-8 sm:px-8 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide">
            Items
          </h3>
          <div className="mt-4 space-y-4">
            {order.items.map((item, itemIndex) => (
              <div
                key={`${order.orderNumber}-${itemIndex}`}
                className="flex items-center gap-3"
              >
                <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-muted ring-1 ring-black/5">
                  {item.image ? (
                    <img
                      src={getImageUrl(item.image)}
                      alt={item.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center">
                      <Package className="h-4 w-4 text-muted-foreground" />
                    </span>
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  {/* Phones wrap long names to 2 lines; desktop keeps 1 line. */}
                  <span className="block text-sm font-medium line-clamp-2 sm:line-clamp-1">
                    {item.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Qty {item.quantity} · {format(item.price)} each
                  </span>
                </span>
                <span className="shrink-0 text-sm font-semibold">
                  {format(item.price * item.quantity)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3 self-start rounded-2xl border bg-muted/30 p-5 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium">{format(order.subtotal)}</span>
          </div>
          {typeof order.discount === "number" && order.discount > 0 && (
            <div className="flex items-center justify-between text-emerald-600">
              <span>Discount</span>
              <span className="font-medium">− {format(order.discount)}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Shipping</span>
            <span
              className={cn(
                "font-medium",
                order.shipping === 0 && "text-brand-gold"
              )}
            >
              {order.shipping === 0 ? "Free" : format(order.shipping)}
            </span>
          </div>
          <div className="h-px bg-border" />
          <div className="flex items-baseline justify-between">
            <span className="font-serif text-base">Total</span>
            <span className="text-xl font-bold text-brand-gold">
              {format(order.total)}
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-5 border-t px-5 py-6 sm:gap-6 sm:px-8 lg:grid-cols-2">
        <div className="flex items-start gap-3">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-gold" />
          <div className="text-sm">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Delivery Address
            </p>
            <p className="mt-1 font-semibold">
              {order.shippingAddress.fullName}
            </p>
            <p className="text-xs text-muted-foreground">
              {order.shippingAddress.phone}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {order.shippingAddress.address}, {order.shippingAddress.city}{" "}
              {order.shippingAddress.postalCode}, {order.shippingAddress.country}
            </p>
          </div>
        </div>

        <SupportCard
          phone={storePhone}
          email={storeEmail}
          orderNumber={order.orderNumber}
        />
      </div>
    </motion.div>
  );
}

export default function TrackOrderPage() {
  const { format, settings } = useStoreSettings();
  const [orderCode, setOrderCode] = useState("");
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<TrackedOrder[] | null>(null);

  const storePhone = settings?.storePhone || "";
  const storeEmail = settings?.storeEmail || "";

  const runTrack = useCallback(async (code: string, phoneNumber: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.post("/orders/track", {
        orderCode: code || undefined,
        phone: phoneNumber || undefined,
      });
      setOrders(response.data.data.orders || []);
    } catch (err: any) {
      setOrders(null);
      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          "Failed to track order. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Arriving from the confirmation page (/track-order?code=ORD-9001) or any
  // shared link: prefill the code and look it up straight away.
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("code");
    if (!code) return;
    setOrderCode(code);
    runTrack(code, "");
  }, [runTrack]);

  const handleTrack = (event: React.FormEvent) => {
    event.preventDefault();
    const code = orderCode.trim();
    const phoneNumber = phone.trim();

    if (!code && !phoneNumber) {
      setError("Please enter either an Order Code or a Phone Number");
      return;
    }

    runTrack(code, phoneNumber);
  };

  const clearSearch = () => {
    setOrders(null);
    setError(null);
    setOrderCode("");
    setPhone("");
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      // Extra bottom space on phones so the fixed bottom nav never covers
      // the order details; desktop keeps the old spacing.
      className="container py-8 pb-28 md:pb-8"
    >
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Track Order" }]} />

      <div className="mx-auto mt-8 max-w-3xl">
        <div className="overflow-hidden rounded-3xl border bg-card shadow-premium">
          <div className="bg-gradient-to-r from-brand-gold/12 via-transparent to-transparent px-5 py-8 text-center sm:px-10">
            <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-brand-gold/10 ring-1 ring-brand-gold/30">
              <PackageSearch className="h-9 w-9 text-brand-gold" />
            </span>
            <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.3em] text-brand-gold">
              Order Tracking
            </p>
            <h1 className="mt-2 font-serif text-3xl leading-tight sm:text-4xl">
              Track Your Order
            </h1>
            <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
              Enter your order code or the phone number you used at checkout to
              see exactly where your order is.
            </p>
          </div>

          <div className="border-t px-5 py-6 sm:px-10">
            <form onSubmit={handleTrack} className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="orderCode">Order Code</Label>
                  <Input
                    id="orderCode"
                    className="h-11"
                    placeholder="e.g. ORD-9001"
                    value={orderCode}
                    onChange={(event) => setOrderCode(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    className="h-11"
                    placeholder="e.g. 03001234567"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 text-[11px] uppercase tracking-wider text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                either one works
                <span className="h-px flex-1 bg-border" />
              </div>

              {error && (
                <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </p>
              )}

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="h-12 flex-1 bg-brand-gold text-sm font-semibold uppercase tracking-wide text-white hover:bg-brand-gold-dark"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Tracking…
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      Track Order
                    </>
                  )}
                </Button>
                {(orders || error) && (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 sm:w-40"
                    onClick={clearSearch}
                  >
                    Clear
                  </Button>
                )}
              </div>
            </form>
          </div>
        </div>

        {orders && orders.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-8 space-y-6"
          >
            <h2 className="font-serif text-xl">
              {orders.length === 1 ? "Your order" : `${orders.length} orders found`}
            </h2>
            {orders.map((order, index) => (
              <OrderCard
                key={order.orderNumber}
                order={order}
                index={index}
                format={format}
                storePhone={storePhone}
                storeEmail={storeEmail}
              />
            ))}
          </motion.div>
        )}

        {orders && orders.length === 0 && (
          <div className="mt-8 rounded-3xl border bg-card shadow-premium">
            <EmptyState
              icon={
                <span className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-gold/10 ring-1 ring-brand-gold/30">
                  <PackageSearch className="h-9 w-9 text-brand-gold" />
                </span>
              }
              title="No order found"
              description="We could not find any order matching those details. Please check your order code or phone number and try again."
              action={
                <Button
                  asChild
                  className="h-11 bg-brand-gold font-semibold text-white hover:bg-brand-gold-dark"
                >
                  <Link href="/shop">Continue Shopping</Link>
                </Button>
              }
            />
          </div>
        )}

        {!orders && !error && (
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              {
                icon: PackageSearch,
                title: "Your order code",
                text: "It starts with ORD- and is shown right after you place an order.",
                href: null as string | null,
              },
              {
                icon: Phone,
                title: "Used phone number",
                text: "The number you entered at checkout finds every order on it.",
                href: null as string | null,
              },
              {
                icon: Sparkles,
                title: "Still stuck?",
                text: "Contact us with your order code and we will help you out.",
                href: "/contact" as string | null,
              },
            ].map(({ icon: Icon, title, text, href }) => {
              const inner = (
                <>
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-gold/10 text-brand-gold">
                    <Icon className="h-4 w-4" />
                  </span>
                  <p className="mt-3 text-sm font-semibold">
                    {title}
                    {href && <span className="text-brand-gold"> →</span>}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {text}
                  </p>
                </>
              );
              return href ? (
                <Link
                  key={title}
                  href={href}
                  className="rounded-2xl border border-brand-gold/30 bg-card p-5 shadow-premium transition-colors hover:border-brand-gold/60"
                >
                  {inner}
                </Link>
              ) : (
                <div
                  key={title}
                  className="rounded-2xl border bg-card p-5 shadow-premium"
                >
                  {inner}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}
