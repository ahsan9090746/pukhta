"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Star, BadgeCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import api from "@/lib/api";
import { getImageUrl } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

interface CustomerReview {
  _id: string;
  rating: number;
  title: string;
  comment: string;
  images: string[];
  isVerified: boolean;
  /** true for the admin-authored testimonials, false for real customer reviews */
  isFake?: boolean;
  name: string;
  /** Profile picture — the customer avatar, or the admin-uploaded fake one */
  avatar?: string;
  productName: string;
  productSlug: string;
  productImage: string;
  createdAt: string;
}

const Stars = ({ rating, className = "h-3.5 w-3.5" }: { rating: number; className?: string }) => (
  <div className="flex items-center gap-0.5">
    {[...Array(5)].map((_, i) => (
      <Star
        key={i}
        className={`${className} ${
          i < rating
            ? "fill-brand-gold text-brand-gold"
            : "fill-muted dark:fill-zinc-700 text-muted-foreground/30 dark:text-zinc-600"
        }`}
      />
    ))}
  </div>
);

/** Profile picture source — admin-uploaded avatars are data URLs, so they must
 *  bypass the API-prefixing that `getImageUrl` does for relative paths. */
const avatarSrc = (avatar?: string) => {
  if (!avatar) return "";
  return avatar.startsWith("data:") ? avatar : getImageUrl(avatar);
};

function ReviewerAvatar({ name, avatar }: { name: string; avatar?: string }) {
  const src = avatarSrc(avatar);
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        className="h-8 w-8 shrink-0 rounded-full object-cover ring-2 ring-brand-gold/40 sm:h-10 sm:w-10"
      />
    );
  }
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-gold/15 text-xs font-bold uppercase text-brand-gold ring-2 ring-brand-gold/30 sm:h-10 sm:w-10 sm:text-sm">
      {(name || "C").trim().charAt(0)}
    </span>
  );
}

