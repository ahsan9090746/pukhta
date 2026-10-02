import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Transactional, personal and admin areas stay out of the index.
        // (Internal /api/* lives on the backend origin, not this app.)
        disallow: [
          "/admin9090746/",
          "/cart",
          "/checkout",
          "/order-confirmation",
          "/track-order",
          "/wishlist",
          "/notifications",
          "/profile",
          "/orders/",
          "/compare",
          "/search",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
