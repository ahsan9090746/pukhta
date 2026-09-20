"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore } from "@/stores/cart-store";
import { useUIStore } from "@/stores/ui-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import CartDrawer from "@/components/cart/cart-drawer";

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
    const { items } = useCartStore();
  const { toggleSidebar, mobileMenuOpen, toggleMobileMenu } = useUIStore();
  const { theme, setTheme } = useTheme();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery("");
    }
  };

  const navLinks = [
    { label: "Home", href: "/" },
    { label: "Products", href: "/products" },
    { label: "Categories", href: "/categories" },
    ];

  return (
    <>
      {/* Top bar - normal flow, scrolls away with the page */}
      {!scrolled && (
        <div className="hidden md:block border-b bg-background relative z-50">
          <div className="container">
            <div className="flex h-10 items-center justify-between text-sm">
              {/* Left: contact info */}
              <div className="flex items-center gap-6 text-muted-foreground">
                <a
                  href="tel:03329090746"
                  className="flex items-center gap-2 hover:text-primary transition-colors"
                >
                  <Phone className="h-4 w-4" />
                  <span>03329090746</span>
                </a>
                <a
                  href="mailto:info@pukhta.com"
                  className="flex items-center gap-2 hover:text-primary transition-colors uppercase"
                >
                  <Mail className="h-4 w-4" />
                  <span>info@pukhta.com</span>
                </a>
              </div>

              {/* Right: quick links */}
              <div className="flex items-center gap-4">
                {[
                  { label: "About Us", href: "/about" },
                  { label: "Blog", href: "/blog" },
                  { label: "Contact Us", href: "/contact" },
                  { label: "FAQs", href: "/faqs" },
                ].map((link, i, arr) => (
                  <span key={link.href} className="flex items-center gap-4">
                    <Link
                      href={link.href}
                      className="text-muted-foreground hover:text-primary transition-colors uppercase text-xs tracking-wide"
                    >
                      {link.label}
                    </Link>
                    {i < arr.length - 1 && (
                      <span className="text-border">|</span>
                    )}
                  </span>
                ))}
                <span className="flex items-center gap-4">
                  <Link
                    href="/wishlist"
                    className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors uppercase text-xs tracking-wide"
                  >
                    <Heart className="h-4 w-4" />
                    Wishlist
                  </Link>
                  <span className="text-border">|</span>
                </span>
                <Button
                  asChild
                  size="sm"
                  className="h-7 px-3 rounded-full uppercase text-[11px] font-semibold tracking-wide"
                >
                  <Link href="/newsletter">Subscribe Us</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <header
        className={`sticky top-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm"
            : "bg-background"
        }`}
      >
      <div className="container">
        <div className="flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-xl font-extrabold tracking-tight">Step<span className="text-gold">Up</span></span>
            </Link>

            <nav className="hidden md:flex items-center gap-6">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative text-sm font-medium transition-colors hover:text-foreground after:absolute after:-bottom-1.5 after:left-0 after:h-0.5 after:bg-gold after:transition-all after:duration-300 ${
                    pathname === link.href ? "text-foreground after:w-full" : "text-muted-foreground after:w-0 hover:after:w-full"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSearchOpen(!searchOpen)}
            >
              <Search className="h-5 w-5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>

            <Link href="/wishlist">
              <Button variant="ghost" size="icon" className="relative">
                <Heart className="h-5 w-5" />
              </Button>
            </Link>

            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={() => setCartOpen(true)}
              title="Open cart"
            >
              <ShoppingCart className="h-5 w-5" />
              {items.length > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 min-w-5 px-1 flex items-center justify-center text-[10px] bg-gold text-white hover:bg-gold-dark">
                  {items.length}
                </Badge>
              )}
            </Button>


            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={toggleMobileMenu}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        <AnimatePresence>
          {searchOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="pb-4"
            >
              <form onSubmit={handleSearch} className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search for products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  autoFocus
                />
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden pb-4 border-t"
            >
              <nav className="flex flex-col gap-2 pt-4">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={toggleMobileMenu}
                    className="px-4 py-2 text-sm font-medium rounded-lg hover:bg-muted"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      </header>
      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
    </>
  );
}
