
import React, { useState, useEffect, useMemo } from "react";
import API from "../utils/api";
import { useAuth } from "../context/AuthContext";

// Components
import Hero from "../components/Hero";
import ShopByCategory from "../components/ShopByCategory";
import SpecialOffer from "../components/SpecialOffer";
import BestSeller from "../components/BestSeller";
import WelcomeSection from "../components/WelcomeSection";
import Features from "../components/Features";
import Footer from "../components/Footer";

const Home = () => {
  const [products, setProducts] = useState([]);
  const [latestProducts, setLatestProducts] = useState([]);
  const [mostPurchasedProducts, setMostPurchasedProducts] = useState([]);
  const [heroLoading, setHeroLoading] = useState(true);
  const [heroError, setHeroError] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const { user } = useAuth();

  // Fetch real products from API (public endpoint)
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const { data } = await API.get("/api/products");
        setProducts(data);
      } catch (err) {
        console.error("Failed to fetch products", err);
        setProducts([]);
      }
    };
    fetchProducts();
  }, []);

  useEffect(() => {
    const fetchHeroProducts = async () => {
      try {
        setHeroLoading(true);
        setHeroError("");
        const [{ data: latest }, { data: mostPurchased }] = await Promise.all([
          API.get("/api/products/latest?limit=6"),
          API.get("/api/products/most-purchased?limit=6"),
        ]);
        setLatestProducts(Array.isArray(latest) ? latest : []);
        setMostPurchasedProducts(Array.isArray(mostPurchased) ? mostPurchased : []);
      } catch (err) {
        console.error("Failed to fetch hero slider products", err);
        setHeroError("Unable to load featured products right now.");
      } finally {
        setHeroLoading(false);
      }
    };

    fetchHeroProducts();
  }, []);

  const filteredProducts =
    selectedCategory === "all"
      ? products
      : products.filter((p) => (p.category || "").toLowerCase() === selectedCategory);

  const categoryCounts = useMemo(() => {
    const counts = { all: products.length, men: 0, women: 0, kids: 0 };
    products.forEach((product) => {
      const category = String(product?.category || "").toLowerCase().trim();
      if (category === "men" || category === "women" || category === "kids") {
        counts[category] += 1;
      }
    });
    return counts;
  }, [products]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Hero
        latestProducts={latestProducts}
        mostPurchasedProducts={mostPurchasedProducts}
        loading={heroLoading}
        error={heroError}
      />
      <ShopByCategory
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        categoryCounts={categoryCounts}
      />
      <SpecialOffer />
      <BestSeller
        products={filteredProducts}
      />
      <WelcomeSection user={user} />
      <Features />
      <Footer />
    </div>
  );
};

export default Home;
