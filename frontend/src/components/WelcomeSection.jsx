import React from "react";
import { Link } from "react-router-dom";

const WelcomeSection = ({ user }) => {
  if (!user) return null;

  return (
    <section className="container mx-auto px-4 pb-16">
      <div className="bg-white rounded-2xl p-6 md:p-8 shadow-md">
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-1">
              {user.isAdmin ? "👋 Welcome, Admin!" : `👋 Welcome back, ${user.name}!`}
            </h2>
            <p className="text-gray-600">
              {user.isAdmin
                ? "Manage your store from the admin dashboard"
                : "Here's what's happening with your orders"}
            </p>
          </div>
          {!user.isAdmin && (
            <div className="mt-4 md:mt-0 flex flex-wrap gap-3">
              <Link
                to="/my-orders"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Go to My Orders
              </Link>
              <Link
                to="/products"
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                Continue Shopping
              </Link>
            </div>
          )}
        </div>

        {!user.isAdmin && (
          <div className="border-t border-gray-100 pt-6">
            <p className="text-gray-600">
              Order history and tracking are available in the{" "}
              <Link to="/my-orders" className="text-blue-600 hover:underline">
                My Orders
              </Link>{" "}
              section.
            </p>
          </div>
        )}

        {/* Admin Quick Links */}
        {user.isAdmin && (
          <div className="border-t border-gray-100 pt-6 mt-6">
            <h3 className="font-semibold text-gray-800 mb-4">Quick Admin Actions</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link
                to="/admin/products"
                className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition text-center"
              >
                <div className="text-2xl mb-2">📦</div>
                <p className="text-sm font-medium text-gray-700">Manage Products</p>
              </Link>
              <Link
                to="/admin/orders"
                className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition text-center"
              >
                <div className="text-2xl mb-2">📋</div>
                <p className="text-sm font-medium text-gray-700">Manage Orders</p>
              </Link>
              <Link
                to="/admin/users"
                className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition text-center"
              >
                <div className="text-2xl mb-2">👥</div>
                <p className="text-sm font-medium text-gray-700">Manage Users</p>
              </Link>
              <Link
                to="/products"
                className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition text-center"
              >
                <div className="text-2xl mb-2">🛒</div>
                <p className="text-sm font-medium text-gray-700">View Store</p>
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default WelcomeSection;
