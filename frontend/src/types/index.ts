export interface Product {
  _id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  sku: string;
  stock: number;
  costPrice?: number;
  shortDescription?: string;
  images: string[];
  sizes?: string[];
  colors?: string[];
  categories: Category[];
  category?: Category;
  variants: Variant[];
  specifications: Specification[];
  rating: number;
  reviewCount: number;
  sold: number;
  featured: boolean;
  isNewArrival: boolean;
  metaTitle?: string;
  metaDescription?: string;
  textStyling?: {
    titleFontSize?: string;
    titleFontWeight?: string;
    titleStyle?: string;
    descFontSize?: string;
    descFontWeight?: string;
    descStyle?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Variant {
  /** Mongoose subdocument id — used to target the exact variant for stock updates. */
  _id?: string;
  size: string;
  color?: string;
  /** Product-level price applies to all variants, so this mirrors Product.price. */
  price: number;
  stock: number;
  sku: string;
  image?: string;
}

export interface Specification {
  key: string;
  value: string;
}

export interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  metaTitle?: string;
  metaDescription?: string;
  parent?: Category;
  subcategories?: Category[];
  /** Nested tree returned by GET /categories/tree (parent → child → sub) */
  children?: Category[];
  productCount?: number;
  /** Active-only product count (what the storefront listing actually shows) */
  activeProductCount?: number;
  /** 0 = Parent, 1 = Child, 2 = Sub-category */
  level?: number;
  /** Full ancestor chain (root → … → direct parent), populated on product reads */
  ancestors?: Category[];
  /** Featured on the home page "Shop by Category" section (admin-selected) */
  showOnHome?: boolean;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  avatar?: string;
}

export interface Order {
  _id: string;
  orderNumber: string;
  user: User;
  items: OrderItem[];
  shippingAddress: Address;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  coupon?: string;
  trackingNumber?: string;
  createdAt: string;
}

export interface OrderItem {
  _id: string;
  product: Product;
  size: string;
  color: string;
  quantity: number;
  price: number;
}

export interface Address {
  _id: string;
  label?: string;
  fullName: string;
  phone: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault?: boolean;
}

export interface Review {
  _id: string;
  user: User;
  product: Product;
  /** Bulk fake reviews: every product the single review row applies to */
  products?: Product[];
  rating: number;
  title?: string;
  comment: string;
  helpfulCount: number;
  status: string;
  createdAt: string;
}

export interface Banner {
  _id: string;
  /** Internal label — never rendered over the artwork on the storefront */
  title: string;
  subtitle?: string;
  /** Desktop / large-screen artwork */
  image: string;
  /** Mobile artwork — the storefront falls back to `image` when empty */
  mobileImage?: string;
  /** SEO / accessibility text for the artwork */
  altText?: string;
  link?: string;
  linkType?: "url" | "product" | "categories";
  /** Banners only live in the homepage hero slider */
  position?: "hero";
  /** 1-based, unique hero position */
  sortOrder: number;
  isActive: boolean;
}

export interface Coupon {
  _id: string;
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  minPurchase: number;
  maxUses: number;
  usageCount: number;
  expiresAt?: string;
  active: boolean;
}

export interface Notification {
  _id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface Settings {
  _id: string;
  storeName: string;
  storeDescription: string;
  storeEmail: string;
  storePhone: string;
  storeAddress: string;
  storeLogo: string;
  /** Logo shown in light mode (falls back to `storeLogo`) */
  logoLight?: string;
  /** Logo shown in dark mode (falls back to `storeLogo`) */
  logoDark?: string;
  currency: string;
  freeShippingThreshold: number;
  shippingCost: number;
  socialMedia: {
    facebook: string;
    instagram: string;
    twitter: string;
    youtube: string;
    pinterest: string;
    linkedin: string;
    whatsapp: string;
    tiktok: string;
  };
  seo: {
    metaTitle: string;
    metaDescription: string;
    keywords: string[];
  };
}