function ReviewCard({
  review,
  className = "",
}: {
  review: CustomerReview;
  className?: string;
}) {
  const image = review.images?.[0] || review.productImage;
  const name = review.name || "Customer";
  return (
    <article
      className={`bg-card dark:bg-zinc-800 rounded-xl overflow-hidden shadow-lg hover:shadow-gold-lg transition-shadow duration-300 flex flex-col shrink-0 ${className}`}
    >
      {image && (
        <Link
          href={review.productSlug ? `/product/${review.productSlug}` : "/product-category"}
          className="relative block aspect-[16/10] overflow-hidden bg-muted dark:bg-zinc-700 group"
        >
          <Image
            src={getImageUrl(image)}
            alt={review.title}
            fill
            sizes="(max-width: 640px) 44vw, 320px"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </Link>
      )}
      <div className="p-3 flex flex-col flex-1 sm:p-4">
        {/* Profile picture, with the reviewer's name right underneath it */}
        <ReviewerAvatar name={name} avatar={review.avatar} />

        <div className="mt-2 flex items-center gap-1.5">
          <span className="truncate text-xs font-semibold text-foreground dark:text-white sm:text-[13px]">
            {name}
          </span>
          {review.isVerified && (
            <BadgeCheck className="h-3 w-3 shrink-0 fill-brand-gold text-background dark:text-zinc-800 sm:h-3.5 sm:w-3.5" />
          )}
        </div>

        <div className="mt-1 sm:mt-1.5 flex items-center gap-1.5 sm:gap-2">
          <Stars rating={review.rating} className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
          <span className="text-[9px] text-muted-foreground dark:text-zinc-400 sm:text-[10px]">
            {new Date(review.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>

        {/* Review title + description */}
        {review.title && (
          <h3 className="mt-2 sm:mt-2.5 text-[11px] sm:text-xs font-bold leading-snug line-clamp-1 text-foreground dark:text-white">
            {review.title}
          </h3>
        )}
        <p className="mt-0.5 sm:mt-1 text-[10px] sm:text-[11px] leading-snug line-clamp-3 text-muted-foreground dark:text-zinc-400">
          {review.comment}
        </p>

        {review.productName && review.productSlug && (
          <Link
            href={`/product/${review.productSlug}`}
            className="mt-auto truncate pt-2 sm:pt-3 text-[9px] sm:text-[10px] font-semibold uppercase tracking-wide text-brand-gold hover:underline"
          >
            on {review.productName}
          </Link>
        )}
      </div>
    </article>
  );
}

export default function CustomerReviews() {
  // Admin-authored testimonials ("fake reviews") — the marquee at the top.
  const { data: testimonials, isLoading: testimonialsLoading } = useQuery({
    queryKey: ["customer-reviews", "fake"],
    queryFn: () =>
      api
        .get("/reviews/featured?type=fake&limit=12")
        .then((res) => res.data.data.reviews ?? []),
    staleTime: 5 * 60 * 1000,
  });

  // Genuine reviews submitted from the storefront — listed underneath.
  const { data: customerReviews, isLoading: reviewsLoading } = useQuery({
    queryKey: ["customer-reviews", "real"],
    queryFn: () =>
      api
        .get("/reviews/featured?type=real&limit=9")
        .then((res) => res.data.data.reviews ?? []),
    staleTime: 5 * 60 * 1000,
  });

  const fakeReviews: CustomerReview[] = testimonials ?? [];
  const realReviews: CustomerReview[] = customerReviews ?? [];

  if (
    !testimonialsLoading &&
    !reviewsLoading &&
    fakeReviews.length === 0 &&
    realReviews.length === 0
  ) {
    return null;
  }

  const avgRating = fakeReviews.length
    ? (
        fakeReviews.reduce((sum: number, r: CustomerReview) => sum + r.rating, 0) /
        fakeReviews.length
      ).toFixed(1)
    : null;

  return (
    <>
      {/* ---------- Testimonials — the reviews added from the admin panel ---------- */}
      {(testimonialsLoading || fakeReviews.length > 0) && (
        <section className="bg-muted dark:bg-zinc-900 py-10 sm:py-16 overflow-hidden">
      <div className="container">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-6 sm:mb-10"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="h-px w-8 bg-gradient-to-r from-transparent to-brand-gold/60" />
            <span className="text-[11px] uppercase tracking-[0.3em] font-semibold text-brand-gold">
              Testimonials
            </span>
            <span className="h-px w-8 bg-gradient-to-l from-transparent to-brand-gold/60" />
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-brand-gold">
            What our customers say
          </h2>
          {avgRating && (
            <div className="mt-4 flex items-center justify-center gap-3">
              <span className="text-2xl font-bold text-foreground dark:text-white">{avgRating}</span>
              <Stars rating={Math.round(Number(avgRating))} className="h-4 w-4" />
            </div>
          )}
          <div className="mt-4 h-0.5 w-12 bg-brand-gold/40 rounded-full mx-auto" />
        </motion.div>

        {testimonialsLoading ? (
          <div className="flex gap-3 sm:gap-6 overflow-hidden">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="w-[44vw] sm:w-[300px] sm:min-w-[300px] h-[320px] sm:h-[420px] rounded-xl shrink-0" />
            ))}
          </div>
        ) : (
          <div
            className="group relative"
            onMouseEnter={(e) => {
              const track = e.currentTarget.querySelector(".marquee-track") as HTMLElement;
              if (track) track.style.animationPlayState = "paused";
            }}
            onMouseLeave={(e) => {
              const track = e.currentTarget.querySelector(".marquee-track") as HTMLElement;
              if (track) track.style.animationPlayState = "running";
            }}
          >
            {/* Fade edges */}
            <div className="absolute left-0 top-0 bottom-0 w-8 sm:w-16 bg-gradient-to-r from-muted dark:from-zinc-900 to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-8 sm:w-16 bg-gradient-to-l from-muted dark:from-zinc-900 to-transparent z-10 pointer-events-none" />

            {/* Marquee — mobile: 2 cards visible at a time, desktop unchanged */}
            <div className="overflow-hidden">
              <div className="marquee-track flex gap-3 sm:gap-6 w-max">
                {[...fakeReviews, ...fakeReviews].map((review: CustomerReview, i: number) => (
                  <ReviewCard key={`${review._id}-${i}`} review={review} className="w-[44vw] sm:w-[250px] shrink-0" />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

          <style jsx>{`
            .marquee-track {
              animation: marquee 30s linear infinite;
            }
            @keyframes marquee {
              0% {
                transform: translateX(0);
              }
              100% {
                transform: translateX(-50%);
              }
            }
          `}</style>
        </section>
      )}

      {/* ---------- Real customer reviews (list, fake ones excluded) ---------- */}
      {(reviewsLoading || realReviews.length > 0) && (
        <section className="py-14 md:py-16">
          <div className="container">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="text-center mb-10"
            >
              <div className="flex items-center justify-center gap-3 mb-4">
                <span className="h-px w-8 bg-gradient-to-r from-transparent to-brand-gold/60" />
                <span className="text-[11px] uppercase tracking-[0.3em] font-semibold text-brand-gold">
                  Real Reviews
                </span>
                <span className="h-px w-8 bg-gradient-to-l from-transparent to-brand-gold/60" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground dark:text-white sm:text-3xl">
                Reviews from our customers
              </h2>
              <p className="mt-2 text-sm text-muted-foreground dark:text-zinc-400">
                Genuine feedback from shoppers who ordered from us
              </p>
            </motion.div>

            {reviewsLoading ? (
              <div className="grid grid-cols-2 gap-3 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-[280px] sm:h-[320px] rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {realReviews.map((review, i) => (
                  <motion.div
                    key={review._id}
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-40px" }}
                    transition={{ duration: 0.5, delay: (i % 3) * 0.08 }}
                  >
                    <ReviewCard review={review} className="h-full" />
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </>
  );
}
