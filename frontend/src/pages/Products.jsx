import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import API from "../utils/api";
import { formatCurrencyINR } from "../utils/currency";

const Products = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [activeOffer, setActiveOffer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  const offerId = searchParams.get("offer") || "";

  // Fetch products from API
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      setError(null);
      try {
        if (offerId) {
          const { data } = await API.get("/api/offers");
          const offers = Array.isArray(data) ? data : [];
          const matchedOffer = offers.find((offer) => offer._id === offerId && offer.isActive);

          if (!matchedOffer) {
            setActiveOffer(null);
            setProducts([]);
            setError("This offer is no longer available.");
            return;
          }

          setActiveOffer(matchedOffer);
          const offerProducts = Array.isArray(matchedOffer.products) ? matchedOffer.products : [];
          setProducts(
            offerProducts.map((product) => ({
              ...product,
              originalPrice: product.originalPrice ?? product.price,
              discountedPrice: product.discountedPrice ?? product.price,
              offer: product.offer || {
                offerId: matchedOffer._id,
                offerTitle: matchedOffer.title,
                discountPercentage: matchedOffer.discountPercentage || product.discountPercentage || 0,
              },
            }))
          );
          return;
        }

        setActiveOffer(null);
        const params = new URLSearchParams();
        if (searchTerm.trim()) params.set("search", searchTerm.trim());
        if (selectedCategory !== "all") params.set("category", selectedCategory);
        if (sortBy) params.set("sort", sortBy);
        if (minPrice !== "") params.set("minPrice", minPrice);
        if (maxPrice !== "") params.set("maxPrice", maxPrice);
        const query = params.toString();
        const { data } = await API.get(`/api/products${query ? `?${query}` : ""}`);
        const items = Array.isArray(data) ? data : data.items || [];
        setProducts(items);
      } catch (err) {
        console.error("Failed to fetch products", err);
        setError("Failed to load products. Please try again later.");
        setActiveOffer(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [offerId, searchTerm, selectedCategory, sortBy, minPrice, maxPrice]);

  useEffect(() => {
    const query = searchParams.get("search") || "";
    setSearchTerm(query);
  }, [searchParams]);

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span
          key={i}
          className={`text-sm ${
            i <= Math.floor(rating)
              ? "text-yellow-400"
              : i - rating < 1
              ? "text-yellow-300"
              : "text-gray-300"
          }`}
        >
          ★
        </span>
      );
    }
    return stars;
  };

  // Filter and sort products
  const filteredProducts = products
    .filter((product) => {
      const productTitle = product.title || product.name || "";
      const matchesSearch = productTitle
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      return matchesSearch;
    })
    .sort((a, b) => {
      const titleA = a.title || a.name || "";
      const titleB = b.title || b.name || "";
      switch (sortBy) {
        case "price-low":
          return a.price - b.price;
        case "price-high":
          return b.price - a.price;
        case "rating":
          return (b.averageRating || b.rating || 0) - (a.averageRating || a.rating || 0);
        case "newest":
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        case "popularity":
          return (b.totalSold || 0) - (a.totalSold || 0);
        case "name":
        default:
          return titleA.localeCompare(titleB);
      }
    });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading products...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">
            Unable to load products
          </h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            {activeOffer ? activeOffer.title : "Our Products"}
          </h1>
          <p className="text-gray-600">
            {activeOffer
              ? `Showing only products selected by admin for this ${activeOffer.discountPercentage}% offer`
              : "Discover our collection of premium fashion items"}
          </p>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="container mx-auto px-4 py-6">
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => {
                  const value = e.target.value;
                  setSearchTerm(value);
                  const nextParams = new URLSearchParams(searchParams);
                  if (value.trim()) {
                    nextParams.set("search", value);
                  } else {
                    nextParams.delete("search");
                  }
                  setSearchParams(nextParams, { replace: true });
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-2">
              <label className="text-gray-700 font-medium">Category:</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="all">All Categories</option>
                <option value="men">Men</option>
                <option value="women">Women</option>
                <option value="kids">Kids</option>
              </select>
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2">
              <label className="text-gray-700 font-medium">Sort by:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="name">Name (A-Z)</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="rating">Highest Rated</option>
                <option value="popularity">Popularity</option>
                <option value="newest">Newest</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-gray-700 font-medium">Price:</label>
              <input
                type="number"
                min="0"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                placeholder="Min"
                className="w-24 px-2 py-2 border border-gray-300 rounded-lg"
              />
              <input
                type="number"
                min="0"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="Max"
                className="w-24 px-2 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-4">
          <p className="text-gray-600">
            Showing {filteredProducts.length} of {products.length} product
            {products.length !== 1 ? "s" : ""}
          </p>
          {activeOffer ? (
            <p className="text-sm text-blue-600 mt-1">
              Only admin-selected offer products are listed here.
            </p>
          ) : null}
        </div>

        {/* Products Grid */}
        {products.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              No products available
            </h3>
            <p className="text-gray-600">
              Check back later for new products
            </p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              No products found
            </h3>
            <p className="text-gray-600">
              Try adjusting your filters or search term
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => {
              const hasDiscount =
                Number(product.discountedPrice) > 0 &&
                Number(product.discountedPrice) < Number(product.originalPrice ?? product.price);
              const currentPrice = hasDiscount
                ? product.discountedPrice
                : product.price;
              const discountPercentage =
                product.offer?.discountPercentage || product.discountPercentage || 0;

              return (
              <div
                key={product._id}
                className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 overflow-hidden group"
              >
                {/* Product Image */}
                <Link
                  to={`/product/${product._id}`}
                  className="block relative h-64 bg-gray-100 overflow-hidden"
                >
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/400x300?text=No+Image';
                    }}
                  />
                  {/* Quick View */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <span className="bg-white text-gray-800 px-4 py-2 rounded-full text-sm font-medium shadow-lg">
                      Quick View
                    </span>
                  </div>
                  {hasDiscount && (
                    <span className="absolute top-3 left-3 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                      {discountPercentage}% OFF
                    </span>
                  )}
                </Link>

                {/* Product Info */}
                <div className="p-5">
                  <div className="mb-2">
                    <span className="text-xs font-medium text-blue-600 uppercase tracking-wide">
                      {product.category}
                    </span>
                  </div>

                  <Link
                    to={`/product/${product._id}`}
                    className="block font-semibold text-gray-800 mb-2 group-hover:text-blue-600 transition"
                  >
                    {product.title || product.name}
                  </Link>

                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                    {product.description}
                  </p>

                  {/* Rating */}
                  <div className="flex items-center mb-3">
                    <div className="flex items-center">
                      {renderStars(product.averageRating || product.rating || 0)}
                    </div>
                    <span className="text-sm text-gray-500 ml-2">
                      ({(product.averageRating || product.rating || 0).toFixed(1)})
                    </span>
                  </div>

                  {/* Price */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex flex-col">
                      <span className="text-2xl font-bold text-gray-900">
                        {formatCurrencyINR(currentPrice)}
                      </span>
                      {hasDiscount && (
                        <span className="text-sm text-gray-400 line-through">
                          {formatCurrencyINR(product.price)}
                        </span>
                      )}
                    </div>
                  </div>

                  <Link
                    to={`/product/${product._id}`}
                    className="block text-center w-full py-2 rounded-lg font-medium text-sm transition bg-gray-900 text-white hover:bg-blue-600"
                  >
                    View Product
                  </Link>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Products;
