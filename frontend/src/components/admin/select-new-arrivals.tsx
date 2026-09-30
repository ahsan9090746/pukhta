"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Sparkles, Search, X, Trash2, Plus } from "lucide-react";
import Image from "next/image";
import { getImageUrl } from "@/lib/utils";

interface ProductRow {
  _id: string;
  name: string;
  sku: string;
  price: number;
  images: string[];
}

export default function SelectNewArrivals() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Fetch all products (for right side list)
  const { data: products, isLoading } = useQuery({
    queryKey: ["admin-products-new-arrivals", search, page],
    queryFn: () =>
      api
        .get(`/products?search=${search}&page=${page}&limit=12`)
        .then((res) => res.data.data),
    enabled: open,
  });

  // Fetch current new arrivals (for left side)
  const { data: newArrivals, isLoading: loadingNew } = useQuery({
    queryKey: ["admin-new-arrivals-list"],
    queryFn: () =>
      api
        .get("/products/new-arrivals?limit=100")
        // This endpoint returns the list under `data` (not `products`).
        .then((res) => res.data.data.data ?? res.data.data.products ?? []),
    enabled: open,
  });

  const addMutation = useMutation({
    mutationFn: (productIds: string[]) =>
      api.patch("/products/new-arrivals", { productIds, isNewArrival: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-new-arrivals-list"] });
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      toast.success("Products added as New Arrivals");
    },
    onError: () => toast.error("Failed to add products"),
  });

  const removeMutation = useMutation({
    mutationFn: (productIds: string[]) =>
      api.patch("/products/new-arrivals", { productIds, isNewArrival: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-new-arrivals-list"] });
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      toast.success("Products removed from New Arrivals");
    },
    onError: () => toast.error("Failed to remove products"),
  });

  const clearAllMutation = useMutation({
    mutationFn: (productIds: string[]) =>
      api.patch("/products/new-arrivals", { productIds, isNewArrival: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-new-arrivals-list"] });
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      toast.success("All New Arrivals cleared");
    },
    onError: () => toast.error("Failed to clear New Arrivals"),
  });

  const handleAdd = (productId: string) => {
    addMutation.mutate([productId]);
  };

  const handleRemove = (productId: string) => {
    removeMutation.mutate([productId]);
  };

  const handleClearAll = () => {
    if (!newArrivals || newArrivals.length === 0) return;
    const ids = newArrivals.map((p: ProductRow) => p._id);
    clearAllMutation.mutate(ids);
  };

  const rows: ProductRow[] = products?.data || [];
  const currentIds = new Set((newArrivals || []).map((p: ProductRow) => p._id));

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) {
          setSearch("");
          setPage(1);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <Sparkles className="h-4 w-4 mr-2" />
          Select New Arrivals
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle>Select New Arrivals</DialogTitle>
          <DialogDescription>
            Click a product on the right to add it. Click remove on the left to take it out.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Left Panel - Selected New Arrivals */}
          <div className="w-1/2 border-r flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
              <span className="text-sm font-medium">
                New Arrivals ({newArrivals?.length || 0})
              </span>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleClearAll}
                disabled={clearAllMutation.isPending || !newArrivals || newArrivals.length === 0}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                Clear All
              </Button>
            </div>
            <div className="flex-1 overflow-auto p-2">
              {loadingNew ? (
                <div className="space-y-2">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-lg" />
                  ))}
                </div>
              ) : !newArrivals || newArrivals.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <Sparkles className="h-8 w-8 mb-2 opacity-30" />
                  <p className="text-sm">No New Arrivals yet</p>
                  <p className="text-xs">Click products on the right to add</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {newArrivals.map((product: ProductRow) => (
                    <div
                      key={product._id}
                      className="flex items-center gap-3 p-2 rounded-lg bg-background border hover:shadow-sm transition-shadow"
                    >
                      <div className="relative w-10 h-10 rounded overflow-hidden shrink-0">
                        <Image
                          src={
                            product.images?.[0]
                              ? getImageUrl(product.images[0])
                              : "/placeholder.png"
                          }
                          alt={product.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{product.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Rs {(product.price || 0).toLocaleString()}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleRemove(product._id)}
                        disabled={removeMutation.isPending}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - All Products */}
          <div className="w-1/2 flex flex-col">
            <div className="px-4 py-3 border-b bg-muted/30">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-9 h-9"
                />
              </div>
            </div>
            <div className="flex-1 overflow-auto p-2">
              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-lg" />
                  ))}
                </div>
              ) : rows.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <p className="text-sm">No products found</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {rows.map((product: ProductRow) => {
                    const isAdded = currentIds.has(product._id);
                    return (
                      <div
                        key={product._id}
                        className="flex items-center gap-3 p-2 rounded-lg border hover:shadow-sm transition-shadow"
                      >
                        <div className="relative w-10 h-10 rounded overflow-hidden shrink-0">
                          <Image
                            src={
                              product.images?.[0]
                                ? getImageUrl(product.images[0])
                                : "/placeholder.png"
                            }
                            alt={product.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{product.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Rs {(product.price || 0).toLocaleString()}
                          </p>
                        </div>
                        {isAdded ? (
                          <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full shrink-0">
                            Added
                          </span>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="shrink-0 h-8 w-8 text-green-600 hover:text-green-700"
                            onClick={() => handleAdd(product._id)}
                            disabled={addMutation.isPending}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {products?.pagination?.pages > 1 && (
              <div className="flex items-center justify-between px-4 py-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <span className="text-xs text-muted-foreground">
                  Page {page} of {products.pagination.pages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPage((p) => Math.min(products.pagination.pages, p + 1))
                  }
                  disabled={page === products.pagination.pages}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
