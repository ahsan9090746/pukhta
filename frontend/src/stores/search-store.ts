import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface SearchState {
  /** Most recent terms, newest first (max 6). */
  recent: string[];
  remember: (term: string) => void;
  forget: (term: string) => void;
  clear: () => void;
}

const MAX_RECENT = 6;

/**
 * Recently searched terms — device-local (same pattern as the guest cart and
 * wishlist stores), so the header suggestions can offer them back without an
 * account or an API round-trip.
 */
export const useSearchStore = create<SearchState>()(
  persist(
    (set, get) => ({
      recent: [],
      remember: (term) => {
        const value = term.trim();
        if (value.length < 2) return;
        const next = [
          value,
          ...get().recent.filter((item) => item.toLowerCase() !== value.toLowerCase()),
        ].slice(0, MAX_RECENT);
        set({ recent: next });
      },
      forget: (term) =>
        set({ recent: get().recent.filter((item) => item !== term) }),
      clear: () => set({ recent: [] }),
    }),
    {
      name: "footware-searches",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
