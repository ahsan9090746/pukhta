"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Sends the visitor to the home page.
 *
 * Detail pages render this when the slug / id in the URL does not exist, so a
 * wrong or outdated link never ends on a dead-end screen.
 */
export default function RedirectHome() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/");
  }, [router]);

  return (
    <div className="container py-20 text-center text-muted-foreground">
      Page not found. Taking you home...
    </div>
  );
}
