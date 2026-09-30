"use client";

import Link from "next/link";
import { ArrowRight, MapPin, Navigation } from "lucide-react";
import type { SocialLink } from "@/lib/social-links";
import { cn } from "@/lib/utils";

/**
 * Brand colours for the social rail that hugs the right edge of the map.
 * Static class strings (not built at runtime) so Tailwind keeps them in the CSS.
 */
const BRAND_BG: Record<string, string> = {
  facebook: "bg-[#1877F2]",
  instagram: "bg-gradient-to-b from-[#F58529] via-[#DD2A7B] to-[#8134AF]",
  twitter: "bg-[#111111]",
  youtube: "bg-[#FF0000]",
  pinterest: "bg-[#E60023]",
  linkedin: "bg-[#0A66C2]",
  whatsapp: "bg-[#25D366]",
  tiktok: "bg-[#010101]",
};

interface StoreMapProps {
  /** Store name from site settings — the card heading and iframe label. */
  storeName?: string | null;
  /** Full street address from site settings — the map pin is placed on this text. */
  storeAddress?: string | null;
  /** Social profiles already filtered by `getSocialLinks`. */
  socialLinks?: SocialLink[];
  className?: string;
}

/**
 * Fallback location for the band.
 *
 * The map is a key-less Google Maps embed (`?q=…&output=embed`), so whichever
 * address the admin saves in Admin → Settings → Store Address is what visitors
 * see. Until that field is filled in we fall back to our own counter at
 * Namak Mandi, Peshawar so the section never renders empty or pins elsewhere.
 */
const FALLBACK_STORE_NAME = "Pukhta Footwear";
const FALLBACK_STORE_ADDRESS = "Namak Mandi Chowk, Peshawar";

/** Address parts that describe a region rather than the city itself. */
const REGION_SUFFIXES = new Set([
  "pakistan",
  "khyber pakhtunkhwa",
  "kp",
  "punjab",
  "sindh",
  "balochistan",
  "azad kashmir",
  "gilgit baltistan",
]);

/**
 * Location band used on the Contact page.
 */
export default function StoreMap({
  storeName,
  storeAddress,
  socialLinks = [],
  className,
}: StoreMapProps) {
  const name = (storeName || "").trim() || FALLBACK_STORE_NAME;
  const address = (storeAddress || "").trim() || FALLBACK_STORE_ADDRESS;
  /**
   * The pin is placed from the address alone: Google resolves plain text such as
   * "Namak Mandi Chowk, Peshawar" to a real spot (34.0029, 71.5845), whereas
   * mixing the shop name into the query can return an empty embed. The store
   * name is only used for the card heading and the iframe label.
   */
  const query = address;

  const embedUrl = `https://www.google.com/maps?q=${encodeURIComponent(
    query
  )}&z=15&output=embed`;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    query
  )}`;

  const addressLines = address
    .split(",")
    .map((line) => line.trim())
    .filter(Boolean);

  /**
   * City used in the card heading — "Namak Mandi Chowk, Peshawar" → "Peshawar".
   * A trailing country/province ("…, Peshawar, Pakistan") is skipped over.
   */
  let cityIndex = addressLines.length - 1;
  while (
    cityIndex > 0 &&
    REGION_SUFFIXES.has(addressLines[cityIndex].toLowerCase())
  ) {
    cityIndex -= 1;
  }
  const city = addressLines[cityIndex] || "";

  return (
    <section className={cn("relative overflow-hidden bg-brand-black", className)}>
      <iframe
        title={`Map showing the location of ${name || "our store"}`}
        src={embedUrl}
        loading="lazy"
        allowFullScreen
        referrerPolicy="no-referrer-when-downgrade"
        className="h-[380px] w-full border-0 sm:h-[460px] lg:h-[540px]"
      />

      {/* Soft edge so the map melts into the page instead of butting against it */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-black/25 to-transparent" />

      {/* ---------- Store card overlay ---------- */}
      <div className="pointer-events-none absolute inset-0 flex items-center">
        <div className="container">
          <div className="pointer-events-auto max-w-md rounded-2xl border border-border/70 bg-card/95 p-6 shadow-premium-lg backdrop-blur-sm sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-gold">
              Our Store
            </p>

            <h2 className="mt-3 text-xl font-extrabold uppercase leading-tight tracking-tight sm:text-2xl">
              Visit our new store{city ? ` in ${city}` : ""}
            </h2>

            <div className="mt-5 flex items-start gap-3 text-sm">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-gold" />
              <div>
                {name && <p className="font-semibold">{name}</p>}
                {addressLines.length > 0 ? (
                  addressLines.map((line) => (
                    <p key={line} className="text-muted-foreground">
                      {line}
                    </p>
                  ))
                ) : (
                  <p className="text-muted-foreground">Available on request</p>
                )}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
              <Link
                href="/about-us"
                className="group inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-foreground transition-colors hover:text-brand-gold"
              >
                See more about
                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>

              <a
                href={directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-brand-gold transition-colors hover:text-brand-gold-dark"
              >
                <Navigation className="h-3.5 w-3.5" />
                Get directions
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ---------- Social rail (desktop) — mirrors the store's profiles ---------- */}
      {socialLinks.length > 0 && (
        <div className="absolute right-0 top-1/2 hidden -translate-y-1/2 flex-col shadow-premium md:flex">
          {socialLinks.map((social) => (
            <a
              key={social.key}
              href={social.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={social.label}
              className={cn(
                "flex h-11 w-11 items-center justify-center text-white transition-all duration-200 hover:w-12 hover:brightness-110",
                BRAND_BG[social.key] || "bg-brand-gold"
              )}
            >
              <social.icon className="h-5 w-5" />
            </a>
          ))}
        </div>
      )}
    </section>
  );
}
