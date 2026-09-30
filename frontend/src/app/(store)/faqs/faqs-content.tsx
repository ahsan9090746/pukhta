"use client";

import { useEffect, useMemo, useState, type ComponentType } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import Breadcrumb from "@/components/common/breadcrumb";
import EmptyState from "@/components/common/empty-state";
import FilterChip from "@/components/common/filter-chip";
import { Reveal } from "@/components/common/reveal";
import {
  CreditCard,
  HelpCircle,
  LifeBuoy,
  Mail,
  PackageSearch,
  RefreshCw,
  Ruler,
  Search,
  Sparkles,
  Truck,
  X,
} from "lucide-react";
import type { FaqGroup } from "./faq-data";

type Icon = ComponentType<{ className?: string }>;

/** Topic → icon. Unknown topics fall back to the generic help glyph. */
const GROUP_ICONS: Record<string, Icon> = {
  "Orders & Delivery": Truck,
  "Sizes & Fit": Ruler,
  "Returns & Exchange": RefreshCw,
  "Payments & Support": CreditCard,
  "Products & Craft": Sparkles,
};

export default function FaqsContent({ groups }: { groups: FaqGroup[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState("all");

  /**
   * Deep links such as `/faqs?topic=Sizes%20%26%20Fit` (the footer's "Size
   * Guide", "Shipping Info" and "Returns" links) open the page already
   * filtered. Applied after mount so the prerendered HTML and the first client
   * render stay identical — no hydration mismatch.
   */
  useEffect(() => {
    const requested = searchParams.get("topic");
    if (requested && groups.some((group) => group.title === requested)) {
      setTopic(requested);
    }
  }, [searchParams, groups]);

  /** Every answer the store publishes — shown as the page's credibility line. */
  const totalAnswers = useMemo(
    () => groups.reduce((sum, group) => sum + group.items.length, 0),
    [groups]
  );

  /**
   * Filters in two passes: pick the topic, then keep only the questions whose
   * text (or answer) matches the search box. Groups that end up empty drop out
   * so visitors never scroll past an empty card.
   */
  const visibleGroups = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return groups
      .filter((group) => topic === "all" || group.title === topic)
      .map((group) => ({
        ...group,
        items: needle
          ? group.items.filter((item) =>
              `${item.question} ${item.answer}`
                .toLowerCase()
                .includes(needle)
            )
          : group.items,
      }))
      .filter((group) => group.items.length > 0);
  }, [groups, query, topic]);

  const matchCount = visibleGroups.reduce(
    (sum, group) => sum + group.items.length,
    0
  );
  const hasFilters = query.trim().length > 0 || topic !== "all";

  /** Topic pill handler — keeps the URL shareable and in sync with the pill. */
  const selectTopic = (next: string) => {
    setTopic(next);
    router.replace(
      next === "all" ? "/faqs" : `/faqs?topic=${encodeURIComponent(next)}`,
      { scroll: false }
    );
  };

  const clearFilters = () => {
    setQuery("");
    selectTopic("all");
  };

  return (
    <div className="flex flex-col">
      {/* ---------- Hero + search ---------- */}
      <section className="relative overflow-hidden border-b bg-muted/40">
        <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-brand-gold/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-brand-gold/5 blur-3xl" />

        <div className="relative container py-10 md:py-14">
          <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "FAQs" }]} />

          <div className="mx-auto mt-8 max-w-3xl text-center">
            <Reveal>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-gold">
                Support
              </p>
            </Reveal>

            <Reveal delay={0.08}>
              <h1 className="mt-3 text-balance text-3xl font-bold sm:text-4xl md:text-5xl">
                Frequently asked questions
              </h1>
            </Reveal>

            <Reveal delay={0.16}>
              <p className="mt-4 text-sm text-muted-foreground md:text-base">
                Everything about ordering, sizing, delivery and after-sales
                support.
              </p>
            </Reveal>

            <Reveal delay={0.24}>
              <div className="relative mx-auto mt-7 max-w-xl">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search your question — sizing, delivery, returns…"
                  aria-label="Search the FAQs"
                  className="h-12 rounded-full pl-11 pr-11 shadow-sm"
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
            </Reveal>

            <Reveal delay={0.32}>
              <p className="mt-4 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                {totalAnswers} answers across {groups.length} topics
              </p>
            </Reveal>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
            <FilterChip
              active={topic === "all"}
              label="All topics"
              count={totalAnswers}
              onClick={() => selectTopic("all")}
            />
            {groups.map((group) => (
              <FilterChip
                key={group.title}
                active={topic === group.title}
                label={group.title}
                count={group.items.length}
                onClick={() => selectTopic(group.title)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Answers ---------- */}
      <section className="container py-10 md:py-14">
        {visibleGroups.length === 0 ? (
          <EmptyState
            icon={<HelpCircle className="h-10 w-10" />}
            title="No answer matched"
            description={
              query.trim()
                ? `We could not find anything for “${query.trim()}”. Try another word, or contact us and we will answer personally.`
                : "Nothing here yet — try another topic."
            }
            action={
              <div className="flex flex-wrap justify-center gap-3">
                <Button
                  onClick={clearFilters}
                  className="rounded-full bg-brand-gold font-semibold text-white hover:bg-brand-gold-dark"
                >
                  Clear filters
                </Button>
                <Button asChild variant="outline" className="rounded-full font-semibold">
                  <Link href="/contact">Ask us directly</Link>
                </Button>
              </div>
            }
          />
        ) : (
          <div className="mx-auto max-w-4xl space-y-8">
            <p className="text-center text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Showing {matchCount} {matchCount === 1 ? "answer" : "answers"}
              {hasFilters ? " for your filters" : ""}
            </p>

            {visibleGroups.map((group, groupIndex) => {
              const GroupIcon = GROUP_ICONS[group.title] || HelpCircle;

              return (
                <Reveal
                  key={group.title}
                  delay={Math.min(groupIndex, 4) * 0.05}
                >
                  <section>
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.18em] text-brand-gold sm:text-sm">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-gold/15">
                          <GroupIcon className="h-4 w-4 text-brand-gold" />
                        </span>
                        {group.title}
                      </h2>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {group.items.length}{" "}
                        {group.items.length === 1 ? "answer" : "answers"}
                      </span>
                    </div>

                    <Card className="mt-4 rounded-2xl border-border/70 shadow-sm">
                      <CardContent className="px-5 md:px-6">
                        <Accordion type="single" collapsible>
                          {group.items.map((item) => (
                            <AccordionItem
                              key={item.question}
                              value={item.question}
                              className="border-border/70 last:border-b-0"
                            >
                              <AccordionTrigger className="text-left text-sm font-semibold hover:text-brand-gold hover:no-underline md:text-base">
                                {highlight(item.question, query)}
                              </AccordionTrigger>
                              <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                                {highlight(item.answer, query)}
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      </CardContent>
                    </Card>
                  </section>
                </Reveal>
              );
            })}
          </div>
        )}
      </section>

      {/* ---------- Help band ---------- */}
      <section className="container pb-16 md:pb-24">
        <Reveal>
          <div className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl border border-brand-gold/25 bg-gold-gradient-soft p-8 text-center md:p-12">
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-brand-gold/10 blur-3xl" />
            <div className="relative">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-gold/15">
                <LifeBuoy className="h-6 w-6 text-brand-gold" />
              </span>
              <h2 className="mt-4 text-2xl font-bold md:text-3xl">
                Still need help?
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
                Our support team answers messages during business hours — send us
                your order code and we will take it from there.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Button
                  asChild
                  size="lg"
                  className="rounded-full bg-brand-gold px-7 font-semibold text-white shadow-gold transition-all hover:bg-brand-gold-dark hover:shadow-gold-lg"
                >
                  <Link href="/contact">
                    <Mail className="mr-2 h-4 w-4" />
                    Contact support
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="rounded-full px-7 font-semibold"
                >
                  <Link href="/track-order">
                    <PackageSearch className="mr-2 h-4 w-4" />
                    Track an order
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}

/**
 * Wraps every occurrence of the search term in a gold mark so a long answer is
 * easy to scan. The term is escaped first, so regex characters stay literal.
 */
function highlight(text: string, needle: string) {
  const term = needle.trim();
  if (!term) return text;

  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));

  return parts.map((part, index) =>
    part.toLowerCase() === term.toLowerCase() ? (
      <mark
        key={index}
        className="rounded bg-brand-gold/25 px-0.5 text-foreground"
      >
        {part}
      </mark>
    ) : (
      <span key={index}>{part}</span>
    )
  );
}
