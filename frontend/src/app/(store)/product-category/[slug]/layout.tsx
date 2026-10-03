import { Metadata } from "next";
import { ReactNode } from "react";

// Always render on demand — never prerender at build time, so a sleeping
// backend can't crash `next build` ("Collecting page data").
export const dynamic = "force-dynamic";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";
const SITE_NAME = "StepUp Premium Footwear";

interface CategorySlugLayoutProps {
  params: Promise<{ slug: string }>;
}

/**
 * Server-side SEO metadata for the single category page.
 * Uses the category's Meta Title / Meta Description when set, with sensible
 * fallbacks (category name, which the root layout title template suffixes with
 * the site name, and "Shop {name} at {site}").
 */
export async function generateMetadata({ params }: CategorySlugLayoutProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const res = await fetch(`${API_URL}/categories/${slug}`, {
      cache: "no-store",
      // Fail fast if the backend is asleep instead of hanging the request.
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return {};
    const json = await res.json();
    const category = json?.data?.category;
    if (!category) return {};

    return {
      // The root layout appends "| StepUp Premium Footwear" via its title template.
      title: category.metaTitle || category.name,
      description: category.metaDescription || `Shop ${category.name} at ${SITE_NAME}`,
    };
  } catch {
    // Backend unreachable — fall back to the default site metadata.
    return {};
  }
}

export default function CategorySlugLayout({ children }: { children: ReactNode }) {
  return children;
}