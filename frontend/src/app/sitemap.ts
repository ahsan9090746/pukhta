import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

// Rebuilt at most once an hour — product/category edits go live in the
// sitemap without redeploying, and crawlers never hammer the backend.
export const revalidate = 3600;

/** Same convention as the rest of the app (see product-category/[slug]). */
const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";

/** Backend caps pages at 100 rows — loop until `hasNext` is false. */
const PAGE_SIZE = 100;
/** Hard stop: 500 pages × 100 rows = 50k URLs (one sitemap file's limit). */
const MAX_PAGES = 500;

interface ApiRow {
  slug?: string;
  updatedAt?: string;
  isActive?: boolean;
  isDeleted?: boolean;
}

async function fetchAll(
  endpoint: "products" | "categories"
): Promise<ApiRow[]> {
  const rows: ApiRow[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    let json: any;
    try {
      const res = await fetch(
        `${API_URL}/${endpoint}?isActive=true&limit=${PAGE_SIZE}&page=${page}`,
        { next: { revalidate } }
      );
      if (!res.ok) break;
      json = await res.json();
    } catch {
      // Backend unreachable (e.g. local dev without the API) — the sitemap
      // still serves every static URL instead of failing outright.
      break;
    }
    const batch: ApiRow[] = json?.data?.data ?? [];
    if (!Array.isArray(batch) || batch.length === 0) break;
    rows.push(...batch);
    if (json?.data?.pagination?.hasNext !== true) break;
  }
  return rows;
}

/** Belt-and-braces: only indexable rows with a usable slug. */
function isIndexable(row: ApiRow): row is Required<Pick<ApiRow, "slug">> & ApiRow {
  return (
    typeof row.slug === "string" &&
    row.slug.trim().length > 0 &&
    row.isActive !== false &&
    (row as { isDeleted?: boolean }).isDeleted !== true
  );
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();

  // Static public pages only — transactional/private pages (cart, checkout,
  // order-confirmation, track-order, wishlist, notifications, profile,
  // orders/*) and /admin9090746/* are intentionally excluded. `/product`
  // redirects to `/`, and `/search` + `/compare` need query params, so both
  // stay out as well.
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, changeFrequency: "daily", priority: 1 },
    { url: `${siteUrl}/shop`, changeFrequency: "daily", priority: 0.9 },
    {
      url: `${siteUrl}/product-category`,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/product-category/new-arrival`,
      changeFrequency: "daily",
      priority: 0.8,
    },
    { url: `${siteUrl}/blog`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${siteUrl}/about-us`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteUrl}/contact`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteUrl}/faqs`, changeFrequency: "monthly", priority: 0.6 },
  ];

  const [products, categories] = await Promise.all([
    fetchAll("products"),
    fetchAll("categories"),
  ]);

  const seen = new Set(staticPages.map((entry) => entry.url));

  const pushUnique = (
    list: MetadataRoute.Sitemap,
    url: string,
    lastModified?: string
  ) => {
    if (seen.has(url)) return;
    seen.add(url);
    list.push({ url, lastModified, changeFrequency: "weekly" });
  };

  const dynamicPages: MetadataRoute.Sitemap = [];

  for (const category of categories) {
    if (!isIndexable(category)) continue;
    pushUnique(
      dynamicPages,
      `${siteUrl}/product-category/${encodeURIComponent(category.slug)}`,
      category.updatedAt
    );
  }

  for (const product of products) {
    if (!isIndexable(product)) continue;
    pushUnique(
      dynamicPages,
      `${siteUrl}/product/${encodeURIComponent(product.slug)}`,
      product.updatedAt
    );
  }

  return [...staticPages, ...dynamicPages];
}
