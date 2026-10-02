"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { PAYMENT_LABELS } from "@/lib/payment";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { getImageUrl } from "@/lib/utils";
import {
  ArrowLeft,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  MapPin,
  CreditCard,
  User,
  Mail,
  Phone,
  StickyNote,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { format } from "date-fns";
import Image from "next/image";

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "Pending", color: "bg-amber-50 text-amber-700 border-amber-200", icon: Clock },
  confirmed: { label: "Confirmed", color: "bg-blue-50 text-blue-700 border-blue-200", icon: CheckCircle2 },
  processing: { label: "Processing", color: "bg-indigo-50 text-indigo-700 border-indigo-200", icon: Package },
  shipped: { label: "Shipped", color: "bg-purple-50 text-purple-700 border-purple-200", icon: Truck },
  delivered: { label: "Delivered", color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", color: "bg-red-50 text-red-700 border-red-200", icon: XCircle },
};

const allStatuses = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];
const timelineSteps = ["pending", "confirmed", "processing", "shipped", "delivered"];

export default function AdminOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [trackingNumber, setTrackingNumber] = useState("");
  const [shippingCarrier, setShippingCarrier] = useState("");

  const { data: order, isLoading, refetch } = useQuery({
    queryKey: ["admin-order", params.id],
    queryFn: () =>
      api.get(`/admin/orders/${params.id}`).then((res) => res.data.data.order),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ status, trackingNumber, shippingCarrier }: { status: string; trackingNumber?: string; shippingCarrier?: string }) =>
      api.patch(`/admin/orders/${params.id}/status`, { status, trackingNumber, shippingCarrier }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-order", params.id] });
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      toast.success("Order status updated successfully");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to update status");
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-64 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Package className="h-16 w-16 text-muted-foreground" />
        <h1 className="text-2xl font-bold">Order not found</h1>
        <Button asChild variant="outline">
          <Link href="/admin9090746/orders">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Orders
          </Link>
        </Button>
      </div>
    );
  }

  const st = statusConfig[order.orderStatus] || statusConfig.pending;
  const currentStep = timelineSteps.indexOf(order.orderStatus);
  const StatusIcon = st.icon;

  const handleStatusChange = (newStatus: string) => {
    const payload: any = { status: newStatus };
    if (trackingNumber) payload.trackingNumber = trackingNumber;
    if (shippingCarrier) payload.shippingCarrier = shippingCarrier;
    updateStatusMutation.mutate(payload);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">Order {order.orderNumber}</h1>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${st.color}`}>
                <StatusIcon className="h-3.5 w-3.5" />
                {st.label}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Placed on {format(new Date(order.createdAt), "MMMM dd, yyyy 'at' h:mm a")}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Timeline */}
          <div className="border rounded-xl p-6 bg-card">
            <h2 className="font-semibold mb-6">Order Timeline</h2>
            <div className="flex items-center justify-between relative">
              {timelineSteps.map((step, index) => {
                const cfg = statusConfig[step];
                const StepIcon = cfg.icon;
                const isCompleted = index < currentStep;
                const isCurrent = index === currentStep;
                return (
                  <div key={step} className="flex flex-col items-center flex-1 relative">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center z-10 transition-all ${
                        isCompleted
                          ? "bg-emerald-500 text-white"
                          : isCurrent
                          ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <StepIcon className="h-5 w-5" />
                      )}
                    </div>
                    <span className={`text-xs mt-2 capitalize font-medium ${isCurrent ? "text-primary" : ""}`}>
                      {step}
                    </span>
                    {index < timelineSteps.length - 1 && (
                      <div
                        className={`absolute top-5 left-[calc(50%+20px)] right-[calc(-50%+20px)] h-0.5 ${
                          isCompleted ? "bg-emerald-500" : "bg-muted"
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
            {order.orderStatus === "cancelled" && (
              <div className="mt-6 p-3 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-500" />
                <span className="text-sm font-medium text-red-700">This order has been cancelled</span>
              </div>
            )}
          </div>

          {/* Order Items */}
          <div className="border rounded-xl p-6 bg-card">
            <h2 className="font-semibold mb-4">
              Purchased Items ({order.items?.length || 0})
            </h2>
            <div className="space-y-4">
              {order.items?.map((item: any, index: number) => (
                <div
                  key={item._id || index}
                  className="flex gap-4 p-4 rounded-lg border bg-background hover:bg-accent/50 transition-colors"
                >
                  <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-muted shrink-0">
                    <Image
                      src={getImageUrl(item.image || item.product?.thumbnail || item.product?.images?.[0] || "")}
                      alt={item.name || "Product"}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm truncate">{item.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Product ID: {item.product?._id || item.product}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs bg-muted px-2 py-0.5 rounded">
                        Qty: {item.quantity}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        @ Rs {item.price?.toLocaleString()} each
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-sm">
                      Rs {(item.price * item.quantity).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Status Update */}
          <div className="border rounded-xl p-6 bg-card">
            <h2 className="font-semibold mb-4">Update Status</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Order Status</label>
                <select
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
                  value={order.orderStatus}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  disabled={updateStatusMutation.isPending}
                >
                  {allStatuses.map((s) => (
                    <option key={s} value={s}>
                      {statusConfig[s]?.label || s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Tracking Number</label>
                <Input
                  placeholder="Enter tracking number"
                  defaultValue={order.trackingNumber || ""}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Shipping Carrier</label>
                <Input
                  placeholder="Enter carrier name"
                  defaultValue={order.shippingCarrier || ""}
                  onChange={(e) => setShippingCarrier(e.target.value)}
                />
              </div>
            </div>
            {updateStatusMutation.isPending && (
              <p className="text-sm text-muted-foreground mt-3">Updating status...</p>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Customer Info */}
          <div className="border rounded-xl p-6 bg-card">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <User className="h-4 w-4" />
              Customer
            </h2>
            <div className="space-y-3 text-sm">
              {order.user ? (
                <>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{order.user.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{order.user.email}</span>
                  </div>
                  {order.user.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{order.user.phone}</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-2">
                  <p className="font-medium text-amber-600">Guest Order</p>
                  {order.guestEmail && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{order.guestEmail}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Order Summary */}
          <div className="border rounded-xl p-6 bg-card">
            <h2 className="font-semibold mb-4">Order Summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>Rs {(order.subtotal || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span>{order.shipping > 0 ? `Rs ${order.shipping.toLocaleString()}` : "Free"}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount</span>
                  <span>- Rs {order.discount.toLocaleString()}</span>
                </div>
              )}
              {order.coupon && (
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Coupon</span>
                  <span>{order.coupon.code || "Applied"}</span>
                </div>
              )}
              <Separator className="my-2" />
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>Rs {(order.total || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Shipping Address */}
          <div className="border rounded-xl p-6 bg-card">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Shipping Address
            </h2>
            <div className="text-sm space-y-1">
              <p className="font-medium">{order.shippingAddress?.fullName}</p>
              <p className="text-muted-foreground">{order.shippingAddress?.address1}</p>
              {order.shippingAddress?.address2 && (
                <p className="text-muted-foreground">{order.shippingAddress.address2}</p>
              )}
              <p className="text-muted-foreground">
                {order.shippingAddress?.city}, {order.shippingAddress?.state}{" "}
                {order.shippingAddress?.postalCode}
              </p>
              <p className="text-muted-foreground">{order.shippingAddress?.country}</p>
              {order.shippingAddress?.phone && (
                <p className="text-muted-foreground flex items-center gap-1 mt-2">
                  <Phone className="h-3.5 w-3.5" />
                  {order.shippingAddress.phone}
                </p>
              )}
            </div>
          </div>

          {/* Payment Info */}
          <div className="border rounded-xl p-6 bg-card">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Payment
            </h2>
            <div className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Method</span>
                <span className="capitalize font-medium">{PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <span className={`capitalize font-medium ${order.paymentStatus === "paid" ? "text-emerald-600" : order.paymentStatus === "failed" ? "text-red-600" : "text-amber-600"}`}>
                  {order.paymentStatus}
                </span>
              </div>
              {order.trackingNumber && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tracking</span>
                  <span className="font-mono text-xs">{order.trackingNumber}</span>
                </div>
              )}
              {order.shippingCarrier && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Carrier</span>
                  <span className="capitalize">{order.shippingCarrier}</span>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {order.notes && (
            <div className="border rounded-xl p-6 bg-card">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <StickyNote className="h-4 w-4" />
                Notes
              </h2>
              <p className="text-sm text-muted-foreground">{order.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
