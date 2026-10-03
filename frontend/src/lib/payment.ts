/** Shared payment-method constants for checkout, confirmation, tracking. */

export const PAYMENT_METHOD_COD = 'cod';
export const PAYMENT_METHOD_BANK_DEPOSIT = 'bank_deposit';

export const PAYMENT_LABELS: Record<string, string> = {
  [PAYMENT_METHOD_COD]: 'Cash on Delivery',
  [PAYMENT_METHOD_BANK_DEPOSIT]: 'Bank Deposit',
  // Legacy values (old orders / old session data) — kept so they still render nicely.
  card: 'Credit / Debit Card',
  stripe: 'Card (Stripe)',
  paypal: 'PayPal',
};

export const BANK_DETAILS = {
  bank: 'Meezan Bank',
  title: 'Ahmad Younas',
  account: '00300108854250',
  iban: 'PK72MEZN0000300108854250',
} as const;

/**
 * Copies text to clipboard.
 * `navigator.clipboard` only exists in secure contexts (https / localhost),
 * so on plain-http LAN hosts (e.g. 192.168.x.x) it is undefined and throws —
 * hence the textarea + execCommand fallback, which works on user gesture
 * in both secure and insecure contexts.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (
      typeof navigator !== "undefined" &&
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === "function"
    ) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    throw new Error("Clipboard API unavailable");
  } catch {
    try {
      const el = document.createElement("textarea");
      el.value = text;
      el.setAttribute("readonly", "");
      el.style.position = "fixed";
      el.style.top = "0";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      // iOS Safari needs an explicit range on top of select().
      el.setSelectionRange(0, el.value.length);
      const ok = document.execCommand("copy");
      document.body.removeChild(el);
      return ok !== false;
    } catch {
      return false;
    }
  }
}
