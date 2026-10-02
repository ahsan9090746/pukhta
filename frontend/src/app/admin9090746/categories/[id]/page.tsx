"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { getImageUrl } from "@/lib/utils";
import {
  ArrowLeft,
  FolderOpen,
  Edit,
  Trash2,
  Tag,
  Hash,
  Layers,
  Image as ImageIcon,
} from "lucide-react";
import { format } from "date-fns";
import Image from "next/image";
import { isRichText, sanitizeRichText } from "@/lib/rich-text";

export default function AdminCategoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: category, isLoading } = useQuery({
    queryKey: ["admin-category", params.id],
    queryFn: () =>
      api.get(`/categories/${params.id}`).then((res) => res.data.data.category),
  });

  const { data: productsData } = useQuery({
    queryKey: ["admin-category-products", params.id],
    queryFn: () =>
      api
        .get(`/products?categories=${params.id}&limit=100`)
        .then((res) => res.data.data?.data ?? []),
    enabled: !!params.id,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      toast.success("Category deleted");
      router.push("/admin9090746/categories");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || "Failed to delete category");
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
          </div>
        </div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <FolderOpen className="h-16 w-16 text-muted-foreground" />
        <h1 className="text-2xl font-bold">Category not found</h1>
        <Button asChild variant="outline">
          <Link href="/admin9090746/categories">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Categories
          </Link>
        </Button>
      </div>
    );
  }

  const products = productsData || [];
  const levelLabels = ["Parent", "Child", "Sub-category"];

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
              <h1 className="text-2xl font-bold tracking-tight">{category.name}</h1>
              <Badge variant={category.isActive !== false ? "default" : "secondary"}>
                {category.isActive !== false ? "Active" : "Inactive"}
              </Badge>
              <Badge variant="outline">
                {levelLabels[category.level] || "Category"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Slug: {category.slug}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
            onClick={() => {
              if (confirm(`Delete "${category.name}"? This action cannot be undone.`)) {
                deleteMutation.mutate(category._id);
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
          {/* Image */}
          <div className="border rounded-xl p-6 bg-card">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              Image
            </h2>
            {category.image ? (
              <div className="relative w-full max-w-md aspect-video rounded-lg overflow-hidden bg-muted">
                <Image
                  src={getImageUrl(category.image)}
                  alt={category.name}
                  fill
                  className="object-contain"
                />
              </div>
            ) : (
              <div className="w-full max-w-md aspect-video rounded-lg bg-muted flex items-center justify-center">
                <ImageIcon className="h-12 w-12 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Description */}
          <div className="border rounded-xl p-6 bg-card">
            <h2 className="font-semibold mb-4">Description</h2>
            {isRichText(category.description) ? (
              <div
                className="text-sm text-muted-foreground [&_a]:underline [&_li]:my-0.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-1.5 [&_ul]:list-disc [&_ul]:pl-5"
                dangerouslySetInnerHTML={{ __html: sanitizeRichText(category.description) }}
              />
            ) : (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {category.description || "No description provided."}
              </p>
            )}
          </div>

          {/* Products in this Category */}
          <div className="border rounded-xl p-6 bg-card">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Products in this Category ({products.length})
            </h2>
            {products.length > 0 ? (
              <div className="space-y-3">
                {products.slice(0, 10).map((p: any) => (
                  <Link
                    key={p._id}
                    href={`/admin9090746/products/${p._id}`}
                    className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                  >
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-muted shrink-0">
                      <Image
                        src={p.images?.[0] ? getImageUrl(p.images[0]) : "/placeholder.png"}
                        alt={p.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground">SKU: {p.sku}</p>
                    </div>
                    <span className="font-medium text-sm shrink-0">
                      Rs {p.price?.toLocaleString()}
                    </span>
                  </Link>
                ))}
                {products.length > 10 && (
                  <p className="text-sm text-muted-foreground text-center">
                    And {products.length - 10} more products...
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Tag className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm">No products in this category</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Details */}
          <div className="border rounded-xl p-6 bg-card">
            <h2 className="font-semibold mb-4">Details</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Name</span>
                <span className="font-medium">{category.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Slug</span>
                <span className="font-mono text-xs">{category.slug}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Level</span>
                <span className="font-medium">{levelLabels[category.level] || "Category"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sort Order</span>
                <span className="font-medium">{category.sortOrder || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Products</span>
                <span className="font-medium">{products.length}</span>
              </div>
            </div>
          </div>

          {/* Parent Category */}
          {category.parent && (
            <div className="border rounded-xl p-6 bg-card">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Parent Category
              </h2>
              <Link
                href={`/admin9090746/categories/${category.parent._id || category.parent}`}
                className="inline-flex items-center gap-2 text-sm font-medium hover:underline"
              >
                <FolderOpen className="h-4 w-4" />
                {category.parent.name || category.parent}
              </Link>
            </div>
          )}

          {/* Timestamps */}
          <div className="border rounded-xl p-6 bg-card">
            <h2 className="font-semibold mb-4">Info</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{format(new Date(category.createdAt), "MMM dd, yyyy h:mm a")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Updated</span>
                <span>{format(new Date(category.updatedAt), "MMM dd, yyyy h:mm a")}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
