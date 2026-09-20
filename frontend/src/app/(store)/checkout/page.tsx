"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import OrderSummary from "@/components/checkout/order-summary";
import Breadcrumb from "@/components/common/breadcrumb";
import EmptyState from "@/components/common/empty-state";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, CreditCard, Banknote, ArrowLeft, ArrowRight, Check, ShoppingBag, PartyPopper } from "lucide-react";
import { useCartStore } from "@/stores/cart-store";

const addressSchema = z.object({
  fullName: z.string().min(2, "Name is required"),
  email: z.string().email("Valid email required").optional().or(z.literal("")),
  phone: z.string().min(10, "Valid phone number required"),
  address: z.string().min(5, "Address is required"),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  zipCode: z.string().min(3, "Postal code is required"),
  country: z.string().min(2, "Country is required"),
});

type AddressFormData = z.infer<typeof addressSchema>;

export default function CheckoutPage() {
  const { items, clearCart } = useCartStore();
  const [step, setStep] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<string>("cod");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderResult, setOrderResult] = useState<{ orderNumber: string; total: number } | null>(null);

  const subtotal = items.reduce((t, i) => t + (i.price || 0) * (i.quantity || 0), 0);
  const shipping = 0; // Shipping is free
  const total = Math.max(0, Math.round((subtotal + shipping) * 100) / 100);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
    defaultValues: { country: "Pakistan" },
  });

  const placeOrder = async (data: AddressFormData) => {
    setIsSubmitting(true);
    try {
      const response = await api.post("/orders/guest", {
        items: items.map((i) => ({
          productId: i.product?._id,
          variantId: i.variantId,
          quantity: i.quantity,
        })),
        shippingAddress: {
          fullName: data.fullName,
          phone: data.phone,
          address1: data.address,
          city: data.city,
          state: data.state,
          postalCode: data.zipCode,
          country: data.country,
        },
        paymentMethod,
        guestEmail: data.email || undefined,
      });
      const order = response.data.data.order;
      setOrderResult({ orderNumber: order.orderNumber, total: order.total });
      clearCart();
      toast.success("Order placed successfully!");
    } catch (error: any) {
      toast.error("Error", {
        description: error.response?.data?.error || error.response?.data?.message || "Failed to place order",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmitAddress = () => setStep(2);

  if (orderResult) {
    return (
      <div className="container py-16 flex flex-col items-center text-center gap-5">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="h-20 w-20 rounded-full bg-gold/15 flex items-center justify-center"
        >
          <PartyPopper className="h-10 w-10 text-gold-dark" />
        </motion.div>
        <h1 className="text-3xl font-bold">Order Placed Successfully!</h1>
        <p className="text-muted-foreground max-w-md">
          Thank you for shopping with us. Your order has been received and is
          being processed.
        </p>
        <div className="rounded-xl border bg-card p-5 w-full max-w-sm space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Order Number</span>
            <span className="font-bold">{orderResult.orderNumber}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total</span>
            <span className="font-bold text-gold-dark">Rs {orderResult.total.toLocaleString()}</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground max-w-sm">
          Save your order number — you can use it to track your order status.
        </p>
        <Button asChild className="bg-gold hover:bg-gold-dark text-white">
          <Link href="/products">Continue Shopping</Link>
        </Button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container py-16">
        <EmptyState
          icon={<ShoppingBag className="h-12 w-12" />}
          title="Your cart is empty"
          description="Add some products before checking out."
          action={
            <Button asChild>
              <Link href="/products">Start Shopping</Link>
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
        items={[{ label: "Home", href: "/" }, { label: "Checkout" }]}
      />

      <h1 className="text-3xl font-bold mt-8 mb-2">Checkout</h1>
      <p className="text-muted-foreground mb-8 flex items-center gap-2">
        <Check className="h-4 w-4 text-green-600" />
        No account needed — checkout as a guest
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {step === 1 && (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
              <Card>
                <CardHeader>
                  <CardTitle>Shipping Address</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit(onSubmitAddress)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Full Name</Label>
                        <Input {...register("fullName")} placeholder="Your name" />
                        {errors.fullName && <p className="text-sm text-destructive">{errors.fullName.message}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label>Phone</Label>
                        <Input {...register("phone")} placeholder="03XX XXXXXXX" />
                        {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Email (optional — for order updates)</Label>
                      <Input type="email" {...register("email")} placeholder="you@example.com" />
                      {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label>Street Address</Label>
                      <Input {...register("address")} placeholder="House #, street, area" />
                      {errors.address && <p className="text-sm text-destructive">{errors.address.message}</p>}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label>City</Label>
                        <Input {...register("city")} />
                        {errors.city && <p className="text-sm text-destructive">{errors.city.message}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label>State</Label>
                        <Input {...register("state")} />
                        {errors.state && <p className="text-sm text-destructive">{errors.state.message}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label>Postal Code</Label>
                        <Input {...register("zipCode")} />
                        {errors.zipCode && <p className="text-sm text-destructive">{errors.zipCode.message}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label>Country</Label>
                        <Input {...register("country")} />
                        {errors.country && <p className="text-sm text-destructive">{errors.country.message}</p>}
                      </div>
                    </div>
                    <Button type="submit" className="w-full bg-gold hover:bg-gold-dark text-white">
                      Continue to Payment
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
              <Card>
                <CardHeader>
                  <CardTitle>Payment Method</CardTitle>
                </CardHeader>
                <CardContent>
                  <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-3">
                    <div className={`flex items-center gap-3 rounded-lg border p-4 cursor-pointer ${paymentMethod === "cod" ? "border-gold bg-gold/5" : ""}`}>
                      <RadioGroupItem value="cod" id="cod" />
                      <Banknote className="h-5 w-5 text-gold-dark" />
                      <div>
                        <Label htmlFor="cod" className="font-medium cursor-pointer">Cash on Delivery</Label>
                        <p className="text-xs text-muted-foreground">Pay when you receive your order</p>
                      </div>
                    </div>
                    <div className={`flex items-center gap-3 rounded-lg border p-4 cursor-pointer ${paymentMethod === "card" ? "border-gold bg-gold/5" : ""}`}>
                      <RadioGroupItem value="card" id="card" />
                      <CreditCard className="h-5 w-5 text-gold-dark" />
                      <div>
                        <Label htmlFor="card" className="font-medium cursor-pointer">Credit / Debit Card</Label>
                        <p className="text-xs text-muted-foreground">Secure online payment</p>
                      </div>
                    </div>
                  </RadioGroup>
                  <div className="flex gap-4 mt-6">
                    <Button variant="outline" onClick={() => setStep(1)}>
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back
                    </Button>
                    <Button className="flex-1 bg-gold hover:bg-gold-dark text-white" onClick={() => setStep(3)}>
                      Review Order
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
              <Card>
                <CardHeader>
                  <CardTitle>Review Order</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="font-medium mb-2">Shipping Address</h3>
                    <p className="text-sm text-muted-foreground">
                      {getValues("fullName")}, {getValues("phone")}<br />
                      {getValues("address")}, {getValues("city")}, {getValues("state")} {getValues("zipCode")}, {getValues("country")}
                    </p>
                  </div>
                  <Separator />
                  <div>
                    <h3 className="font-medium mb-2">Payment Method</h3>
                    <p className="text-sm text-muted-foreground capitalize">
                      {paymentMethod === "card" ? "Credit/Debit Card" : "Cash on Delivery"}
                    </p>
                  </div>
                  <Separator />
                  <div>
                    <h3 className="font-medium mb-2">Order Items</h3>
                    {items.map((item) => (
                      <div key={item._id} className="flex justify-between text-sm py-2">
                        <span>
                          {item.product?.name} x {item.quantity}
                        </span>
                        <span>Rs {((item.price || 0) * (item.quantity || 0)).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-4">
                    <Button variant="outline" onClick={() => setStep(2)}>
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back
                    </Button>
                    <Button
                      className="flex-1 bg-gold hover:bg-gold-dark text-white"
                      onClick={handleSubmit(placeOrder)}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Placing Order...
                        </>
                      ) : (
                        "Place Order"
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>

        <div>
          <OrderSummary
            subtotal={subtotal}
            discount={0}
            shipping={shipping}
            total={total}
          />
        </div>
      </div>
    </motion.div>
  );
}
