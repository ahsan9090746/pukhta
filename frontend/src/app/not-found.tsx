import { redirect } from "next/navigation";

/**
 * Root not-found boundary.
 *
 * Next.js renders this file for every URL the app has no route for, and for
 * pages that call `notFound()`. Instead of showing a dead-end 404 screen the
 * visitor is sent straight to the home page.
 */
export default function NotFound() {
  redirect("/");
}
