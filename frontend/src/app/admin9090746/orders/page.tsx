"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Eye, Search, RefreshCw, Package, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "bg-amber-100 text-amber-700" },
  confirmed: { label: "Confirmed", color: "bg-blue-100 text-blue-700" },
  processing: { label: "Processing", color: "bg-indigo-100 text-indigo-700" },
  shipped: { label: "Shipped", color: "bg-purple-100 text-purple-700" },
  delivered: { label: "Delivered", color: "bg-emerald-100 text-emerald-700" },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-700" },
};

const paymentStatusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "Unpaid", color: "bg-amber-100 text-amber-700" },
  paid: { label: "Paid", color: "bg-emerald-100 text-emerald-700" },
  failed: { label: "Failed", color: "bg-red-100 text-red-700" },
  refunded: { label: "Refunded", color: "bg-sky-100 text-sky-700" },
};

const allStatuses = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];

export default function AdminOrdersPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data: orders, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin-orders", statusFilter, page],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set("limit", String(limit));
      params.set("page", String(page));
      if (statusFilter !== "all") params.set("status", statusFilter);
      return api
        .get(`/admin/orders?${params.toString()}`)
        .then((res) => res.data.data ?? { data: [], pagination: {} });
    },
  });

  const { data: allOrders } = useQuery({
    queryKey: ["admin-orders-counts"],
    queryFn: () =>
      api
        .get(`/admin/orders?limit=1000`)
        .then((res) => res.data.data?.data ?? []),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/admin/orders/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin-orders-counts"] });
      toast.success("Order status updated successfully");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to update status");
    },
  });

  const updatePaymentStatusMutation = useMutation({
    mutationFn: ({ id, paymentStatus }: { id: string; paymentStatus: string }) =>
      api.patch(`/admin/orders/${id}/payment-status`, { paymentStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin-orders-counts"] });
      toast.success("Payment status updated successfully");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to update payment status");
    },
  });

  const orderList = orders?.data ?? [];
  const pagination = orders?.pagination ?? {};

  const filteredOrders = search
    ? orderList.filter(
        (row: any) =>
          row.orderNumber?.toLowerCase().includes(search.toLowerCase()) ||
          row.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
          row.user?.email?.toLowerCase().includes(search.toLowerCase())
      )
    : orderList;

  const statusCounts = (allOrders || []).reduce((acc: Record<string, number>, o: any) => {
    acc[o.orderStatus] = (acc[o.orderStatus] || 0) + 1;
    return acc;
  }, {});

  const totalCount = (allOrders || []).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
          <p className="text-muted-foreground mt-1">Manage and track all customer orders</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {["all", "pending", "confirmed", "processing", "shipped", "delivered", "cancelled"].map((s) => {
          const count = s === "all" ? totalCount : (statusCounts[s] || 0);
          return (
            <Button
              key={s}
              variant={statusFilter === s ? "default" : "outline"}
              size="sm"
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className="gap-2"
            >
              {s === "all" ? "All" : statusConfig[s]?.label || s}
              <span className={`ml-1 px-1.5 py-0.5 text-xs rounded-full ${statusFilter === s ? "bg-white/20" : "bg-muted"}`}>
                {count}
              </span>
            </Button>
          );
        })}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by order #, customer name, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Package className="h-8 w-8" />
                      <p className="font-medium">No orders found</p>
                      <p className="text-sm">Try adjusting your filters or search</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order: any) => (
                  <TableRow key={order._id}>
                    <TableCell>
                      <span className="font-mono text-sm font-medium">{order.orderNumber}</span>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{order.user?.name || "Guest"}</p>
                        <p className="text-xs text-muted-foreground">{order.user?.email || "-"}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{order.items?.length || 0}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-sm">Rs {(order.total || 0).toLocaleString()}</span>
                    </TableCell>
                    <TableCell>
                      <select
                        className="text-xs font-medium border rounded-md px-2 py-1.5 bg-background cursor-pointer hover:bg-accent transition-colors"
                        value={order.paymentStatus || "pending"}
                        onChange={(e) =>
                          updatePaymentStatusMutation.mutate({ id: order._id, paymentStatus: e.target.value })
                        }
                        disabled={updatePaymentStatusMutation.isPending}
                      >
                        <option value="pending">Unpaid</option>
                        <option value="paid">Paid</option>
                        <option value="failed">Failed</option>
                        <option value="refunded">Refunded</option>
                      </select>
                    </TableCell>
                    <TableCell>
                      <select
                        className="text-xs font-medium border rounded-md px-2 py-1.5 bg-background cursor-pointer hover:bg-accent transition-colors"
                        value={order.orderStatus || "pending"}
                        onChange={(e) =>
                          updateStatusMutation.mutate({ id: order._id, status: e.target.value })
                        }
                        disabled={updateStatusMutation.isPending}
                      >
                        {allStatuses.map((s) => (
                          <option key={s} value={s}>
                            {statusConfig[s]?.label || s}
                          </option>
                        ))}
                      </select>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(order.createdAt), "MMM dd, yyyy h:mm a")}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/admin9090746/orders/${order._id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {pagination.totalPages} ({pagination.total || 0} orders)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
