/**
 * Canonical public site URL used for absolute SEO URLs
 * (sitemap, robots, metadataBase).
 *
 * Configured via `NEXT_PUBLIC_SITE_URL` — never hardcoded:
 * - development `.env.local`: http://localhost:3000
 * - production hosting env: https://yourdomain.com
 *
 * Never throws: during `next build` (e.g. on Render while the backend or
 * env may not be ready) a missing value falls back to a safe default with
 * a warning instead of crashing "Collecting page data". Set
 * NEXT_PUBLIC_SITE_URL on your host for correct production URLs.
 */
export function getSiteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  if (!process.env.NEXT_PUBLIC_SITE_URL && process.env.NODE_ENV === "production") {
    console.warn(
      "NEXT_PUBLIC_SITE_URL is not set. Using http://localhost:3000 as a build-safe fallback. " +
        "Set NEXT_PUBLIC_SITE_URL=https://yourdomain.com in your production environment so sitemap/robots/canonical URLs are absolute."
    );
  }

  return raw.replace(/\/+$/, "");
}
