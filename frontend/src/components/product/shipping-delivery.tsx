"use client";

import Image from "next/image";
import {
  Banknote,
  Clock,
  MapPin,
  PackageCheck,
  Phone,
  RotateCcw,
  ShieldCheck,
  Truck,
} from "lucide-react";

/**
 * Swap these two photos for your own store uploads whenever you like
 * (e.g. "/uploads/courier-handover.jpg"). They are only used as visuals.
 */
const SHIPPING_IMAGES = [
  {
    src: "https://images.unsplash.com/photo-1566576721346-d4a3b4eaeb55?w=800&q=80&auto=format&fit=crop",
    alt: "Courier handing a packed parcel to a customer",
    caption: "Carefully packed",
  },
  {
    src: "https://images.unsplash.com/photo-1580674285054-bed31e145f59?w=800&q=80&auto=format&fit=crop",
    alt: "Delivery van loaded with parcels ready for dispatch",
    caption: "Trusted couriers",
  },
];

interface ShippingDeliveryProps {
  settings?: {
    freeShippingThreshold?: number;
    shippingCost?: number;
    storePhone?: string;
    storeEmail?: string;
  } | null;
}

/** "Shipping and Delivery" tab — visuals on the left, policy copy on the right. */
export default function ShippingDelivery({ settings }: ShippingDeliveryProps) {
  const highlights = [
    {
      icon: Clock,
      title: "Processing time",
      text: "Orders are processed within 1–2 business days.",
    },
    {
      icon: Truck,
      title: "Delivery time",
      text: "Delivered in 3–7 business days across Pakistan.",
    },
    {
      icon: Banknote,
      title: "Cash on Delivery",
      text: "COD available nationwide — pay when it arrives.",
    },
    {
      icon: RotateCcw,
      title: "Easy returns",
      text: "7-day exchange & return on unused items.",
    },
  ];

  return (
    <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
      {/* Visuals */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {SHIPPING_IMAGES.map((image) => (
          <div
            key={image.src}
            className="group relative aspect-[3/4] overflow-hidden rounded-2xl bg-muted"
          >
            <Image
              src={image.src}
              alt={image.alt}
              fill
              sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 22vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <span className="absolute bottom-3 left-3 rounded-full bg-background/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-foreground shadow-sm backdrop-blur">
              {image.caption}
            </span>
          </div>
        ))}
      </div>

      {/* Copy */}
      <div className="space-y-5">
        <div>
          <h3 className="text-2xl font-bold tracking-tight">Shipping &amp; Delivery</h3>
          <p className="mt-3 text-[16px] leading-[1.75] text-muted-foreground">
            We carefully pack every order so it reaches you in perfect condition.
            Orders are usually processed within{" "}
            <strong className="font-semibold text-foreground">1–2 business days</strong>{" "}
            and shipped through trusted courier services across Pakistan. Delivery
            typically takes{" "}
            <strong className="font-semibold text-foreground">3–7 business days</strong>,
            depending on your location.
          </p>
          <p className="mt-3 text-[16px] leading-[1.75] text-muted-foreground">
            Once your order has been dispatched, you receive tracking details
            (where available) so you can monitor your shipment. If you have any
            questions about your order or delivery, our customer support team is
            always happy to assist you.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {highlights.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex gap-3 rounded-xl border bg-card/60 p-3.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-gold/10 text-brand-gold">
                <Icon className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[15px] font-semibold leading-tight">{title}</p>
                <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                  {text}
                </p>
              </div>
            </div>
          ))}
        </div>

        <ul className="space-y-2 rounded-xl border border-brand-gold/30 bg-brand-gold/5 p-4 text-[15px]">
          <li className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-gold" />
            <span>
              <strong className="font-semibold text-foreground">Free delivery</strong>{" "}
              on every order — no shipping fee, anywhere in Pakistan
            </span>
          </li>
          <li className="flex items-start gap-2">
            <PackageCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-gold" />
            <span>Secure packaging with order tracking</span>
          </li>
        </ul>

        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-brand-gold" /> Deliveries all over
            Pakistan
          </span>
          {settings?.storePhone && (
            <span className="inline-flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-brand-gold" />
              {settings.storePhone}
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
