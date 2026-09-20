"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Minus, Plus, PackageSearch, AlertTriangle } from "lucide-react";

export default function ManageStockPage() {
  const queryClient = useQueryClient();
  const [qtyInputs, setQtyInputs] = useState<Record<string, number>>({});

  const { data: products, isLoading } = useQuery({
    queryKey: ["manage-stock-products"],
    queryFn: () =>
      api
        .get("/products?limit=100&sort=name")
        .then((res) => res.data.data.data ?? []),
  });

  const adjustMutation = useMutation({
    mutationFn: (data: {
      productId: string;
      variantId?: string;
      quantity: number;
    }) =>
      api.post("/inventory/update-stock", {
        productId: data.productId,
        variantId: data.variantId,
        quantity: data.quantity,
        type: data.quantity >= 0 ? "restock" : "adjustment",
        notes: "Manual stock adjustment (Manage Stock)",
      }),
    onSuccess: (res: any) => {
      toast.success(
        `Stock updated: ${res.data.data.previousStock} -> ${res.data.data.newStock}`
      );
      queryClient.invalidateQueries({ queryKey: ["manage-stock-products"] });
      queryClient.invalidateQueries({ queryKey: ["admin-inventory"] });
      queryClient.invalidateQueries({ queryKey: ["admin-low-stock"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to update stock");
    },
  });

  const adjust = (
    productId: string,
    variantId: string | undefined,
    currentStock: number,
    delta: number | null
  ) => {
    const key = variantId || productId;
    const qty = delta !== null ? Math.abs(delta) : Math.abs(qtyInputs[key] || 0);
    if (qty === 0) {
      toast.error("Enter a quantity first");
      return;
    }
    adjustMutation.mutate({
      productId,
      variantId,
      quantity: delta === null ? qtyInputs[key] || 0 : delta,
    });
  };

  const totalStock = (p: any) =>
    p.variants?.length > 0
      ? p.variants.reduce((s: number, v: any) => s + (v.stock || 0), 0)
      : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Manage Stock</h1>
        <p className="text-muted-foreground mt-1">
          Add or remove stock for each product variant using the + / - controls.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {(products || []).map((p: any) => {
            const stock = totalStock(p);
            const low = stock < 5;
            return (
              <Card key={p._id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <PackageSearch className="h-8 w-8 text-gold shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium truncate">{p.name}</p>
                        <p className="text-xs text-muted-foreground">SKU: {p.sku}</p>
                      </div>
                    </div>
                    <div
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold ${
                        low
                          ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                          : "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400"
                      }`}
                    >
                      {low && <AlertTriangle className="h-4 w-4" />}
                      Stock: {stock}
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    {(p.variants || []).map((v: any) => {
                      const key = v._id?.toString() || `${p._id}-${v.size}-${v.color}`;
                      const label = [v.size && `Size ${v.size}`, v.color]
                        .filter(Boolean)
                        .join(" / ") || "Default";
                      return (
                        <div
                          key={key}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/50 px-3 py-2"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium">{label}</span>
                            <span
                              className={`text-sm font-semibold ${
                                (v.stock || 0) < 5 ? "text-red-600" : "text-foreground"
                              }`}
                            >
                              {v.stock || 0} in stock
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              disabled={adjustMutation.isPending}
                              onClick={() =>
                                adjust(p._id, v._id?.toString(), v.stock || 0, -1)
                              }
                              title="Remove 1"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </Button>
                            <Input
                              type="number"
                              className="w-20 h-8 text-center"
                              placeholder="Qty"
                              value={qtyInputs[key] ?? ""}
                              onChange={(e) =>
                                setQtyInputs({
                                  ...qtyInputs,
                                  [key]: parseInt(e.target.value) || 0,
                                })
                              }
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-2 text-red-600 hover:text-red-700 hover:border-red-300"
                              disabled={adjustMutation.isPending}
                              onClick={() =>
                                adjust(p._id, v._id?.toString(), v.stock || 0, null)
                              }
                              title="Remove entered quantity"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-2 text-green-700 hover:text-green-800 hover:border-green-300"
                              disabled={adjustMutation.isPending}
                              onClick={() => {
                                const key2 = v._id?.toString();
                                const q = qtyInputs[key2] || 0;
                                if (q === 0) {
                                  toast.error("Enter a quantity first");
                                  return;
                                }
                                adjustMutation.mutate({
                                  productId: p._id,
                                  variantId: v._id?.toString(),
                                  quantity: q,
                                });
                              }}
                              title="Add entered quantity"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              disabled={adjustMutation.isPending}
                              onClick={() =>
                                adjust(p._id, v._id?.toString(), v.stock || 0, 1)
                              }
                              title="Add 1"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                    {(!p.variants || p.variants.length === 0) && (
                      <p className="text-sm text-muted-foreground px-3 py-2">
                        No variants — add variants in the product editor to manage stock.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}