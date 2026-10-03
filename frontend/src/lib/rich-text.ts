import DOMPurify from "isomorphic-dompurify";

/**
 * Rich-text (WYSIWYG) helpers.
 *
 * Admins write product/category descriptions in the rich text editor, which
 * stores HTML in the existing String fields. Legacy plain-text descriptions
 * must keep working, so every helper branches on whether the stored value
 * actually contains markup.
 */

/** Tags the storefront is allowed to render from admin-authored HTML. */
const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "h1",
  "h2",
  "h3",
  "ul",
  "ol",
  "li",
  "a",
  "blockquote",
  "code",
  "pre",
  "hr",
];

const ALLOWED_ATTR = ["href", "title", "style"];

/** Heuristic: does this value contain HTML markup (vs. legacy plain text)? */
export function isRichText(value?: string | null): boolean {
  if (!value) return false;
  return /<\/?(?:p|br|strong|b|em|i|u|s|h[1-6]|ul|ol|li|a|div|span|blockquote|code|pre|hr)\b/i.test(
    value
  );
}

/**
 * Sanitizes rich text right before rendering it on a page.
 * Strips scripts, event handlers, unsafe URLs, and anything outside the
 * allowlist. `style` is kept but DOMPurify filters its CSS properties
 * (e.g. `text-align` survives; `expression()`/`url()` do not).
 */
export function sanitizeRichText(value?: string | null): string {
  if (!value) return "";
  if (!isRichText(value)) return value; // legacy plain text — nothing to sanitize
  return DOMPurify.sanitize(value, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
  });
}

/**
 * Flattens rich text to plain text for compact previews (line-clamped
 * snippets, compare-table cells, drawers) so raw tags are never shown.
 */
export function richTextToPlainText(value?: string | null): string {
  if (!value) return "";
  if (!isRichText(value)) return value;
  return DOMPurify.sanitize(value, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
