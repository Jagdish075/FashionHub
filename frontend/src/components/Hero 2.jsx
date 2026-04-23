
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";

const Hero = ({ latestProducts = [], mostPurchasedProducts = [], loading, error }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const slides = [
    {
      id: 1,
      title: "Latest Uploaded Products",
      subtitle: "Fresh picks just added to the store",
      cta: "Shop Now",
      link: "/products",
      bg: "bg-gradient-to-r from-blue-700 to-indigo-600",
      products: latestProducts,
    },
    {
      id: 2,
      title: "Most Purchased Products",
      subtitle: "Customer favorites based on real orders",
      cta: "Shop Now",
      link: "/products",
      bg: "bg-gradient-to-r from-emerald-700 to-teal-600",
      products: mostPurchasedProducts,
    },
  ];

  useEffect(() => {
    if (slides.length <= 1) return undefined;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [slides.length]);

  return (
    <section className="relative h-[500px] overflow-hidden">
      {slides.map((slide, index) => (
        <div
          key={slide.id}
          className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
            index === currentSlide ? "opacity-100" : "opacity-0"
          } ${slide.bg}`}
        >
          <div className="container mx-auto px-4 h-full flex items-center">
            <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div className="max-w-2xl text-white">
              <h1 className="text-4xl md:text-5xl font-bold mb-4 animate-fade-in-up">
                {slide.title}
              </h1>
              <p className="text-xl mb-8 opacity-90 animate-fade-in-up delay-100">
                {slide.subtitle}
              </p>
              <Link
                to={slide.link}
                className="inline-block bg-white text-gray-900 px-8 py-3 rounded-full font-semibold hover:bg-gray-100 transition transform hover:scale-105 animate-fade-in-up delay-200"
              >
                {slide.cta}
              </Link>
            </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {loading ? (
                  [1, 2, 3].map((k) => (
                    <div key={k} className="rounded-xl bg-white/20 backdrop-blur-sm p-3 animate-pulse h-44" />
                  ))
                ) : slide.products?.length > 0 ? (
                  slide.products.slice(0, 3).map((product) => (
                    <Link
                      key={product._id}
                      to={`/product/${product._id}`}
                      className="rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-sm p-3 transition"
                    >
                      <img
                        src={product.image}
                        alt={product.title}
                        className="h-24 w-full object-cover rounded-lg mb-2"
                      />
                      <p className="text-white text-sm font-semibold line-clamp-2">{product.title}</p>
                    </Link>
                  ))
                ) : (
                  <div className="sm:col-span-3 rounded-xl bg-white/20 backdrop-blur-sm p-4 text-white/90 text-sm">
                    {error || "No products available for this section yet."}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Slider Indicators */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex space-x-3">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`w-3 h-3 rounded-full transition-all ${
              index === currentSlide
                ? "bg-white w-8"
                : "bg-white/50 hover:bg-white/75"
            }`}
          />
        ))}
      </div>

      {/* Slider Arrows */}
      <button
        onClick={() =>
          setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)
        }
        className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white p-2 rounded-full backdrop-blur-sm transition"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <button
        onClick={() => setCurrentSlide((prev) => (prev + 1) % slides.length)}
        className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white p-2 rounded-full backdrop-blur-sm transition"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </section>
  );
};

export default Hero;
