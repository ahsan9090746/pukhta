import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/providers/theme-provider";
import { QueryProvider } from "@/providers/query-provider";
import { SocketProvider } from "@/providers/socket-provider";
import { Toaster } from "sonner";
import AppShell from "@/components/layout/app-shell";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "StepUp Premium Footwear",
    template: "%s | StepUp Premium Footwear",
  },
  description:
    "Discover premium footwear for every occasion. Shop the latest collections with nationwide delivery.",
  keywords: [
    "footwear",
    "shoes",
    "sneakers",
    "boots",
    "sandals",
    "premium",
    "fashion",
  ],
  authors: [{ name: "StepUp" }],
  creator: "StepUp",
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "StepUp Premium Footwear",
    title: "StepUp Premium Footwear",
    description:
      "Discover premium footwear for every occasion.",
  },
  twitter: {
    card: "summary_large_image",
    title: "StepUp Premium Footwear",
    description:
      "Discover premium footwear for every occasion.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            <SocketProvider>
              <AppShell>{children}</AppShell>
              <Toaster position="top-right" richColors closeButton />
            </SocketProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
