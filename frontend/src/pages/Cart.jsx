import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { formatCurrencyINR } from "../utils/currency";
import { toast } from "react-toastify";

const Cart = () => {
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const navigate = useNavigate();
  
  // Use AuthContext for authentication
  const { isAuthenticated, token } = useAuth();

  useEffect(() => {
    fetchCart();
  }, []);

  const fetchCart = async () => {
    setLoading(true);
    try {
      const { data } = await API.get("/api/cart");
      setCart(data.items || []);
    } catch (err) {
      console.error("Failed to fetch cart", err);
      setCart([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateQuantity = async (itemId, newQuantity) => {
    if (newQuantity < 1) return;
    setUpdating(true);
    try {
      const { data } = await API.put(`/api/cart/${itemId}`, { quantity: newQuantity });
      setCart(data.items || []);
    } catch (err) {
      console.error("Failed to update quantity", err);
      toast.error("Failed to update quantity");
    } finally {
      setUpdating(false);
    }
  };

  const handleRemoveItem = async (itemId) => {
    setUpdating(true);
    try {
      const { data } = await API.delete(`/api/cart/${itemId}`);
      setCart(data.items || []);
      toast.success("Item removed from cart");
    } catch (err) {
      console.error("Failed to remove item", err);
      toast.error("Failed to remove item");
    } finally {
      setUpdating(false);
    }
  };

  const handleClearCart = async () => {
    if (!window.confirm("Are you sure you want to clear your cart?")) return;
    setUpdating(true);
    try {
      await API.delete("/api/cart");
      setCart([]);
      toast.success("Cart cleared successfully");
    } catch (err) {
      console.error("Failed to clear cart", err);
      toast.error("Failed to clear cart");
    } finally {
      setUpdating(false);
    }
  };

  const FREE_SHIPPING_THRESHOLD = 1000;
  const DELIVERY_FEE = 100;
  const subtotal = cart.reduce((sum, item) => sum + (item.price || 0) * (item.qty || 1), 0);
  const shipping = subtotal > 0 && subtotal < FREE_SHIPPING_THRESHOLD ? DELIVERY_FEE : 0;
  const total = subtotal + shipping;

  const handleCheckout = async () => {
    setUpdating(true);
    try {
      // Check if user is logged in via AuthContext
      if (!isAuthenticated || !token) {
        toast.info("Please login to proceed with checkout");
        navigate("/login?redirect=/cart");
        return;
      }

      // Navigate to checkout page
      navigate("/checkout");
    } catch (err) {
      console.error("Checkout navigation failed", err);
      toast.error(err.response?.data?.message || "Failed to proceed to checkout.");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading cart...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Your Shopping Cart</h1>
        
        {cart.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🛒</div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Your cart is empty</h2>
            <p className="text-gray-600 mb-8">Looks like you haven't added any items to your cart yet.</p>
            <Link
              to="/products"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium"
            >
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-md overflow-hidden">
                {cart.map((item) => (
                  <div
                    key={item._id}
                    className="flex items-center gap-4 p-4 border-b border-gray-100 last:border-b-0"
                  >
                    {/* Product Image */}
                    <div className="w-24 h-24 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.parentElement.querySelector('.no-image').style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div className="no-image w-full h-full flex items-center justify-center text-gray-400" style={{display: item.image ? 'none' : 'flex'}}>
                        No Image
                      </div>
                    </div>
                    
                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-800 truncate">
                        {item.title}
                      </h3>
                      {item.size && (
                        <p className="text-sm text-gray-600">Size: {item.size}</p>
                      )}
                      {item.color && (
                        <p className="text-sm text-gray-600">Color: {item.color}</p>
                      )}
                      <p className="text-blue-600 font-medium mt-1">
                        {formatCurrencyINR(item.price || 0)}
                      </p>
                    </div>
                    
                    {/* Quantity Controls */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleUpdateQuantity(item._id, item.qty - 1)}
                        disabled={updating || item.qty <= 1}
                        className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:bg-gray-200 disabled:cursor-not-allowed flex items-center justify-center transition"
                      >
                        -
                      </button>
                      <span className="w-10 text-center font-semibold text-gray-900">
                        {item.qty}
                      </span>
                      <button
                        onClick={() => handleUpdateQuantity(item._id, item.qty + 1)}
                        disabled={updating}
                        className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:bg-gray-200 disabled:cursor-not-allowed flex items-center justify-center transition"
                      >
                        +
                      </button>
                    </div>
                    
                    {/* Item Total */}
                    <div className="text-right min-w-[80px]">
                      <p className="font-bold text-gray-900">
                        {formatCurrencyINR((item.price || 0) * item.qty)}
                      </p>
                    </div>
                    
                    {/* Remove Button */}
                    <button
                      onClick={() => handleRemoveItem(item._id)}
                      disabled={updating}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
              
              {/* Clear Cart Button */}
              {cart.length > 0 && (
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={handleClearCart}
                    disabled={updating}
                    className="text-red-600 hover:text-red-700 font-medium disabled:opacity-50 transition"
                  >
                    Clear Cart
                  </button>
                </div>
              )}
            </div>
            
            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-md p-6 sticky top-4">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Order Summary</h2>
                
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal ({cart.length} items)</span>
                    <span>{formatCurrencyINR(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Shipping</span>
                    <span className={shipping === 0 ? "text-green-600" : ""}>
                      {shipping === 0 ? "Free" : formatCurrencyINR(shipping)}
                    </span>
                  </div>
                  {subtotal > 0 && subtotal < FREE_SHIPPING_THRESHOLD && (
                    <div className="text-xs text-gray-500">
                      Add {formatCurrencyINR(FREE_SHIPPING_THRESHOLD - subtotal)} more for free shipping.
                    </div>
                  )}
                  <div className="border-t pt-3 flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>{formatCurrencyINR(total)}</span>
                  </div>
                </div>
                
                <button
                  onClick={handleCheckout}
                  disabled={updating || cart.length === 0}
                  className="w-full py-3 bg-green-600 text-white rounded-xl font-semibold text-lg hover:bg-green-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {updating ? "Processing..." : "Proceed to Checkout"}
                </button>
                
                <Link
                  to="/products"
                  className="block text-center mt-4 text-blue-600 hover:text-blue-700 font-medium"
                >
                  Continue Shopping
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Cart;
