import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { trackEvent } from "@/lib/analytics";

interface CartItem {
  _id: string;
  product: any;
  /** Variant _id for the chosen size — used to deduct the correct variant stock. */
  variantId?: string;
  size: string;
  color: string;
  quantity: number;
  price: number;
}

interface CartState {
  items: CartItem[];
  setItems: (items: CartItem[]) => void;
  addItem: (item: CartItem) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      setItems: (items) => set({ items }),
      addItem: (item) => {
        set((state) => ({
          items: [...state.items, item],
        }));

        // Analytics: add_to_cart funnel event (fire-and-forget, deduped server-side)
        try {
          const productId =
            typeof item.product === "string" ? item.product : item.product?._id;
          if (productId && typeof window !== "undefined") {
            trackEvent("add_to_cart", {
              productId: String(productId),
              path: window.location.pathname,
            });
          }
        } catch {
          // analytics must never break the cart
        }
      },
      removeItem: (itemId) =>
        set((state) => ({
          items: state.items.filter((item) => item._id !== itemId),
        })),
      updateQuantity: (itemId, quantity) =>
        set((state) => ({
          items: state.items.map((item) =>
            item._id === itemId ? { ...item, quantity } : item
          ),
        })),
      clearCart: () => set({ items: [] }),
      getTotal: () => {
        const { items } = get();
        return items.reduce((total, item) => total + item.price * item.quantity, 0);
      },
      getItemCount: () => {
        const { items } = get();
        return items.reduce((count, item) => count + item.quantity, 0);
      },
    }),
    {
      name: "footware-cart",
      storage: createJSONStorage(() => localStorage),
    }
  )
);