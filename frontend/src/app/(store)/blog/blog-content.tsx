"use client";

import { useMemo, useState, type ComponentType } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Breadcrumb from "@/components/common/breadcrumb";
import EmptyState from "@/components/common/empty-state";
import TopicChip from "@/components/common/filter-chip";
import { EASE_OUT, Reveal } from "@/components/common/reveal";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  CalendarDays,
  ChevronDown,
  Clock,
  Droplets,
  Hammer,
  Ruler,
  Search,
  Shirt,
  SlidersHorizontal,
  User,
  X,
} from "lucide-react";
import type { BlogPost } from "./blog-posts";

/** Owner-supplied storefront artwork (same asset the About hero uses). */
const HERO_IMAGE = "/product-cat.png";

type Icon = ComponentType<{ className?: string }>;

/**
 * Topic → icon + cover gradient. Plain class strings so Tailwind keeps them.
 * Unknown topics fall back to the neutral journal cover.
 */
const TAG_STYLES: Record<string, { icon: Icon; cover: string }> = {
  "Care Guide": {
    icon: Droplets,
    cover: "from-[#101d2b] via-[#1b2b3a] to-[#0c141d]",
  },
  "Buying Guide": {
    icon: Ruler,
    cover: "from-brand-black via-brand-charcoal to-brand-dark",
  },
  "Craft Notes": {
    icon: Hammer,
    cover: "from-[#2b2118] via-[#3d3020] to-[#191410]",
  },
  Styling: {
    icon: Shirt,
    cover: "from-[#241f2e] via-[#302842] to-[#151221]",
  },
};

const FALLBACK_STYLE: { icon: Icon; cover: string } = {
  icon: BookOpen,
  cover: "from-brand-black to-brand-charcoal",
};

const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "az", label: "Title A–Z" },
];

