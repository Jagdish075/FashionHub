import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import API from "../utils/api";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import { formatCurrencyINR } from "../utils/currency";
import WishlistButton from "../components/WishlistButton";
import ReviewForm from "../components/ReviewForm";
import ProductReviews from "../components/ProductReviews";

const ProductDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [reviewsRefreshKey, setReviewsRefreshKey] = useState(0);
  
  // Use AuthContext for authentication
  const { isAuthenticated, storePendingAction } = useAuth();

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      try {
        const { data } = await API.get(`/api/products/${id}`);
        setProduct(data);
        if (data.sizes && data.sizes.length > 0) {
          setSelectedSize(data.sizes[0]);
        }
        if (data.colors && data.colors.length > 0) {
          setSelectedColor(data.colors[0]);
        }
      } catch (err) {
        console.error("Failed to fetch product", err);
        setProduct(null);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  const handleQuantityChange = (delta) => {
    const selectedSizeStock =
      selectedSize && Array.isArray(product?.sizeInventory)
        ? Number(product.sizeInventory.find((entry) => entry.size === selectedSize)?.quantity || 0)
        : null;
    const maxStock = selectedSizeStock ?? (product?.stockQuantity ?? product?.stock ?? 99);
    setQuantity((prev) =>
      Math.max(1, Math.min(maxStock, prev + delta))
    );
  };

  const handleAddToCart = async () => {
    const hasSizes = Array.isArray(product?.sizes) && product.sizes.length > 0;
    if (hasSizes && !selectedSize) {
      toast.error("Please select a size");
      return;
    }

    // Check authentication using AuthContext
    if (!isAuthenticated) {
      // Store pending action for after login
      storePendingAction({
        action: 'addToCart',
        productId: product._id,
        quantity,
        size: selectedSize || "",
        color: selectedColor || ""
      });
      toast.info("Please login to add items to cart");
      return;
    }

    try {
      await API.post("/api/cart", {
        productId: product._id,
        quantity,
        size: selectedSize || "",
        color: selectedColor || "",
      });
      toast.success(`${product.title || product.name} added to cart!`);
    } catch (err) {
      console.error("Failed to add to cart", err);
      toast.error("Failed to add to cart. Please try again.");
    }
  };

  const handleBuyNow = async () => {
    const hasSizes = Array.isArray(product?.sizes) && product.sizes.length > 0;
    if (hasSizes && !selectedSize) {
      toast.error("Please select a size");
      return;
    }

    // Check authentication using AuthContext
    if (!isAuthenticated) {
      // Store pending action and redirect to login
      storePendingAction({
        action: 'buyNow',
        productId: product._id,
        quantity,
        size: selectedSize,
        color: selectedColor || ""
      });
      navigate("/login?redirect=/checkout");
      return;
    }

    await handleAddToCart();
    navigate("/checkout");
  };

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span
          key={i}
          className={`text-lg ${
            i <= Math.floor(rating || 0)
              ? "text-yellow-400"
              : i - (rating || 0) < 1
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading product details...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Product Not Found
          </h2>
          <p className="text-gray-600 mb-6">
            The product you are looking for does not exist or has been removed.
          </p>
          <Link
            to="/"
            className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  const productImages = product.images || (product.image ? [product.image] : []);
  const hasDiscount =
    Number(product.discountedPrice) > 0 &&
    Number(product.discountedPrice) < Number(product.price);
  const currentPrice = hasDiscount ? product.discountedPrice : product.price;
  const availableStock = (() => {
    if (selectedSize && Array.isArray(product.sizeInventory) && product.sizeInventory.length > 0) {
      return Number(product.sizeInventory.find((entry) => entry.size === selectedSize)?.quantity || 0)
    }
    return Number(product.stockQuantity ?? product.stock ?? 0)
  })();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <nav className="flex items-center space-x-2 text-sm">
            <Link to="/" className="text-gray-500 hover:text-blue-600">
              Home
            </Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-800 font-medium truncate max-w-xs">
              {product.title || product.name}
            </span>
          </nav>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
            <div className="space-y-4">
              <div className="relative bg-gray-100 rounded-xl overflow-hidden aspect-[4/5] max-h-[560px]">
                <img
                  src={productImages[activeImage] || product.image}
                  alt={product.title || product.name}
                  className="w-full h-full object-cover"
                />
              </div>

              {productImages.length > 1 && (
                <div className="flex space-x-3 overflow-x-auto pb-2">
                  {productImages.map((img, index) => (
                    <button
                      key={index}
                      onClick={() => setActiveImage(index)}
                      className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition ${
                        activeImage === index
                          ? "border-blue-600"
                          : "border-transparent hover:border-gray-300"
                      }`}
                    >
                      <img
                        src={img}
                        alt={`${product.title || product.name} ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                    {product.category?.charAt(0).toUpperCase() +
                      product.category?.slice(1) ||
                      "Uncategorized"}
                  </span>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-3">
                  {product.title || product.name}
                </h1>
                {(product.averageRating || product.rating) && (
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1">
                      {renderStars(product.averageRating || product.rating)}
                    </div>
                    <span className="text-gray-600">
                      {(product.averageRating || product.rating || 0).toFixed(1)} ({product.reviewCount || product.reviews || 0} reviews)
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-baseline space-x-3">
                <span className="text-3xl font-bold text-gray-900">
                  {formatCurrencyINR(currentPrice)}
                </span>
                {hasDiscount && (
                  <span className="text-lg text-gray-400 line-through">
                    {formatCurrencyINR(product.price)}
                  </span>
                )}
                {hasDiscount && (
                  <span className="px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-semibold">
                    {product.offer?.discountPercentage || 0}% OFF
                  </span>
                )}
              </div>

              {product.description && (
                <p className="text-gray-600 leading-relaxed">
                  {product.description}
                </p>
              )}

              {product.sizes && product.sizes.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-semibold text-gray-800">Size</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {product.sizes.map((size) => (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        className={`w-12 h-12 rounded-lg font-medium transition ${
                          selectedSize === size
                            ? "bg-gray-900 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-6">
                <span className="font-semibold text-gray-800 block mb-3">
                  Quantity
                </span>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center bg-gray-100 rounded-lg">
                    <button
                      onClick={() => handleQuantityChange(-1)}
                      className="w-12 h-12 flex items-center justify-center text-gray-600 hover:bg-gray-200 rounded-l-lg transition"
                    >
                      -
                    </button>
                    <span className="w-16 text-center font-semibold text-gray-900">
                      {quantity}
                    </span>
                    <button
                      onClick={() => handleQuantityChange(1)}
                      disabled={quantity >= availableStock}
                      className="w-12 h-12 flex items-center justify-center text-gray-600 hover:bg-gray-200 rounded-r-lg transition"
                    >
                      +
                    </button>
                  </div>
                  <span className="text-sm text-gray-500">
                    {availableStock > 0 ? `${availableStock} in stock` : "Out of stock"}
                  </span>
                </div>
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={handleAddToCart}
                  disabled={availableStock === 0 || ((product.sizes?.length || 0) > 0 && !selectedSize)}
                  className={`flex-1 py-3 rounded-lg font-semibold text-base transition ${
                    availableStock === 0 || ((product.sizes?.length || 0) > 0 && !selectedSize)
                      ? "bg-gray-300 cursor-not-allowed"
                      : "bg-gray-900 text-white hover:bg-blue-600"
                  }`}
                >
                  Add to Cart
                </button>
                <button
                  onClick={handleBuyNow}
                  disabled={availableStock === 0 || ((product.sizes?.length || 0) > 0 && !selectedSize)}
                  className={`flex-1 py-3 rounded-lg font-semibold text-base transition ${
                    availableStock === 0 || ((product.sizes?.length || 0) > 0 && !selectedSize)
                      ? "bg-gray-300 cursor-not-allowed"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  Buy Now
                </button>
              </div>
              <WishlistButton productId={product._id} />

              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <div className="flex items-center space-x-3 text-gray-600">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                  <span>Free shipping on orders over ₹1000</span>
                </div>
                <div className="flex items-center space-x-3 text-gray-600">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>30-day easy returns</span>
                </div>
                <div className="flex items-center space-x-3 text-gray-600">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span>Secure checkout</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
          <ReviewForm
            productId={product._id}
            onSubmitted={() => {
              setReviewsRefreshKey((prev) => prev + 1);
            }}
          />
          <ProductReviews productId={product._id} refreshKey={reviewsRefreshKey} />
        </div>

      </div>
    </div>
  );
};

export default ProductDetails;
