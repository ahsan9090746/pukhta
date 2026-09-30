"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, PackageSearch, ShoppingCart, Store } from "lucide-react";
import { useCartStore } from "@/stores/cart-store";
import { useWishlistStore } from "@/stores/wishlist-store";
import { useUIStore } from "@/stores/ui-store";

/** Routes that already render their own fixed bottom action bar. */
const HIDDEN_ON = ["/cart", "/checkout", "/product"];

/**
 * Mobile-only bottom navigation (md:hidden): Shop · Track Order · Wishlist · Cart.
 * Cart opens the slide-in cart drawer (shared state with the header).
 */
export default function BottomNav() {
  const pathname = usePathname();
  const { items } = useCartStore();
  const wishlistItems = useWishlistStore((s) => s.items);
  const setCartOpen = useUIStore((s) => s.setCartOpen);

  const cartCount = items.reduce(
    (count, item) => count + (item.quantity || 0),
    0
  );
  const wishlistCount = wishlistItems.length;

  const hidden = HIDDEN_ON.some(
    (base) => pathname === base || pathname?.startsWith(`${base}/`)
  );
  if (hidden) return null;

  const links = [
    { href: "/shop", label: "Shop", icon: Store, badge: 0 },
    {
      href: "/track-order",
      label: "Track Order",
      icon: PackageSearch,
      badge: 0,
    },
    { href: "/wishlist", label: "Wishlist", icon: Heart, badge: wishlistCount },
  ];

  const cellClass =
    "relative flex h-16 flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors";

  return (
    <nav
      aria-label="Mobile quick navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg md:hidden"
    >
      <div className="grid grid-cols-4">
        {links.map((link) => {
          const active =
            pathname === link.href ||
            (!!pathname && pathname.startsWith(`${link.href}/`));
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`${cellClass} ${
                active
                  ? "text-brand-gold"
                  : "text-muted-foreground hover:text-brand-gold"
              }`}
            >
              <span className="relative">
                <Icon className="h-5 w-5" />
                {link.badge > 0 && (
                  <span className="absolute -right-2 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-brand-gold px-1 text-[9px] font-bold leading-none text-white">
                    {link.badge}
                  </span>
                )}
              </span>
              <span className="whitespace-nowrap">{link.label}</span>
            </Link>
          );
        })}

        {/* Cart — opens the slide-in cart drawer instead of navigating */}
        <button
          type="button"
          onClick={() => setCartOpen(true)}
          aria-label={`Open cart (${cartCount} items)`}
          className={`${cellClass} text-muted-foreground hover:text-brand-gold`}
        >
          <span className="relative">
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -right-2 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-brand-gold px-1 text-[9px] font-bold leading-none text-white">
                {cartCount}
              </span>
            )}
          </span>
          <span className="whitespace-nowrap">Cart</span>
        </button>
      </div>
    </nav>
  );
}
