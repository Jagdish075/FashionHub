/**
 * Payment Success Page
 * 
 * This page is shown when a payment is successfully completed.
 * It displays order details and provides options for further actions.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import API from "../utils/api";
import { formatCurrencyINR } from "../utils/currency";

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  const [paymentStatus, setPaymentStatus] = useState(null);
  const hasVerifiedRef = useRef(false);

  // Get order ID from URL (this is the gateway's order id - e.g. cashfreeOrderId)
  const orderId = searchParams.get("order_id");
  const verifyPayment = useCallback(async () => {
    if (!orderId) {
      setError("Order ID not found");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Verify payment status using gateway order id
      const { data } = await API.post("/api/payments/verify", {
        cashfreeOrderId: orderId
      });

      if (data.success && data.order) {
        // If the API returned the created order, use its trackingId
        const ord = data.order;
        setOrder(ord);
        setPaymentStatus(ord.paymentStatus === "paid" ? "paid" : (data.paymentStatus || "failed"));

        // Clear cart after successful payment (backend also clears cart on confirm)
        try {
          await API.delete("/api/cart");
        } catch (cartError) {
          console.error("Failed to clear cart:", cartError);
        }
      } else {
        setPaymentStatus(data.paymentStatus || "failed");
        setError(data.message || "Payment verification failed");
      }
    } catch (err) {
      console.error("Payment verification error:", err);
      // Preserve paid UI if we already have a paid order loaded
      setPaymentStatus((prev) => (prev === "paid" ? "paid" : (err.response?.data?.paymentStatus || "failed")));
      if (order?.paymentStatus !== "paid") {
        setError(err.response?.data?.message || "Unable to verify order status");
      }
    } finally {
      setLoading(false);
    }
  }, [order?.paymentStatus, orderId]);

  useEffect(() => {
    if (!orderId || hasVerifiedRef.current) return;
    hasVerifiedRef.current = true;
    verifyPayment();
  }, [orderId, verifyPayment]);

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-20 h-20 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Verifying your payment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center mb-6">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${
              paymentStatus === "paid" ? "bg-green-100" : "bg-red-100"
            }`}>
              <svg
                className={`w-10 h-10 ${paymentStatus === "paid" ? "text-green-500" : "text-red-500"}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {paymentStatus === "paid" ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                )}
              </svg>
            </div>
            
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              {paymentStatus === "paid" ? "Payment Successful!" : "Payment Verification Failed"}
            </h1>
            <p className="text-gray-600 text-lg">
              {paymentStatus === "paid"
                ? "Thank you for your order. Your payment has been processed."
                : error || "We couldn't confirm your payment yet."}
            </p>
          </div>

          {/* Order Details Card */}
          {order && (
            <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                Order Details
              </h2>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-500">Order ID</p>
                    <p className="font-mono font-bold text-gray-800">
                    #{order.trackingId}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Order Date</p>
                  <p className="font-medium text-gray-800">
                    {formatDate(order.createdAt)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Amount</p>
                  <p className="font-bold text-xl text-green-600">
                    {formatCurrencyINR(order.total)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Payment Status</p>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">
                    <svg
                      className="w-4 h-4 mr-1"
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
                    Paid
                  </span>
                </div>
              </div>

              {/* Items */}
              <div className="border-t border-gray-100 pt-4">
                <h3 className="font-semibold text-gray-700 mb-3">Items Ordered</h3>
                <div className="space-y-2">
                  {order.items?.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white rounded overflow-hidden">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                              No img
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{item.name}</p>
                          <p className="text-sm text-gray-500">
                            Qty: {item.qty} × {formatCurrencyINR(item.price)}
                          </p>
                        </div>
                      </div>
                      <p className="font-semibold text-gray-800">
                        {formatCurrencyINR((item.price || 0) * item.qty)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Order ID Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <svg
                className="w-6 h-6 text-blue-500 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <p className="font-medium text-blue-800">
                  Save Your Order ID
                </p>
                <p className="text-sm text-blue-700 mt-1">
                  Please save your order tracking ID:{" "}
                  <span className="font-mono font-bold">
                    {orderId || "N/A"}
                  </span>
                </p>
                <p className="text-sm text-blue-600 mt-1">
                  You'll need this ID to track your order status.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              to={order?.trackingId ? `/order/${order.trackingId}` : "/my-orders"}
              className="flex items-center justify-center gap-2 py-3 px-6 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-medium"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              View Order Details
            </Link>
            <Link
              to="/my-orders"
              className="flex items-center justify-center gap-2 py-3 px-6 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition font-medium"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>
              My Orders
            </Link>
          </div>

          {/* Continue Shopping */}
          <div className="text-center mt-6">
            <Link
              to="/products"
              className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16l-4-4m0 0l4-4m-4 4h18"
                />
              </svg>
              Continue Shopping
            </Link>
          </div>

          {/* Support Info */}
          <div className="mt-8 pt-6 border-t border-gray-200 text-center">
            <p className="text-gray-500 text-sm">
              Need help? Contact our support team at{" "}
              <a
                href="mailto:support@fationhub.com"
                className="text-blue-600 hover:underline"
              >
                support@fationhub.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
