"use client";
// Render on demand - skip static generation so a sleeping backend cannot crash the build.
export const dynamic = "force-dynamic";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { getImageUrl } from "@/lib/utils";
import {
  ArrowLeft,
  Package,
  Edit,
  Trash2,
  Star,
  Tag,
  Sparkles,
  Layers,
  Hash,
  DollarSign,
  Box,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Image as ImageIcon,
} from "lucide-react";
import { format } from "date-fns";
import Image from "next/image";
import { isRichText, sanitizeRichText } from "@/lib/rich-text";

export default function AdminProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedImage, setSelectedImage] = useState(0);

  const { data: product, isLoading } = useQuery({
    queryKey: ["admin-product", params.id],
    queryFn: () =>
      api.get(`/products/${params.id}`).then((res) => res.data.data.product),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      toast.success("Product deleted");
      router.push("/admin9090746/products");
    },
    onError: () => toast.error("Failed to delete product"),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-80 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Package className="h-16 w-16 text-muted-foreground" />
        <h1 className="text-2xl font-bold">Product not found</h1>
        <Button asChild variant="outline">
          <Link href="/admin9090746/products">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Products
          </Link>
        </Button>
      </div>
    );
  }

  const totalStock = product.variants?.reduce((sum: number, v: any) => sum + (v.stock || 0), 0) || 0;
  const hasDiscount = product.compareAtPrice && product.compareAtPrice > product.price;
  const discountPercent = hasDiscount
    ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
    : 0;

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
              <h1 className="text-2xl font-bold tracking-tight">{product.name}</h1>
              <Badge variant={product.isActive ? "default" : "secondary"}>
                {product.isActive ? "Active" : "Inactive"}
              </Badge>
              {product.isFeatured && (
                <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                  <Star className="h-3 w-3 mr-1" />
                  Featured
                </Badge>
              )}
              {product.isNewArrival && (
                <Badge className="bg-green-100 text-green-700 border-green-200">
                  <Sparkles className="h-3 w-3 mr-1" />
                  New Arrival
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              SKU: {product.slug}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/admin9090746/products/${product._id}/edit`}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
            onClick={() => {
              if (confirm(`Delete "${product.name}"? This action cannot be undone.`)) {
                deleteMutation.mutate(product._id);
              }
            }}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Images */}
          <div className="border rounded-xl p-6 bg-card">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              Images ({product.images?.length || 0})
            </h2>
            {product.images?.length > 0 ? (
              <div className="space-y-4">
                <div className="relative aspect-square max-h-80 rounded-lg overflow-hidden bg-muted">
                  <Image
                    src={getImageUrl(product.images[selectedImage] || product.images[0])}
                    alt={product.name}
                    fill
                    className="object-contain"
                  />
                  {hasDiscount && (
                    <Badge className="absolute top-3 left-3 bg-red-500 text-white">
                      -{discountPercent}%
                    </Badge>
                  )}
                </div>
                {product.images.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto">
                    {product.images.map((img: string, i: number) => (
                      <button
                        key={i}
                        onClick={() => setSelectedImage(i)}
                        className={`relative w-16 h-16 rounded-lg overflow-hidden shrink-0 border-2 transition-all ${
                          selectedImage === i ? "border-primary" : "border-transparent hover:border-muted-foreground/30"
                        }`}
                      >
                        <Image
                          src={getImageUrl(img)}
                          alt={`${product.name} ${i + 1}`}
                          fill
                          className="object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="h-48 rounded-lg bg-muted flex items-center justify-center">
                <ImageIcon className="h-12 w-12 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Description */}
          <div className="border rounded-xl p-6 bg-card">
            <h2 className="font-semibold mb-4">Description</h2>
            {isRichText(product.description) ? (
              <div
                className="text-sm text-muted-foreground [&_a]:underline [&_h1]:text-base [&_h1]:font-bold [&_h2]:text-base [&_h2]:font-bold [&_h3]:text-sm [&_h3]:font-semibold [&_li]:my-0.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-1.5 [&_ul]:list-disc [&_ul]:pl-5"
                dangerouslySetInnerHTML={{ __html: sanitizeRichText(product.description) }}
              />
            ) : (
              <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                {product.description || "No description provided."}
              </div>
            )}
            {product.shortDescription && (
              <>
                <Separator className="my-4" />
                <h3 className="font-medium text-sm mb-2">Short Description</h3>
                {isRichText(product.shortDescription) ? (
                  <div
                    className="text-sm text-muted-foreground [&_p]:my-1 [&_strong]:font-semibold"
                    dangerouslySetInnerHTML={{ __html: sanitizeRichText(product.shortDescription) }}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">{product.shortDescription}</p>
                )}
              </>
            )}
          </div>

          {/* Variants */}
          {product.variants?.length > 0 && (
            <div className="border rounded-xl p-6 bg-card">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Variants ({product.variants.length})
              </h2>
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted">
                      <th className="text-left px-4 py-2 font-medium">Size</th>
                      <th className="text-left px-4 py-2 font-medium">Color</th>
                      <th className="text-left px-4 py-2 font-medium">SKU</th>
                      <th className="text-right px-4 py-2 font-medium">Stock</th>
                      <th className="text-right px-4 py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {product.variants.map((v: any, i: number) => (
                      <tr key={v._id || i} className="border-t">
                        <td className="px-4 py-2">{v.size || "-"}</td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            {v.color && (
                              <span
                                className="w-3 h-3 rounded-full border"
                                style={{ backgroundColor: v.color }}
                              />
                            )}
                            {v.color || "-"}
                          </div>
                        </td>
                        <td className="px-4 py-2 font-mono text-xs">{v.sku || "-"}</td>
                        <td className="px-4 py-2 text-right font-medium">{v.stock}</td>
                        <td className="px-4 py-2 text-right">
                          {v.stock > 0 ? (
                            <span className="text-emerald-600 text-xs font-medium">In Stock</span>
                          ) : (
                            <span className="text-red-600 text-xs font-medium">Out of Stock</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tags */}
          {product.tags?.length > 0 && (
            <div className="border rounded-xl p-6 bg-card">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Tags
              </h2>
              <div className="flex flex-wrap gap-2">
                {product.tags.map((tag: string, i: number) => (
                  <Badge key={i} variant="secondary">{tag}</Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Pricing */}
          <div className="border rounded-xl p-6 bg-card">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Pricing
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-sm">Price</span>
                <span className="text-xl font-bold">Rs {product.price?.toLocaleString()}</span>
              </div>
              {hasDiscount && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground text-sm">Compare at</span>
                    <span className="text-sm line-through text-muted-foreground">
                      Rs {product.compareAtPrice?.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-emerald-600 text-sm font-medium">You save</span>
                    <span className="text-sm font-medium text-emerald-600">
                      Rs {(product.compareAtPrice - product.price).toLocaleString()} ({discountPercent}%)
                    </span>
                  </div>
                </>
              )}
              {product.costPrice > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-sm">Cost Price</span>
                  <span className="text-sm">Rs {product.costPrice?.toLocaleString()}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-sm">Margin</span>
                <span className="text-sm font-medium">
                  {product.costPrice > 0
                    ? `${Math.round(((product.price - product.costPrice) / product.price) * 100)}%`
                    : "-"}
                </span>
              </div>
            </div>
          </div>

          {/* Inventory */}
          <div className="border rounded-xl p-6 bg-card">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <Box className="h-4 w-4" />
              Inventory
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-sm">SKU</span>
                <span className="font-mono text-sm font-medium">{product.sku}</span>
              </div>
              {product.barcode && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-sm">Barcode</span>
                  <span className="font-mono text-sm">{product.barcode}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-sm">Total Stock</span>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold">{totalStock}</span>
                  {totalStock > 0 ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                  )}
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-sm">Variants</span>
                <span className="text-sm font-medium">{product.variants?.length || 0}</span>
              </div>
            </div>
          </div>

          {/* Categories */}
          <div className="border rounded-xl p-6 bg-card">
            <h2 className="font-semibold mb-4">Categories</h2>
            <div className="space-y-2">
              {product.categories && product.categories.length > 0 ? (
                product.categories.map((cat: any) => (
                  <Link
                    key={cat._id}
                    href={`/admin9090746/categories/${cat._id}`}
                    className="inline-flex items-center gap-2 text-sm font-medium hover:underline block"
                  >
                    <Tag className="h-4 w-4" />
                    {cat.name}
                  </Link>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">No categories</span>
              )}
              {product.subcategory && (
                <div className="ml-2 pl-4 border-l border-muted">
                  <p className="text-sm font-medium">{product.subcategory}</p>
                  <span className="text-xs text-muted-foreground">Subcategory</span>
                </div>
              )}
            </div>
          </div>

          {/* Ratings */}
          <div className="border rounded-xl p-6 bg-card">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <Star className="h-4 w-4" />
              Ratings & Reviews
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-sm">Average Rating</span>
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span className="font-bold">{product.averageRating?.toFixed(1) || "0.0"}</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-sm">Total Reviews</span>
                <span className="font-medium">{product.numReviews || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-sm">Sold</span>
                <span className="font-medium">{product.sold || 0}</span>
              </div>
            </div>
          </div>

          {/* SEO */}
          {(product.seoTitle || product.seoDescription) && (
            <div className="border rounded-xl p-6 bg-card">
              <h2 className="font-semibold mb-4">SEO</h2>
              <div className="space-y-2 text-sm">
                {product.seoTitle && (
                  <div>
                    <span className="text-muted-foreground">Title: </span>
                    <span>{product.seoTitle}</span>
                  </div>
                )}
                {product.seoDescription && (
                  <div>
                    <span className="text-muted-foreground">Description: </span>
                    <span>{product.seoDescription}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Text Styling */}
          {(product.textStyling && Object.values(product.textStyling).some((v) => v)) && (
            <div className="border rounded-xl p-6 bg-card">
              <h2 className="font-semibold mb-4">Text Styling</h2>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {product.textStyling.titleFontSize && <div><span className="text-muted-foreground">Title Size:</span> <span className="font-medium">{product.textStyling.titleFontSize}</span></div>}
                {product.textStyling.titleFontWeight && <div><span className="text-muted-foreground">Title Weight:</span> <span className="font-medium">{product.textStyling.titleFontWeight}</span></div>}
                {product.textStyling.titleStyle && <div><span className="text-muted-foreground">Title Style:</span> <span className="font-medium">{product.textStyling.titleStyle}</span></div>}
                {product.textStyling.descFontSize && <div><span className="text-muted-foreground">Desc Size:</span> <span className="font-medium">{product.textStyling.descFontSize}</span></div>}
                {product.textStyling.descFontWeight && <div><span className="text-muted-foreground">Desc Weight:</span> <span className="font-medium">{product.textStyling.descFontWeight}</span></div>}
                {product.textStyling.descStyle && <div><span className="text-muted-foreground">Desc Style:</span> <span className="font-medium">{product.textStyling.descStyle}</span></div>}
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div className="border rounded-xl p-6 bg-card">
            <h2 className="font-semibold mb-4">Info</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{format(new Date(product.createdAt), "MMM dd, yyyy h:mm a")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Updated</span>
                <span>{format(new Date(product.updatedAt), "MMM dd, yyyy h:mm a")}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
