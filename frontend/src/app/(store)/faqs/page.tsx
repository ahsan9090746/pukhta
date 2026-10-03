// Render on demand - skip static generation so a sleeping backend cannot crash the build.
export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { Suspense } from "react";
import FaqsContent from "./faqs-content";
import { FAQ_GROUPS } from "./faq-data";

const TITLE = "Frequently asked questions";
const DESCRIPTION =
  "Orders, delivery, sizing, returns, payments and leather care — the questions our customers ask most, answered in one place.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "faq",
    "delivery",
    "cash on delivery",
    "chappal size guide",
    "returns and exchange",
    "leather care",
  ],
  alternates: { canonical: "/faqs" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
    url: "/faqs",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

/**
 * `/faqs` — the support centre.
 *
 * The route stays a server component so every question ships as `FAQPage`
 * structured data (eligible for rich results) and the interactive parts —
 * search, topic filters, accordions — live in `FaqsContent`.
 */
export default function FaqsPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_GROUPS.flatMap((group) =>
      group.items.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.answer },
      }))
    ),
  };

  return (
    <>
      <script
        type="application/ld+json"
        // Static, author-written content only — nothing user supplied is injected.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Suspense
        fallback={<div className="container py-16 text-center">Loading...</div>}
      >
        <FaqsContent groups={FAQ_GROUPS} />
      </Suspense>
    </>
  );
}
