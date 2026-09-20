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
  category: Category;
  variants: Variant[];
  specifications: Specification[];
  rating: number;
  reviewCount: number;
  sold: number;
  featured: boolean;
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
  parent?: Category;
  subcategories?: Category[];
  productCount?: number;
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
  rating: number;
  title?: string;
  comment: string;
  helpfulCount: number;
  status: string;
  createdAt: string;
}

export interface Banner {
  _id: string;
  title: string;
  subtitle?: string;
  image: string;
  link?: string;
  order: number;
  active: boolean;
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
