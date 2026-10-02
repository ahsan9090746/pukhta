"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Breadcrumb from "@/components/common/breadcrumb";
import StoreMap from "@/components/common/store-map";
import { getSocialLinks } from "@/lib/social-links";
import {
  Clock,
  HelpCircle,
  Mail,
  MapPin,
  MessageCircle,
  PackageSearch,
  Phone,
  Send,
} from "lucide-react";

export default function ContactPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  // Inline form feedback (Daraz-style, no popup).
  const [formError, setFormError] = useState<string | null>(null);
  const [mailOpened, setMailOpened] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ["site-settings"],
    queryFn: () => api.get("/settings").then((res) => res.data.data.settings),
    staleTime: 5 * 60 * 1000,
  });

  const socialLinks = getSocialLinks(settings?.socialMedia);
  const storeEmail = settings?.storeEmail || "";
  const storePhone = settings?.storePhone || "";

  /**
   * WhatsApp prefers the profile saved in Admin → Settings → Social Media;
   * when that is empty we fall back to a chat link built from the store phone.
   */
  const whatsappHref =
    socialLinks.find((social) => social.key === "whatsapp")?.url ||
    (storePhone ? `https://wa.me/${storePhone.replace(/\D/g, "")}` : "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMailOpened(false);

    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setFormError("Please fill in your name, email and message.");
      return;
    }

    if (!storeEmail) {
      setFormError(
        "Email is not configured yet — please reach us on the phone number listed here."
      );
      return;
    }

    setFormError(null);

    const subject = encodeURIComponent(
      form.subject.trim() || `Website enquiry from ${form.name}`
    );
    const body = encodeURIComponent(
      `${form.message}\n\n— ${form.name}\n${form.email}`
    );

    // Opens the visitor's mail client with everything pre-filled
    window.location.href = `mailto:${storeEmail}?subject=${subject}&body=${body}`;
    setMailOpened(true);
  };

  return (
    <div className="pb-16 md:pb-24">
      <div className="container pt-10 pb-8">
        <Breadcrumb
          items={[{ label: "Home", href: "/" }, { label: "Contact Us" }]}
        />

        <div className="mx-auto mt-10 max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-gold">
            Get in touch
          </p>
          <h1 className="mt-3 text-3xl font-bold sm:text-4xl">Contact Us</h1>
          <p className="mt-4 text-muted-foreground">
            Questions about an order, sizing or bulk purchases? Send us a message
            or call us — we are happy to help.
          </p>
        </div>
      </div>

      {/* ---------- Location — address driven by Admin → Settings ---------- */}
      <StoreMap
        storeName={settings?.storeName}
        storeAddress={settings?.storeAddress}
        socialLinks={socialLinks}
      />

      {/* ---------- Contact us for any questions ---------- */}
      <div className="container mt-14 md:mt-20">
        <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-muted/40 p-8 md:p-12">
          <div className="pointer-events-none absolute -left-20 -top-20 h-56 w-56 rounded-full bg-brand-gold/10 blur-3xl" />

          <div className="relative grid gap-8 lg:grid-cols-[1.05fr_1fr] lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-gold">
                We are here to help
              </p>
              <h2 className="mt-3 text-2xl font-bold sm:text-3xl">
                Contact us for any questions
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base">
                Sizing doubts, an order you want to track, an exchange or a bulk
                enquiry — reach us on any channel below. Our team replies during
                business hours, Monday to Saturday.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Button
                  asChild
                  className="rounded-full bg-brand-gold px-6 font-semibold text-white hover:bg-brand-gold-dark"
                >
                  <Link href="#contact-form">Send us a message</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="rounded-full px-6 font-semibold"
                >
                  <Link href="/faqs">
                    <HelpCircle className="mr-2 h-4 w-4" />
                    Read the FAQs
                  </Link>
                </Button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {storePhone && (
                <a
                  href={`tel:${storePhone}`}
                  className="flex items-center gap-4 rounded-2xl border border-border/70 bg-card p-4 transition-all duration-200 hover:border-brand-gold/40 hover:shadow-gold"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-gold/15">
                    <Phone className="h-5 w-5 text-brand-gold" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs uppercase tracking-wide text-muted-foreground">
                      Call us
                    </span>
                    <span className="block truncate text-sm font-semibold">
                      {storePhone}
                    </span>
                  </span>
                </a>
              )}

              {whatsappHref && (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 rounded-2xl border border-border/70 bg-card p-4 transition-all duration-200 hover:border-brand-gold/40 hover:shadow-gold"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#25D366]/15">
                    <MessageCircle className="h-5 w-5 text-[#25D366]" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs uppercase tracking-wide text-muted-foreground">
                      WhatsApp
                    </span>
                    <span className="block text-sm font-semibold">
                      Chat with us
                    </span>
                  </span>
                </a>
              )}

              {storeEmail && (
                <a
                  href={`mailto:${storeEmail}`}
                  className="flex items-center gap-4 rounded-2xl border border-border/70 bg-card p-4 transition-all duration-200 hover:border-brand-gold/40 hover:shadow-gold"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-gold/15">
                    <Mail className="h-5 w-5 text-brand-gold" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs uppercase tracking-wide text-muted-foreground">
                      Email us
                    </span>
                    <span className="block truncate text-sm font-semibold">
                      {storeEmail}
                    </span>
                  </span>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container">
        <div className="mx-auto mt-12 grid max-w-5xl gap-8 lg:grid-cols-5">
          {/* Contact details */}
          <div className="space-y-4 lg:col-span-2">
            {settings?.storePhone && (
              <Card className="border-border/70">
                <CardContent className="flex items-start gap-4 pt-6">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-gold/15">
                    <Phone className="h-5 w-5 text-brand-gold" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Call us
                    </p>
                    <a
                      href={`tel:${settings.storePhone}`}
                      className="font-semibold transition-colors hover:text-brand-gold"
                    >
                      {settings.storePhone}
                    </a>
                  </div>
                </CardContent>
              </Card>
            )}

            {storeEmail && (
              <Card className="border-border/70">
                <CardContent className="flex items-start gap-4 pt-6">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-gold/15">
                    <Mail className="h-5 w-5 text-brand-gold" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Email
                    </p>
                    <a
                      href={`mailto:${storeEmail}`}
                      className="font-semibold uppercase transition-colors hover:text-brand-gold"
                    >
                      {storeEmail}
                    </a>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="border-border/70">
              <CardContent className="flex items-start gap-4 pt-6">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-gold/15">
                  <MapPin className="h-5 w-5 text-brand-gold" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Workshop
                  </p>
                  <p className="font-semibold">
                    {settings?.storeAddress || "Available on request"}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/70">
              <CardContent className="flex items-start gap-4 pt-6">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-gold/15">
                  <Clock className="h-5 w-5 text-brand-gold" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Opening hours
                  </p>
                  <p className="font-semibold">Mon – Sat, 10:00 AM – 8:00 PM</p>
                </div>
              </CardContent>
            </Card>

            <Button asChild variant="outline" className="w-full">
              <Link href="/track-order">
                <PackageSearch className="mr-2 h-4 w-4" />
                Track an existing order
              </Link>
            </Button>
          </div>

          <Card
            id="contact-form"
            className="scroll-mt-28 border-border/70 lg:col-span-3"
          >
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                {formError && (
                  <p
                    role="alert"
                    className="rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm font-medium text-destructive"
                  >
                    {formError}
                  </p>
                )}
                {mailOpened && !formError && (
                  <p
                    role="status"
                    className="rounded-xl border border-emerald-500/40 bg-emerald-500/5 px-4 py-3 text-sm font-medium text-emerald-700"
                  >
                    Opening your email app — your message will be sent to{" "}
                    {storeEmail}.
                  </p>
                )}
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Your name</Label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Full name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="you@example.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    value={form.subject}
                    onChange={(e) =>
                      setForm({ ...form, subject: e.target.value })
                    }
                    placeholder="How can we help?"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    rows={6}
                    value={form.message}
                    onChange={(e) =>
                      setForm({ ...form, message: e.target.value })
                    }
                    placeholder="Tell us a little more..."
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-brand-gold text-white hover:bg-brand-gold-dark"
                >
                  <Send className="mr-2 h-4 w-4" />
                  Send message
                </Button>

                <p className="text-center text-xs text-muted-foreground">
                  This opens your email app with the message ready to send.
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      {socialLinks.length > 0 && (
        <div className="container mt-12">
          <div className="mx-auto max-w-5xl text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Follow us
            </p>
            <div className="mt-4 flex justify-center gap-3">
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
          </div>
        </div>
      )}
    </div>
  );
}
