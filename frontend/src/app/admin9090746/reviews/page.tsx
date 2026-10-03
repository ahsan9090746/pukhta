"use client";
// Render on demand - skip static generation so a sleeping backend cannot crash the build.
export const dynamic = "force-dynamic";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import DataTable from "@/components/admin/data-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Check, X, Trash2, Plus, ImagePlus } from "lucide-react";
import { format } from "date-fns";

/** Fake reviews (home page testimonials) only ever use these five fields. */
const emptyFakeForm = {
  rating: 5,
  title: "",
  comment: "",
  fakeName: "",
  fakeAvatar: "",
};

/** Uploaded avatars are downscaled so the home page feed stays small + fast. */
const AVATAR_MAX_SIZE = 256;

const readAvatar = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the image"));
    reader.onload = () => {
      const image = new window.Image();
      image.onerror = () => reject(new Error("Could not read the image"));
      image.onload = () => {
        const scale = Math.min(
          1,
          AVATAR_MAX_SIZE / Math.max(image.width, image.height)
        );
        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(String(reader.result));
          return;
        }
        ctx.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });

/**
 * A review's product list. Bulk fake reviews (category / all target) store the
 * full list in `products[]`; legacy single-product rows only carry `product`.
 */
const getReviewProducts = (row: any): any[] => {
  const bulk = (Array.isArray(row?.products) ? row.products : []).filter(
    (p: any) => p && typeof p === "object"
  );
  if (bulk.length) return bulk;
  return row?.product && typeof row.product === "object" ? [row.product] : [];
};

