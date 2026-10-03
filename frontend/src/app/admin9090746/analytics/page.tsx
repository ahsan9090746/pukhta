"use client";
// Render on demand - skip static generation so a sleeping backend cannot crash the build.
export const dynamic = "force-dynamic";

import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import StatsCard from "@/components/admin/stats-card";
import Chart from "@/components/admin/chart";
import DonutChart from "@/components/admin/pie-chart";
import DataTable from "@/components/admin/data-table";
import {
  Users,
  Eye,
  ShoppingCart,
  Target,
  MousePointerClick,
  CreditCard,
  BadgeCheck,
} from "lucide-react";
import { format } from "date-fns";

interface Funnel {
  views: number;
  addToCart: number;
  checkout: number;
  purchase: number;
}

const funnelSteps = [
  { key: "views", label: "Product Views", icon: Eye },
  { key: "addToCart", label: "Added to Cart", icon: ShoppingCart },
  { key: "checkout", label: "Checkout Started", icon: CreditCard },
  { key: "purchase", label: "Purchase", icon: BadgeCheck },
] as const;

export default function AdminAnalyticsPage() {
  const [days, setDays] = useState(7);

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["analytics-summary", days],
    queryFn: () =>
      api.get(`/analytics/summary?days=${days}`).then((res) => res.data.data),
  });

  const { data: trend } = useQuery({
    queryKey: ["analytics-trend", days],
    queryFn: () =>
      api
        .get(`/analytics/visitor-trends?days=${days}`)
        .then((res) => res.data.data.trend ?? []),
  });

  const { data: funnel } = useQuery({
    queryKey: ["analytics-funnel", days],
    queryFn: () =>
      api
        .get(`/analytics/conversion-funnel?days=${days}`)
        .then((res) => res.data.data.funnel as Funnel),
  });

  const { data: topProducts } = useQuery({
    queryKey: ["analytics-top-products", days],
    queryFn: () =>
      api
        .get(`/analytics/top-products?days=${days}&limit=10`)
        .then((res) => res.data.data.products ?? []),
  });

  const { data: byCategory } = useQuery({
    queryKey: ["analytics-category", days],
    queryFn: () =>
      api
        .get(`/analytics/sales-by-category?days=${days}`)
        .then((res) => res.data.data.categories ?? []),
  });

  const { data: topPages } = useQuery({
    queryKey: ["analytics-top-pages", days],
    queryFn: () =>
      api
        .get(`/analytics/top-pages?days=${days}&limit=10`)
        .then((res) => res.data.data.pages ?? []),
  });

  const isLoading =
    summaryLoading || !trend || !funnel || !topProducts || !byCategory || !topPages;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  // Human-friendly date labels for the trend charts
  const trendData = (trend || []).map((point: any) => ({
    ...point,
    date: format(new Date(`${point.date}T00:00:00`), "MMM dd"),
  }));

  const summaryCards = [
    {
      title: "Visitors",
      value: (summary?.visitors ?? 0).toLocaleString(),
      change: null,
      icon: Users,
    },
    {
      title: "Page Views",
      value: (summary?.pageViews ?? 0).toLocaleString(),
      change: null,
      icon: Eye,
    },
    {
      title: "Orders",
      value: (summary?.orders ?? 0).toLocaleString(),
      change: null,
      icon: ShoppingCart,
    },
    {
      title: "Conversion Rate",
      value: `${summary?.conversionRate ?? 0}%`,
      change: null,
      icon: Target,
    },
  ];

  const funnelValues: Record<string, number> = {
    views: funnel?.views ?? 0,
    addToCart: funnel?.addToCart ?? 0,
    checkout: funnel?.checkout ?? 0,
    purchase: funnel?.purchase ?? 0,
  };

  const categoryData = (byCategory || []).map((c: any) => ({
    name: c.name,
    value: c.revenue || 0,
  }));

  const productColumns = [
    { header: "Product", accessorKey: "name" },
    { header: "Units Sold", accessorKey: "unitsSold" },
    {
      header: "Revenue",
      accessorKey: "revenue",
      cell: (row: any) => `Rs ${row.revenue?.toLocaleString() || "0"}`,
    },
  ];

  const pageColumns = [
    { header: "Page", accessorKey: "path" },
    { header: "Views", accessorKey: "views" },
    { header: "Visitors", accessorKey: "visitors" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl font-bold">Analytics</h1>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={days === 7 ? "default" : "outline"}
            onClick={() => setDays(7)}
          >
            Last 7 days
          </Button>
          <Button
            size="sm"
            variant={days === 30 ? "default" : "outline"}
            onClick={() => setDays(30)}
          >
            Last 30 days
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {summaryCards.map((stat, i) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <StatsCard {...stat} />
          </motion.div>
        ))}
      </div>

      {/* Visitor trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Page Views</CardTitle>
          </CardHeader>
          <CardContent>
            <Chart
              type="area"
              data={trendData}
              xKey="date"
              yKey="pageViews"
              color="hsl(var(--primary))"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Unique Visitors</CardTitle>
          </CardHeader>
          <CardContent>
            <Chart
              type="line"
              data={trendData}
              xKey="date"
              yKey="visitors"
              color="hsl(var(--primary))"
            />
          </CardContent>
        </Card>
      </div>

      {/* Conversion funnel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MousePointerClick className="h-5 w-5 text-primary" />
            Conversion Funnel
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {funnelSteps.map((step, i) => {
            const value = funnelValues[step.key];
            const first = funnelValues[funnelSteps[0].key];
            const shareOfTop = first ? Math.round((value / first) * 100) : 0;
            const StepIcon = step.icon;
            return (
              <div key={step.key} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 font-medium">
                    <StepIcon className="h-4 w-4 text-muted-foreground" />
                    {step.label}
                  </span>
                  <span className="text-muted-foreground">
                    {value.toLocaleString()}
                    {i > 0 && ` · ${shareOfTop}% of views`}
                  </span>
                </div>
                <Progress value={shareOfTop} className="h-2" />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Best sellers + sales by category */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Best-Selling Products</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable columns={productColumns} data={topProducts || []} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sales by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <DonutChart data={categoryData} />
          </CardContent>
        </Card>
      </div>

      {/* Top pages */}
      <Card>
        <CardHeader>
          <CardTitle>Top Pages</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable columns={pageColumns} data={topPages || []} />
        </CardContent>
      </Card>
    </motion.div>
  );
}