"use client";

import Link from "next/link";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Breadcrumb from "@/components/common/breadcrumb";
import { Reveal, Stagger, StaggerItem } from "@/components/common/reveal";
import { getSocialLinks } from "@/lib/social-links";
import type { Settings } from "@/types";
import {
  Award,
  Check,
  HeartHandshake,
  Leaf,
  Mail,
  MapPin,
  Phone,
  Truck,
} from "lucide-react";

/** Owner-supplied storefront artwork (same asset the category hero uses). */
const HERO_IMAGE = "/product-cat.png";

const VALUES = [
  {
    icon: Award,
    title: "Handmade Quality",
    description:
      "Every pair is stitched by experienced craftsmen using traditional techniques passed down through generations.",
  },
  {
    icon: Leaf,
    title: "Genuine Leather",
    description:
      "We use pure cow and buffalo leather that moulds to your feet and gets more comfortable with every wear.",
  },
  {
    icon: Truck,
    title: "Nationwide Delivery",
    description:
      "Fast, tracked shipping across the country — cash on delivery available in most cities.",
  },
  {
    icon: HeartHandshake,
    title: "Easy Exchange",
    description:
      "Wrong size or not the right fit? Exchange within our return window, no questions asked.",
  },
];

const CRAFT_POINTS = [
  "Hand-picked leather, tanned and cut for durability",
  "Stitched soles that hold their shape for years",
  "Comfort-first finishing, checked pair by pair",
  "Fair pricing straight from our workshop to your door",
];

