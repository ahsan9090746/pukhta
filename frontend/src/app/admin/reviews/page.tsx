"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import DataTable from "@/components/admin/data-table";
import { toast } from "sonner";
import { Check, X, Trash2 } from "lucide-react";
import { format } from "date-fns";

export default function AdminReviewsPage() {
  const queryClient = useQueryClient();

  const { data: reviews, isLoading } = useQuery({
    queryKey: ["admin-reviews"],
    queryFn: () =>
      api.get("/admin/reviews?limit=100").then((res) => res.data.data.data ?? []),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/admin/reviews/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
      toast.success("Review updated");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/reviews/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
      toast.success("Review deleted");
    },
  });

  const columns = [
    { header: "User", accessorKey: "user.name" },
    { header: "Product", accessorKey: "product.name" },
    { header: "Rating", accessorKey: "rating" },
    { header: "Comment", accessorKey: "comment", cell: (row: any) => row.comment?.substring(0, 50) + "..." },
    { header: "Date", accessorKey: "createdAt", cell: (row: any) => format(new Date(row.createdAt), "MMM dd, yyyy") },
    {
      header: "Status", accessorKey: "status",
      cell: (row: any) => (
        <Badge variant={row.status === "approved" ? "default" : row.status === "rejected" ? "destructive" : "secondary"}>
          {row.status}
        </Badge>
      ),
    },
    {
      header: "Actions", accessorKey: "_id",
      cell: (row: any) => (
        <div className="flex gap-1">
          {row.status !== "approved" && (
            <Button variant="ghost" size="icon" onClick={() => updateStatusMutation.mutate({ id: row._id, status: "approved" })}>
              <Check className="h-4 w-4 text-green-500" />
            </Button>
          )}
          {row.status !== "rejected" && (
            <Button variant="ghost" size="icon" onClick={() => updateStatusMutation.mutate({ id: row._id, status: "rejected" })}>
              <X className="h-4 w-4 text-yellow-500" />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(row._id)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Reviews Moderation</h1>
      <DataTable columns={columns} data={reviews || []} isLoading={isLoading} />
    </div>
  );
}
