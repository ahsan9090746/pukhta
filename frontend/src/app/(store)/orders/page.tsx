"use client";
// Render on demand - skip static generation so a sleeping backend cannot crash the build.
export const dynamic = "force-dynamic";

import { motion } from "framer-motion";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/common/empty-state";
import Breadcrumb from "@/components/common/breadcrumb";
import { Package, Eye } from "lucide-react";
import { format } from "date-fns";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  processing: "bg-blue-100 text-blue-800",
  shipped: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function OrdersPage() {
  const { data: orders, isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: () => api.get("/orders").then((res) => res.data.data.data ?? []),
  });

  if (isLoading) {
    return (
      <div className="container py-8">
        <Skeleton className="h-8 w-32 mb-8" />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!orders?.length) {
    return (
      <div className="container py-16">
        <EmptyState
          icon={<Package className="h-12 w-12" />}
          title="No orders yet"
          description="Your order history will appear here once you make a purchase."
          action={
            <Button asChild>
              <Link href="/product-category">Start Shopping</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="container py-8"
    >
      <Breadcrumb
        items={[{ label: "Home", href: "/" }, { label: "My Orders" }]}
      />

      <h1 className="text-3xl font-bold mt-8 mb-6">My Orders</h1>

      <div className="space-y-4">
        {orders.map((order: any) => (
          <motion.div
            key={order._id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="border rounded-xl p-6 hover:shadow-premium transition-all"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Order #{order.orderNumber}</span>
                  <Badge
                    className={statusColors[order.status] || "bg-gray-100 text-gray-800"}
                  >
                    {order.status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Placed on {format(new Date(order.createdAt), "MMM dd, yyyy")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {order.items?.length || 0} items
                </p>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-bold text-lg">Rs {order.total.toLocaleString()}</span>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/orders/${order._id}`}>
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Link>
                </Button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
