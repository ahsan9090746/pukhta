"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Category, Product } from "@/types";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ProductGallery from "@/components/product/product-gallery";
import ColorPicker from "@/components/product/color-picker";
import ProductDescription from "@/components/product/product-description";
import ReviewList from "@/components/product/review-list";
import ReviewForm from "@/components/product/review-form";
import AdditionalInformation from "@/components/product/additional-information";
import ShippingDelivery from "@/components/product/shipping-delivery";
import ProductCard from "@/components/product/product-card";
import Breadcrumb from "@/components/common/breadcrumb";
import RedirectHome from "@/components/common/redirect-home";

import { getSocialLinks } from "@/lib/social-links";
import { useCartStore } from "@/stores/cart-store";
import { useWishlistStore } from "@/stores/wishlist-store";
import { normalizeSizeLabel } from "@/lib/shoe-sizes";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Heart,
  Minus,
  Plus,
  ShoppingBag,
  Star,
  X,
  Zap,
} from "lucide-react";
import Link from "next/link";

/** All sizes offered for a product (variant sizes + the simple `sizes` array). */
const getUniqueSizes = (product: Product) =>
  [
    ...new Set<string>([
      ...(product.variants?.map((v: any) => v.size).filter(Boolean) || []),
      ...(product.sizes || []),
    ]),
  ].filter(Boolean);

/** All colours offered for a product (variant colours + the simple `colors` array). */
const getUniqueColors = (product: Product) =>
  [
    ...new Set<string>([
      ...(product.variants?.map((v: any) => v.color).filter(Boolean) || []),
      ...(product.colors || []),
    ]),
  ].filter(Boolean);

/**
 * Breadcrumb categories for a product: ALWAYS "Parent / Child" — never deeper.
 * If the product is filed directly under a level-2 sub-category, the sub's own
 * name is skipped and only its parent (the child) is shown, e.g.
 * Home / Men's Wear / Norozi Chappal / <product name>.
 */
const getCategoryCrumbs = (categories: Product["categories"]) => {
  if (!categories || categories.length === 0) return [];
  
  // Use the first category for breadcrumbs
  const category = categories[0];
  if (!category?.name) return [];

  const ancestors = category.ancestors || [];
  const root = ancestors[0];
  // A level-2 sub-category is never shown — stop at its parent (the child)
  const child =
    (category.level ?? 0) >= 2
      ? ancestors[ancestors.length - 1] ?? category.parent ?? category
      : category;

  const crumbs: { label: string; href: string }[] = [];
  if (root?.name && root._id !== child._id) {
    crumbs.push({ label: root.name, href: `/product-category/${root.slug}` });
  }
  if (child?.name) {
    crumbs.push({ label: child.name, href: `/product-category/${child.slug}` });
  }
  return crumbs;
};

/**
 * Every category this product is filed under, flattened so a parent always
 * comes before its children — e.g. Men's Wear → Charsadda Chappal → <sub>.
 * The ancestors that come populated on the product are merged in, so a product
 * linked only to a sub-category still lists its parent chain, and duplicates
 * (product linked to both a parent and its child) appear once.
 */
