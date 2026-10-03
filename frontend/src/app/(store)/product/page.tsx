import { redirect } from "next/navigation";

/**
 * The bare `/product` URL has no page of its own — product browsing lives at
 * `/product-category`. Anyone who types `/product`, or follows an old link to
 * it, is sent to the home page.
 *
 * `/product/<slug>` — the product detail page — is not affected.
 */
export default function ProductIndexPage() {
  redirect("/");
}