export default function AdminReviewsPage() {
  const queryClient = useQueryClient();
  /** "real" = customer-submitted reviews, "fake" = home page testimonials */
  const [tab, setTab] = useState<"real" | "fake">("real");
  const [fakeOpen, setFakeOpen] = useState(false);
  const [fakeForm, setFakeForm] = useState({ ...emptyFakeForm });
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState("");

  // Two separate sections: genuine customer reviews and admin testimonials.
  const { data: realReviews, isLoading: realLoading } = useQuery({
    queryKey: ["admin-reviews", "real"],
    queryFn: () =>
      api
        .get("/admin/reviews?isFake=false&limit=100")
        .then((res) => res.data.data.data ?? []),
  });

  const { data: fakeReviews, isLoading: fakeLoading } = useQuery({
    queryKey: ["admin-reviews", "fake"],
    queryFn: () =>
      api
        .get("/admin/reviews?isFake=true&limit=100")
        .then((res) => res.data.data.data ?? []),
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

  const createFakeMutation = useMutation({
    mutationFn: (data: any) => api.post("/reviews/fake", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
      // The storefront testimonial feed has to pick the new row up too.
      queryClient.invalidateQueries({ queryKey: ["customer-reviews"] });
      toast.success("Testimonial added — it is live on the home page");
      setFakeOpen(false);
      setFakeForm({ ...emptyFakeForm });
      setAvatarPreview("");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to add the testimonial");
    },
  });

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Only image files are allowed");
      return;
    }
    try {
      // Resized to <=256px before saving so the feed payload stays tiny.
      const dataUrl = await readAvatar(file);
      setAvatarPreview(dataUrl);
      setFakeForm((current) => ({ ...current, fakeAvatar: dataUrl }));
    } catch {
      toast.error("Could not read that image");
    }
  };

  const handleFakeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fakeForm.fakeName.trim()) {
      toast.error("Please enter a reviewer name");
      return;
    }
    createFakeMutation.mutate({
      rating: fakeForm.rating,
      title: fakeForm.title,
      comment: fakeForm.comment,
      fakeName: fakeForm.fakeName,
      fakeAvatar: fakeForm.fakeAvatar,
    });
  };

  /** Shared by both tables — expands a review to show every product it covers. */
  const renderRowDetails = (row: any) => {
    const products = getReviewProducts(row);
    const name = row.isFake
      ? row.fakeName || "Fake User"
      : row.user?.name || row.guestName || "User";
    return (
      <div className="space-y-2 px-2 py-3">
        <p className="text-sm font-medium">
          {name} reviewed {products.length} product
          {products.length === 1 ? "" : "s"}:
        </p>
        <ul className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p: any) => (
            <li
              key={p._id}
              className="flex items-center gap-2 rounded-md border bg-background px-2.5 py-1.5 text-sm"
            >
              <span className="truncate">{p.name}</span>
              {p.slug && (
                <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                  /{p.slug}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    );
  };

  /** Real (customer-submitted) reviews — approve / reject / delete. */
  const realColumns = [
    {
      header: "Reviewer",
      accessorKey: "user.name",
      cell: (row: any) => (
        <div className="flex items-center gap-2">
          {row.user?.avatar ? (
            <img
              src={row.user.avatar}
              alt=""
              className="h-6 w-6 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
              {(row.user?.name || row.guestName || "U").charAt(0)}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm">
              {row.user?.name || row.guestName || "User"}
            </p>
            {!row.user && row.guestEmail && (
              <p className="truncate text-xs text-muted-foreground">
                {row.guestEmail}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      header: "Product",
      accessorKey: "product.name",
      cell: (row: any) => {
        const products = getReviewProducts(row);
        if (products.length > 1) {
          return <Badge variant="outline">{products.length} products</Badge>;
        }
        return products[0]?.name || "-";
      },
    },
    { header: "Rating", accessorKey: "rating", cell: (row: any) => `${row.rating}★` },
    {
      header: "Review",
      accessorKey: "title",
      cell: (row: any) => (
        <div className="max-w-[260px]">
          {row.title && (
            <p className="truncate text-sm font-medium">{row.title}</p>
          )}
          <p className="truncate text-xs text-muted-foreground">{row.comment}</p>
        </div>
      ),
    },
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

  /**
   * Fake reviews → home page testimonials only. They have NO product at all,
   * so this table just shows the reviewer, rating, text and date.
   */
  const fakeColumns = [
    {
      header: "Reviewer",
      accessorKey: "fakeName",
      cell: (row: any) => (
        <div className="flex items-center gap-2">
          {row.fakeAvatar ? (
            <img
              src={row.fakeAvatar}
              alt=""
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-xs font-medium text-purple-700">
              {(row.fakeName || "F").charAt(0)}
            </div>
          )}
          <span className="text-sm">{row.fakeName || "Testimonial"}</span>
        </div>
      ),
    },
    { header: "Rating", accessorKey: "rating", cell: (row: any) => `${row.rating}★` },
    {
      header: "Review",
      accessorKey: "title",
      cell: (row: any) => (
        <div className="max-w-[320px]">
          {row.title && (
            <p className="truncate text-sm font-medium">{row.title}</p>
          )}
          <p className="line-clamp-2 text-xs text-muted-foreground">{row.comment}</p>
        </div>
      ),
    },
    {
      header: "Date",
      accessorKey: "createdAt",
      cell: (row: any) => format(new Date(row.createdAt), "MMM dd, yyyy"),
    },
    {
      header: "Actions",
      accessorKey: "_id",
      cell: (row: any) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => deleteMutation.mutate(row._id)}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reviews</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Real customer reviews and the home page testimonials
          </p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(value) => setTab(value as "real" | "fake")}>
        <TabsList>
          <TabsTrigger value="real">
            Real Reviews ({realReviews?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="fake">
            Fake Reviews ({fakeReviews?.length ?? 0})
          </TabsTrigger>
        </TabsList>

        {/* ---------- Section 1: reviews submitted by customers ---------- */}
        <TabsContent value="real" className="space-y-4">
          <p className="rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            Reviews customers submit from the product pages. Approve one to publish it
            on that product&apos;s page. Fake reviews have no effect here.
          </p>
          <DataTable
            columns={realColumns}
            data={realReviews || []}
            isLoading={realLoading}
            isRowExpandable={(row) => getReviewProducts(row).length > 0}
            renderRowDetails={renderRowDetails}
          />
        </TabsContent>

        {/* ---------- Section 2: admin testimonials (shown on the home page) ---------- */}
        <TabsContent value="fake" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/40 px-4 py-3">
            <p className="max-w-2xl text-sm text-muted-foreground">
              Testimonials you add here appear on the home page in the
              &quot;What our customers say&quot; section. They are not linked to any
              product and never change a product&apos;s rating.
            </p>
            <Button onClick={() => setFakeOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Fake Review
            </Button>
          </div>
          <DataTable
            columns={fakeColumns}
            data={fakeReviews || []}
            isLoading={fakeLoading}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={fakeOpen} onOpenChange={(v) => { setFakeOpen(v); if (!v) { setFakeForm({ ...emptyFakeForm }); setAvatarPreview(""); } }}>
          <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Fake Review</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleFakeSubmit} className="space-y-3">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  placeholder="e.g. John Smith"
                  value={fakeForm.fakeName}
                  onChange={(e) => setFakeForm({ ...fakeForm, fakeName: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Profile Picture</Label>
                <div className="flex items-center gap-3">
                  {avatarPreview ? (
                    <div className="relative">
                      <img src={avatarPreview} alt="Avatar" className="h-14 w-14 rounded-full object-cover border" />
                      <button
                        type="button"
                        onClick={() => { setAvatarPreview(""); setFakeForm({ ...fakeForm, fakeAvatar: "" }); }}
                        className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-white flex items-center justify-center text-xs"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      className="h-14 w-14 rounded-full border-2 border-dashed flex items-center justify-center hover:border-primary/50 transition-colors"
                    >
                      <ImagePlus className="h-5 w-5 text-muted-foreground" />
                    </button>
                  )}
                  <div className="text-xs text-muted-foreground">Optional — a small square photo looks best (auto-resized)</div>
                </div>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>

              <div className="space-y-2">
                <Label>Rating</Label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFakeForm({ ...fakeForm, rating: star })}
                      className={`text-2xl ${star <= fakeForm.rating ? "text-yellow-500" : "text-gray-300"}`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  placeholder="e.g. Great product!"
                  value={fakeForm.title}
                  onChange={(e) => setFakeForm({ ...fakeForm, title: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Write the review text..."
                  value={fakeForm.comment}
                  onChange={(e) => setFakeForm({ ...fakeForm, comment: e.target.value })}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={createFakeMutation.isPending}>
                {createFakeMutation.isPending ? "Saving..." : "Add Fake Review"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
    </div>
  );
}
