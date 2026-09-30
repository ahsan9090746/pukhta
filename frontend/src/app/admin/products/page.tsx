"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import DataTable from "@/components/admin/data-table";
import { toast } from "sonner";
import { Plus, Search, Trash2, Edit, Eye } from "lucide-react";
import Image from "next/image";
import { getImageUrl } from "@/lib/utils";
import SelectNewArrivals from "@/components/admin/select-new-arrivals";

export default function AdminProductsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data: products, isLoading } = useQuery({
    queryKey: ["admin-products", search, page],
    queryFn: () =>
      api
        .get(`/products?search=${search}&page=${page}&limit=10`)
        .then((res) => res.data.data),
  });

  const deleteProductMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      toast.success("Product deleted");
    },
  });

  const columns = [
    {
      header: "Image",
      accessorKey: "images",
      cell: (row: any) => (
        <div className="relative w-12 h-12 rounded-lg overflow-hidden">
          <Image
            src={row.images?.[0] ? getImageUrl(row.images[0]) : "/placeholder.png"}
            alt={row.name}
            fill
            className="object-cover"
          />
        </div>
      ),
    },
    {
      header: "Name",
      accessorKey: "name",
      cell: (row: any) => (
        <Link href={`/admin/products/${row._id}`} className="font-medium hover:underline">
          {row.name}
        </Link>
      ),
    },
    { header: "SKU", accessorKey: "sku" },
    {
      header: "Price",
      accessorKey: "price",
      cell: (row: any) => `Rs ${(row.price || 0).toLocaleString()}`,
    },
    { header: "Stock", accessorKey: "stock" },
    { header: "Category", accessorKey: "category.name" },
    {
      header: "Actions",
      accessorKey: "_id",
      cell: (row: any) => (
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/admin/products/${row._id}`}>
              <Eye className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/admin/products/${row._id}/edit`}>
              <Edit className="h-4 w-4" />
            </Link>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Product</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this product? This action
                  cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteProductMutation.mutate(row._id)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ),
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Products</h1>
        <div className="flex items-center gap-3">
          <SelectNewArrivals />
          <Button asChild>
            <Link href="/admin/products/new">
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <DataTable columns={columns} data={products?.data || []} isLoading={isLoading} />

      {products?.pagination?.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {products.pagination.pages}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage(Math.min(products.pagination.pages, page + 1))}
            disabled={page === products.pagination.pages}
          >
            Next
          </Button>
        </div>
      )}
    </motion.div>
  );
}
