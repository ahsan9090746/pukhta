import { Metadata } from "next";
import { ReactNode } from "react";

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
    const res = await fetch(`${API_URL}/categories/${slug}`, { cache: "no-store" });
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