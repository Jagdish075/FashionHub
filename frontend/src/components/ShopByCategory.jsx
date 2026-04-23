
import React from "react";

const categories = [
  { id: "all", name: "All", image: "🛍️" },
  { id: "men", name: "Men", image: "👔" },
  { id: "women", name: "Women", image: "👗" },
  { id: "kids", name: "Kids", image: "🧒" },
];

const ShopByCategory = ({ selectedCategory, setSelectedCategory, categoryCounts = {} }) => {
  return (
    <section className="container mx-auto px-4 py-16">
      <h2 className="text-3xl font-bold text-center mb-12 text-gray-800">
        Shop by Category
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`group bg-white rounded-2xl p-8 text-center shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 ${
              selectedCategory === cat.id
                ? "ring-2 ring-blue-500 shadow-xl"
                : ""
            }`}
          >
            <div className="text-6xl mb-4 group-hover:scale-110 transition-transform">
              {cat.image}
            </div>
            <h3
              className={`text-xl font-semibold transition ${
                selectedCategory === cat.id
                  ? "text-blue-600"
                  : "text-gray-800 group-hover:text-blue-600"
              }`}
            >
              {cat.name}
            </h3>
            <p className="text-gray-500 mt-2">
              {cat.id === "all"
                ? `${categoryCounts.all || 0} Items`
                : `${categoryCounts[cat.id] || 0} Items`}
            </p>
          </button>
        ))}
      </div>
    </section>
  );
};

export default ShopByCategory;
