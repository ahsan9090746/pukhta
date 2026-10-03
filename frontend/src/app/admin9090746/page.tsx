"use client";
// Render on demand - skip static generation so a sleeping backend cannot crash the build.
export const dynamic = "force-dynamic";

import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import StatsCard from "@/components/admin/stats-card";
import Chart from "@/components/admin/chart";
import DataTable from "@/components/admin/data-table";
import {
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  TrendingUp,
  TrendingDown,
  Eye,
  Clock,
} from "lucide-react";
import { format } from "date-fns";

/** % change helper, guarded against divide-by-zero */
const pctChange = (today?: number, yesterday?: number): number => {
  const t = today || 0;
  const y = yesterday || 0;
  if (!y) return 0;
  return Math.round(((t - y) / y) * 100);
};

export default function AdminDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => api.get("/admin/stats").then((res) => res.data.data),
  });

  const { data: revenueChart } = useQuery({
    queryKey: ["revenue-chart"],
    queryFn: () =>
      api.get("/admin/charts/revenue").then((res) => res.data.data.chart ?? []),
  });

  const { data: ordersChart } = useQuery({
    queryKey: ["orders-chart"],
    queryFn: () =>
      api
        .get("/admin/charts/orders")
        .then((res) =>
          (res.data.data.distribution ?? []).map((d: any) => ({
            date: d._id,
            orders: d.count,
          }))
        ),
  });

  const { data: topProducts } = useQuery({
    queryKey: ["top-products"],
    queryFn: () =>
      api.get("/admin/top-products").then((res) => res.data.data.products ?? []),
  });

  const { data: recentOrders } = useQuery({
    queryKey: ["recent-orders"],
    queryFn: () =>
      api
        .get("/admin/orders?limit=5&sort=-createdAt")
        .then((res) => res.data.data.data ?? []),
  });

  const { data: lowStock } = useQuery({
    queryKey: ["low-stock"],
    queryFn: () =>
      api
        .get("/admin/inventory/low-stock")
        .then((res) => res.data.data.products ?? []),
  });

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
      </div>
    );
  }

  const todayCards = [
    {
      title: "Today's Visitors",
      value: (stats?.visitors?.today ?? 0).toString(),
      change: pctChange(stats?.visitors?.today, stats?.visitors?.yesterday),
      icon: Eye,
    },
    {
      title: "Today's Orders",
      value: (stats?.orders?.today ?? 0).toString(),
      change: pctChange(stats?.orders?.today, stats?.orders?.yesterday),
      icon: ShoppingCart,
    },
    {
      title: "Today's Revenue",
      value: `Rs ${(stats?.revenue?.today ?? 0).toLocaleString()}`,
      change: pctChange(stats?.revenue?.today, stats?.revenue?.yesterday),
      icon: DollarSign,
    },
    {
      title: "Pending Orders",
      value: (stats?.orders?.pending ?? 0).toString(),
      change: null,
      icon: Clock,
    },
  ];

  const statsCards = [
    {
      title: "Total Revenue",
      value: `Rs ${stats?.revenue?.total?.toLocaleString() || "0"}`,
      change: 0,
      icon: DollarSign,
    },
    {
      title: "Total Orders",
      value: stats?.orders?.total?.toString() || "0",
      change: 0,
      icon: ShoppingCart,
    },
    {
      title: "Total Customers",
      value: stats?.users?.total?.toString() || "0",
      change: 0,
      icon: Users,
    },
    {
      title: "Total Products",
      value: stats?.products?.total?.toString() || "0",
      change: 0,
      icon: Package,
    },
  ];

  const orderColumns = [
    { header: "Order ID", accessorKey: "orderNumber" },
    { header: "Customer", accessorKey: "user.name" },
    {
      header: "Total",
      accessorKey: "total",
      cell: (row: any) => `Rs ${row.total.toLocaleString()}`,
    },
    { header: "Status", accessorKey: "status" },
    {
      header: "Date",
      accessorKey: "createdAt",
      cell: (row: any) => format(new Date(row.createdAt), "MMM dd, yyyy"),
    },
  ];

  const productColumns = [
    { header: "Product", accessorKey: "name" },
    { header: "Sold", accessorKey: "totalSold" },
    {
      header: "Revenue",
      accessorKey: "revenue",
      cell: (row: any) => `Rs ${row.revenue?.toLocaleString() || "0"}`,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <h1 className="text-3xl font-bold">Dashboard</h1>

      {/* Today at a glance */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Today at a glance
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {todayCards.map((stat, i) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <StatsCard
                {...stat}
                changeLabel={stat.change === null ? "" : "vs yesterday"}
              />
            </motion.div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {statsCards.map((stat, i) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <StatsCard {...stat} />
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <Chart
              type="line"
              data={revenueChart || []}
              xKey="date"
              yKey="revenue"
              color="hsl(var(--primary))"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Orders Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <Chart
              type="bar"
              data={ordersChart || []}
              xKey="date"
              yKey="orders"
              color="hsl(var(--primary))"
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Products</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable columns={productColumns} data={topProducts || []} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable columns={orderColumns} data={recentOrders || []} />
          </CardContent>
        </Card>
      </div>

      {lowStock?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-orange-500" />
              Low Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={[
                { header: "Product", accessorKey: "name" },
                { header: "SKU", accessorKey: "sku" },
                { header: "Stock", accessorKey: "stock" },
              ]}
              data={lowStock}
            />
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
