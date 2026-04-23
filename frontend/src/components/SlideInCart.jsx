/**
 * Slide-In Cart Component
 * 
 * A modern e-commerce style slide-in cart drawer with:
 * - Smooth animations
 * - Product image, name, quantity controls
 * - Price display and remove functionality
 * - Cart total and checkout button
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../utils/api';
import { toast } from 'react-toastify';
import { formatCurrencyINR } from '../utils/currency';

const SlideInCart = ({ isOpen, onClose }) => {
  const { isAuthenticated, guestSessionId } = useAuth();
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const navigate = useNavigate();

  // Fetch cart when cart opens
  const fetchCart = useCallback(async () => {
    setLoading(true);
    try {
      const headers = isAuthenticated 
        ? {} 
        : { 'X-Session-ID': guestSessionId };
      
      const { data } = await API.get('/api/cart', { headers });
      setCart(data.items || []);
    } catch (err) {
      console.error('Failed to fetch cart', err);
      setCart([]);
    } finally {
      setLoading(false);
    }
  }, [guestSessionId, isAuthenticated]);

  useEffect(() => {
    if (isOpen) {
      fetchCart();
    }
  }, [fetchCart, isOpen]);

  const handleUpdateQuantity = async (itemId, newQuantity) => {
    if (newQuantity < 1) return;
    setUpdating(true);
    
    try {
      const headers = isAuthenticated 
        ? {} 
        : { 'X-Session-ID': guestSessionId };
      
      const { data } = await API.put(`/api/cart/${itemId}`, { quantity: newQuantity }, { headers });
      setCart(data.items || []);
    } catch (err) {
      console.error('Failed to update quantity', err);
      toast.error('Failed to update quantity');
    } finally {
      setUpdating(false);
    }
  };

  const handleRemoveItem = async (itemId) => {
    setUpdating(true);
    
    try {
      const headers = isAuthenticated 
        ? {} 
        : { 'X-Session-ID': guestSessionId };
      
      const { data } = await API.delete(`/api/cart/${itemId}`, { headers });
      setCart(data.items || []);
      toast.success('Item removed from cart');
    } catch (err) {
      console.error('Failed to remove item', err);
      toast.error('Failed to remove item');
    } finally {
      setUpdating(false);
    }
  };

  const handleCheckout = () => {
    onClose();
    
    if (!isAuthenticated) {
      toast.info('Please login to proceed to checkout');
      navigate('/login?redirect=/checkout');
      return;
    }
    
    navigate('/checkout');
  };

  // Calculate totals
  const subtotal = cart.reduce(
    (sum, item) => sum + (item.price || 0) * (item.qty || 1),
    0
  );
  const FREE_SHIPPING_THRESHOLD = 1000;
  const DELIVERY_FEE = 100;
  const shipping = subtotal > 0 && subtotal < FREE_SHIPPING_THRESHOLD ? DELIVERY_FEE : 0;
  const total = subtotal + shipping;
  const totalItems = cart.reduce((sum, item) => sum + (item.qty || 1), 0);

  // Don't render if closed
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Cart Drawer */}
      <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-gray-800">Shopping Cart</h2>
            {totalItems > 0 && (
              <span className="px-2 py-1 bg-blue-600 text-white text-xs font-medium rounded-full">
                {totalItems} {totalItems === 1 ? 'item' : 'items'}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Cart Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            // Loading state
            <div className="flex flex-col items-center justify-center h-64">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-600 mt-4">Loading cart...</p>
            </div>
          ) : cart.length === 0 ? (
            // Empty cart state
            <div className="flex flex-col items-center justify-center h-64 px-4">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Your cart is empty</h3>
              <p className="text-gray-500 text-center mb-6">
                Looks like you haven't added anything to your cart yet.
              </p>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            // Cart items
            <div className="p-4 space-y-4">
              {cart.map((item) => (
                <div 
                  key={item._id}
                  className="flex gap-4 p-3 bg-gray-50 rounded-xl"
                >
                  {/* Product Image */}
                  <div className="w-20 h-20 bg-white rounded-lg overflow-hidden flex-shrink-0">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.title || item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                        No img
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-800 truncate">
                      {item.title || item.name}
                    </h4>
                    
                    {item.size && (
                      <p className="text-xs text-gray-500 mt-0.5">Size: {item.size}</p>
                    )}
                    {item.color && (
                      <p className="text-xs text-gray-500">Color: {item.color}</p>
                    )}
                    
                    <div className="flex items-center justify-between mt-2">
                      {/* Quantity Controls */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleUpdateQuantity(item._id, item.qty - 1)}
                          disabled={updating || item.qty <= 1}
                          className="w-7 h-7 flex items-center justify-center bg-white border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                          </svg>
                        </button>
                        <span className="w-8 text-center font-medium text-gray-900">
                          {item.qty}
                        </span>
                        <button
                          onClick={() => handleUpdateQuantity(item._id, item.qty + 1)}
                          disabled={updating}
                          className="w-7 h-7 flex items-center justify-center bg-white border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 transition"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                      </div>

                      {/* Price */}
                      <p className="font-semibold text-gray-900">
                        {formatCurrencyINR((item.price || 0) * item.qty)}
                      </p>
                    </div>
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={() => handleRemoveItem(item._id)}
                    disabled={updating}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition self-start disabled:opacity-50"
                    title="Remove item"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {cart.length > 0 && (
          <div className="border-t border-gray-100 p-4 bg-white">
            {/* Totals */}
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal ({totalItems} items)</span>
                <span className="font-medium">{formatCurrencyINR(subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Shipping</span>
                <span className={shipping === 0 ? "text-green-600 font-medium" : "font-medium"}>
                  {shipping === 0 ? "Free" : formatCurrencyINR(shipping)}
                </span>
              </div>
              {subtotal > 0 && subtotal < FREE_SHIPPING_THRESHOLD && (
                <div className="text-xs text-gray-500">
                  Add {formatCurrencyINR(FREE_SHIPPING_THRESHOLD - subtotal)} more for free shipping.
                </div>
              )}
              <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-100">
                <span>Total</span>
                <span>{formatCurrencyINR(total)}</span>
              </div>
            </div>

            {/* Checkout Button */}
            <button
              onClick={handleCheckout}
              disabled={updating}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold text-lg hover:bg-blue-700 transition disabled:bg-blue-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              {updating ? 'Processing...' : 'Proceed to Checkout'}
            </button>

            {/* Continue Shopping */}
            <button
              onClick={onClose}
              className="w-full mt-3 py-2 text-blue-600 hover:text-blue-700 font-medium transition"
            >
              Continue Shopping
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default SlideInCart;
