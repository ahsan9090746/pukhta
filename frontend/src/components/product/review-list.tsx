"use client";

import { motion } from "framer-motion";
import { Star, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface ReviewListProps {
  reviews: any[];
}

export default function ReviewList({ reviews }: ReviewListProps) {
  const ratingDistribution = [5, 4, 3, 2, 1].map((rating) => {
    const count = reviews.filter((r) => Math.round(r.rating) === rating).length;
    const percentage = reviews.length ? (count / reviews.length) * 100 : 0;
    return { rating, count, percentage };
  });

  const averageRating = reviews.length
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  if (!reviews.length) {
    return (
      <div className="space-y-3">
        <h3 className="text-lg font-bold tracking-tight">Reviews</h3>
        <p className="text-sm text-muted-foreground">There are no reviews yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-bold tracking-tight">
        Reviews ({reviews.length})
      </h3>
      <div className="flex items-start gap-8">
        <div className="text-center">
          <div className="text-4xl font-bold">{averageRating.toFixed(1)}</div>
          <div className="flex items-center justify-center mt-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={cn(
                  "h-4 w-4",
                  star <= averageRating
                    ? "fill-brand-gold text-brand-gold"
                    : "text-gray-300"
                )}
              />
            ))}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {reviews.length} reviews
          </p>
        </div>

        <div className="flex-1 space-y-2">
          {ratingDistribution.map(({ rating, count, percentage }) => (
            <div key={rating} className="flex items-center gap-2">
              <span className="text-sm w-8">{rating}★</span>
              <Progress value={percentage} className="h-2 flex-1" />
              <span className="text-sm text-muted-foreground w-8">{count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {reviews.map((review) => (
          <motion.div
            key={review._id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="border rounded-xl p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {review.isFake ? (
                  <>
                    {review.fakeAvatar ? (
                      <img src={review.fakeAvatar} alt="" className="h-8 w-8 rounded-full object-cover" />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-sm font-medium">
                        {(review.fakeName || "U").charAt(0)}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                    {review.user?.name?.charAt(0) || review.guestName?.charAt(0) || "U"}
                  </div>
                )}
                <div>
                  <p className="font-medium text-sm">{review.isFake ? (review.fakeName || "User") : (review.user?.name || review.guestName || "Customer")}</p>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={cn(
                          "h-3 w-3",
                          star <= review.rating
                            ? "fill-brand-gold text-brand-gold"
                            : "text-gray-300"
                        )}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <span className="text-xs text-muted-foreground">
                {format(new Date(review.createdAt), "MMM dd, yyyy")}
              </span>
            </div>
            {review.title && (
              <p className="font-medium text-sm mb-1">{review.title}</p>
            )}
            <p className="text-sm text-muted-foreground">{review.comment}</p>
            <Button variant="ghost" size="sm" className="mt-2">
              <ThumbsUp className="h-3 w-3 mr-1" />
              Helpful ({review.helpfulCount || 0})
            </Button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
