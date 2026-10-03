"use client";
// Render on demand - skip static generation so a sleeping backend cannot crash the build.
export const dynamic = "force-dynamic";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ChevronRight,
  ChevronDown,
  Minus,
  Plus,
  PackageSearch,
  AlertTriangle,
  History,
  Search,
  ArrowDown,
  ArrowUp,
  RotateCcw,
  ShoppingCart,
  User,
} from "lucide-react";
import { format } from "date-fns";

export default function ManageStockPage() {
  const queryClient = useQueryClient();
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"stock" | "history">("stock");
  const [search, setSearch] = useState("");
  const [editVariant, setEditVariant] = useState<{
    productId: string;
    variantId: string;
    label: string;
    currentStock: number;
  } | null>(null);
  const [editQty, setEditQty] = useState<number>(0);
  const [editNotes, setEditNotes] = useState("");
  const [historyFilter, setHistoryFilter] = useState<string>("");

  const { data: products, isLoading } = useQuery({
    queryKey: ["manage-stock-products"],
    queryFn: () =>
      api
        .get("/products?limit=500&sort=name")
        .then((res) => res.data.data.data ?? []),
  });

  const { data: movements, isLoading: movementsLoading } = useQuery({
    queryKey: ["admin-movements", historyFilter],
    queryFn: () => {
      const params = new URLSearchParams({ limit: "100", sort: "-createdAt" });
      if (historyFilter) params.set("productId", historyFilter);
      return api.get(`/inventory/movements?${params}`).then((res) => res.data.data.data ?? []);
    },
    enabled: activeTab === "history",
  });

  const adjustMutation = useMutation({
    mutationFn: (data: {
      productId: string;
      variantId?: string;
      quantity: number;
      type: string;
      notes: string;
    }) =>
      api.post("/inventory/update-stock", {
        productId: data.productId,
        variantId: data.variantId,
        quantity: data.quantity,
        type: data.type,
        notes: data.notes,
      }),
    onSuccess: (res: any) => {
      toast.success(`Stock updated: ${res.data.data.previousStock} → ${res.data.data.newStock}`);
      queryClient.invalidateQueries({ queryKey: ["manage-stock-products"] });
      queryClient.invalidateQueries({ queryKey: ["admin-movements"] });
      queryClient.invalidateQueries({ queryKey: ["admin-inventory"] });
      queryClient.invalidateQueries({ queryKey: ["admin-low-stock"] });
      setEditVariant(null);
      setEditQty(0);
      setEditNotes("");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to update stock");
    },
  });

  const totalStock = (p: any) =>
    p.variants?.length > 0
      ? p.variants.reduce((s: number, v: any) => s + (v.stock || 0), 0)
      : 0;

  const filteredProducts = (products || []).filter((p: any) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku?.toLowerCase().includes(search.toLowerCase())
  );

  const handleQuickAdjust = (
    productId: string,
    variantId: string,
    delta: number
  ) => {
    adjustMutation.mutate({
      productId,
      variantId,
      quantity: delta,
      type: delta > 0 ? "purchase" : "adjustment",
      notes: delta > 0 ? "Quick stock add" : "Quick stock remove",
    });
  };

  const handleEditSubmit = () => {
    if (!editVariant || editQty === 0) {
      toast.error("Enter a valid quantity");
      return;
    }
    adjustMutation.mutate({
      productId: editVariant.productId,
      variantId: editVariant.variantId,
      quantity: editQty,
      type: editQty > 0 ? "purchase" : "adjustment",
      notes: editNotes || (editQty > 0 ? "Stock added" : "Stock removed"),
    });
  };

  const movementIcon = (type: string) => {
    switch (type) {
      case "purchase":
        return <ArrowDown className="h-4 w-4 text-green-600" />;
      case "sale":
        return <ShoppingCart className="h-4 w-4 text-blue-600" />;
      case "return":
        return <RotateCcw className="h-4 w-4 text-orange-600" />;
      default:
        return <ArrowUp className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Manage Stock</h1>
          <p className="text-muted-foreground mt-1">
            Click on a product to expand variants. Add or remove stock easily.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={activeTab === "stock" ? "default" : "outline"}
            onClick={() => setActiveTab("stock")}
          >
            <PackageSearch className="h-4 w-4 mr-2" />
            Stock
          </Button>
          <Button
            variant={activeTab === "history" ? "default" : "outline"}
            onClick={() => setActiveTab("history")}
          >
            <History className="h-4 w-4 mr-2" />
            History
          </Button>
        </div>
      </div>

      {activeTab === "stock" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Product List */}
          <div className="lg:col-span-1 space-y-2">
            <div className="relative">
              <Input
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-9"
              />
              <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
            </div>

            <div className="space-y-1 max-h-[calc(100vh-220px)] overflow-y-auto">
              {isLoading ? (
                [...Array(8)].map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)
              ) : (
                filteredProducts.map((p: any) => {
                  const stock = totalStock(p);
                  const isExpanded = expandedProduct === p._id;
                  const isLow = stock < 5;
                  const isOut = stock === 0;
                  return (
                    <div key={p._id}>
                      <button
                        onClick={() =>
                          setExpandedProduct(isExpanded ? null : p._id)
                        }
                        className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                          isExpanded
                            ? "bg-primary/10 border border-primary/20"
                            : "hover:bg-muted/50 border border-transparent"
                        }`}
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 shrink-0 text-primary" />
                        ) : (
                          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{p.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {p.variants?.length || 0} variant{(p.variants?.length || 0) !== 1 ? "s" : ""}
                          </p>
                        </div>
                        <Badge
                          variant={isOut ? "destructive" : isLow ? "secondary" : "default"}
                          className="shrink-0"
                        >
                          {isLow && !isOut && <AlertTriangle className="h-3 w-3 mr-1" />}
                          {stock}
                        </Badge>
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right: Variant Details */}
          <div className="lg:col-span-2">
            {expandedProduct ? (
              (() => {
                const product = (products || []).find((p: any) => p._id === expandedProduct);
                if (!product) return null;
                const stock = totalStock(product);
                return (
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg">{product.name}</CardTitle>
                          <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
                        </div>
                        <div
                          className={`px-3 py-1.5 rounded-full text-sm font-semibold ${
                            stock === 0
                              ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                              : stock < 5
                              ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400"
                              : "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400"
                          }`}
                        >
                          Total Stock: {stock}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {product.variants?.length > 0 ? (
                        product.variants.map((v: any) => {
                          const label = [v.size && `Size ${v.size}`, v.color]
                            .filter(Boolean)
                            .join(" / ") || "Default";
                          const vStock = v.stock || 0;
                          const isLow = vStock < 5;
                          return (
                            <div
                              key={v._id}
                              className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-medium min-w-[100px]">{label}</span>
                                <span
                                  className={`text-sm font-bold ${
                                    isLow ? "text-red-600" : "text-foreground"
                                  }`}
                                >
                                  {vStock} in stock
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8"
                                  disabled={adjustMutation.isPending}
                                  onClick={() => handleQuickAdjust(product._id, v._id, -1)}
                                  title="Remove 1"
                                >
                                  <Minus className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8"
                                  disabled={adjustMutation.isPending}
                                  onClick={() => handleQuickAdjust(product._id, v._id, 1)}
                                  title="Add 1"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 px-2"
                                  onClick={() => {
                                    setEditVariant({
                                      productId: product._id,
                                      variantId: v._id,
                                      label,
                                      currentStock: vStock,
                                    });
                                    setEditQty(0);
                                    setEditNotes("");
                                  }}
                                >
                                  Edit
                                </Button>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No variants — add variants in the product editor.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })()
            ) : (
              <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
                <PackageSearch className="h-12 w-12 mb-3" />
                <p className="text-lg font-medium">Select a product</p>
                <p className="text-sm">Click on a product from the left to manage its stock</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* History Tab */
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Input
                placeholder="Filter by product name..."
                value={historyFilter}
                onChange={(e) => setHistoryFilter(e.target.value)}
              />
            </div>
            {historyFilter && (
              <Button variant="ghost" size="sm" onClick={() => setHistoryFilter("")}>
                Clear
              </Button>
            )}
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium">Type</th>
                      <th className="text-left p-3 font-medium">Product</th>
                      <th className="text-left p-3 font-medium">Variant</th>
                      <th className="text-left p-3 font-medium">Qty</th>
                      <th className="text-left p-3 font-medium">Stock Change</th>
                      <th className="text-left p-3 font-medium">Notes</th>
                      <th className="text-left p-3 font-medium">By</th>
                      <th className="text-left p-3 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movementsLoading ? (
                      [...Array(5)].map((_, i) => (
                        <tr key={i}>
                          <td colSpan={8} className="p-3">
                            <Skeleton className="h-8" />
                          </td>
                        </tr>
                      ))
                    ) : (movements || []).length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-6 text-center text-muted-foreground">
                          No stock movements found
                        </td>
                      </tr>
                    ) : (
                      (movements || []).map((m: any) => (
                        <tr key={m._id} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              {movementIcon(m.type)}
                              <Badge variant="outline" className="capitalize">
                                {m.type}
                              </Badge>
                            </div>
                          </td>
                          <td className="p-3 font-medium">{m.product?.name || "—"}</td>
                          <td className="p-3 text-muted-foreground">
                            {m.variantDetails?.size ? `Size ${m.variantDetails.size}` : ""}
                            {m.variantDetails?.color ? ` / ${m.variantDetails.color}` : ""}
                            {!m.variantDetails && "—"}
                          </td>
                          <td className="p-3">
                            <span
                              className={`font-semibold ${
                                m.type === "purchase" || m.type === "return"
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              {m.type === "purchase" || m.type === "return" ? "+" : "-"}
                              {m.quantity}
                            </span>
                          </td>
                          <td className="p-3 text-muted-foreground">
                            {m.previousStock} → {m.newStock}
                          </td>
                          <td className="p-3 text-muted-foreground max-w-[200px] truncate">
                            {m.notes || "—"}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                                <User className="h-3 w-3" />
                              </div>
                              <div>
                                <p className="text-sm font-medium">{m.performedBy?.name || "System"}</p>
                                <Badge
                                  variant={m.performedBy?.role === "super-admin" || m.performedBy?.role === "admin" ? "default" : "secondary"}
                                  className="text-xs mt-0.5"
                                >
                                  {m.performedBy?.role === "super-admin" || m.performedBy?.role === "admin" ? "Admin" : "Staff"}
                                </Badge>
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-muted-foreground text-xs">
                            {format(new Date(m.createdAt), "MMM dd, yyyy HH:mm")}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Stock Dialog */}
      <Dialog open={!!editVariant} onOpenChange={(v) => { if (!v) setEditVariant(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Stock</DialogTitle>
          </DialogHeader>
          {editVariant && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted p-3">
                <p className="text-sm font-medium">{editVariant.label}</p>
                <p className="text-xs text-muted-foreground">
                  Current Stock: <span className="font-bold">{editVariant.currentStock}</span>
                </p>
              </div>

              <div className="space-y-2">
                <Label>Quantity (use + for add, - for remove)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 10 or -5"
                  value={editQty || ""}
                  onChange={(e) => setEditQty(parseInt(e.target.value) || 0)}
                />
              </div>

              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Input
                  placeholder="e.g. Restocked from supplier"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setEditVariant(null)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  disabled={adjustMutation.isPending || editQty === 0}
                  onClick={handleEditSubmit}
                >
                  {adjustMutation.isPending ? "Saving..." : "Update Stock"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
