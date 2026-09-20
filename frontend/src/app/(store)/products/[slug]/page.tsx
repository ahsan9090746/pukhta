"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Product, Review } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import ProductGallery from "@/components/product/product-gallery";
import SizePicker from "@/components/product/size-picker";
import ColorPicker from "@/components/product/color-picker";
import ReviewList from "@/components/product/review-list";
import ReviewForm from "@/components/product/review-form";
import ProductCard from "@/components/product/product-card";
import Breadcrumb from "@/components/common/breadcrumb";
import { useCartStore } from "@/stores/cart-store";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "sonner";
import {
  Heart,
  ShoppingCart,
  Minus,
  Plus,
  Star,
  Truck,
  RotateCcw,
  ShieldCheck,
  Check,
} from "lucide-react";
import Link from "next/link";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { addItem } = useCartStore();
  const { user, isAuthenticated } = useAuthStore();

  const [selectedSize, setSelectedSize] = useState<string>("");
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const [isWishlisted, setIsWishlisted] = useState(false);

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", params.slug],
    queryFn: () =>
      api.get(`/products/${params.slug}`).then((res) => res.data.data.product),
  });

  const { data: reviews } = useQuery({
    queryKey: ["reviews", product?._id],
    queryFn: () =>
      api
        .get(`/reviews?product=${product?._id}&limit=50`)
        .then((res) => res.data.data),
    enabled: !!product?._id,
  });

  const { data: relatedProducts } = useQuery({
    queryKey: ["related-products", product?.category?._id],
    queryFn: () =>
      api
        .get(`/products?category=${product?.category?._id}&limit=4`)
        .then((res) => res.data.data.data ?? []),
    enabled: !!product?.category?._id,
  });

  const addToCartMutation = useMutation({
    mutationFn: (data: any) => api.post("/cart/items", data),
    onSuccess: () => {
      toast.success("Added to cart", {
        description: "Item has been added to your cart.",
      });
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
    onError: (error: any) => {
      toast.error("Error", {
        description: error.response?.data?.message || "Failed to add to cart",
      });
    },
  });

  const wishlistMutation = useMutation({
    mutationFn: () =>
      isWishlisted
        ? api.delete(`/wishlist/${product?._id}`)
        : api.post("/wishlist", { productId: product?._id }),
    onSuccess: () => {
      setIsWishlisted(!isWishlisted);
      toast.success(isWishlisted ? "Removed from wishlist" : "Added to wishlist");
    },
  });

  const handleAddToCart = () => {
    if (!selectedSize) {
      toast.error("Please select a size");
      return;
    }
    if (!selectedColor && product?.colors?.length > 0) {
      toast.error("Please select a color");
      return;
    }

    addToCartMutation.mutate({
      productId: product._id,
      size: selectedSize,
      color: selectedColor || product.colors?.[0],
      quantity,
    });
  };

  const handleAddToWishlist = () => {
    if (!isAuthenticated) {
      toast.error("Please login to add to wishlist");
      router.push("/login");
      return;
    }
    wishlistMutation.mutate();
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
      <div className="container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <Skeleton className="aspect-square rounded-xl" />
          <div className="space-y-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container py-16 text-center">
        <h1 className="text-2xl font-bold">Product not found</h1>
        <Link href="/products">
          <Button className="mt-4">Browse Products</Button>
        </Link>
      </div>
    );
  }

  const hasDiscount =
    product.compareAtPrice && product.compareAtPrice > product.price;
  const discountPercentage = hasDiscount
    ? Math.round(
        ((product.compareAtPrice - product.price) / product.compareAtPrice) *
          100
      )
    : 0;

  const uniqueSizes = [...new Set<string>(product.variants?.map((v: any) => v.size) || [])];
  const uniqueColors = [...new Set<string>(product.variants?.map((v: any) => v.color) || [])];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="container py-8"
    >
      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: "Products", href: "/products" },
          {
            label: product.category?.name || "Category",
            href: `/categories/${product.category?.slug}`,
          },
          { label: product.name },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mt-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <ProductGallery images={product.images || []} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
          <div>
            <h1 className="text-3xl font-bold">{product.name}</h1>
            {product.shortDescription && (
              <p className="text-muted-foreground mt-2">{product.shortDescription}</p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <div className="flex items-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-4 w-4 ${
                      star <= (product.rating || 0)
                        ? "fill-gold-500 text-gold-500"
                        : "text-gray-300"
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">
                ({reviews?.total || 0} reviews)
              </span>
            </div>
          </div>

          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold">
              Rs {product.price.toLocaleString()}
            </span>
            {hasDiscount && (
              <>
                <span className="text-xl text-muted-foreground line-through">
                  Rs {product.compareAtPrice.toLocaleString()}
                </span>
                <Badge variant="destructive">-{discountPercentage}%</Badge>
              </>
            )}
          </div>

          {product.stock > 0 ? (
            <Badge variant="outline" className="text-green-600 border-green-600">
              <Check className="h-3 w-3 mr-1" />
              In Stock ({product.stock} available)
            </Badge>
          ) : (
            <Badge variant="destructive">Out of Stock</Badge>
          )}

          <Separator />

          {uniqueSizes.length > 0 && (
            <div>
              <Label className="text-sm font-medium mb-3 block">Size</Label>
              <SizePicker
                sizes={uniqueSizes}
                selected={selectedSize}
                onSelect={setSelectedSize}
                variants={product.variants || []}
              />
            </div>
          )}

          {uniqueColors.length > 0 && (
            <div>
              <Label className="text-sm font-medium mb-3 block">Color</Label>
              <ColorPicker
                colors={uniqueColors}
                selected={selectedColor}
                onSelect={setSelectedColor}
              />
            </div>
          )}

          <div>
            <Label className="text-sm font-medium mb-3 block">Quantity</Label>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={decrementQuantity}
                disabled={quantity <= 1}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-12 text-center font-medium">{quantity}</span>
              <Button
                variant="outline"
                size="icon"
                onClick={incrementQuantity}
                disabled={quantity >= product.stock}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              size="lg"
              className="flex-1"
              onClick={handleAddToCart}
              disabled={product.stock === 0 || addToCartMutation.isPending}
            >
              <ShoppingCart className="h-5 w-5 mr-2" />
              Add to Cart
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={handleAddToWishlist}
              className={isWishlisted ? "text-red-500 border-red-500" : ""}
            >
              <Heart
                className={`h-5 w-5 ${isWishlisted ? "fill-current" : ""}`}
              />
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-4">
            {[
              { icon: Truck, text: "Free Shipping" },
              { icon: RotateCcw, text: "30-Day Returns" },
              { icon: ShieldCheck, text: "2-Year Warranty" },
            ].map(({ icon: Icon, text }, i) => (
              <div key={i} className="flex flex-col items-center text-center">
                <Icon className="h-5 w-5 text-muted-foreground mb-1" />
                <span className="text-xs text-muted-foreground">{text}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <div className="mt-16">
        <Tabs defaultValue="description">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="description">Description</TabsTrigger>
            <TabsTrigger value="specifications">Specifications</TabsTrigger>
            <TabsTrigger value="reviews">
              Reviews ({reviews?.pagination?.total || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="description" className="mt-6">
            <div className="prose max-w-none">
              <p>{product.description}</p>
            </div>
          </TabsContent>

          <TabsContent value="specifications" className="mt-6">
            <div className="grid grid-cols-2 gap-4">
              {product.specifications?.map((spec: any, i: number) => (
                <div key={i} className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">{spec.key}</span>
                  <span className="font-medium">{spec.value}</span>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="reviews" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <ReviewList reviews={reviews?.data || []} />
              </div>
              <div>
                <ReviewForm productId={product._id} />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {relatedProducts?.length > 0 && (
        <div className="mt-16">
          <h2 className="text-2xl font-bold mb-6">Related Products</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {relatedProducts.map((p: Product) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={className} {...props} />;
}