export default function AboutUsPage() {
  const { data: settings } = useQuery({
    queryKey: ["site-settings"],
    queryFn: () =>
      api.get("/settings").then((res) => res.data.data.settings as Settings),
    staleTime: 5 * 60 * 1000,
  });

  const socialLinks = getSocialLinks(settings?.socialMedia);
  const hasStoreInfo = Boolean(
    settings?.storeAddress || settings?.storePhone || settings?.storeEmail
  );

  return (
    <div className="flex flex-col">
      {/* ---------- Hero — owner artwork + our story intro ---------- */}
      <section className="relative overflow-hidden bg-brand-black">
        <Image
          src={HERO_IMAGE}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-black/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/25" />

        <div className="relative container py-12 md:py-20 lg:py-24">
          <Breadcrumb
            variant="inverted"
            items={[{ label: "Home", href: "/" }, { label: "About Us" }]}
          />

          <div className="mt-8 max-w-3xl md:mt-12">
            <Reveal>
              <span className="flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-[0.28em] text-brand-gold sm:text-xs">
                <span className="hidden h-px w-8 bg-brand-gold/50 sm:block" />
                Our Story
              </span>
            </Reveal>

            <Reveal delay={0.08}>
              <h1 className="mt-4 text-balance font-serif text-4xl leading-[1.08] text-white drop-shadow-sm sm:text-5xl md:text-6xl">
                Handcrafted footwear, made to last
              </h1>
            </Reveal>

            <Reveal delay={0.16}>
              <p className="mt-5 max-w-2xl text-sm leading-relaxed text-white/75 md:text-base">
                We are a family-run footwear house specialising in traditional
                Peshawari chappals and modern leather styles. Each pair is made
                by hand, one at a time — from selecting the hide to the final
                polish — so what reaches you is footwear that is comfortable
                from day one and better with age.
              </p>
            </Reveal>

            <Reveal delay={0.24}>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button
                  asChild
                  size="lg"
                  className="rounded-full bg-brand-gold px-7 font-semibold text-white shadow-gold transition-all hover:bg-brand-gold-dark hover:shadow-gold-lg"
                >
                  <Link href="/product-category">Shop the collection</Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="rounded-full border-white/30 bg-white/5 px-7 font-semibold text-white backdrop-blur-sm transition-colors hover:border-brand-gold hover:bg-brand-gold hover:text-white"
                >
                  <Link href="/contact">Contact us</Link>
                </Button>
              </div>
            </Reveal>

            {/* Value chips — the promises below, condensed for quick scanning */}
            <Reveal delay={0.32}>
              <div className="mt-9 flex flex-wrap gap-2">
                {VALUES.map((value) => (
                  <span
                    key={value.title}
                    className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-medium text-white/85 backdrop-blur-sm"
                  >
                    <value.icon className="h-3.5 w-3.5 text-brand-gold" />
                    {value.title}
                  </span>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---------- What every pair stands for ---------- */}
      <section className="container pt-14 md:pt-20">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-gold">
            Why choose us
          </p>
          <h2 className="mt-3 text-2xl font-bold sm:text-3xl">
            Craft you can feel with every step
          </h2>
          <p className="mt-3 text-sm text-muted-foreground md:text-base">
            Four promises we never compromise on — the same ones we have kept
            since the first pair left our bench.
          </p>
        </Reveal>

        <Stagger
          className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
          stagger={0.08}
        >
          {VALUES.map((value) => (
            <StaggerItem key={value.title} className="h-full">
              <Card className="group h-full rounded-2xl border-border/70 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-brand-gold/40 hover:shadow-gold">
                <CardContent className="pt-6 text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-gold/15 transition-colors duration-300 group-hover:bg-brand-gold">
                    <value.icon className="h-6 w-6 text-brand-gold transition-colors duration-300 group-hover:text-white" />
                  </div>
                  <h3 className="font-semibold">{value.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {value.description}
                  </p>
                </CardContent>
              </Card>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* ---------- Made the traditional way ---------- */}
      <section className="mt-14 bg-muted/40 py-14 md:mt-20 md:py-20">
        <div className="container grid items-start gap-10 lg:grid-cols-2 lg:gap-16">
          <Reveal direction="right">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-gold">
              Our workshop
            </p>
            <h2 className="mt-3 text-2xl font-bold sm:text-3xl">
              Made the traditional way
            </h2>
            <p className="mt-4 text-muted-foreground">
              Our workshop keeps the craft alive: leather is cut, shaped and
              stitched by hand before the sole is attached, so the shoe holds
              its form instead of loosening after a few wears. Nothing is
              rushed, and nothing leaves the bench until it passes our own
              quality check.
            </p>
            <p className="mt-4 text-muted-foreground">
              Because we sell directly to you, there is no middle-man markup —
              you pay for the leather and the labour, not for a brand logo.
            </p>
          </Reveal>

          <Reveal direction="left" delay={0.1}>
            <Card className="rounded-3xl border-brand-gold/25 bg-card shadow-premium">
              <CardContent className="pt-6">
                <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-gold">
                  Why shop with us
                </h3>
                <ul className="mt-5 space-y-4">
                  {CRAFT_POINTS.map((point) => (
                    <li key={point} className="flex items-start gap-3 text-sm">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-gold/15">
                        <Check className="h-3 w-3 text-brand-gold" />
                      </span>
                      <span className="text-muted-foreground">{point}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </Reveal>
        </div>
      </section>

      {/* ---------- Store details + socials (admin-driven, hidden when empty) ---------- */}
      {(hasStoreInfo || socialLinks.length > 0) && (
        <section className="container py-14 md:py-20">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-gold">
              Find us
            </p>
            <h2 className="mt-3 text-2xl font-bold sm:text-3xl">
              Visit the workshop, or say hello online
            </h2>
          </Reveal>

          <Stagger
            className="mx-auto mt-10 grid max-w-5xl gap-5 sm:grid-cols-3"
            stagger={0.08}
          >
            {settings?.storeAddress && (
              <StaggerItem className="h-full">
                <Card className="h-full rounded-2xl border-border/70 shadow-sm transition-colors duration-300 hover:border-brand-gold/40">
                  <CardContent className="flex items-start gap-4 pt-6">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-gold/15">
                      <MapPin className="h-5 w-5 text-brand-gold" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Our address
                      </p>
                      <p className="mt-1 text-sm font-medium">
                        {settings.storeAddress}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </StaggerItem>
            )}

            {settings?.storePhone && (
              <StaggerItem className="h-full">
                <Card className="h-full rounded-2xl border-border/70 shadow-sm transition-colors duration-300 hover:border-brand-gold/40">
                  <CardContent className="flex items-start gap-4 pt-6">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-gold/15">
                      <Phone className="h-5 w-5 text-brand-gold" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Call us
                      </p>
                      <a
                        href={`tel:${settings.storePhone}`}
                        className="mt-1 block text-sm font-medium transition-colors hover:text-brand-gold"
                      >
                        {settings.storePhone}
                      </a>
                    </div>
                  </CardContent>
                </Card>
              </StaggerItem>
            )}

            {settings?.storeEmail && (
              <StaggerItem className="h-full">
                <Card className="h-full rounded-2xl border-border/70 shadow-sm transition-colors duration-300 hover:border-brand-gold/40">
                  <CardContent className="flex items-start gap-4 pt-6">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-gold/15">
                      <Mail className="h-5 w-5 text-brand-gold" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Email us
                      </p>
                      <a
                        href={`mailto:${settings.storeEmail}`}
                        className="mt-1 block break-words text-sm font-medium transition-colors hover:text-brand-gold"
                      >
                        {settings.storeEmail}
                      </a>
                    </div>
                  </CardContent>
                </Card>
              </StaggerItem>
            )}
          </Stagger>

          {socialLinks.length > 0 && (
            <Reveal delay={0.15} className="mt-10 text-center">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Follow us
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-3">
                {socialLinks.map((social) => (
                  <a
                    key={social.key}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.label}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-border/70 transition-colors hover:border-brand-gold/40 hover:bg-brand-gold/10 hover:text-brand-gold"
                  >
                    <social.icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            </Reveal>
          )}
        </section>
      )}

      {/* ---------- Closing CTA ---------- */}
      <section className="container pb-16 md:pb-24">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-brand-gold/25 bg-gold-gradient-soft p-10 text-center md:p-14">
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-brand-gold/10 blur-3xl" />
            <div className="relative">
              <h2 className="text-2xl font-bold md:text-3xl">
                Ready to find your pair?
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
                Browse the full collection or get in touch if you need help
                choosing the right size.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Button
                  asChild
                  size="lg"
                  className="rounded-full bg-brand-gold px-7 font-semibold text-white shadow-gold transition-all hover:bg-brand-gold-dark hover:shadow-gold-lg"
                >
                  <Link href="/product-category">Shop the collection</Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="rounded-full px-7 font-semibold"
                >
                  <Link href="/contact">Contact us</Link>
                </Button>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}

