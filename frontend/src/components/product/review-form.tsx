"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Loader2, Star } from "lucide-react";

interface ReviewFormProps {
  productId: string;
  productName?: string;
  /** Used for the "Be the first to review …" heading. */
  reviewsCount?: number;
}

/** Where "Save my name, email…" is remembered between visits. */
const AUTHOR_STORAGE_KEY = "footware-review-author";

/** The API requires a title, the design does not show one — use the review text. */
const buildTitle = (comment: string) => {
  const words = comment.trim().split(/\s+/).slice(0, 8).join(" ");
  const title = words.length > 80 ? `${words.slice(0, 77)}...` : words;
  return title || "Customer review";
};

export default function ReviewForm({
  productId,
  productName = "this product",
  reviewsCount = 0,
}: ReviewFormProps) {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [saveDetails, setSaveDetails] = useState(false);

  // Restore the "saved for next time" details
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(AUTHOR_STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored);
      if (parsed?.name) setName((current) => current || parsed.name);
      if (parsed?.email) setEmail((current) => current || parsed.email);
      setSaveDetails(true);
    } catch {
      // Malformed / unavailable storage — nothing to restore.
    }
  }, []);

  // Logged-in customers get their profile details prefilled
  useEffect(() => {
    if (!user) return;
    setName((current) => current || user.name || "");
    setEmail((current) => current || user.email || "");
  }, [user]);

  const submitReviewMutation = useMutation({
    mutationFn: (payload: {
      rating: number;
      title: string;
      comment: string;
      name: string;
      email: string;
    }) => api.post("/reviews", { productId, ...payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews", productId] });
      queryClient.invalidateQueries({ queryKey: ["product"] });
      toast.success("Review submitted", {
        description: "Thanks! Your review is awaiting moderation.",
      });
      setRating(0);
      setHoveredRating(0);
      setComment("");
    },
    onError: (error: any) => {
      toast.error("Could not submit review", {
        description:
          error.response?.data?.message ||
          "Something went wrong. Please try again.",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }
    if (!comment.trim()) {
      toast.error("Please write your review");
      return;
    }
    if (!name.trim()) {
      toast.error("Please enter your name");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      toast.error("Please enter a valid email address");
      return;
    }

    try {
      if (saveDetails) {
        window.localStorage.setItem(
          AUTHOR_STORAGE_KEY,
          JSON.stringify({ name: name.trim(), email: email.trim() })
        );
      } else {
        window.localStorage.removeItem(AUTHOR_STORAGE_KEY);
      }
    } catch {
      // Storage is optional — never block the review.
    }

    submitReviewMutation.mutate({
      rating,
      title: buildTitle(comment),
      comment: comment.trim(),
      name: name.trim(),
      email: email.trim(),
    });
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div>
        <h3 className="text-lg font-bold leading-snug tracking-tight">
          {reviewsCount === 0
            ? `Be the first to review “${productName}”`
            : `Write a review for “${productName}”`}
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Your email address will not be published. Required fields are marked{" "}
          <span className="text-red-500">*</span>
        </p>
      </div>

      {/* Rating */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">
          Your rating <span className="text-red-500">*</span>
        </Label>
        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              aria-label={`${star} star${star > 1 ? "s" : ""}`}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
              className="transition-transform hover:scale-110"
            >
              <Star
                className={cn(
                  "h-5 w-5 transition-colors",
                  (hoveredRating || rating) >= star
                    ? "fill-brand-gold text-brand-gold"
                    : "text-gray-300"
                )}
              />
            </button>
          ))}
          {rating > 0 && (
            <span className="ml-1 text-xs font-medium text-muted-foreground">
              {rating} / 5
            </span>
          )}
        </div>
      </div>

      {/* Review */}
      <div className="space-y-1.5">
        <Label htmlFor="review-comment" className="text-sm font-medium">
          Your review <span className="text-red-500">*</span>
        </Label>
        <Textarea
          id="review-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={6}
          placeholder="Share the fit, comfort, quality and how you use this product…"
          className="min-h-[150px] rounded-2xl"
        />
      </div>

      {/* Name + email */}
      <div className="space-y-1.5">
        <Label htmlFor="review-name" className="text-sm font-medium">
          Name <span className="text-red-500">*</span>
        </Label>
        <Input
          id="review-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          className="h-11 rounded-full px-4"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="review-email" className="text-sm font-medium">
          Email <span className="text-red-500">*</span>
        </Label>
        <Input
          id="review-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="h-11 rounded-full px-4"
        />
      </div>

      <label className="flex cursor-pointer items-start gap-2.5 text-sm text-muted-foreground">
        <Checkbox
          checked={saveDetails}
          onCheckedChange={(checked) => setSaveDetails(checked === true)}
          className="mt-0.5"
        />
        <span>
          Save my name, email, and website in this browser for the next time I
          comment.
        </span>
      </label>

      <Button
        type="submit"
        disabled={submitReviewMutation.isPending}
        className="h-11 rounded-full bg-brand-gold px-10 text-sm font-bold uppercase tracking-wide text-white hover:bg-brand-gold-dark"
      >
        {submitReviewMutation.isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Submitting
          </>
        ) : (
          "Submit"
        )}
      </Button>
    </form>
  );
}
