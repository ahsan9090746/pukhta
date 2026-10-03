"use client";
// Render on demand - skip static generation so a sleeping backend cannot crash the build.
export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/stores/auth-store";
import { useUIStore } from "@/stores/ui-store";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LayoutDashboard,
  BarChart3,
  Package,
  FolderTree,
  Building2,
  ShoppingCart,
  UserCog,
  Image,
  Film,
  Star,
  Warehouse,
  Settings,
  Menu,
  X,
  LogOut,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";

const menuItems = [
  { label: "Dashboard", href: "/admin9090746", icon: LayoutDashboard },
  { label: "Analytics", href: "/admin9090746/analytics", icon: BarChart3 },
  { label: "Products", href: "/admin9090746/products", icon: Package },
  { label: "Categories", href: "/admin9090746/categories", icon: FolderTree },
  { label: "Orders", href: "/admin9090746/orders", icon: ShoppingCart },
  { label: "Staff", href: "/admin9090746/staff", icon: UserCog },
  { label: "Banners", href: "/admin9090746/banners", icon: Image },
  { label: "Shorts", href: "/admin9090746/shorts", icon: Film },
  { label: "Reviews", href: "/admin9090746/reviews", icon: Star },
  { label: "Manage Stock", href: "/admin9090746/inventory", icon: Warehouse },
  { label: "Settings", href: "/admin9090746/settings", icon: Settings },
];

/**
 * Menu entries a `staff`-role user must not see — the backend denies these
 * with 403 (analytics.view / staff.manage / banners.manage / settings.manage),
 * so hiding them keeps the panel clean instead of showing dead links.
 */
const staffHiddenHrefs = [
  "/admin9090746/analytics",
  "/admin9090746/staff",
  "/admin9090746/banners",
  "/admin9090746/shorts",
  "/admin9090746/settings",
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, setUser, logout } = useAuthStore();
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const [collapsed, setCollapsed] = useState(false);
  const [checking, setChecking] = useState(true);

  const isAdminLogin = pathname === "/admin9090746/login";

  // Auth guard: only admin/staff/super-admin; customers -> admin login
  useEffect(() => {
    if (isAdminLogin) {
      setChecking(false);
      return;
    }

    const bootstrap = async () => {
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("token="))
        ?.split("=")[1];

      if (!token) {
        router.replace("/admin9090746/login");
        return;
      }

      // Refresh pe store khali hota hai — token hai to /auth/me se user fetch
      if (!user) {
        try {
          const res = await api.get("/auth/me");
          const fetchedUser = res.data.data?.user ?? res.data.data;
          if (fetchedUser?.role === "customer") {
            logout();
            router.replace("/admin9090746/login");
            return;
          }
          setUser(fetchedUser);
        } catch (err: any) {
          // Network/server hiccup (backend busy, timeout, 5xx, rate-limit):
          // don't log the user out — just stop loading and let them retry.
          const status = err?.response?.status;
          if (status !== 401 && status !== 403) {
            setChecking(false);
            return;
          }
          logout();
          router.replace("/admin9090746/login");
          return;
        }
      } else if (user.role === "customer") {
        logout();
        router.replace("/admin9090746/login");
        return;
      }

      setChecking(false);
    };

    bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, user]);

  // Admin login page: standalone (no sidebar/header)
  if (isAdminLogin) {
    return <>{children}</>;
  }

  if (checking || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50 lg:hidden"
              onClick={toggleSidebar}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              className={cn(
                "fixed left-0 top-0 z-50 h-full bg-card border-r transition-all duration-300",
                collapsed ? "w-16" : "w-64"
              )}
            >
              <div className="flex items-center justify-between p-4">
                {!collapsed && (
                  <h2 className="font-bold text-lg">Admin Panel</h2>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCollapsed(!collapsed)}
                  className="hidden lg:flex"
                >
                  <Menu className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleSidebar}
                  className="lg:hidden"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <ScrollArea className="h-[calc(100vh-120px)]">
                <nav className="p-2 space-y-1">
                  {menuItems
                    .filter(
                      (item) =>
                        // Staff lack analytics.view / staff.manage / banners.manage /
                        // settings.manage — hide those links instead of dead ends.
                        user?.role !== "staff" || !staffHiddenHrefs.includes(item.href)
                    )
                    .map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span>{item.label}</span>}
                      </Link>
                    );
                  })}
                </nav>
              </ScrollArea>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div
        className={cn(
          "flex-1 transition-all duration-300",
          sidebarOpen ? (collapsed ? "lg:ml-16" : "lg:ml-64") : "lg:ml-0"
        )}
      >
        <header className="sticky top-0 z-30 h-14 border-b bg-card flex items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="font-semibold hidden sm:block">Admin Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full" />
            </Button>
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  {user?.name?.charAt(0) || "A"}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block">
                <p className="text-sm font-medium">{user?.name}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {user?.role}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                logout();
                router.replace("/admin9090746/login");
              }}
              className="text-muted-foreground hover:text-destructive"
              title="Logout"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </header>

        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
