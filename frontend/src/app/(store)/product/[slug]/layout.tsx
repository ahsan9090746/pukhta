import { Metadata } from "next";
import { ReactNode } from "react";

// Always render on demand — never prerender at build time, so a sleeping
// backend can't crash `next build` ("Collecting page data").
export const dynamic = "force-dynamic";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";

/** Strips HTML tags from rich-text descriptions for use as meta text. */
const stripHtml = (html: string) =>
  html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

interface ProductSlugLayoutProps {
  params: Promise<{ slug: string }>;
}

/**
 * Server-side SEO metadata for the product detail page.
 * Uses the product's Meta Title / Meta Description when set, with sensible
 * fallbacks (product name / description truncated to 160 characters).
 */
export async function generateMetadata({ params }: ProductSlugLayoutProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const res = await fetch(`${API_URL}/products/${slug}`, {
      cache: "no-store",
      // Fail fast if the backend is asleep instead of hanging the request.
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return {};
    const json = await res.json();
    const product = json?.data?.product;
    if (!product) return {};

    return {
      title: product.metaTitle || product.name,
      description:
        product.metaDescription ||
        (product.description ? stripHtml(product.description).slice(0, 160) : undefined),
    };
  } catch {
    // Backend unreachable — fall back to the default site metadata.
    return {};
  }
}

export default function ProductSlugLayout({ children }: { children: ReactNode }) {
  return children;
}