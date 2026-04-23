/**
 * Checkout Page
 * 
 * This page handles the payment checkout flow using Cashfree.
 * It shows order summary, shipping address form, and initiates payment.
 * 
 * Address Flow:
 * - First-time user: Show form only, save address after order
 * - Returning user: Show options to use existing or enter new address
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { load as loadCashfree } from "@cashfreepayments/cashfree-js";
import API from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { formatCurrencyINR } from "../utils/currency";

const Checkout = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [cart, setCart] = useState([]);
  const [orderId, setOrderId] = useState(null);
  
  // Use AuthContext for user state
  const { user, isAuthenticated } = useAuth();
  
  // Address state
  const [savedAddress, setSavedAddress] = useState(null);
  const [hasAddress, setHasAddress] = useState(false);
  const [addressOption, setAddressOption] = useState("existing"); // "existing" or "new"
  
  // Shipping address state
  const [shippingAddress, setShippingAddress] = useState({
    name: "",
    phone: "",
    street: "",
    city: "",
    state: "",
    zipCode: "",
    country: "India",
    note: ""
  });

  // Payment state
  const [selectedMethod, setSelectedMethod] = useState("online");
  const [error, setError] = useState("");

  // Cashfree checkout reference
  const checkoutRef = useRef(null);

  // Get orderId from URL if coming from success page
  const urlOrderId = searchParams.get("order_id");

  const initializeCheckout = useCallback(async () => {
    setLoading(true);
    
    // Check if user is authenticated via AuthContext
    if (!isAuthenticated || !user) {
      navigate("/login?redirect=/checkout");
      return;
    }

    try {
      // Pre-fill shipping address with user data
      setShippingAddress((prev) => ({
        ...prev,
        name: user.name || "",
        phone: user.phone || ""
      }));

      // If we have an order ID from URL, fetch order details
      if (urlOrderId) {
        try {
          const { data } = await API.get(`/api/orders/${urlOrderId}`);
          setOrderId(data.trackingId);
          setCart(data.items || []);
          if (data.shippingAddress) {
            setShippingAddress((prev) => ({
              ...prev,
              ...data.shippingAddress
            }));
          }
        } catch (err) {
          console.error("Failed to fetch order:", err);
        }
      } else {
        // Fetch cart
        const { data: cartData } = await API.get("/api/cart");
        setCart(cartData.items || []);
      }

      // Check for saved address
      try {
        const { data: addressData } = await API.get("/api/address/me");
        if (addressData.hasAddress && addressData.address) {
          setSavedAddress(addressData.address);
          setHasAddress(true);
          setAddressOption("existing");
          
          // Pre-fill form with saved address
          setShippingAddress((prev) => ({
            ...prev,
            name: addressData.address.name || prev.name,
            phone: addressData.address.phone || prev.phone,
            street: addressData.address.street || "",
            city: addressData.address.city || "",
            state: addressData.address.state || "",
            zipCode: addressData.address.zipCode || "",
            country: addressData.address.country || "India"
          }));
        } else {
          setHasAddress(false);
          setAddressOption("new");
          setShippingAddress((prev) => ({
            ...prev,
            street: prev.street || user.address || "",
          }));
        }
      } catch (addrErr) {
        console.error("Failed to fetch saved address:", addrErr);
        setHasAddress(false);
        setAddressOption("new");
        setShippingAddress((prev) => ({
          ...prev,
          street: prev.street || user.address || "",
        }));
      }

    } catch (err) {
      console.error("Checkout initialization error:", err);
      setError("Failed to initialize checkout");
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, navigate, urlOrderId, user]);

  useEffect(() => {
    initializeCheckout();
  }, [initializeCheckout]);

  // Calculate totals
  const subtotal = cart.reduce(
    (sum, item) => sum + (item.price || 0) * (item.qty || 1),
    0
  );
  const FREE_SHIPPING_THRESHOLD = 1000;
  const DELIVERY_FEE = 100;
  const shipping = subtotal > 0 && subtotal < FREE_SHIPPING_THRESHOLD ? DELIVERY_FEE : 0;
  const tax = 0; // No tax for now
  const total = subtotal + shipping + tax;

  // Handle shipping address change
  const handleAddressChange = (e) => {
    const { name, value } = e.target;
    setShippingAddress((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle address option change
  const handleAddressOptionChange = (option) => {
    setAddressOption(option);
    if (option === "existing" && savedAddress) {
      // Use saved address
      setShippingAddress((prev) => ({
        ...prev,
        name: savedAddress.name || prev.name,
        phone: savedAddress.phone || prev.phone,
        street: savedAddress.street || "",
        city: savedAddress.city || "",
        state: savedAddress.state || "",
        zipCode: savedAddress.zipCode || "",
        country: savedAddress.country || "India"
      }));
    } else if (option === "new") {
      // Reset to empty form but keep user info
      setShippingAddress((prev) => ({
        ...prev,
        street: "",
        city: "",
        state: "",
        zipCode: "",
      }));
    }
  };

  // Validate form
  const validateForm = () => {
    if (!shippingAddress.name?.trim()) {
      setError("Please enter your name");
      return false;
    }
    if (!shippingAddress.phone?.trim()) {
      setError("Please enter your phone number");
      return false;
    }
    if (!shippingAddress.street?.trim()) {
      setError("Please enter your street address");
      return false;
    }
    if (!shippingAddress.city?.trim()) {
      setError("Please enter your city");
      return false;
    }
    if (!shippingAddress.state?.trim()) {
      setError("Please enter your state");
      return false;
    }
    if (!shippingAddress.zipCode?.trim()) {
      setError("Please enter your PIN code");
      return false;
    }
    return true;
  };

  // Save address to database
  const saveAddress = async () => {
    try {
      const { data } = await API.post("/api/address", {
        name: shippingAddress.name,
        phone: shippingAddress.phone,
        street: shippingAddress.street,
        city: shippingAddress.city,
        state: shippingAddress.state,
        zipCode: shippingAddress.zipCode,
        country: shippingAddress.country
      });
      console.log("[Checkout] Address saved successfully");
      if (data?.address) {
        setSavedAddress(data.address);
        setHasAddress(true);
      }
    } catch (addrErr) {
      console.error("[Checkout] Failed to save address:", addrErr);
      // Don't block order placement if address save fails
    }
  };

  // Handle payment initiation
  const handlePayment = async () => {
    if (!validateForm()) return;

    setProcessing(true);
    setError("");

    try {
      // Always save selected shipping address so checkout always shows latest one
      await saveAddress();

      // Create order and payment session
      const { data: paymentData } = await API.post("/api/payments/create", {
        orderId: orderId || undefined,
        amount: total,
        shippingAddress
      });

      console.log("Payment session created:", paymentData);

      if (!paymentData.paymentSessionId) {
        throw new Error("Payment session ID not received from server");
      }

      const checkoutResult = await openCashfreeCheckout(
        paymentData.paymentSessionId,
        paymentData.orderId
      );
      if (checkoutResult?.error) {
        throw new Error(checkoutResult.error.message || "Payment failed or cancelled.");
      }
    } catch (err) {
      console.error("Payment initiation error:", err);
      setError(
        err.response?.data?.message ||
          "Failed to initiate payment. Please try again."
      );
    } finally {
      setProcessing(false);
    }
  };

  // Handle COD order (direct order placement)
  const handleCODOrder = async () => {
    if (!validateForm()) return;

    setProcessing(true);
    setError("");

    try {
      // Always save selected shipping address so checkout always shows latest one
      await saveAddress();

      // Create order directly with COD
      const { data: orderData } = await API.post("/api/orders", {
        items: cart,
        total: total,
        shippingAddress,
        paymentMethod: "cod",
        paymentStatus: "pending"
      });

      console.log("COD order created:", orderData);

      // Redirect to order success or details page
      navigate(`/order/${orderData.trackingId}`, { 
        state: { success: true, message: "Order placed successfully!" }
      });
    } catch (err) {
      console.error("COD order error:", err);
      setError(
        err.response?.data?.message ||
          "Failed to place order. Please try again."
      );
    } finally {
      setProcessing(false);
    }
  };

  // Open Cashfree checkout popup
  const openCashfreeCheckout = async (paymentSessionId, cashfreeOrderId) => {
    try {
      if (!checkoutRef.current) {
        const { data } = await API.get("/api/payments/config");
        const mode = data?.config?.environment === "production" ? "production" : "sandbox";
        checkoutRef.current = await loadCashfree({ mode });
      }

      if (!checkoutRef.current) {
        throw new Error("Unable to load Cashfree SDK");
      }

      const checkoutResult = await checkoutRef.current.checkout({
        paymentSessionId,
        redirectTarget: "_modal",
      });

      if (checkoutResult?.error) {
        navigate(`/payment/failed?order_id=${encodeURIComponent(cashfreeOrderId || "")}`);
        return { error: checkoutResult.error };
      }

      navigate(`/payment/success?order_id=${encodeURIComponent(cashfreeOrderId || "")}`);
      return checkoutResult || { success: true };
    } catch (sdkError) {
      console.error("[Checkout] Cashfree SDK error:", sdkError);
      navigate(`/payment/failed?order_id=${encodeURIComponent(cashfreeOrderId || "")}`);
      return { error: sdkError };
    }
  };

  // If loading, show loader
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading checkout...</p>
        </div>
      </div>
    );
  }

  // Empty cart check
  if (cart.length === 0 && !orderId) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="container mx-auto px-4">
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🛒</div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              Your cart is empty
            </h2>
            <p className="text-gray-600 mb-8">
              Add some products to your cart to proceed with checkout.
            </p>
            <Link
              to="/products"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition font-medium"
            >
              Browse Products
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Checkout</h1>
          <p className="text-gray-600">
            Complete your order with secure payment
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Forms */}
          <div className="lg:col-span-2 space-y-6">
            {/* Shipping Address */}
            <div className="bg-white rounded-2xl shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                Delivery Address
              </h2>

              {/* Address Options - Only show if user has saved address */}
              {hasAddress && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Select Delivery Option
                  </label>
                  <div className="space-y-3">
                    <label 
                      className={`flex items-start p-3 border-2 rounded-xl cursor-pointer transition ${
                        addressOption === "existing"
                          ? "border-blue-600 bg-white"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="addressOption"
                        value="existing"
                        checked={addressOption === "existing"}
                        onChange={(e) => handleAddressOptionChange(e.target.value)}
                        className="mt-1 w-4 h-4 text-blue-600"
                      />
                      <div className="ml-3 flex-1">
                        <span className="font-semibold text-gray-800">
                          Use existing address
                        </span>
                        {savedAddress && (
                          <div className="mt-1 text-sm text-gray-600">
                            {savedAddress.name}, {savedAddress.phone}<br />
                            {savedAddress.street}, {savedAddress.city}<br />
                            {savedAddress.state} - {savedAddress.zipCode}
                          </div>
                        )}
                      </div>
                    </label>
                    
                    <label 
                      className={`flex items-start p-3 border-2 rounded-xl cursor-pointer transition ${
                        addressOption === "new"
                          ? "border-blue-600 bg-white"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="addressOption"
                        value="new"
                        checked={addressOption === "new"}
                        onChange={(e) => handleAddressOptionChange(e.target.value)}
                        className="mt-1 w-4 h-4 text-blue-600"
                      />
                      <div className="ml-3">
                        <span className="font-semibold text-gray-800">
                          Enter new address
                        </span>
                        <p className="text-sm text-gray-500">
                          Add a different delivery address
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* Saved Address Summary Card - when using existing */}
              {hasAddress && addressOption === "existing" && savedAddress && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
                  <div className="flex items-start gap-3">
                    <svg
                      className="w-5 h-5 text-green-600 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <div>
                      <p className="font-semibold text-green-800">
                        Delivering to saved address:
                      </p>
                      <p className="text-green-700 mt-1">
                        <strong>{savedAddress.name}</strong> - {savedAddress.phone}
                      </p>
                      <p className="text-green-700 text-sm mt-1">
                        {savedAddress.street}, {savedAddress.city}<br />
                        {savedAddress.state} - {savedAddress.zipCode}<br />
                        {savedAddress.country}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Address Form - Show when: no saved address OR user chose new address */}
              {(!hasAddress || addressOption === "new") && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={shippingAddress.name}
                      onChange={handleAddressChange}
                      placeholder="Enter your full name"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={shippingAddress.phone}
                      onChange={handleAddressChange}
                      placeholder="10-digit mobile number"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      PIN Code *
                    </label>
                    <input
                      type="text"
                      name="zipCode"
                      value={shippingAddress.zipCode}
                      onChange={handleAddressChange}
                      placeholder="6-digit PIN code"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Street Address *
                    </label>
                    <input
                      type="text"
                      name="street"
                      value={shippingAddress.street}
                      onChange={handleAddressChange}
                      placeholder="House/Flat No., Building Name, Area"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City *
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={shippingAddress.city}
                      onChange={handleAddressChange}
                      placeholder="Enter city"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      State *
                    </label>
                    <input
                      type="text"
                      name="state"
                      value={shippingAddress.state}
                      onChange={handleAddressChange}
                      placeholder="Enter state"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Country
                    </label>
                    <input
                      type="text"
                      name="country"
                      value={shippingAddress.country}
                      onChange={handleAddressChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-100"
                      disabled
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Order Note (Optional)
                    </label>
                    <textarea
                      name="note"
                      value={shippingAddress.note}
                      onChange={handleAddressChange}
                      placeholder="Special instructions for delivery..."
                      rows={2}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Payment Method */}
            <div className="bg-white rounded-2xl shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                  />
                </svg>
                Payment Method
              </h2>

              <div className="space-y-3">
                {/* Online Payment */}
                <label
                  className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition ${
                    selectedMethod === "online"
                      ? "border-blue-600 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="online"
                    checked={selectedMethod === "online"}
                    onChange={(e) => setSelectedMethod(e.target.value)}
                    className="w-5 h-5 text-blue-600"
                  />
                  <div className="ml-4 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-800">
                        Online Payment
                      </span>
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                        Recommended
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Pay securely using UPI, Cards, Net Banking via Cashfree
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* UPI Icon - Inline SVG */}
                    <svg viewBox="0 0 48 48" className="h-6 w-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect width="48" height="48" rx="8" fill="#E0E7FF"/>
                      <path d="M12 16h24v4H12v-4zm0 6h18v4H12v-4zm0 6h12v4H12v-4z" fill="#4F46E5"/>
                      <circle cx="36" cy="34" r="4" fill="#10B981"/>
                    </svg>
                    {/* Cards Icon - Inline SVG */}
                    <svg viewBox="0 0 48 48" className="h-6 w-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect width="48" height="48" rx="8" fill="#FEF3C7"/>
                      <rect x="8" y="14" width="32" height="20" rx="2" stroke="#F59E0B" strokeWidth="2"/>
                      <path d="M8 22h32" stroke="#F59E0B" strokeWidth="2"/>
                      <rect x="10" y="26" width="10" height="4" rx="1" fill="#F59E0B"/>
                    </svg>
                  </div>
                </label>

                {/* Cash on Delivery */}
                <label
                  className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition ${
                    selectedMethod === "cod"
                      ? "border-blue-600 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="cod"
                    checked={selectedMethod === "cod"}
                    onChange={(e) => setSelectedMethod(e.target.value)}
                    className="w-5 h-5 text-blue-600"
                  />
                  <div className="ml-4 flex-1">
                    <span className="font-semibold text-gray-800">
                      Cash on Delivery
                    </span>
                    <p className="text-sm text-gray-500 mt-1">
                      Pay in cash when your order is delivered
                    </p>
                  </div>
                </label>
              </div>

              {selectedMethod === "cod" && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> Cash on Delivery orders have a minimum
                    order value of ₹500. Please ensure your cart meets this
                    requirement.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-md p-6 sticky top-4">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                Order Summary
              </h2>

              {/* Cart Items */}
              <div className="space-y-3 mb-6 max-h-64 overflow-y-auto">
                {cart.map((item) => (
                  <div
                    key={item._id}
                    className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg"
                  >
                    <div className="w-12 h-12 bg-white rounded overflow-hidden">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.title || item.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.parentElement.querySelector('.no-image').style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div className="no-image w-full h-full flex items-center justify-center text-gray-400 text-xs" style={{display: item.image ? 'none' : 'flex'}}>
                        No img
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {item.title || item.name}
                      </p>
                      <p className="text-xs text-gray-500">Qty: {item.qty}</p>
                    </div>
                    <p className="text-sm font-semibold text-gray-800">
                      {formatCurrencyINR((item.price || 0) * item.qty)}
                    </p>
                  </div>
                ))}
              </div>

              {/* Price Breakdown */}
              <div className="border-t border-gray-100 pt-4 space-y-2">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
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
                {tax > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Tax</span>
                    <span>{formatCurrencyINR(tax)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span>Total</span>
                  <span>{formatCurrencyINR(total)}</span>
                </div>
              </div>

              {/* Pay Button */}
              <button
                onClick={selectedMethod === "cod" ? handleCODOrder : handlePayment}
                disabled={processing || cart.length === 0}
                className="w-full mt-6 py-4 bg-blue-600 text-white rounded-xl font-semibold text-lg hover:bg-blue-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {processing ? (
                  <>
                    <svg
                      className="animate-spin h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Processing...
                  </>
                ) : selectedMethod === "cod" ? (
                  <>Place Order (Cash on Delivery)</>
                ) : (
                  <>Pay {formatCurrencyINR(total)}</>
                )}
              </button>

              {/* Security Note */}
              <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-500">
                <svg
                  className="w-4 h-4 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
                <span>Secured by Cashfree</span>
              </div>

              {/* Back to Cart */}
              <Link
                to="/cart"
                className="block text-center mt-4 text-blue-600 hover:text-blue-700 font-medium"
              >
                ← Back to Cart
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
