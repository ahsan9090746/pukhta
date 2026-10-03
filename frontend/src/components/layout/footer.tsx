"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Mail,
  Phone,
  MapPin,
  ArrowRight,
  CreditCard,
  Truck,
  Shield,
  RotateCcw,
} from "lucide-react";
import { getImageUrl } from "@/lib/utils";
import { getSocialLinks } from "@/lib/social-links";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const { data: settings } = useQuery({
    queryKey: ["site-settings"],
    queryFn: () => api.get("/settings").then((res) => res.data.data.settings),
    staleTime: 5 * 60 * 1000,
  });

  // Admin → Settings → Social Media drives these icons (empty ones are hidden)
  const socialLinks = getSocialLinks(settings?.socialMedia);

  // Theme-aware logo — the footer surface is light in light mode and black in
  // dark mode, so both logo variants are rendered and swapped with `dark:`.
  // `storeLogo` stays the shared fallback for either slot.
  const storeName = settings?.storeName || "StepUp";
  const logoLight = settings?.logoLight || settings?.storeLogo || settings?.logoDark || "";
  const logoDark = settings?.logoDark || settings?.storeLogo || settings?.logoLight || "";
  const hasLogo = Boolean(logoLight && logoDark);

  const features = [
    { icon: Truck, title: "Free Shipping", desc: "On every order — always free" },
    { icon: RotateCcw, title: "Easy Returns", desc: "30-day return policy" },
    { icon: Shield, title: "Secure Payment", desc: "100% secure checkout" },
    { icon: CreditCard, title: "Flexible Payment", desc: "Multiple payment options" },
  ];

  return (
    // Surface follows the active theme — white/cream in light mode, black in dark mode
    <footer className="border-t bg-card text-foreground dark:border-white/5 dark:bg-brand-black">
      {/* Features Bar */}
      <div className="border-b bg-muted dark:border-white/5 dark:bg-brand-dark">
        <div className="container py-5 md:py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
            {features.map((f) => (
              <div key={f.title} className="flex items-center gap-2.5 md:gap-3 group">
                <div className="h-9 w-9 rounded-lg md:h-12 md:w-12 md:rounded-xl bg-brand-gold/10 border border-brand-gold/20 flex items-center justify-center shrink-0 group-hover:bg-brand-gold/20 group-hover:border-brand-gold/30 transition-all duration-300">
                  <f.icon className="h-4 w-4 md:h-5 md:w-5 text-brand-gold" />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] md:text-sm font-semibold text-foreground leading-tight">{f.title}</p>
                  <p className="hidden md:block text-xs text-muted-foreground">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="container py-9 md:py-16">
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-12 gap-x-5 gap-y-8 md:gap-12">
          {/* Brand Column */}
          <div className="col-span-2 md:col-span-1 lg:col-span-4">
            <Link href="/" className="inline-block mb-4 md:mb-6">
              {hasLogo ? (
                <>
                  {/* Light-mode logo (footer is light there) + dark-mode logo */}
                  <img
                    src={getImageUrl(logoLight)}
                    alt={storeName}
                    className="h-9 max-w-[140px] object-contain md:h-12 md:max-w-[160px] dark:hidden"
                  />
                  <img
                    src={getImageUrl(logoDark)}
                    alt={storeName}
                    className="hidden h-9 max-w-[140px] object-contain md:h-12 md:max-w-[160px] dark:block"
                  />
                </>
              ) : (
                <span className="text-2xl font-extrabold tracking-tight">
                  {settings?.storeName?.split(" ")[0] || "Step"}
                  <span className="text-brand-gold">
                    {settings?.storeName?.split(" ").slice(1).join(" ") || "Up"}
                  </span>
                </span>
              )}
            </Link>
            <p className="text-muted-foreground text-xs leading-relaxed mb-4 max-w-sm md:mb-6 md:text-sm">
              {settings?.storeDescription || "Premium footwear for every occasion. Quality craftsmanship meets modern design."}
            </p>

            {/* Contact Info */}
            <div className="space-y-2 mb-4 md:space-y-3 md:mb-6">
              {settings?.storePhone && (
                <a
                  href={`tel:${settings.storePhone}`}
                  className="flex items-center gap-3 text-[13px] text-muted-foreground hover:text-brand-gold transition-colors md:text-sm"
                >
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center dark:bg-white/5">
                    <Phone className="h-3.5 w-3.5" />
                  </div>
                  {settings.storePhone}
                </a>
              )}
              {settings?.storeEmail && (
                <a
                  href={`mailto:${settings.storeEmail}`}
                  className="flex items-center gap-3 text-[13px] text-muted-foreground hover:text-brand-gold transition-colors md:text-sm"
                >
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center dark:bg-white/5">
                    <Mail className="h-3.5 w-3.5" />
                  </div>
                  {settings.storeEmail}
                </a>
              )}
              {settings?.storeAddress && (
                <div className="flex items-center gap-3 text-[13px] text-muted-foreground md:text-sm">
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center dark:bg-white/5">
                    <MapPin className="h-3.5 w-3.5" />
                  </div>
                  {settings.storeAddress}
                </div>
              )}
            </div>

            {/* Social Links */}
            {socialLinks.length > 0 && (
              <div className="flex flex-wrap gap-2 md:gap-3">
                {socialLinks.map((s) => (
                  <a
                    key={s.label}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-9 w-9 md:h-10 md:w-10 rounded-full bg-muted border flex items-center justify-center hover:bg-brand-gold hover:border-brand-gold hover:text-brand-black transition-all duration-300 dark:border-white/10 dark:bg-white/5"
                  >
                    <s.icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div className="lg:col-span-2">
            <h4 className="text-sm font-bold uppercase tracking-wider mb-3 text-foreground md:mb-6">
              Quick Links
            </h4>
            <ul className="space-y-2 md:space-y-3">
              {[
                { label: "Home", href: "/" },
                { label: "Shop All", href: "/product-category" },
                { label: "New Arrivals", href: "/product-category/new-arrival" },
                { label: "Best Sellers", href: "/product-category?sort=best-selling" },
                { label: "Sale", href: "/product-category?sale=1" },
              ].map((link) => (
                <li key={`${link.label}-${link.href}`}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-brand-gold hover:pl-1 transition-all duration-200 flex items-center gap-2 group"
                  >
                    <ArrowRight className="h-3 w-3 opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all duration-200" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Help */}
          <div className="lg:col-span-2">
            <h4 className="text-sm font-bold uppercase tracking-wider mb-3 text-foreground md:mb-6">
              Help
            </h4>
            <ul className="space-y-2 md:space-y-3">
              {[
                { label: "About Us", href: "/about-us" },
                { label: "Contact Us", href: "/contact" },
                { label: "FAQs", href: "/faqs" },
                // The next three open the FAQ centre already filtered to the
                // matching topic — `/faqs` reads the `topic` search param.
                {
                  label: "Shipping Info",
                  href: `/faqs?topic=${encodeURIComponent("Orders & Delivery")}`,
                },
                {
                  label: "Returns & Exchanges",
                  href: `/faqs?topic=${encodeURIComponent(
                    "Returns & Exchange"
                  )}`,
                },
                {
                  label: "Size Guide",
                  href: `/faqs?topic=${encodeURIComponent("Sizes & Fit")}`,
                },
                { label: "Track Order", href: "/track-order" },
              ].map((link) => (
                <li key={`${link.label}-${link.href}`}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-brand-gold hover:pl-1 transition-all duration-200 flex items-center gap-2 group"
                  >
                    <ArrowRight className="h-3 w-3 opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all duration-200" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter — targeted by the header "Subscribe Us" button (#newsletter) */}
          <div id="newsletter" className="col-span-2 md:col-span-1 scroll-mt-28 lg:col-span-4">
            <h4 className="text-sm font-bold uppercase tracking-wider mb-3 text-foreground md:mb-6">
              Stay in the Loop
            </h4>
            <p className="text-muted-foreground text-xs mb-3 md:mb-4 md:text-sm">
              Subscribe to our newsletter for exclusive offers, new arrivals, and style inspiration.
            </p>
            <form className="mb-4 flex gap-2 md:mb-6">
              <Input
                placeholder="Enter your email"
                className="bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-brand-gold focus:ring-brand-gold/20 dark:border-white/10 dark:bg-white/5 dark:placeholder:text-gray-500"
              />
              <Button
                type="submit"
                className="shrink-0 bg-brand-gold hover:bg-brand-gold-dark text-brand-black font-semibold px-4 md:px-6"
              >
                Subscribe
              </Button>
            </form>

            {/* Payment Methods */}
            <div>
              <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wider">We Accept</p>
              <div className="flex flex-wrap gap-2">
                {["Visa", "Mastercard", "PayPal", "Cash"].map((method) => (
                  <div
                    key={method}
                    className="h-8 px-3 rounded-lg bg-brand-gold/10 border border-brand-gold/20 flex items-center justify-center text-xs text-brand-gold font-medium"
                  >
                    {method}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t bg-muted dark:border-white/5 dark:bg-brand-dark/50">
        <div className="container py-4 md:py-5">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">
              &copy; {currentYear} {settings?.storeName || "StepUp"}. All rights reserved.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground md:justify-start md:gap-6">
              <Link href="/privacy" className="hover:text-brand-gold transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="hover:text-brand-gold transition-colors">
                Terms of Service
              </Link>
              <Link href="/cookies" className="hover:text-brand-gold transition-colors">
                Cookies
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
