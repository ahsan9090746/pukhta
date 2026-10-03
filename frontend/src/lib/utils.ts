import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "PKR") {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string | Date, format = "MMM dd, yyyy") {
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function truncate(str: string, length: number) {
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
) {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function generateSlug(str: string) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function getImageUrl(path: string) {
  if (!path) return "/placeholder.png";
  if (path.startsWith("http")) return path;
  // Backend origin derived from NEXT_PUBLIC_API_URL (inlined at build time).
  // /uploads/* files live on the backend, so they need the absolute URL in
  // production (e.g. https://pukhta-backend.onrender.com/uploads/...).
  const backendBase = (
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api"
  ).replace(/\/api\/?$/, "");
  if (path.startsWith("/uploads/")) return `${backendBase}${path}`;
  if (path.startsWith("/")) return `${backendBase}${path}`;
  return `${backendBase}/${path}`;
}
