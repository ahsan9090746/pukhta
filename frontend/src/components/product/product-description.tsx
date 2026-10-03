"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { isRichText, sanitizeRichText } from "@/lib/rich-text";

/**
 * Product description renderer.
 *
 * Descriptions are stored as plain text (paragraphs separated by blank lines)
 * and usually end with an "FAQs" section written as question / answer lines.
 * This renders that text with the storefront typography:
 *
 *   • paragraphs  → 17px, relaxed leading, 24px between paragraphs
 *   • "FAQs"      → section heading (20px bold) with extra space above
 *   • "…?" lines  → question headings (20px bold), answer right below
 *   • "- item"    → gold-marker bullet list
 *   • **bold**    → semibold text
 *   • [label](url) → gold product link
 *
 * Admin "Text Styling" values (Tailwind classes) override the defaults.
 */

type DescriptionBlock =
  | { type: "heading"; text: string }
  | { type: "question"; text: string }
  | { type: "list"; items: string[] }
  | { type: "paragraph"; text: string };

const FAQ_HEADINGS = ["faqs", "faq", "frequently asked questions"];

const isQuestionLine = (text: string) =>
  text.endsWith("?") &&
  text.length <= 160 &&
  // "Looking for more styles? Explore …" is a sentence that happens to contain a
  // question mark — only treat a line as a question when it stands alone.
  !/[.!]/.test(text.slice(0, -1));

/** Splits the stored description into typed blocks for rendering. */
export function parseDescription(raw: string | null | undefined): DescriptionBlock[] {
  const lines = (raw || "").replace(/\r\n?/g, "\n").split("\n");
  const blocks: DescriptionBlock[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push({ type: "paragraph", text: paragraph.join(" ").trim() });
      paragraph = [];
    }
  };

  const flushList = () => {
    if (list.length) {
      blocks.push({ type: "list", items: [...list] });
      list = [];
    }
  };

  lines.forEach((line) => {
    const text = line.trim();

    if (!text) {
      flushParagraph();
      flushList();
      return;
    }

    if (FAQ_HEADINGS.includes(text.toLowerCase())) {
      flushParagraph();
      flushList();
      blocks.push({ type: "heading", text });
      return;
    }

    if (/^[-*•]\s+/.test(text)) {
      flushParagraph();
      list.push(text.replace(/^[-*•]\s+/, "").trim());
      return;
    }

    if (isQuestionLine(text)) {
      flushParagraph();
      flushList();
      blocks.push({ type: "question", text });
      return;
    }

    flushList();
    paragraph.push(text);
  });

  flushParagraph();
  flushList();

  return blocks;
}

/** Inline formatting: `**bold**` and `[label](url)` (gold product links). */
const INLINE_PATTERN = /(\*\*[^*]+\*\*|\[[^\]]+\]\((?:https?:\/\/|\/)[^)]+\))/g;

function renderInline(text: string, keyPrefix: string) {
  return text
    .split(INLINE_PATTERN)
    .filter((part) => part !== "")
    .map((part, index) => {
      const key = `${keyPrefix}-${index}`;

      const bold = part.match(/^\*\*([^*]+)\*\*$/);
      if (bold) {
        return (
          <strong key={key} className="font-semibold text-foreground">
            {bold[1]}
          </strong>
        );
      }

      const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (link) {
        return (
          <Link
            key={key}
            href={link[2]}
            className="font-semibold text-brand-gold underline-offset-2 hover:underline"
          >
            {link[1]}
          </Link>
        );
      }

      return <span key={key}>{part}</span>;
    });
}


interface ProductDescriptionProps {
  description?: string | null;
  /** Admin "Text Styling" settings — Tailwind classes that override the defaults. */
  styling?: {
    descFontSize?: string;
    descFontWeight?: string;
    descStyle?: string;
  } | null;
}

export default function ProductDescription({
  description,
  styling,
}: ProductDescriptionProps) {
  const bodyText = cn(
    "text-[17px] leading-[1.75] text-foreground/80",
    styling?.descFontWeight || "",
    styling?.descStyle || "",
    styling?.descFontSize || ""
  );

  // Rich-text (HTML) descriptions from the admin editor — sanitized right
  // before rendering. Legacy plain-text descriptions use the block parser.
  const html = isRichText(description) ? sanitizeRichText(description) : "";

  if (html) {
    return (
      <div
        className={cn(
          "mx-auto max-w-6xl text-left [&_a]:font-semibold [&_a]:text-brand-gold [&_a]:underline-offset-2 [&_a]:hover:underline [&_h1]:mb-4 [&_h1]:mt-10 [&_h1]:text-3xl [&_h1]:font-bold [&_h2]:mb-3 [&_h2]:mt-9 [&_h2]:text-2xl [&_h2]:font-bold [&_h3]:mb-3 [&_h3]:mt-8 [&_h3]:text-xl [&_h3]:font-bold [&_li]:pl-1 [&_ol]:mt-6 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-6 [&_p]:first:mt-0 [&_p]:mt-6 [&_strong]:font-semibold [&_strong]:text-foreground [&_ul]:marker:text-brand-gold [&_ul]:mt-6 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6",
          bodyText
        )}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  const blocks = parseDescription(description);

  if (!blocks.length) {
    return (
      <p className={cn("mx-auto max-w-6xl", bodyText)}>
        No description available for this product.
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-6xl text-left">
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          return (
            <h3
              key={index}
              className="mt-12 text-xl font-bold tracking-tight text-foreground first:mt-0"
            >
              {block.text}
            </h3>
          );
        }

        if (block.type === "question") {
          return (
            <h4
              key={index}
              className="mt-9 text-lg font-bold leading-snug tracking-tight text-foreground first:mt-0 md:text-xl"
            >
              {block.text}
            </h4>
          );
        }

        if (block.type === "list") {
          return (
            <ul
              key={index}
              className={cn("mt-6 list-disc space-y-2 pl-6 marker:text-brand-gold", bodyText)}
            >
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{renderInline(item, `item-${index}-${itemIndex}`)}</li>
              ))}
            </ul>
          );
        }

        return (
          <p key={index} className={cn("mt-6 first:mt-0", bodyText)}>
            {renderInline(block.text, `para-${index}`)}
          </p>
        );
      })}
    </div>
  );
}
