"use client";
// Render on demand - skip static generation so a sleeping backend cannot crash the build.
export const dynamic = "force-dynamic";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
// NOTE: only the tiny country list ships with the page — states + cities
// (~2MB) lazy-load when the visitor reaches those fields (see below).
import countryList from "country-state-city/lib/cjs/assets/country.json";
import {
  Banknote,
  Check,
  CircleAlert,
  Copy,
  CreditCard,
  Landmark,
  Loader2,
  Lock,
  MapPin,
  MessageCircle,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import api from "@/lib/api";
import { trackEvent } from "@/lib/analytics";
import {
  BANK_DETAILS,
  PAYMENT_METHOD_BANK_DEPOSIT,
  PAYMENT_METHOD_COD,
  copyText,
} from "@/lib/payment";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { default as nextDynamic } from "next/dynamic";
import OrderSummary from "@/components/checkout/order-summary";
// Celebration overlay only matters after an order is placed — loads on
// demand so it never costs initial-load time. Same visuals, same timing.
const OrderSuccessAnimation = nextDynamic(
  () => import("@/components/checkout/order-success-animation"),
  { ssr: false }
);
import TrustBadges from "@/components/common/trust-badges";
import Breadcrumb from "@/components/common/breadcrumb";
import EmptyState from "@/components/common/empty-state";
import { useCartStore } from "@/stores/cart-store";
import { useStoreSettings } from "@/hooks/useStoreSettings";

const addressSchema = z.object({
  fullName: z.string().min(2, "Name is required"),
  email: z.string().min(1, "Email is required").email("Valid email required"),
  phone: z.string().min(10, "Valid phone number required"),
  address: z.string().min(5, "Address is required"),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  zipCode: z.string().min(3, "Postal code is required"),
  country: z.string().min(2, "Country is required"),
});

type AddressFormData = z.infer<typeof addressSchema>;

const PAYMENT_OPTIONS = [
  {
    value: PAYMENT_METHOD_COD,
    title: "Cash on Delivery",
    description: "Pay in cash when your order arrives.",
    icon: Banknote,
  },
  {
    value: PAYMENT_METHOD_BANK_DEPOSIT,
    title: "Bank Deposit",
    description: "Transfer to our Meezan Bank account.",
    icon: Landmark,
  },
];

/** Address from the last checkout on this device (convenience, no account). */
const ADDRESS_KEY = "footware-checkout-address";
/**
 * Mobile-first field sizing: 16px text stops iOS from zooming into the inputs
 * and the taller box is a comfortable thumb target. Desktop keeps the old h-11.
 */
const FIELD_CLASS = "h-12 text-base md:h-11 md:text-sm";

export default function CheckoutPage() {
  const { items, clearCart } = useCartStore();
  const { format, settings, storePhone } = useStoreSettings();
  const router = useRouter();

  const [paymentMethod, setPaymentMethod] = useState<string>("cod");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<{
    orderNumber: string;
    total: number;
  } | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  // Amazon-style inline problem box above the Place Order button (no popup).
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Which bank field was just copied ("Account Number" / "IBAN" / null).
  const [copiedBankField, setCopiedBankField] = useState<string | null>(null);

  // Analytics: visitor reached the checkout flow (one event per session)
  useEffect(() => {
    trackEvent("checkout_started", { path: "/checkout" });
  }, []);

  const subtotal = items.reduce(
    (value, item) => value + (item.price || 0) * (item.quantity || 0),
    0
  );
  // Shipping is free on every order — the server also always charges 0, so
  // the displayed total always matches the total the order is created with.
  const shipping = 0;
  const total = Math.max(0, Math.round(subtotal * 100) / 100);
  const itemCount = items.reduce((sum, item) => sum + (item.quantity || 0), 0);

  const orderLines = items.map((item) => ({
    id: item._id,
    name: item.product?.name || "Product",
    image: item.product?.images?.[0] || item.product?.thumbnail || "",
    quantity: item.quantity || 1,
    price: item.price || 0,
    size: item.size,
    color: item.color,
  }));

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
    defaultValues: { country: "Pakistan", state: "", city: "" },
  });

  // Country / State / City dropdowns (country-state-city package).
  // Stored as names ("Pakistan") so the backend payload stays unchanged.
  // The country list (93KB) ships with the page so the dropdown is complete
  // instantly. States + cities (the ~2MB part) load only when the visitor
  // reaches these fields — zero cost to initial load, same dropdowns after.
  type LocationLib = typeof import("country-state-city");
  const [locationLib, setLocationLib] = useState<LocationLib | null>(null);
  const locationLoading = useRef(false);
  const ensureLocations = useCallback(() => {
    if (locationLoading.current) return;
    locationLoading.current = true;
    import("country-state-city").then(
      (lib) => setLocationLib(lib),
      () => {
        locationLoading.current = false;
      }
    );
  }, []);
  const countries = useMemo(
    () =>
      (countryList as Array<{
        isoCode: string;
        name: string;
        flag?: string;
      }>),
    []
  );
  const watchedCountry = watch("country");
  const watchedState = watch("state");
  const selectedCountry = useMemo(
    () =>
      countries.find((c) => c.name === watchedCountry) ||
      countries.find((c) => c.isoCode === "PK"),
    [countries, watchedCountry]
  );
  const statesOfCountry = useMemo(
    () =>
      locationLib && selectedCountry
        ? locationLib.State.getStatesOfCountry(selectedCountry.isoCode)
        : [],
    [locationLib, selectedCountry]
  );
  const selectedState = useMemo(
    () => statesOfCountry.find((s) => s.name === watchedState),
    [statesOfCountry, watchedState]
  );
  const citiesOfState = useMemo(() => {
    if (!locationLib || !selectedCountry) return [];
    const raw = selectedState
      ? locationLib.City.getCitiesOfState(
          selectedCountry.isoCode,
          selectedState.isoCode
        )
      : locationLib.City.getCitiesOfCountry(selectedCountry.isoCode) || [];
    // The dataset contains duplicate names (e.g. "Shorkot" twice in Punjab) —
    // dedupe by name so React keys and Select values stay unique.
    const seen = new Set<string>();
    return raw.filter((c) => {
      if (seen.has(c.name)) return false;
      seen.add(c.name);
      return true;
    });
  }, [locationLib, selectedCountry, selectedState]);

  const handleCountryChange = useCallback(
    (name: string) => {
      setValue("country", name, { shouldValidate: true });
      setValue("state", "", { shouldValidate: false });
      setValue("city", "", { shouldValidate: false });
    },
    [setValue]
  );

  const handleStateChange = useCallback(
    (name: string) => {
      setValue("state", name, { shouldValidate: true });
      setValue("city", "", { shouldValidate: false });
    },
    [setValue]
  );

  // Shop WhatsApp number for the payment-screenshot instruction.
  // Prefers Admin → Settings → Social Media → WhatsApp link, falls back to store phone.
  const adminWhatsapp = (settings?.socialMedia?.whatsapp || "").trim();
  const phoneDigits = (storePhone || "").replace(/\D/g, "");
  const adminWhatsappDigits = adminWhatsapp.replace(/\D/g, "");
  // wa.me needs the full international digits (92…); local 03… numbers get the 0 swapped for 92.
  const normalizePk = (digits: string) => {
    if (!digits) return "";
    if (digits.startsWith("92")) return digits;
    if (digits.startsWith("0")) return `92${digits.slice(1)}`;
    return digits;
  };
  const waDigits =
    normalizePk(adminWhatsappDigits) || normalizePk(phoneDigits);
  const displayShopNumber =
    storePhone ||
    (adminWhatsappDigits ? `+${adminWhatsappDigits}` : "") ||
    "our shop number";
  const waText = encodeURIComponent(
    `Assalam-o-Alaikum! I just placed an order (${format(total)}) via bank deposit. Here is my payment receipt screenshot.`
  );
  const whatsappHref = waDigits
    ? `https://wa.me/${waDigits}?text=${waText}`
    : "";
  const [copiedShopNumber, setCopiedShopNumber] = useState(false);

  // Prefill the form with the address used last time on this device.
  // Country always falls back to Pakistan when the stored value is missing.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(ADDRESS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<AddressFormData>;
        reset({ country: "Pakistan", state: "", city: "", ...parsed } as AddressFormData);
      }
    } catch {
      // malformed storage — just start with an empty form
    }
  }, [reset]);

  const placeOrder = async (data: AddressFormData) => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const response = await api.post("/orders/guest", {
        items: items.map((item) => ({
          productId: item.product?._id,
          variantId: item.variantId,
          quantity: item.quantity,
        })),
        shippingAddress: {
          fullName: data.fullName,
          phone: data.phone,
          address1: data.address,
          city: data.city,
          state: data.state,
          postalCode: data.zipCode,
          country: data.country,
        },
        paymentMethod,
        guestEmail: data.email,
      });

      const order = response.data.data.order;

      // The confirmation + tracking pages read this, so the shape stays the same
      // (extra fields are additive and optional on the reader side).
      sessionStorage.setItem(
        "order-confirmation",
        JSON.stringify({
          orderNumber: order.orderNumber,
          total: order.total,
          itemCount,
          paymentMethod,
          email: data.email,
          items: orderLines.map((line) => ({
            name: line.name,
            quantity: line.quantity,
            price: line.price,
          })),
        })
      );

      // Remember the address for the next checkout on this device
      try {
        localStorage.setItem(ADDRESS_KEY, JSON.stringify(data));
      } catch {
        // private mode — not important enough to interrupt the order
      }

      // The confirmation page skips its own celebration for orders that were
      // already celebrated here, so the animation never plays twice in a row.
      sessionStorage.setItem("order-celebrated", order.orderNumber);

      clearCart();
      trackEvent("purchase", { path: "/checkout" });
      setPlacedOrder({ orderNumber: order.orderNumber, total: order.total });
      setShowSuccess(true);
    } catch (error: any) {
      setSubmitError(
        error.response?.data?.error ||
          error.response?.data?.message ||
          "Failed to place order. Please check your connection and try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuccessComplete = useCallback(
    () => router.push("/order-confirmation"),
    [router]
  );

  if (!items.length && !showSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="container py-8"
      >
        <Breadcrumb
          items={[{ label: "Home", href: "/" }, { label: "Checkout" }]}
        />
        <div className="mt-8 rounded-3xl border bg-card shadow-premium">
          <EmptyState
            icon={
              <span className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-gold/10 ring-1 ring-brand-gold/30">
                <ShoppingBag className="h-9 w-9 text-brand-gold" />
              </span>
            }
            title="Your bag is empty"
            description="Add a pair to your bag before checking out."
            action={
              <Button
                asChild
                className="h-11 bg-brand-gold font-semibold text-white hover:bg-brand-gold-dark"
              >
                <Link href="/shop">Start Shopping</Link>
              </Button>
            }
          />
        </div>
      </motion.div>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="container pb-32 pt-8 lg:pb-10"
      >
        <Breadcrumb
          items={[{ label: "Home", href: "/" }, { label: "Checkout" }]}
        />

        <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between lg:mt-8">
          <div>
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.28em] text-brand-gold">
              <Sparkles className="h-3.5 w-3.5" />
              Checkout — one simple step
            </p>
            <h1 className="mt-3 font-serif text-3xl leading-tight sm:text-4xl">
              Secure Checkout
            </h1>
            <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <Check className="h-4 w-4 shrink-0 text-emerald-600" />
              Free shipping on every order — no account needed
            </p>
          </div>
          <p className="hidden items-center gap-2 rounded-full border px-4 py-2 text-xs text-muted-foreground sm:flex">
            <Lock className="h-3.5 w-3.5 shrink-0 text-brand-gold" />
            Your details are only used to deliver this order
          </p>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:mt-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8">
          {/* One page, one step — delivery + payment + place order */}
          <form
            id="checkout-form"
            onSubmit={handleSubmit(placeOrder)}
            className="space-y-5 lg:space-y-6"
          >
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="overflow-hidden rounded-2xl border bg-card shadow-premium"
            >
              <div className="border-b bg-gradient-to-r from-brand-gold/10 via-transparent to-transparent px-4 py-4 sm:px-6 sm:py-5">
                <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.28em] text-brand-gold">
                  <MapPin className="h-3.5 w-3.5" />
                  Delivery details
                </p>
                <h2 className="mt-1 font-serif text-xl sm:text-2xl">
                  Where your order goes
                </h2>
              </div>

              <div className="space-y-5 px-4 py-5 sm:px-6 sm:py-6">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      className={FIELD_CLASS}
                      placeholder="Your name"
                      autoComplete="name"
                      {...register("fullName")}
                    />
                    {errors.fullName && (
                      <p className="text-xs text-destructive">
                        {errors.fullName.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      inputMode="tel"
                      className={FIELD_CLASS}
                      placeholder="03XX XXXXXXX"
                      autoComplete="tel"
                      {...register("phone")}
                    />
                    {errors.phone && (
                      <p className="text-xs text-destructive">
                        {errors.phone.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    className={FIELD_CLASS}
                    placeholder="you@example.com"
                    autoComplete="email"
                    {...register("email")}
                  />
                  {errors.email && (
                    <p className="text-xs text-destructive">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Street Address</Label>
                  <Input
                    id="address"
                    className={FIELD_CLASS}
                    placeholder="House #, street, area"
                    autoComplete="street-address"
                    {...register("address")}
                  />
                  {errors.address && (
                    <p className="text-xs text-destructive">
                      {errors.address.message}
                    </p>
                  )}
                </div>

                <div
                  className="grid grid-cols-2 gap-5 md:grid-cols-4"
                  onPointerEnter={ensureLocations}
                  onFocus={ensureLocations}
                >
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Controller
                      control={control}
                      name="country"
                      render={({ field }) => (
                        <Select
                          value={field.value || "Pakistan"}
                          onValueChange={handleCountryChange}
                        >
                          <SelectTrigger
                            id="country"
                            className={FIELD_CLASS}
                          >
                            <SelectValue placeholder="Select country" />
                          </SelectTrigger>
                          <SelectContent>
                            {countries.map((c) => (
                              <SelectItem key={c.isoCode} value={c.name}>
                                {c.flag} {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.country && (
                      <p className="text-xs text-destructive">
                        {errors.country.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    {!locationLib ? (
                      <Controller
                        control={control}
                        name="state"
                        render={({ field }) => (
                          <Select
                            value={field.value || ""}
                            onValueChange={handleStateChange}
                            disabled
                          >
                            <SelectTrigger id="state" className={FIELD_CLASS}>
                              <SelectValue placeholder="Select state" />
                            </SelectTrigger>
                            <SelectContent />
                          </Select>
                        )}
                      />
                    ) : statesOfCountry.length > 0 ? (
                      <Controller
                        control={control}
                        name="state"
                        render={({ field }) => (
                          <Select
                            value={field.value || ""}
                            onValueChange={handleStateChange}
                          >
                            <SelectTrigger id="state" className={FIELD_CLASS}>
                              <SelectValue placeholder="Select state" />
                            </SelectTrigger>
                            <SelectContent>
                              {statesOfCountry.map((s) => (
                                <SelectItem key={s.isoCode} value={s.name}>
                                  {s.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    ) : (
                      <Input
                        id="state"
                        className={FIELD_CLASS}
                        placeholder="State"
                        autoComplete="address-level1"
                        {...register("state")}
                      />
                    )}
                    {errors.state && (
                      <p className="text-xs text-destructive">
                        {errors.state.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    {!locationLib ? (
                      <Controller
                        control={control}
                        name="city"
                        render={({ field }) => (
                          <Select
                            value={field.value || ""}
                            onValueChange={(v) =>
                              setValue("city", v, { shouldValidate: true })
                            }
                            disabled
                          >
                            <SelectTrigger id="city" className={FIELD_CLASS}>
                              <SelectValue placeholder="Select city" />
                            </SelectTrigger>
                            <SelectContent />
                          </Select>
                        )}
                      />
                    ) : citiesOfState.length > 0 ? (
                      <Controller
                        control={control}
                        name="city"
                        render={({ field }) => (
                          <Select
                            value={field.value || ""}
                            onValueChange={(v) =>
                              setValue("city", v, { shouldValidate: true })
                            }
                          >
                            <SelectTrigger id="city" className={FIELD_CLASS}>
                              <SelectValue placeholder="Select city" />
                            </SelectTrigger>
                            <SelectContent>
                              {citiesOfState.map((c, i) => (
                                <SelectItem
                                  key={`${c.name}-${i}`}
                                  value={c.name}
                                >
                                  {c.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    ) : (
                      <Input
                        id="city"
                        className={FIELD_CLASS}
                        placeholder="City"
                        autoComplete="address-level2"
                        {...register("city")}
                      />
                    )}
                    {errors.city && (
                      <p className="text-xs text-destructive">
                        {errors.city.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="zipCode">Postal Code</Label>
                    <Input
                      id="zipCode"
                      inputMode="numeric"
                      className={FIELD_CLASS}
                      autoComplete="postal-code"
                      {...register("zipCode")}
                    />
                    {errors.zipCode && (
                      <p className="text-xs text-destructive">
                        {errors.zipCode.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="overflow-hidden rounded-2xl border bg-card shadow-premium"
            >
              <div className="border-b bg-gradient-to-r from-brand-gold/10 via-transparent to-transparent px-4 py-4 sm:px-6 sm:py-5">
                <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.28em] text-brand-gold">
                  <CreditCard className="h-3.5 w-3.5" />
                  Payment
                </p>
                <h2 className="mt-1 font-serif text-xl sm:text-2xl">
                  How you&apos;d like to pay
                </h2>
              </div>

              <div className="space-y-5 px-4 py-5 sm:px-6 sm:py-6">
                <RadioGroup
                  value={paymentMethod}
                  onValueChange={setPaymentMethod}
                  className="space-y-3"
                >
                  {PAYMENT_OPTIONS.map((option) => {
                    const Icon = option.icon;
                    const selected = paymentMethod === option.value;
                    return (
                      <label
                        key={option.value}
                        htmlFor={option.value}
                        className={cn(
                          "flex cursor-pointer items-center gap-4 rounded-2xl border p-4 transition-all duration-200",
                          selected
                            ? "border-brand-gold bg-brand-gold/5 shadow-gold"
                            : "hover:border-brand-gold/40 hover:bg-muted/60"
                        )}
                      >
                        <RadioGroupItem value={option.value} id={option.value} />
                        <span
                          className={cn(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                            selected
                              ? "bg-gradient-to-br from-brand-gold to-brand-gold-dark text-white"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          <Icon className="h-5 w-5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold">
                            {option.title}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {option.description}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </RadioGroup>

                {paymentMethod === PAYMENT_METHOD_BANK_DEPOSIT && (
                  <div className="space-y-3 rounded-2xl border border-brand-gold/30 bg-brand-gold/[0.04] p-4">
                    <p className="flex items-center gap-2 text-sm font-semibold">
                      <Landmark className="h-4 w-4 text-brand-gold" />
                      Deposit the total to this account
                    </p>
                    <dl className="space-y-2 text-sm">
                      {(
                        [
                          ["Bank", BANK_DETAILS.bank, false],
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
                              onClick={async () => {
                                if (await copyText(value)) {
                                  setCopiedBankField(label);
                                  setTimeout(() => setCopiedBankField(null), 2000);
                                }
                              }}
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
                      Transfer the exact order total, then place your order and
                      share the receipt screenshot with us so we can dispatch
                      quickly.
                    </p>
                    <div className="rounded-xl border border-[#25D366]/40 bg-[#25D366]/[0.06] p-3">
                      <p className="flex items-center gap-1.5 text-xs font-bold text-[#128C4B]">
                        <MessageCircle className="h-3.5 w-3.5" />
                        Required: send payment screenshot on WhatsApp
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        After online payment, send your receipt screenshot on
                        WhatsApp at{" "}
                        <span className="font-bold text-foreground">
                          {displayShopNumber}
                        </span>{" "}
                        so we can confirm and dispatch your order quickly.
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {whatsappHref && (
                          <a
                            href={whatsappHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#25D366] px-4 text-xs font-bold text-white transition-colors hover:bg-[#1da851]"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                            Send on WhatsApp
                          </a>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-9 rounded-full text-xs"
                          onClick={async () => {
                            if (await copyText(displayShopNumber)) {
                              setCopiedShopNumber(true);
                              setTimeout(() => setCopiedShopNumber(false), 2000);
                            }
                          }}
                        >
                          {copiedShopNumber ? (
                            <>
                              <Check className="mr-1 h-3.5 w-3.5 text-emerald-600" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="mr-1 h-3.5 w-3.5" />
                              Copy number
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {paymentMethod === PAYMENT_METHOD_BANK_DEPOSIT ? (
                  <div className="flex items-start gap-2 rounded-xl border border-[#25D366]/40 bg-[#25D366]/[0.06] px-4 py-3 text-xs leading-relaxed">
                    <MessageCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#128C4B]" />
                    <p className="text-muted-foreground">
                      <span className="font-bold text-[#128C4B]">
                        Online payment ho jaye to WhatsApp par screenshot bhej
                        dein:
                      </span>{" "}
                      <span className="font-bold text-foreground">
                        {displayShopNumber}
                      </span>
                      {whatsappHref && (
                        <>
                          {" — "}
                          <a
                            href={whatsappHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-bold text-[#128C4B] underline underline-offset-2"
                          >
                            Send screenshot here
                          </a>
                        </>
                      )}
                    </p>
                  </div>
                ) : (
                  <p className="flex items-start gap-2 rounded-xl border border-brand-gold/25 bg-brand-gold/5 px-4 py-3 text-xs text-muted-foreground">
                    <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-gold" />
                    Our team confirms every order before it ships — you will
                    receive your order code right after placing it.
                  </p>
                )}
              </div>
            </motion.div>

            {/* Desktop CTA — mobile uses the sticky bar below */}
            {submitError && (
              <div
                role="alert"
                className="mb-4 flex items-start gap-2.5 rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm"
              >
                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <div>
                  <p className="font-semibold text-destructive">
                    There was a problem placing your order
                  </p>
                  <p className="mt-0.5 text-muted-foreground">{submitError}</p>
                </div>
              </div>
            )}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="hidden h-12 w-full bg-brand-gold text-sm font-semibold uppercase tracking-wide text-white hover:bg-brand-gold-dark lg:flex"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Placing Order…
                </>
              ) : (
                <>
                  <Lock className="mr-2 h-4 w-4" />
                  Place Order · {format(total)}
                </>
              )}
            </Button>
          </form>

          <div className="space-y-4">
            <OrderSummary
              subtotal={subtotal}
              discount={0}
              shipping={shipping}
              total={total}
              items={orderLines}
            >
              <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                <Lock className="mt-0.5 h-3 w-3 shrink-0 text-brand-gold" />
                Totals are calculated on our side when the order is placed.
              </p>
            </OrderSummary>
            <TrustBadges />
          </div>
        </div>
      </motion.div>

      {/* Mobile sticky action bar — total + Place Order in thumb reach */}
      {!showSuccess && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-brand-gold/25 bg-background/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-lg lg:hidden">
          {submitError && (
            <p role="alert" className="mb-2 flex items-center gap-1.5 text-xs font-medium text-destructive">
              <CircleAlert className="h-3.5 w-3.5 shrink-0" />
              {submitError}
            </p>
          )}
          <div className="flex items-center gap-3">
            <div className="min-w-0 shrink-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Total
              </p>
              <p className="font-serif text-lg font-bold leading-tight text-brand-gold">
                {format(total)}
              </p>
            </div>
            <Button
              form="checkout-form"
              type="submit"
              disabled={isSubmitting}
              className="h-12 flex-1 bg-brand-gold text-sm font-semibold uppercase tracking-wide text-white hover:bg-brand-gold-dark"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Placing…
                </>
              ) : (
                <>
                  <Lock className="mr-2 h-4 w-4" />
                  Place Order
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      <OrderSuccessAnimation
        open={showSuccess}
        orderNumber={placedOrder?.orderNumber}
        amount={placedOrder?.total}
        formatAmount={format}
        onComplete={handleSuccessComplete}
      />
    </>
  );
}