export default function BlogContent({ posts }: { posts: BlogPost[] }) {
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState("all");
  const [sort, setSort] = useState("newest");
  const [openSlug, setOpenSlug] = useState<string | null>(null);

  /** Every topic the journal actually covers, with its article count. */
  const topics = useMemo(() => {
    const counts = new Map<string, number>();
    posts.forEach((post) => counts.set(post.tag, (counts.get(post.tag) || 0) + 1));
    return Array.from(counts, ([name, count]) => ({ name, count }));
  }, [posts]);

  const latestDate = useMemo(() => {
    const newest = [...posts].sort((a, b) => b.dateISO.localeCompare(a.dateISO))[0];
    return newest?.date || "";
  }, [posts]);

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();

    const matching = posts.filter((post) => {
      if (tag !== "all" && post.tag !== tag) return false;
      if (!needle) return true;

      return [post.title, post.excerpt, post.tag, post.author, ...post.body]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });

    return [...matching].sort((a, b) => {
      if (sort === "az") return a.title.localeCompare(b.title);
      const byDate = a.dateISO.localeCompare(b.dateISO);
      return sort === "oldest" ? byDate : -byDate;
    });
  }, [posts, query, tag, sort]);

  const [featuredPost, ...otherPosts] = results;
  const hasFilters = query.trim().length > 0 || tag !== "all";

  const clearFilters = () => {
    setQuery("");
    setTag("all");
    setSort("newest");
  };

  const toggle = (slug: string) =>
    setOpenSlug((current) => (current === slug ? null : slug));

  return (
    <div className="flex flex-col">
      {/* ---------- Hero ---------- */}
      <section className="relative overflow-hidden bg-brand-black">
        <Image
          src={HERO_IMAGE}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/75 to-black/45" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/25" />

        <div className="relative container py-12 md:py-16 lg:py-20">
          <Breadcrumb
            variant="inverted"
            items={[{ label: "Home", href: "/" }, { label: "Blog" }]}
          />

          <div className="mt-8 max-w-3xl">
            <Reveal>
              <span className="flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-[0.28em] text-brand-gold sm:text-xs">
                <span className="hidden h-px w-8 bg-brand-gold/50 sm:block" />
                Journal
              </span>
            </Reveal>

            <Reveal delay={0.08}>
              <h1 className="mt-4 text-balance font-serif text-4xl leading-[1.08] text-white drop-shadow-sm sm:text-5xl md:text-6xl">
                Care guides &amp; styling notes
              </h1>
            </Reveal>

            <Reveal delay={0.16}>
              <p className="mt-5 max-w-2xl text-sm leading-relaxed text-white/75 md:text-base">
                Practical advice from our workshop on choosing, wearing and
                looking after handcrafted leather footwear.
              </p>
            </Reveal>

            <Reveal delay={0.24}>
              <div className="mt-8 flex flex-wrap gap-2">
                <HeroChip icon={BookOpen} label={`${posts.length} articles`} />
                <HeroChip icon={SlidersHorizontal} label={`${topics.length} topics`} />
                {latestDate && (
                  <HeroChip icon={CalendarDays} label={`Latest ${latestDate}`} />
                )}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---------- Search / topics / sort ---------- */}
      <section className="border-b bg-muted/30">
        <div className="container py-6 md:py-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-md">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search articles, topics or advice…"
                aria-label="Search articles"
                className="h-11 rounded-full pl-11 pr-11"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition-colors hover:text-brand-gold"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <span className="hidden text-sm text-muted-foreground sm:inline">
                Sort by
              </span>
              <Select value={sort} onValueChange={setSort}>
                <SelectTrigger
                  aria-label="Sort articles"
                  className="h-11 w-[180px] rounded-full"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <TopicChip
              active={tag === "all"}
              label="All topics"
              count={posts.length}
              onClick={() => setTag("all")}
            />
            {topics.map((topic) => (
              <TopicChip
                key={topic.name}
                active={tag === topic.name}
                label={topic.name}
                count={topic.count}
                onClick={() => setTag(topic.name)}
              />
            ))}
          </div>

          <p className="mt-4 text-xs uppercase tracking-[0.18em] text-muted-foreground">
            {results.length} {results.length === 1 ? "article" : "articles"}
            {hasFilters ? " match your filters" : " in the journal"}
          </p>
        </div>
      </section>

      {/* ---------- Articles ---------- */}
      <section className="container py-10 md:py-14">
        {results.length === 0 ? (
          <EmptyState
            icon={<Search className="h-10 w-10" />}
            title="No articles matched"
            description={
              query.trim()
                ? `Nothing found for “${query.trim()}”. Try another word, or clear the filters to see every guide.`
                : "Nothing found in this topic yet — try another topic."
            }
            action={
              <Button
                onClick={clearFilters}
                className="rounded-full bg-brand-gold font-semibold text-white hover:bg-brand-gold-dark"
              >
                Clear filters
              </Button>
            }
          />
        ) : (
          <>
            {featuredPost && (
              <Reveal>
                <PostCard
                  post={featuredPost}
                  featured
                  open={openSlug === featuredPost.slug}
                  onToggle={() => toggle(featuredPost.slug)}
                />
              </Reveal>
            )}

            {otherPosts.length > 0 && (
              <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3 md:mt-8">
                {otherPosts.map((post, index) => (
                  <Reveal
                    key={post.slug}
                    delay={Math.min(index, 5) * 0.06}
                    className="h-full"
                  >
                    <PostCard
                      post={post}
                      open={openSlug === post.slug}
                      onToggle={() => toggle(post.slug)}
                    />
                  </Reveal>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      {/* ---------- Closing CTA ---------- */}
      <section className="container pb-16 md:pb-24">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-brand-gold/25 bg-gold-gradient-soft p-10 text-center md:p-14">
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-brand-gold/10 blur-3xl" />
            <div className="relative">
              <h2 className="text-2xl font-bold md:text-3xl">
                Need advice on your order?
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
                Our team is happy to help with sizing, care or anything else.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Button
                  asChild
                  size="lg"
                  className="rounded-full bg-brand-gold px-7 font-semibold text-white shadow-gold transition-all hover:bg-brand-gold-dark hover:shadow-gold-lg"
                >
                  <Link href="/contact">Talk to us</Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="rounded-full px-7 font-semibold"
                >
                  <Link href="/product-category">Shop the collection</Link>
                </Button>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}

/** Small glass chip used in the hero stat row. */
function HeroChip({ icon: Icon, label }: { icon: Icon; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-medium text-white/85 backdrop-blur-sm">
      <Icon className="h-3.5 w-3.5 text-brand-gold" />
      {label}
    </span>
  );
}

/**
 * One article. Renders as the large featured card (cover beside the copy) or as
 * a compact grid card — the body opens inline, so readers never leave the page.
 */
function PostCard({
  post,
  featured = false,
  open,
  onToggle,
}: {
  post: BlogPost;
  featured?: boolean;
  open: boolean;
  onToggle: () => void;
}) {
  const style = TAG_STYLES[post.tag] || FALLBACK_STYLE;
  const CoverIcon = style.icon;

  return (
    <Card
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-3xl border-border/70 transition-all duration-300 hover:border-brand-gold/40",
        featured
          ? "shadow-premium lg:grid lg:grid-cols-[0.85fr_1.15fr]"
          : "shadow-sm hover:shadow-gold"
      )}
    >
      {/* Cover — generated from the topic, so no extra artwork is needed */}
      <div
        className={cn(
          "relative flex flex-col justify-between gap-6 bg-gradient-to-br text-white",
          style.cover,
          featured ? "min-h-[210px] p-7 md:p-9" : "min-h-[150px] p-6"
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <span className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] backdrop-blur-sm">
            {post.tag}
          </span>
          <span className="inline-flex items-center gap-1.5 text-[11px] text-white/70">
            <Clock className="h-3.5 w-3.5" />
            {post.readTime}
          </span>
        </div>

        <CoverIcon
          className={cn(
            "text-brand-gold/80 transition-transform duration-500 group-hover:scale-110",
            featured ? "h-16 w-16" : "h-10 w-10"
          )}
        />

        {featured && (
          <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/60">
            {post.featured ? "Featured article" : "Latest article"}
          </span>
        )}
      </div>

      <CardContent
        className={cn("flex flex-1 flex-col", featured ? "p-7 md:p-9" : "pt-6")}
      >
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
          <time dateTime={post.dateISO} className="flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" />
            {post.date}
          </time>
          <span className="flex items-center gap-1.5">
            <User className="h-3.5 w-3.5" />
            {post.author}
          </span>
        </div>

        <h2
          className={cn(
            "mt-3 font-bold leading-snug",
            featured ? "text-balance text-2xl md:text-3xl" : "text-lg"
          )}
        >
          {post.title}
        </h2>

        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {post.excerpt}
        </p>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              key="body"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.35, ease: EASE_OUT }}
              className="overflow-hidden"
            >
              <div className="mt-5 space-y-4 border-t border-border/70 pt-5">
                {post.body.map((paragraph) => (
                  <p
                    key={paragraph.slice(0, 40)}
                    className="text-sm leading-relaxed text-muted-foreground"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-auto pt-6">
          <Button
            size="sm"
            variant={open ? "outline" : "default"}
            onClick={onToggle}
            aria-expanded={open}
            className={cn(
              "rounded-full font-semibold",
              !open && "bg-brand-gold text-white hover:bg-brand-gold-dark"
            )}
          >
            {open ? "Show less" : "Read article"}
            <ChevronDown
              className={cn(
                "ml-2 h-4 w-4 transition-transform duration-300",
                open && "rotate-180"
              )}
            />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
