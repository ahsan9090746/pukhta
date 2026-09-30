import sanitizeHtml from 'sanitize-html';

/**
 * Strict allowlist for admin-authored rich text (product short/long
 * description and category description). Scripts, event handlers,
 * javascript: URLs, iframes, etc. are always discarded. `text-align`
 * styles survive via allowedStyles; everything else in `style` is dropped.
 */
const RICH_TEXT_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'p',
    'br',
    'strong',
    'b',
    'em',
    'i',
    'u',
    's',
    'strike',
    'h1',
    'h2',
    'h3',
    'ul',
    'ol',
    'li',
    'a',
    'blockquote',
    'code',
    'pre',
    'hr',
  ],
  allowedAttributes: {
    '*': ['style'],
    a: ['href', 'title'],
  },
  allowedStyles: {
    '*': {
      'text-align': [/^left$/, /^center$/, /^right$/, /^justify$/],
    },
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowProtocolRelative: false,
  disallowedTagsMode: 'discard',
};

const CONTAINS_HTML = /<\/?[a-z][^>]*>/i;

/**
 * Sanitizes a rich-text field on save. Legacy plain-text values (no tags)
 * pass through byte-for-byte so existing content is never altered.
 */
export const sanitizeRichText = (value: unknown): string => {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string') return String(value);
  if (!CONTAINS_HTML.test(value)) return value;
  return sanitizeHtml(value, RICH_TEXT_OPTIONS);
};
