"use client";

import { usePathname } from "next/navigation";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import PageViewTracker from "@/components/analytics/page-view-tracker";
import BottomNav from "@/components/layout/bottom-nav";

/**
 * Wraps store pages with Header/Footer.
 * Admin panel (and admin login) render without the storefront Header/Footer.
 */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith("/admin");

  if (isAdminRoute) {
    return <>{children}</>;
  }

  // Pages with their own fixed bottom action bar (cart/checkout/PDP) skip the
  // global mobile bottom nav — and don't need the padding reserving its space.
  const hasOwnBottomBar =
    !!pathname &&
    ["/cart", "/checkout", "/product"].some(
      (base) => pathname === base || pathname.startsWith(`${base}/`)
    );

  return (
    <div
      className={`relative flex min-h-screen flex-col ${
        hasOwnBottomBar
          ? ""
          : "pb-[calc(4rem_+_env(safe-area-inset-bottom))] md:pb-0"
      }`}
    >
      <PageViewTracker />
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <BottomNav />
    </div>
  );
}