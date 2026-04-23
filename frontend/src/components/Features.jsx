
import React from "react";

const Features = () => {
  return (
    <section className="bg-gray-900 py-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
          <div className="text-white">
            <div className="text-4xl mb-4">🚚</div>
            <h3 className="font-semibold text-lg">Free Shipping</h3>
            <p className="text-gray-400 text-sm mt-2">On orders over ₹1000</p>
          </div>
          <div className="text-white">
            <div className="text-4xl mb-4">↩️</div>
            <h3 className="font-semibold text-lg">Easy Returns</h3>
            <p className="text-gray-400 text-sm mt-2">7-day return policy</p>
          </div>
          <div className="text-white">
            <div className="text-4xl mb-4">🔒</div>
            <h3 className="font-semibold text-lg">Secure Payment</h3>
            <p className="text-gray-400 text-sm mt-2">100% secure checkout</p>
          </div>
          <div className="text-white">
            <div className="text-4xl mb-4">💬</div>
            <h3 className="font-semibold text-lg">24/7 Support</h3>
            <p className="text-gray-400 text-sm mt-2">Dedicated support team</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Features;

