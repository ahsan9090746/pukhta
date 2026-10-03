"use client";

import { Headphones, Mail, MessageCircle, Phone } from "lucide-react";
import { cn } from "@/lib/utils";

interface SupportCardProps {
  phone?: string;
  email?: string;
  /** Prefilled into the WhatsApp chat so support knows the context. */
  orderNumber?: string;
  className?: string;
}

/**
 * Visible support entry (Call + WhatsApp + Email) used wherever a customer
 * might need help — tracking, confirmation, contact. Same content as before,
 * now impossible to miss.
 */
export default function SupportCard({
  phone,
  email,
  orderNumber,
  className,
}: SupportCardProps) {
  if (!phone && !email) return null;

  const digits = (phone || "").replace(/\D/g, "");
  const waText = encodeURIComponent(
    orderNumber
      ? `Assalam-o-Alaikum! I need help with my order ${orderNumber}.`
      : "Assalam-o-Alaikum! I need help with my order."
  );
  const whatsappHref = digits ? `https://wa.me/${digits}?text=${waText}` : "";

  return (
    <div
      className={cn(
        "rounded-2xl border border-brand-gold/40 bg-gradient-to-br from-brand-gold/[0.10] via-brand-gold/[0.04] to-transparent p-4 sm:p-5",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-gold text-white shadow-gold">
          <Headphones className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold">Need help? Contact support</p>
          <p className="text-xs text-muted-foreground">
            Mon–Sat, 10:00 AM – 8:00 PM
            {orderNumber ? ` · Order ${orderNumber}` : ""}
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {phone && (
          <a
            href={`tel:${phone.replace(/\s+/g, "")}`}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-brand-gold px-4 text-sm font-bold text-white transition-colors hover:bg-brand-gold-dark"
          >
            <Phone className="h-4 w-4" />
            Call Now
          </a>
        )}
        {whatsappHref && (
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[#25D366]/50 bg-[#25D366]/10 px-4 text-sm font-bold text-[#128C4B] transition-colors hover:bg-[#25D366]/20"
          >
            <MessageCircle className="h-4 w-4" />
            WhatsApp
          </a>
        )}
      </div>

      {email && (
        <a
          href={`mailto:${email}`}
          className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-brand-gold"
        >
          <Mail className="h-3.5 w-3.5 text-brand-gold" />
          {email}
        </a>
      )}
    </div>
  );
}
