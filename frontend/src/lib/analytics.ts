import api from "@/lib/api";

/**
 * Lightweight client-side analytics.
 *
 * Visitor identity is kept in localStorage (the app is fully decoupled and the
 * shared axios instance does not use cookies, so identity travels via
 * x-visitor-id / x-session-id headers instead).
 *  - visitorId: persists ~forever (new browser = new visitor)
 *  - sessionId: 30-minute sliding window (new tab / idle 30 min = new session)
 *
 * Every event is deduped server-side (one document per session/type/key), so
 * it is safe to fire-and-forget.
 */

const VISITOR_KEY = "fw-visitor-id";
const SESSION_KEY = "fw-session-id";
const SESSION_TTL = 30 * 60 * 1000;

export type TrackEventType =
  | "page_view"
  | "add_to_cart"
  | "checkout_started"
  | "purchase";

export interface TrackEventData {
  path?: string;
  productId?: string;
}

function uuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}-${Math.random()
    .toString(36)
    .slice(2, 12)}`;
}

function getVisitorId(): string {
  let id = localStorage.getItem(VISITOR_KEY);
  if (!id) {
    id = uuid();
    localStorage.setItem(VISITOR_KEY, id);
  }
  return id;
}

function getSessionId(): string {
  const raw = localStorage.getItem(SESSION_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as { id: string; ts: number };
      if (parsed.id && Date.now() - parsed.ts < SESSION_TTL) {
        return parsed.id;
      }
    } catch {
      // corrupted entry — recreate below
    }
  }
  const id = uuid();
  localStorage.setItem(SESSION_KEY, JSON.stringify({ id, ts: Date.now() }));
  return id;
}

/** Fire-and-forget analytics event. Never throws — analytics must not break the UX. */
export function trackEvent(type: TrackEventType, data: TrackEventData = {}): void {
  if (typeof window === "undefined") return;

  try {
    api
      .post(
        "/analytics/track",
        { type, ...data },
        {
          headers: {
            "x-visitor-id": getVisitorId(),
            "x-session-id": getSessionId(),
          },
        }
      )
      .catch(() => {});
  } catch {
    // ignore
  }
}