const getLinkedCategories = (categories: Product["categories"]) => {
  if (!categories || categories.length === 0) return [];

  const unique = new Map<string, Category>();
  categories.forEach((category) => {
    [...(category.ancestors || []), category].forEach((item) => {
      if (item?.name && !unique.has(item._id)) unique.set(item._id, item);
    });
  });

  return [...unique.values()].sort(
    (a, b) => (a.level ?? 0) - (b.level ?? 0) || a.name.localeCompare(b.name)
  );
};

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);
  const wishlistItems = useWishlistStore((s) => s.items);
  const toggleWishlist = useWishlistStore((s) => s.toggle);

  const [selectedSize, setSelectedSize] = useState<string>("");
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [quantity, setQuantity] = useState(1);

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", params.slug],
    queryFn: () =>
      api.get(`/products/${params.slug}`).then((res) => res.data.data.product),
  });

  // Wishlist lives in localStorage — no login, no API round-trip
  const isWishlisted =
    !!product && wishlistItems.some((p) => p._id === product._id);

  const { data: reviews } = useQuery({
    queryKey: ["reviews", product?._id],
    queryFn: () =>
      api
        .get(`/reviews/product/${product?._id}?limit=50`)
        .then((res) => res.data.data),
    enabled: !!product?._id,
  });

  const { data: relatedProducts } = useQuery({
    queryKey: ["related-products", product?.categories?.[0]?._id],
    queryFn: () =>
      api
        .get(`/products?categories=${product?.categories?.[0]?._id}&limit=4`)
        .then((res) => res.data.data.data ?? []),
    enabled: !!product?.categories?.[0]?._id,
  });

  // Store settings — used for social links + shipping tab content
  const { data: settings } = useQuery({
    queryKey: ["site-settings"],
    queryFn: () => api.get("/settings").then((res) => res.data.data.settings),
    staleTime: 5 * 60 * 1000,
  });

  const validateSelection = (): boolean => {
    if (!product) return false;
    if (getUniqueSizes(product).length > 0 && !selectedSize) {
      toast.error("Please select a size");
      return false;
    }
    if (!selectedColor && getUniqueColors(product).length > 0) {
      toast.error("Please select a color");
      return false;
    }
    return true;
  };

  // Add to the local (guest-friendly) cart — same store the checkout page reads from
  const buildCartItem = () => {
    const variant = (product.variants || []).find(
      (v: any) =>
        (v.size || "") === selectedSize &&
        (!selectedColor || !v.color || v.color === selectedColor)
    );

    return {
      _id: `${product._id}-${selectedSize}-${selectedColor}`,
      product: {
        _id: product._id,
        name: product.name,
        slug: product.slug,
        images: product.images,
      },
      variantId: variant?._id,
      size: selectedSize,
      color: selectedColor,
      quantity,
      price: product.price,
    };
  };

  const handleAddToCart = () => {
    if (!validateSelection()) return;
    addItem(buildCartItem());
    toast.success("Added to cart", { description: product.name });
  };

  const handleBuyNow = () => {
    if (!validateSelection()) return;
    addItem(buildCartItem());
    toast.success("Added to cart", { description: product.name });
    // Login-free checkout — guests can order directly
    router.push("/checkout");
  };

  const handleAddToWishlist = () => {
    if (!product) return;
    const added = toggleWishlist(product);
    toast.success(added ? "Added to wishlist" : "Removed from wishlist");
  };

  const incrementQuantity = () => {
    if (quantity < (product?.stock || 10)) {
      setQuantity(quantity + 1);
    }
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  if (isLoading) {
    return (
      <div className="container py-6 md:py-10">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
          <div className="flex gap-3">
            <div className="hidden w-20 space-y-2 md:block">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-16 rounded-lg" />
              ))}
            </div>
            <Skeleton className="aspect-square flex-1 rounded-2xl" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-9 w-3/4" />
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-9 w-40" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-11 w-56" />
            <div className="flex flex-wrap gap-3">
              <Skeleton className="h-11 w-32" />
              <Skeleton className="h-11 w-36" />
              <Skeleton className="h-11 w-32" />
            </div>
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return <RedirectHome />;
  }

  const hasDiscount =
    !!product.compareAtPrice && product.compareAtPrice > product.price;
  const discountPercent = hasDiscount
    ? Math.round(
        ((product.compareAtPrice! - product.price) / product.compareAtPrice!) * 100
      )
    : 0;

  const sizes = getUniqueSizes(product);
  const colors = getUniqueColors(product);
  const reviewCount = reviews?.pagination?.total ?? product.reviewCount ?? 0;
  const ratingValue = product.rating || 0;

  const sizeAvailable = (size: string) => {
    if (!product.variants?.length) return true;
    return product.variants.some((v: any) => v.size === size && v.stock > 0);
  };

  const socials = getSocialLinks(settings?.socialMedia);
  const linkedCategories = getLinkedCategories(product.categories);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="container pb-28 pt-6 md:pb-24 md:pt-10 lg:pb-10"
    >
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-2 lg:gap-12">
        {/* Left — gallery */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="lg:sticky lg:top-24"
        >
          <ProductGallery
            images={product.images || []}
            productName={product.name}
            discountPercent={discountPercent}
            isNew={product.isNewArrival}
            isOutOfStock={product.stock <= 0}
            isWishlisted={isWishlisted}
            onWishlistToggle={handleAddToWishlist}
          />
        </motion.div>

        {/* Right — buy box: name → price → short description → size → quantity →
            add to cart / buy now → SKU → categories → follow */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-4"
        >
          {/*
            Breadcrumb sits directly above the H1: Home / Parent / Child /
            <product name>. `wrap` keeps it tidy — the long product name stays on
            the category line when it fits, otherwise the whole name drops onto
            its own (small, bold) line below instead of stacking into a cramped
            multi-line block.
          */}
          <Breadcrumb
            items={[
              { label: "Home", href: "/" },
              ...getCategoryCrumbs(product.categories),
              { label: product.name },
            ]}
            wrap
          />

          <h1 className={cn(
            "leading-tight tracking-tight",
            product.textStyling?.titleFontSize || "text-2xl md:text-3xl lg:text-4xl",
            product.textStyling?.titleFontWeight || "font-bold",
            product.textStyling?.titleStyle || ""
          )}>
            {product.name}
          </h1>

          {/* Rating summary */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={cn(
                    "h-4 w-4",
                    star <= Math.round(ratingValue)
                      ? "fill-brand-gold text-brand-gold"
                      : "text-gray-300"
                  )}
                />
              ))}
            </span>
            <span className="text-muted-foreground">
              ({reviewCount} review{reviewCount === 1 ? "" : "s"})
            </span>
            {product.sold > 0 && (
              <span className="text-muted-foreground">• {product.sold} sold</span>
            )}
          </div>

          {/* Price */}
          <div className="flex flex-wrap items-baseline gap-3">
            <span className="text-3xl font-bold tracking-tight">
              Rs {product.price.toLocaleString()}
            </span>
            {hasDiscount && (
              <>
                <span className="text-lg text-muted-foreground line-through">
                  Rs {product.compareAtPrice!.toLocaleString()}
                </span>
                <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-bold text-red-600">
                  Save {discountPercent}%
                </span>
              </>
            )}
          </div>

          {/* Short description (rich text from the admin editor — sanitized) */}
          {product.shortDescription && (
            <div className="mx-auto max-w-6xl">
              <ProductDescription
                description={product.shortDescription}
                styling={product.textStyling}
              />
            </div>
          )}

          {/* Stock */}
          {product.stock <= 0 ? (
            <p className="inline-flex items-center rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600">
              Out of stock
            </p>
          ) : product.stock <= 5 ? (
            <p className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
              Hurry — only {product.stock} left in stock
            </p>
          ) : (
            <p className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              In stock — ready to ship
            </p>
          )}

          {/* Size */}
          {sizes.length > 0 && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Size
                </span>
                {selectedSize && (
                  <button
                    type="button"
                    onClick={() => setSelectedSize("")}
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" /> Clear
                  </button>
                )}
              </div>
              <Select
                value={selectedSize || undefined}
                onValueChange={setSelectedSize}
              >
                <SelectTrigger className="h-11 w-full sm:w-72">
                  <SelectValue placeholder="Choose an option" />
                </SelectTrigger>
                <SelectContent>
                  {sizes.map((size) => (
                    <SelectItem
                      key={size}
                      value={size}
                      disabled={!sizeAvailable(size)}
                    >
                      {normalizeSizeLabel(size)}
                      {!sizeAvailable(size) ? " (out of stock)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {sizes.some((size) => !size.includes("/")) && (
                <p className="text-xs text-muted-foreground">
                  Full PK / EU / US size conversion is listed in the Additional
                  Information tab.
                </p>
              )}
            </div>
          )}

          {/* Colour */}
          {colors.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Color
              </p>
              <ColorPicker
                colors={colors}
                selected={selectedColor}
                onSelect={setSelectedColor}
              />
            </div>
          )}

          {/* Quantity + actions */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <div className="flex h-11 items-center rounded-full border">
              <button
                type="button"
                onClick={decrementQuantity}
                disabled={quantity <= 1}
                aria-label="Decrease quantity"
                className="flex h-11 w-11 items-center justify-center rounded-l-full text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="w-9 text-center text-sm font-semibold">
                {quantity}
              </span>
              <button
                type="button"
                onClick={incrementQuantity}
                disabled={quantity >= product.stock}
                aria-label="Increase quantity"
                className="flex h-11 w-11 items-center justify-center rounded-r-full text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>

            <Button
              onClick={handleAddToCart}
              disabled={product.stock <= 0}
              className="h-11 flex-1 rounded-full bg-brand-gold px-6 text-sm font-bold uppercase tracking-wide text-white hover:bg-brand-gold-dark sm:flex-none sm:px-8"
            >
              <ShoppingBag className="mr-2 h-4 w-4" />
              Add to Cart
            </Button>

            <Button
              onClick={handleBuyNow}
              disabled={product.stock <= 0}
              className="h-11 flex-1 rounded-full bg-brand-gold-dark px-6 text-sm font-bold uppercase tracking-wide text-white hover:bg-brand-gold sm:flex-none sm:px-8"
            >
              <Zap className="mr-2 h-4 w-4" />
              Buy Now
            </Button>
          </div>

          <button
            type="button"
            onClick={handleAddToWishlist}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-brand-gold"
          >
            <Heart
              className={cn(
                "h-4 w-4",
                isWishlisted && "fill-brand-gold text-brand-gold"
              )}
            />
            {isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
          </button>

          {/* Meta: SKU → categories (parent → child → sub) → social links */}
          <div className="space-y-2.5 border-t pt-5 text-sm">
            <p>
              <span className="text-muted-foreground">SKU:&nbsp;</span>
              <span className="font-medium tracking-wide">{product.sku}</span>
            </p>

            {linkedCategories.length > 0 && (
              <p className="leading-relaxed">
                <span className="text-muted-foreground">Categories:&nbsp;</span>
                {linkedCategories.map((category, index) => (
                  <span key={category._id}>
                    <Link
                      href={`/product-category/${category.slug}`}
                      className="text-brand-gold hover:underline"
                    >
                      {category.name}
                    </Link>
                    {index < linkedCategories.length - 1 && (
                      <span className="text-muted-foreground">, </span>
                    )}
                  </span>
                ))}
              </p>
            )}

            {socials.length > 0 && (
              <p className="flex flex-wrap items-center gap-3 pt-0.5">
                <span className="text-muted-foreground">Follow:&nbsp;</span>
                {socials.map(({ key, label, icon: Icon, url }) => (
                  <a
                    key={key}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    title={label}
                    className="text-muted-foreground transition-colors hover:text-brand-gold"
                  >
                    <Icon className="h-[18px] w-[18px]" />
                  </a>
                ))}
              </p>
            )}
          </div>
        </motion.div>
      </div>

      {/* Description / Additional information / Reviews / Shipping and delivery */}
      <Tabs defaultValue="description" className="mt-14">
        <TabsList className="h-auto w-full flex-wrap justify-center gap-5 overflow-x-auto rounded-none border-b bg-transparent p-0 sm:gap-10">
          <TabsTrigger
            value="description"
            className="whitespace-nowrap rounded-none border-b-2 border-transparent px-0 pb-4 text-[13px] font-semibold uppercase tracking-[0.08em] text-muted-foreground data-[state=active]:border-brand-gold data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none md:text-sm"
          >
            Description
          </TabsTrigger>
          <TabsTrigger
            value="additional"
            className="whitespace-nowrap rounded-none border-b-2 border-transparent px-0 pb-4 text-[13px] font-semibold uppercase tracking-[0.08em] text-muted-foreground data-[state=active]:border-brand-gold data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none md:text-sm"
          >
            Additional Information
          </TabsTrigger>
          <TabsTrigger
            value="reviews"
            className="whitespace-nowrap rounded-none border-b-2 border-transparent px-0 pb-4 text-[13px] font-semibold uppercase tracking-[0.08em] text-muted-foreground data-[state=active]:border-brand-gold data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none md:text-sm"
          >
            Reviews ({reviewCount})
          </TabsTrigger>
          <TabsTrigger
            value="shipping"
            className="whitespace-nowrap rounded-none border-b-2 border-transparent px-0 pb-4 text-[13px] font-semibold uppercase tracking-[0.08em] text-muted-foreground data-[state=active]:border-brand-gold data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none md:text-sm"
          >
            Shipping and Delivery
          </TabsTrigger>
        </TabsList>

        {/* Description */}
        <TabsContent value="description" className="pt-8 md:pt-10">
          <ProductDescription
            description={product.description}
            styling={product.textStyling}
          />

          {product.specifications?.length > 0 && (
            <div className="mx-auto mt-10 grid max-w-6xl gap-3 text-center sm:grid-cols-2">
              {product.specifications.slice(0, 6).map((spec) => (
                <div
                  key={spec.key}
                  className="flex flex-col items-center gap-1 rounded-lg border bg-card/60 px-4 py-3.5 text-center"
                >
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {spec.key}
                  </span>
                  <span className="text-[15px] font-medium text-foreground">
                    {spec.value}
                  </span>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Additional information */}
        <TabsContent value="additional" className="pt-8 md:pt-10">
          <AdditionalInformation product={product} />
        </TabsContent>

        {/* Reviews */}
        <TabsContent value="reviews" className="pt-8 md:pt-10">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <ReviewList reviews={reviews?.data || []} />
            </div>
            <div className="lg:col-span-7">
              <ReviewForm
                productId={product._id}
                productName={product.name}
                reviewsCount={reviewCount}
              />
            </div>
          </div>
        </TabsContent>

        {/* Shipping and delivery */}
        <TabsContent value="shipping" className="pt-8 md:pt-10">
          <ShippingDelivery settings={settings} />
        </TabsContent>
      </Tabs>

      {/* Related products */}
      {relatedProducts &&
        relatedProducts.filter((p: Product) => p._id !== product._id).length >
          0 && (
          <section className="mt-16">
            <h2 className="text-xl font-bold uppercase tracking-wide">
              Related Products
            </h2>
            <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
              {relatedProducts
                .filter((p: Product) => p._id !== product._id)
                .slice(0, 4)
                .map((related: Product) => (
                  <ProductCard key={related._id} product={related} />
                ))}
            </div>
          </section>
        )}

      {/* Mobile: sticky buy bar — price + actions always in thumb reach */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-brand-gold/25 bg-background/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-lg lg:hidden">
        <div className="flex items-center gap-3">
          <div className="hidden min-[400px]:block">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {product.stock <= 0 ? "Unavailable" : "Price"}
            </p>
            <p className="font-serif text-lg font-bold leading-tight text-brand-gold">
              Rs {product.price.toLocaleString()}
            </p>
          </div>
          <Button
            onClick={handleAddToCart}
            disabled={product.stock <= 0}
            className="h-12 min-w-0 flex-1 rounded-full bg-brand-gold px-3 text-[11px] font-bold uppercase tracking-wide text-white hover:bg-brand-gold-dark sm:text-sm"
          >
            <ShoppingBag className="mr-1.5 h-4 w-4 shrink-0" />
            Add to Cart
          </Button>
          <Button
            onClick={handleBuyNow}
            disabled={product.stock <= 0}
            className="h-12 shrink-0 rounded-full bg-brand-gold-dark px-4 text-[11px] font-bold uppercase tracking-wide text-white hover:bg-brand-gold sm:text-sm"
          >
            <Zap className="mr-1.5 h-4 w-4" />
            Buy Now
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
