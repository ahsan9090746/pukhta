import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Product } from "@/types";

interface WishlistState {
  /** Saved products (full snapshot) so the wishlist page can render without any API call. */
  items: Product[];
  /** Add/remove a product. Returns true when the product is now in the wishlist. */
  toggle: (product: Product) => boolean;
  remove: (productId: string) => void;
  clear: () => void;
}

/**
 * Login-free wishlist — everything lives in localStorage (same pattern as the
 * guest cart store). No account required, works entirely offline of the API.
 */
export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      toggle: (product) => {
        const exists = get().items.some((p) => p._id === product._id);
        if (exists) {
          set({ items: get().items.filter((p) => p._id !== product._id) });
        } else {
          set({ items: [...get().items, product] });
        }
        return !exists;
      },
      remove: (productId) =>
        set({ items: get().items.filter((p) => p._id !== productId) }),
      clear: () => set({ items: [] }),
    }),
    {
      name: "footware-wishlist",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
