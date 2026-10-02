/**
 * Canonical public site URL used for absolute SEO URLs
 * (sitemap, robots, metadataBase).
 *
 * Configured via `NEXT_PUBLIC_SITE_URL` — never hardcoded:
 * - development `.env.local`: http://localhost:3000
 * - production hosting env: https://yourdomain.com
 */
export function getSiteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.NODE_ENV === "production" ? "" : "http://localhost:3000");

  if (!raw) {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL is not set. Add it to your production environment (e.g. NEXT_PUBLIC_SITE_URL=https://yourdomain.com) so sitemap/robots/canonical URLs are absolute."
    );
  }

  return raw.replace(/\/+$/, "");
}
