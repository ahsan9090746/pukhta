/**
 * Footwear size helpers (Pakistani / European / US conversions).
 *
 * Local chappal & footwear makers use this standard conversion:
 *   PK 7 = EU 40 = US 8  →  EU = PK + 33, US = PK + 1
 *
 * A product variant may store only `"7"`, only `"EU 40"` or the full
 * `"PK 7 / EU 40 / US 8"` label — every shape is normalised to the full one:
 *
 *   formatSizeLabel("7")        → "PK 7 / EU 40 / US 8"
 *   formatSizeLabel("EU 40")    → "PK 7 / EU 40 / US 8"
 *   formatSizeLabel("US 8")     → "PK 7 / EU 40 / US 8"
 *   formatSizeLabel("Free Size") → "Free Size"  (non-numeric labels untouched)
 */

/** Difference between the European and Pakistani scales. */
const EU_OFFSET = 33;
/** Difference between the US and Pakistani scales. */
const US_OFFSET = 1;
/** Smallest plausible numeric shoe size (bare numbers below this can't be EU). */
const EU_MIN_LIMIT = 39;
/** Largest plausible numeric shoe size (bare numbers above this aren't numeric sizes). */
const MAX_NUMERIC_SIZE = 20;

export interface ShoeSizeBreakdown {
  pk: number;
  eu: number;
  us: number;
}

const round1 = (value: number) => Number(value.toFixed(1));

/**
 * Reads the numeric value that follows a `PK` / `EU` / `US` prefix inside a
 * label such as `"PK 7 / EU 40 / US 8"`, `"EU 42"` or `"EUR 45"`.
 */
const readPrefixed = (raw: string, prefix: "PK" | "EU" | "US") => {
  const alternate = prefix === "EU" ? "(?:RO|R)?" : "";
  const match = raw.match(
    new RegExp(
      `(?:^|[^A-Za-z])${prefix}${alternate}\\s*[.:-]?\\s*(\\d{1,2}(?:\\.\\d)?)`,
      "i"
    )
  );
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
};

/**
 * Splits any supported size label into its PK / EU / US numbers.
 * Returns `null` for non-numeric labels ("S", "Free Size", ...).
 */
export function parseShoeSize(size: string | null | undefined): ShoeSizeBreakdown | null {
  const raw = (size ?? "").trim();
  if (!raw) return null;

  const pk = readPrefixed(raw, "PK");
  const eu = readPrefixed(raw, "EU");
  const us = readPrefixed(raw, "US");

  if (pk !== null && pk >= 1 && pk <= MAX_NUMERIC_SIZE) {
    return { pk: round1(pk), eu: round1(pk + EU_OFFSET), us: round1(pk + US_OFFSET) };
  }
  if (eu !== null && eu >= 1 && eu <= 60) {
    return { pk: round1(eu - EU_OFFSET), eu: round1(eu), us: round1(eu - EU_OFFSET + US_OFFSET) };
  }
  if (us !== null && us >= 1 && us <= MAX_NUMERIC_SIZE) {
    return {
      pk: round1(us - US_OFFSET),
      eu: round1(us - US_OFFSET + EU_OFFSET),
      us: round1(us),
    };
  }

  // Bare number: "7" (PK/US range) or "40" (EU range)
  const bare = raw.match(/^(\d{1,2}(?:\.\d)?)$/);
  if (bare) {
    const value = Number(bare[1]);
    if (value > 0 && value < EU_MIN_LIMIT && value <= MAX_NUMERIC_SIZE) {
      return { pk: round1(value), eu: round1(value + EU_OFFSET), us: round1(value + US_OFFSET) };
    }
    if (value >= EU_MIN_LIMIT) {
      return { pk: round1(value - EU_OFFSET), eu: round1(value), us: round1(value - EU_OFFSET + US_OFFSET) };
    }
  }

  return null;
}

/** `"7"` → `"PK 7 / EU 40 / US 8"`. Falls back to the original label. */
export function formatSizeLabel(size: string | null | undefined): string {
  const raw = (size ?? "").trim();
  const parsed = parseShoeSize(raw);
  if (!parsed) return raw;
  return `PK ${parsed.pk} / EU ${parsed.eu} / US ${parsed.us}`;
}

/** `["7", "8"]` → `"PK 7 / EU 40 / US 8, PK 8 / EU 41 / US 9"` (deduped). */
export function formatSizeList(sizes: string[] | null | undefined): string {
  const seen = new Set<string>();
  const labels: string[] = [];

  (sizes ?? []).forEach((size) => {
    const label = formatSizeLabel(size);
    if (!label || seen.has(label)) return;
    seen.add(label);
    labels.push(label);
  });

  return labels.join(", ");
}

/**
 * Tidies the spacing of a raw size label for display:
 * `"PK11 / EU44"` → `"PK 11 / EU 44"`, `"PK 7/EU 40"` → `"PK 7 / EU 40"`.
 * Labels without a PK / EU / US prefix are returned untouched.
 */
export function normalizeSizeLabel(size: string | null | undefined): string {
  const raw = (size ?? "").trim();
  if (!raw) return "";
  return raw
    .replace(/\b(PK|EU|US)\s*/gi, (_match, prefix: string) => `${prefix.toUpperCase()} `)
    .replace(/\s*\/\s*/g, " / ")
    .replace(/\s{2,}/g, " ")
    .trim();
}
