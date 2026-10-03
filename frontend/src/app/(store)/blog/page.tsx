// Render on demand - skip static generation so a sleeping backend cannot crash the build.
export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import BlogContent from "./blog-content";
import { POSTS } from "./blog-posts";

const TITLE = "Care guides & styling notes";
const DESCRIPTION =
  "Practical advice from our workshop on choosing, wearing and looking after handcrafted leather footwear — sizing, leather care, styling and craft notes.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "leather care",
    "Peshawari chappals",
    "chappal sizing",
    "leather footwear guide",
    "handmade shoes",
  ],
  alternates: { canonical: "/blog" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
    url: "/blog",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

/**
 * `/blog` — the store journal.
 *
 * The route itself stays a server component so the page ships real metadata and
 * `Blog`/`BlogPosting` structured data; the interactive listing (search, topic
 * filters, inline reader) lives in the client `BlogContent` component beside it.
 */
export default function BlogPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: TITLE,
    description: DESCRIPTION,
    blogPost: POSTS.map((post) => ({
      "@type": "BlogPosting",
      headline: post.title,
      description: post.excerpt,
      datePublished: post.dateISO,
      articleSection: post.tag,
      keywords: post.tag,
      author: { "@type": "Organization", name: post.author },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        // Static, author-written content only — nothing user supplied is injected.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <BlogContent posts={POSTS} />
    </>
  );
}
