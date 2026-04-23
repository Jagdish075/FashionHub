
import React from "react";
import { Link } from "react-router-dom";
import { formatCurrencyINR } from "../utils/currency";

const BestSeller = ({ products }) => {
  const filteredProducts = products;

  const getCategoryDisplayName = (catId) => {
    const categoryNames = {
      all: "All",
      men: "Men",
      women: "Women",
      kids: "Kids",
    };
    return categoryNames[catId] || catId;
  };

  return (
    <section className="container mx-auto px-4 pb-16">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-bold text-gray-800">
          {getCategoryDisplayName("all")} Products
        </h2>
        <span className="text-gray-500">{filteredProducts.length} products</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {filteredProducts.length > 0 ? (
          filteredProducts.map((product) => {
            const hasDiscount = Number(product.discountedPrice) > 0 && Number(product.discountedPrice) < Number(product.price)
            const currentPrice = hasDiscount ? product.discountedPrice : product.price
            const discountPercentage = product.offer?.discountPercentage || 0

            return (
            <div
              key={product._id}
              className="bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 group"
            >
              <Link
                to={`/product/${product._id}`}
                className="block h-64 bg-gray-100 flex items-center justify-center overflow-hidden relative"
              >
                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.title || product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <span className="text-6xl">👔</span>
                )}
                {hasDiscount && (
                  <span className="absolute top-3 left-3 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                    {discountPercentage}% OFF
                  </span>
                )}
              </Link>
              <div className="p-5">
                <Link
                  to={`/product/${product._id}`}
                  className="block"
                >
                  <h3 className="font-semibold text-gray-800 mb-2 group-hover:text-blue-600 transition">
                    {product.title || product.name}
                  </h3>
                </Link>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex flex-col">
                    <span className="text-xl font-bold text-gray-900">
                      {formatCurrencyINR(currentPrice)}
                    </span>
                    {hasDiscount && (
                      <span className="text-sm text-gray-400 line-through">
                        {formatCurrencyINR(product.price)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center text-yellow-500">
                    <span>★</span>
                    <span className="text-gray-600 ml-1 text-sm">
                      {(product.averageRating || product.rating || 0).toFixed(1)}
                    </span>
                  </div>
                </div>
                <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                  {product.description}
                </p>
                <Link
                  to={`/product/${product._id}`}
                  className="block text-center w-full py-2 rounded-lg font-medium transition bg-gray-900 text-white hover:bg-blue-600"
                >
                  View Product
                </Link>
              </div>
            </div>
            )
          })
        ) : (
          <div className="col-span-4 text-center py-8">
            <p className="text-gray-600 mb-4">No products available yet.</p>
            <p className="text-sm text-gray-500">Admin hasn't added any products yet.</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default BestSeller;
