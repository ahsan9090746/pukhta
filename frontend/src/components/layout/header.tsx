"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore } from "@/stores/cart-store";
import { useWishlistStore } from "@/stores/wishlist-store";
import { useUIStore } from "@/stores/ui-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  ShoppingCart,
  Heart,
  Menu,
  X,
  Sun,
  Moon,
  Phone,
  Mail,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import CartDrawer from "@/components/cart/cart-drawer";
import { formatCurrency, getImageUrl } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import {
  DesktopCategoryNavItem,
  MobileCategoryList,
  useCategoryTree,
} from "@/components/layout/header-category-menu";
import SearchPanel from "@/components/layout/search-panel";

export default function Header() {
  const router = useRouter();
  const { items } = useCartStore();
  const wishlistItems = useWishlistStore((s) => s.items);
  const {
    mobileMenuOpen,
    toggleMobileMenu,
    setMobileMenuOpen,
    cartOpen,
    setCartOpen,
  } = useUIStore();
  const { user, isAuthenticated } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const { categories, isLoading: categoriesLoading } = useCategoryTree();

  // Slide-in sidebar (mobile): MENU / CATEGORIES tab + body scroll lock
  const [menuTab, setMenuTab] = useState<"menu" | "categories">("menu");

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    setMenuTab("menu");
    // Viewport grown to desktop while open (hamburger is hidden there) → close
    const desktop = window.matchMedia("(min-width: 768px)");
    const onDesktop = (e: MediaQueryListEvent) => {
      if (e.matches) setMobileMenuOpen(false);
    };
    desktop.addEventListener("change", onDesktop);
    return () => {
      document.body.style.overflow = previous;
      desktop.removeEventListener("change", onDesktop);
    };
  }, [mobileMenuOpen, setMobileMenuOpen]);

  const { data: settings } = useQuery({
    queryKey: ["site-settings"],
    queryFn: () => api.get("/settings").then((res) => res.data.data.settings),
    staleTime: 5 * 60 * 1000,
  });

  const currency = settings?.currency || "PKR";
  const cartCount = items.reduce(
    (count, item) => count + (item.quantity || 0),
    0
  );
  const cartTotal = items.reduce(
    (total, item) => total + (item.price || 0) * (item.quantity || 0),
    0
  );

  // Theme-aware logo — both fall back to the single "shop logo" upload
  const logoLight =
    settings?.logoLight || settings?.storeLogo || settings?.logoDark || "";
  const logoDark =
    settings?.logoDark || settings?.storeLogo || settings?.logoLight || "";
  const hasLogo = Boolean(logoLight || logoDark);
  const storeName = settings?.storeName || "PUKHTA";
  const [firstWord, ...otherWords] = storeName.split(" ");
  const restWords = otherWords.join(" ");

  // Top utility bar links
  const utilityLinks = [
    { label: "About Us", href: "/about-us" },
    { label: "Blog", href: "/blog" },
    { label: "Contact Us", href: "/contact" },
    { label: "FAQs", href: "/faqs" },
    { label: "Track Order", href: "/track-order" },
  ];
  const accountLabel =
    isAuthenticated && user?.name ? user.name.split(" ")[0] : "My Account";

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Mobile renders the search suggestions as an inline sheet, desktop as a dropdown
  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    const apply = () => setIsMobile(query.matches);
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);

  /** Opens the field, focuses it and reveals the live suggestions. */
  const openSearch = useCallback(() => {
    setSearchOpen(true);
    setShowSuggestions(true);
    setTimeout(() => searchInputRef.current?.focus(), 60);
  }, []);

  const closeSearch = useCallback(() => {
    setShowSuggestions(false);
    setSearchOpen(false);
    setSearchQuery("");
  }, []);

  /**
   * Search never opens a separate page — the shopper is sent to the existing
   * listing page (`/product-category` or `/shop`) with `?search=`, where the
   * results render inline with the same filters and sorting.
   */
  const handleSearchSubmit = useCallback(
    (term?: string) => {
      const value = (term ?? searchQuery).trim();
      if (value.length < 2) return;
      closeSearch();
      const base = pathname?.startsWith("/shop") ? "/shop" : "/product-category";
      router.push(`${base}?search=${encodeURIComponent(value)}`);
    },
    [closeSearch, pathname, router, searchQuery]
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearchSubmit();
  };

  // Click outside closes the suggestion list (the input keeps its text)
  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  // Ctrl/Cmd + K (or "/") opens search from anywhere on the page
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = !!target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
      const isShortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k";

      if (isShortcut || (event.key === "/" && !typing)) {
        event.preventDefault();
        openSearch();
        return;
      }
      if (event.key === "Escape") setShowSuggestions(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [openSearch]);

  // Navigating anywhere closes the panel so it never lingers over a new page
  useEffect(() => {
    setShowSuggestions(false);
  }, [pathname]);

  // Each entry must keep a unique `href` — hrefs/labels are used as React keys below.
  const navLinksBeforeCategories = [{ label: "Home", href: "/" }];

  // These follow the parent-category menus in the header
  const navLinksAfterCategories = [
    { label: "Shop", href: "/shop" },
    { label: "New Arrivals", href: "/product-category/new-arrival" },
    { label: "Track Order", href: "/track-order" },
  ];

  // MENU tab of the slide-in sidebar — plain, organized, uppercase rows
  const menuLinks: { label: string; href: string; badge?: number }[] = [
    { label: "Home", href: "/" },
    { label: "About Us", href: "/about-us" },
    { label: "Contact Us", href: "/contact" },
    { label: "Blog", href: "/blog" },
    { label: "Shop", href: "/shop" },
    { label: "New Arrivals", href: "/product-category/new-arrival" },
    { label: "Checkout", href: "/checkout" },
    { label: "Track Order", href: "/track-order" },
    { label: accountLabel, href: "/profile" },
    {
      label: "Wishlist",
      href: "/wishlist",
      badge: wishlistItems.length || undefined,
    },
    { label: "FAQ's", href: "/faqs" },
  ];

  return (
    <>
      {/* Top utility bar — phone / email + quick links (reference design) */}
      <div className="hidden border-b border-border bg-brand-cream md:block dark:border-white/10 dark:bg-brand-dark">
        <div className="container">
          <div className="flex h-11 items-center justify-between gap-6 text-[11px]">
            <div className="flex items-center gap-6 text-muted-foreground">
              {settings?.storePhone && (
                <a
                  href={`tel:${settings.storePhone}`}
                  className="flex items-center gap-2 tracking-wide transition-colors hover:text-brand-gold"
                >
                  <Phone className="h-3.5 w-3.5 text-brand-gold" />
                  <span>{settings.storePhone}</span>
                </a>
              )}
              {settings?.storeEmail && (
                <a
                  href={`mailto:${settings.storeEmail}`}
                  className="flex items-center gap-2 uppercase tracking-wide transition-colors hover:text-brand-gold"
                >
                  <Mail className="h-3.5 w-3.5 text-brand-gold" />
                  <span>{settings.storeEmail}</span>
                </a>
              )}
            </div>

            <div className="flex items-center gap-3">
              {utilityLinks.map((link, index) => (
                <span key={link.href} className="flex items-center gap-3">
                  <Link
                    href={link.href}
                    className="uppercase tracking-wide text-muted-foreground transition-colors hover:text-brand-gold"
                  >
                    {link.label}
                  </Link>
                  {index < utilityLinks.length - 1 && (
                    <span className="text-border">|</span>
                  )}
                </span>
              ))}
              <span className="text-border">|</span>
              <Button
                asChild
                size="sm"
                className="h-8 rounded-full bg-brand-gold px-5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white hover:bg-brand-gold-dark"
              >
                <Link href="/#newsletter">Subscribe Us</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <header
        className={`sticky top-0 z-50 border-b transition-all duration-300 ${
          scrolled
            ? "border-border bg-background/95 shadow-premium backdrop-blur supports-[backdrop-filter]:bg-background/80"
            : "border-border/60 bg-background"
        }`}
      >
        <div className="container">
          {/* Row height is kept just a touch above the logo height (logo: h-12 →
              48px, sm:h-14 → 56px, lg:h-16 → 64px) so the header stays compact. */}
          <div className="relative flex h-14 items-center justify-between gap-4 md:h-16 lg:h-18">
            {/* Mobile only — menu trigger pinned to the LEFT edge */}
            <Button
              variant="ghost"
              size="icon"
              className="-ml-2 shrink-0 rounded-full border border-border/60 hover:border-brand-gold hover:bg-brand-gold/10 hover:text-brand-gold md:hidden"
              onClick={toggleMobileMenu}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>

            {/* Logo — truly centered on mobile, in-flow on the left from md up */}
            <Link
              href="/"
              className="absolute left-1/2 top-1/2 flex max-w-[48%] shrink-0 -translate-x-1/2 -translate-y-1/2 items-center md:static md:max-w-none md:translate-x-0 md:translate-y-0"
            >
              {hasLogo ? (
                <>
                  <img
                    src={getImageUrl(logoLight || logoDark)}
                    alt={storeName}
                    className="h-12 max-w-[190px] object-contain sm:h-14 lg:h-16 dark:hidden"
                  />
                  <img
                    src={getImageUrl(logoDark || logoLight)}
                    alt={storeName}
                    className="hidden h-12 max-w-[190px] object-contain sm:h-14 lg:h-16 dark:block"
                  />
                </>
              ) : (
                /* Text wordmark is only the fallback when no logo is uploaded */
                <span className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                  {firstWord}
                  {restWords && (
                    <span className="text-brand-gold"> {restWords}</span>
                  )}
                </span>
              )}
            </Link>

            {/* Desktop nav — parent categories reveal their children on hover */}
            <ul className="hidden flex-1 items-center justify-center gap-7 md:flex">
              {navLinksBeforeCategories.map((link) => (
                <NavItem key={link.href} href={link.href} label={link.label} />
              ))}

              {categoriesLoading
                ? [0, 1, 2].map((i) => (
                    <li key={`category-skeleton-${i}`} aria-hidden>
                      <span className="block h-2.5 w-16 animate-pulse rounded-full bg-muted" />
                    </li>
                  ))
                : categories.map((category) => (
                    <DesktopCategoryNavItem
                      key={category._id}
                      category={category}
                    />
                  ))}

              {navLinksAfterCategories.map((link) => (
                <NavItem key={link.href} href={link.href} label={link.label} />
              ))}
            </ul>

            <div className="flex items-center gap-1">
              {/* Theme + wishlist — md and up; mobile keeps both inside the menu drawer */}
              <div className="hidden items-center gap-1 md:flex">
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative hover:bg-brand-gold/10 hover:text-brand-gold"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  title="Toggle theme"
                >
                  <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                  <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                </Button>

                {/* Wishlist sits next to the theme toggle */}
                <Link href="/wishlist" title="Wishlist">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative hover:bg-brand-gold/10 hover:text-brand-gold"
                  >
                    <Heart className="h-5 w-5" />
                    {wishlistItems.length > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand-gold px-1 text-[10px] font-bold leading-none text-white">
                        {wishlistItems.length}
                      </span>
                    )}
                  </Button>
                </Link>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="hover:bg-brand-gold/10 hover:text-brand-gold"
                onClick={() => (searchOpen ? closeSearch() : openSearch())}
                aria-expanded={searchOpen}
                aria-label="Search products"
                title="Search products (Ctrl + K)"
              >
                <Search className="h-5 w-5" />
              </Button>

              {/* Cart — item count badge + running total; hover stays gold in both themes */}
              <Button
                variant="ghost"
                onClick={() => setCartOpen(true)}
                title="Open cart"
                className="gap-2.5 px-2 hover:bg-brand-gold/10 hover:text-brand-gold"
              >
                <span className="relative">
                  <ShoppingCart className="h-6 w-6" />
                  <span className="absolute -right-2 -top-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand-gold px-1 text-[10px] font-bold leading-none text-white">
                    {cartCount}
                  </span>
                </span>
                <span className="hidden text-sm font-semibold sm:inline">
                  {formatCurrency(cartTotal, currency)}
                </span>
              </Button>
            </div>
          </div>

          <AnimatePresence>
            {searchOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="border-t"
              >
                <div ref={searchRef} className="relative py-4">
                  <form onSubmit={handleSearch} className="relative">
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      ref={searchInputRef}
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setShowSuggestions(true);
                      }}
                      onFocus={() => setShowSuggestions(true)}
                      placeholder="Search products by name or SKU…"
                      aria-label="Search products"
                      autoComplete="off"
                      spellCheck={false}
                      className="h-12 rounded-xl pl-10 pr-24 text-base"
                    />
                    <span className="absolute right-3 top-1/2 hidden -translate-y-1/2 items-center gap-1 sm:flex">
                      {searchQuery ? (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery("");
                            searchInputRef.current?.focus();
                          }}
                          aria-label="Clear search"
                          className="rounded-full p-1.5 text-muted-foreground transition-colors hover:text-foreground"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      ) : (
                        <>
                          <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                            Ctrl
                          </kbd>
                          <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                            K
                          </kbd>
                        </>
                      )}
                    </span>
                  </form>

                  <AnimatePresence>
                    {showSuggestions && (
                      <SearchPanel
                        query={searchQuery}
                        categories={categories}
                        onClose={closeSearch}
                        onSearch={handleSearchSubmit}
                        variant={isMobile ? "sheet" : "dropdown"}
                      />
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Mobile menu → slide-in sidebar, rendered outside the sticky header below. */}


        </div>
      </header>
      {/* Mobile slide-in sidebar — Close · Search · MENU/CATEGORIES tabs (reference design) */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-[60] md:hidden">
            <motion.button
              type="button"
              aria-label="Close menu"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={toggleMobileMenu}
              className="absolute inset-0 h-full w-full cursor-default bg-black/55 backdrop-blur-[2px]"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-y-0 left-0 flex w-[88%] max-w-sm flex-col bg-background shadow-2xl"
            >
              {/* Close */}
              <div className="flex h-14 shrink-0 items-center justify-end border-b border-border/60 px-4">
                <button
                  type="button"
                  onClick={toggleMobileMenu}
                  className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                  Close
                </button>
              </div>

              {/* Quick search */}
              <button
                type="button"
                onClick={() => {
                  toggleMobileMenu();
                  openSearch();
                }}
                className="mx-4 mt-3 flex h-10 shrink-0 items-center justify-between rounded-xl border border-border/70 bg-muted/50 px-3.5 text-sm text-muted-foreground transition-colors hover:border-brand-gold hover:text-foreground"
              >
                Search for products
                <Search className="h-4 w-4 shrink-0 text-brand-gold" />
              </button>

              {/* MENU / CATEGORIES tabs */}
              <div className="mt-3 grid shrink-0 grid-cols-2 gap-1.5 px-4">
                {(["menu", "categories"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setMenuTab(tab)}
                    className={`rounded-lg border py-2 text-xs font-bold uppercase tracking-[0.14em] transition-colors ${
                      menuTab === tab
                        ? "border-brand-gold/60 bg-brand-gold/10 text-brand-gold"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab === "menu" ? "Menu" : "Categories"}
                  </button>
                ))}
              </div>

              {/* Scrollable panel content */}
              <div className="mt-3 flex-1 overflow-y-auto overscroll-contain border-t border-border/60">
                {menuTab === "menu" ? (
                  <nav>
                    {menuLinks.map((link) => {
                      const active = pathname === link.href;
                      return (
                        <Link
                          key={link.href}
                          href={link.href}
                          onClick={toggleMobileMenu}
                          className={`flex items-center justify-between border-b border-border/60 px-4 py-3 text-[13px] font-semibold uppercase tracking-wide transition-colors hover:bg-brand-gold/10 hover:text-brand-gold ${
                            active
                              ? "bg-brand-gold/5 text-brand-gold"
                              : "text-foreground/80"
                          }`}
                        >
                          <span>{link.label}</span>
                          {link.badge ? (
                            <span className="rounded-full bg-brand-gold px-2 py-0.5 text-[10px] font-bold text-white">
                              {link.badge}
                            </span>
                          ) : null}
                        </Link>
                      );
                    })}
                  </nav>
                ) : (
                  <div className="py-1">
                    <MobileCategoryList
                      categories={categories}
                      onNavigate={toggleMobileMenu}
                    />
                    {!categories.length && !categoriesLoading && (
                      <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                        No categories yet.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Panel footer — theme toggle (mobile-only entry point) */}
              <div className="shrink-0 border-t border-border/60 px-4 py-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                <button
                  type="button"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-muted-foreground transition-colors hover:text-brand-gold"
                >
                  {theme === "dark" ? (
                    <Sun className="h-4 w-4 text-brand-gold" />
                  ) : (
                    <Moon className="h-4 w-4 text-brand-gold" />
                  )}
                  {theme === "dark" ? "Light mode" : "Dark mode"}
                </button>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
    </>
  );
}

/** Plain header nav link with an active state */
function NavItem({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <li>
      <Link
        href={href}
        className={`whitespace-nowrap py-2 text-xs font-medium uppercase tracking-[0.12em] transition-colors ${
          active
            ? "text-brand-gold"
            : "text-muted-foreground hover:text-brand-gold"
        }`}
      >
        {label}
      </Link>
    </li>
  );
}
