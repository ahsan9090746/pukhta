"use client";

import { Suspense, useState } from "react";
import { motion } from "framer-motion";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Product, Category } from "@/types";
import ProductCard from "@/components/product/product-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Search,
  SlidersHorizontal,
  Grid3X3,
  List,
  X,
  ChevronDown,
} from "lucide-react";

const sizes = ["US 6", "US 7", "US 8", "US 9", "US 10", "US 11", "US 12"];
const colors = [
  { name: "Black", value: "#000000" },
  { name: "White", value: "#ffffff" },
  { name: "Red", value: "#ef4444" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Green", value: "#22c55e" },
  { name: "Brown", value: "#a16207" },
];

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="container py-8 text-center">Loading...</div>}>
      <ProductsContent />
    </Suspense>
  );
}

function ProductsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    searchParams.get("category")?.split(",") || []
  );
  const [selectedSizes, setSelectedSizes] = useState<string[]>(
    searchParams.get("size")?.split(",") || []
  );
  const [selectedColors, setSelectedColors] = useState<string[]>(
    searchParams.get("color")?.split(",") || []
  );
  const [priceRange, setPriceRange] = useState([
    Number(searchParams.get("minPrice")) || 0,
    Number(searchParams.get("maxPrice")) || 1000,
  ]);
  const [sortBy, setSortBy] = useState(searchParams.get("sort") || "-createdAt");
  const [page, setPage] = useState(Number(searchParams.get("page")) || 1);
  const [searchQuery, setSearchQuery] = useState(
    searchParams.get("search") || ""
  );

  const buildQueryParams = () => {
    const params = new URLSearchParams();
    if (selectedCategories.length)
      params.set("category", selectedCategories.join(","));
    if (selectedSizes.length) params.set("size", selectedSizes.join(","));
    if (selectedColors.length) params.set("color", selectedColors.join(","));
    if (priceRange[0] > 0) params.set("minPrice", priceRange[0].toString());
    if (priceRange[1] < 1000) params.set("maxPrice", priceRange[1].toString());
    params.set("sort", sortBy);
    params.set("page", page.toString());
    if (searchQuery) params.set("search", searchQuery);
    return params.toString();
  };

  const { data: products, isLoading } = useQuery({
    queryKey: [
      "products",
      selectedCategories,
      selectedSizes,
      selectedColors,
      priceRange,
      sortBy,
      page,
      searchQuery,
    ],
    queryFn: () =>
      api
        .get(`/products?${buildQueryParams()}`)
        .then((res) => res.data.data),
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () =>
      api.get("/categories?limit=50").then((res) => res.data.data.data ?? []),
  });


  const toggleFilter = (
    selected: string[],
    setSelected: (val: string[]) => void,
    value: string
  ) => {
    if (selected.includes(value)) {
      setSelected(selected.filter((v) => v !== value));
    } else {
      setSelected([...selected, value]);
    }
    setPage(1);
  };

  const clearFilters = () => {
    setSelectedCategories([]);
    setSelectedSizes([]);
    setSelectedColors([]);
    setPriceRange([0, 1000]);
    setSearchQuery("");
    setPage(1);
  };

  const activeFilterCount =
    selectedCategories.length +
    selectedSizes.length +
    selectedColors.length;

  return (
    <div className="container py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {showFilters && (
          <motion.aside
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-full lg:w-64 shrink-0"
          >
            <div className="sticky top-24 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Filters</h3>
                {activeFilterCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    Clear all
                  </Button>
                )}
              </div>

              <div>
                <h4 className="font-medium mb-3">Categories</h4>
                <div className="space-y-2">
                  {(categories || []).map((category: Category) => (
                    <div key={category._id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`cat-${category._id}`}
                        checked={selectedCategories.includes(category._id)}
                        onCheckedChange={() =>
                          toggleFilter(
                            selectedCategories,
                            setSelectedCategories,
                            category._id
                          )
                        }
                      />
                      <Label
                        htmlFor={`cat-${category._id}`}
                        className="text-sm cursor-pointer"
                      >
                        {category.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />



              <div>
                <h4 className="font-medium mb-3">Sizes</h4>
                <div className="flex flex-wrap gap-2">
                  {sizes.map((size) => (
                    <Button
                      key={size}
                      variant={
                        selectedSizes.includes(size) ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() =>
                        toggleFilter(selectedSizes, setSelectedSizes, size)
                      }
                    >
                      {size}
                    </Button>
                  ))}
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-3">Colors</h4>
                <div className="flex flex-wrap gap-2">
                  {colors.map((color) => (
                    <button
                      key={color.value}
                      onClick={() =>
                        toggleFilter(
                          selectedColors,
                          setSelectedColors,
                          color.value
                        )
                      }
                      className={`h-8 w-8 rounded-full border-2 ${
                        selectedColors.includes(color.value)
                          ? "border-primary ring-2 ring-primary ring-offset-2"
                          : "border-gray-200"
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
            </div>
          </motion.aside>
        )}

        <div className="flex-1">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold">All Products</h1>
              <p className="text-muted-foreground">
                {products?.total || 0} products found
              </p>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  className="pl-9 w-full sm:w-64"
                />
              </div>

              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowFilters(!showFilters)}
                className={showFilters ? "bg-primary text-primary-foreground" : ""}
              >
                <SlidersHorizontal className="h-4 w-4" />
              </Button>

              <div className="flex border rounded-md">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setViewMode("grid")}
                  className={viewMode === "grid" ? "bg-muted" : ""}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setViewMode("list")}
                  className={viewMode === "list" ? "bg-muted" : ""}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="-createdAt">Newest</SelectItem>
                  <SelectItem value="createdAt">Oldest</SelectItem>
                  <SelectItem value="price">Price: Low to High</SelectItem>
                  <SelectItem value="-price">Price: High to Low</SelectItem>
                  <SelectItem value="-sold">Best Selling</SelectItem>
                  <SelectItem value="-rating">Highest Rated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {activeFilterCount > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {selectedCategories.map((catId) => {
                const cat = categories?.find((c: Category) => c._id === catId);
                return (
                  <Badge key={catId} variant="secondary" className="gap-1">
                    {cat?.name}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() =>
                        toggleFilter(
                          selectedCategories,
                          setSelectedCategories,
                          catId
                        )
                      }
                    />
                  </Badge>
                );
              })}
            </div>
          )}

          {isLoading ? (
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
                  : "space-y-4"
              }
            >
              {[...Array(8)].map((_, i) => (
                <Skeleton
                  key={i}
                  className={viewMode === "grid" ? "h-96 rounded-xl" : "h-32 rounded-xl"}
                />
              ))}
            </div>
          ) : products?.data?.length === 0 ? (
            <div className="text-center py-16">
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold">No products found</h3>
              <p className="text-muted-foreground mb-4">
                Try adjusting your filters or search query
              </p>
              <Button onClick={clearFilters}>Clear Filters</Button>
            </div>
          ) : (
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
                  : "space-y-4"
              }
            >
              {products?.data?.map((product: Product) => (
                <motion.div
                  key={product._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <ProductCard product={product} viewMode={viewMode} />
                </motion.div>
              ))}
            </div>
          )}

          {products?.pagination?.pages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <Button
                variant="outline"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              {Array.from(
                { length: products.pagination.pages },
                (_, i) => i + 1
              )
                .filter(
                  (p) =>
                    p === 1 ||
                    p === products.pagination.pages ||
                    Math.abs(p - page) <= 2
                )
                .reduce<(number | string)[]>((acc, p, i, arr) => {
                  if (i > 0 && p - (arr[i - 1] as number) > 1) {
                    acc.push("...");
                  }
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  typeof p === "string" ? (
                    <span key={`dots-${i}`} className="px-2">
                      ...
                    </span>
                  ) : (
                    <Button
                      key={p}
                      variant={page === p ? "default" : "outline"}
                      size="icon"
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </Button>
                  )
                )}
              <Button
                variant="outline"
                onClick={() =>
                  setPage(Math.min(products.pagination.pages, page + 1))
                }
                disabled={page === products.pagination.pages}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
