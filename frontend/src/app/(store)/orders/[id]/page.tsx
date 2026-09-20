"use client";

import { motion } from "framer-motion";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import Breadcrumb from "@/components/common/breadcrumb";
import { getImageUrl } from "@/lib/utils";
import {
  Package,
  Truck,
  CheckCircle2,
  Clock,
  MapPin,
  CreditCard,
} from "lucide-react";
import { format } from "date-fns";
import Image from "next/image";

const statusSteps = ["pending", "processing", "shipped", "delivered"];

export default function OrderDetailPage() {
  const params = useParams();

  const { data: order, isLoading } = useQuery({
    queryKey: ["order", params.id],
    queryFn: () =>
      api.get(`/orders/${params.id}`).then((res) => res.data.data.order),
  });

  if (isLoading) {
    return (
      <div className="container py-8">
        <Skeleton className="h-8 w-48 mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-64 rounded-xl" />
          </div>
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container py-16 text-center">
        <h1 className="text-2xl font-bold">Order not found</h1>
        <Button asChild className="mt-4">
          <Link href="/orders">View All Orders</Link>
        </Button>
      </div>
    );
  }

  const currentStep = statusSteps.indexOf(order.status);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="container py-8"
    >
      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: "Orders", href: "/orders" },
          { label: `Order #${order.orderNumber}` },
        ]}
      />

      <div className="flex items-center justify-between mt-8 mb-6">
        <div>
          <h1 className="text-3xl font-bold">Order #{order.orderNumber}</h1>
          <p className="text-muted-foreground">
            Placed on {format(new Date(order.createdAt), "MMMM dd, yyyy 'at' h:mm a")}
          </p>
        </div>
        <Badge className="text-lg px-4 py-1 capitalize">{order.status}</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="border rounded-xl p-6">
            <h2 className="font-semibold mb-4">Order Timeline</h2>
            <div className="flex items-center justify-between mb-8">
              {statusSteps.map((step, index) => (
                <div key={step} className="flex flex-col items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      index <= currentStep
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {index < currentStep ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : index === currentStep ? (
                      <Truck className="h-5 w-5" />
                    ) : (
                      <Clock className="h-5 w-5" />
                    )}
                  </div>
                  <span className="text-xs mt-2 capitalize">{step}</span>
                  {index < statusSteps.length - 1 && (
                    <div
                      className={`h-0.5 w-full mt-5 ${
                        index < currentStep ? "bg-primary" : "bg-muted"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="border rounded-xl p-6">
            <h2 className="font-semibold mb-4">Order Items</h2>
            <div className="space-y-4">
              {order.items?.map((item: any) => (
                <div
                  key={item._id}
                  className="flex gap-4 py-3 border-b last:border-0"
                >
                  <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-muted shrink-0">
                    <Image
                      src={item.product?.images?.[0] ? getImageUrl(item.product.images[0]) : getImageUrl(item.image || "")}
                      alt={item.product?.name || "Product"}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium">{item.product?.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      Size: {item.size} | Color: {item.color}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Qty: {item.quantity} x Rs {item.price.toLocaleString()}
                    </p>
                  </div>
                  <span className="font-medium">
                    Rs {(item.price * item.quantity).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="border rounded-xl p-6">
            <h2 className="font-semibold mb-4">Order Summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>Rs {order.subtotal?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span>{order.shipping ? `Rs ${order.shipping.toLocaleString()}` : "Free"}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span>- Rs {order.discount?.toLocaleString()}</span>
                </div>
              )}
              <Separator className="my-2" />
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>Rs {order.total?.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="border rounded-xl p-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Shipping Address
            </h2>
            <div className="text-sm text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">
                {order.shippingAddress?.fullName}
              </p>
              <p>{order.shippingAddress?.address1}</p>
              {order.shippingAddress?.address2 && <p>{order.shippingAddress.address2}</p>}
              <p>
                {order.shippingAddress?.city}, {order.shippingAddress?.state}{" "}
                {order.shippingAddress?.postalCode}
              </p>
              <p>{order.shippingAddress?.country}</p>
              <p>{order.shippingAddress?.phone}</p>
            </div>
          </div>

          <div className="border rounded-xl p-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Payment Info
            </h2>
            <div className="text-sm text-muted-foreground space-y-1">
              <p className="capitalize">Method: {order.paymentMethod}</p>
              <p className="capitalize">Status: {order.paymentStatus}</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
