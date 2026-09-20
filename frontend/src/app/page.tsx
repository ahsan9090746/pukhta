"use client";

import { motion } from "framer-motion";
import HeroBanner from "@/components/home/hero-banner";
import CategoryGrid from "@/components/home/category-grid";
import CategoryShowcase from "@/components/home/category-showcase";
import FeaturedProducts from "@/components/home/featured-products";
import Newsletter from "@/components/home/newsletter";
import ProductCard from "@/components/product/product-card";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Product, Category, Banner } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const stagger = {
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

export default function HomePage() {
  const { data: banners, isLoading: bannersLoading } = useQuery({
    queryKey: ["banners"],
    queryFn: () =>
      api.get("/banners/active").then((res) => res.data.data.banners ?? []),
  });

  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: () =>
      api.get("/categories?limit=8").then((res) => res.data.data.data ?? []),
  });

  const { data: trendingProducts, isLoading: trendingLoading } = useQuery({
    queryKey: ["trending-products"],
    queryFn: () =>
      api
        .get("/products?sort=-sold&limit=8")
        .then((res) => res.data.data.data ?? []),
  });

  const { data: newArrivals, isLoading: newLoading } = useQuery({
    queryKey: ["new-arrivals"],
    queryFn: () =>
      api
        .get("/products?sort=-createdAt&limit=8")
        .then((res) => res.data.data.data ?? []),
  });

  const { data: featuredProducts, isLoading: featuredLoading } = useQuery({
    queryKey: ["featured-products"],
    queryFn: () =>
      api
        .get("/products?featured=true&limit=8")
        .then((res) => res.data.data.data ?? []),
  });

  return (
    <div className="flex flex-col">
      <section>
        <HeroBanner banners={banners || []} loading={bannersLoading} />
      </section>

      <section className="container py-16">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUp}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl font-bold text-center mb-8">
            Shop by Category
          </h2>
        </motion.div>
        {categoriesLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-xl" />
            ))}
          </div>
        ) : (
          <CategoryGrid categories={categories || []} />
        )}
      </section>

      {/* Per-category product carousels — Shop by Category ke neeche, Trending se pehle */}
      {!categoriesLoading && categories && categories.length > 0 && (
        <section className="pb-16">
          <CategoryShowcase categories={categories} />
        </section>
      )}

      <section className="container py-16">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUp}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl font-bold text-center mb-2">
            Trending Now
          </h2>
          <p className="text-muted-foreground text-center mb-10">
            Our most popular picks this season
          </p>
        </motion.div>
        {trendingLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-96 rounded-xl" />
            ))}
          </div>
        ) : (
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-2 md:grid-cols-4 gap-6"
          >
            {(trendingProducts || []).map((product: Product) => (
              <motion.div key={product._id} variants={fadeInUp}>
                <ProductCard product={product} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </section>

      <section className="bg-muted py-16">
        <div className="container">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl font-bold text-center mb-2">
              New Arrivals
            </h2>
            <p className="text-muted-foreground text-center mb-10">
              Fresh styles just dropped
            </p>
          </motion.div>
          {newLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-96 rounded-xl" />
              ))}
            </div>
          ) : (
            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="grid grid-cols-2 md:grid-cols-4 gap-6"
            >
              {(newArrivals || []).map((product: Product) => (
                <motion.div key={product._id} variants={fadeInUp}>
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </section>

      <FeaturedProducts
        products={featuredProducts || []}
        loading={featuredLoading}
      />

      <section className="container py-16">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUp}
          transition={{ duration: 0.5 }}
          className="bg-brand-black text-white rounded-3xl p-12 text-center"
        >
          <h2 className="text-3xl font-bold mb-4">
            Premium Quality Guarantee
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto mb-8">
            Every pair of shoes we sell is crafted with the finest materials and
            comes with our quality guarantee. Free delivery on every order across Pakistan.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { title: "Free Shipping", desc: "On all orders — nationwide" },
              { title: "30-Day Returns", desc: "Hassle-free returns" },
              { title: "Secure Payment", desc: "100% secure checkout" },
            ].map((item, i) => (
              <div key={i}>
                <h3 className="font-semibold mb-1">{item.title}</h3>
                <p className="text-gray-400 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      <Newsletter />
    </div>
  );
}
