"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

interface CartSummaryProps {
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  coupon?: string;
  onApplyCoupon?: (code: string) => void;
}

export default function CartSummary({
  subtotal,
  discount,
  shipping,
  total,
  coupon,
  onApplyCoupon,
}: CartSummaryProps) {
  const [couponCode, setCouponCode] = useState("");

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (couponCode.trim() && onApplyCoupon) {
      onApplyCoupon(couponCode.trim());
      setCouponCode("");
    }
  };

  return (
    <Card className="sticky top-24">
      <CardHeader>
        <CardTitle>Order Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>Rs {subtotal.toLocaleString()}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Discount</span>
              <span>- Rs {discount.toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Shipping</span>
            <span>{shipping === 0 ? "Free" : `Rs ${shipping.toLocaleString()}`}</span>
          </div>
          <Separator />
          <div className="flex justify-between font-bold text-lg">
            <span>Total</span>
            <span>Rs {total.toLocaleString()}</span>
          </div>
        </div>

        {onApplyCoupon && (
          <form onSubmit={handleApplyCoupon} className="flex gap-2">
            <Input
              placeholder="Coupon code"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
            />
            <Button type="submit" variant="outline">
              Apply
            </Button>
          </form>
        )}

        {coupon && (
          <Badge variant="secondary" className="w-full justify-center">
            Applied: {coupon}
          </Badge>
        )}

        <Button asChild className="w-full" size="lg">
          <Link href="/checkout">Proceed to Checkout</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
