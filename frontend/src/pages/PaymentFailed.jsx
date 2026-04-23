/**
 * Payment Failed Page
 * 
 * This page is shown when a payment fails.
 * It provides options to retry payment or contact support.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { load as loadCashfree } from "@cashfreepayments/cashfree-js";
import API from "../utils/api";
import { formatCurrencyINR } from "../utils/currency";

const PaymentFailed = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  const cashfreeRef = useRef(null);

  // Get order ID from URL
  const orderId = searchParams.get("order_id");
  const txStatus = searchParams.get("txStatus");
  const txMsg = searchParams.get("txMsg");

  const fetchOrderDetails = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await API.get(`/api/orders/track/${orderId}`);
      setOrder(data);
    } catch (err) {
      console.error("Failed to fetch order:", err);
      setError("Unable to load order details");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();
    }
  }, [fetchOrderDetails, orderId]);

  const handleRetryPayment = async () => {
    if (!order) return;

    setRetrying(true);
    setError("");

    try {
      // Create new payment session
      const { data } = await API.post("/api/payments/retry", {
        orderId: order.trackingId
      });

      if (data.success && data.paymentSessionId) {
        if (!cashfreeRef.current) {
          const { data: configData } = await API.get("/api/payments/config");
          const mode = configData?.config?.environment === "production" ? "production" : "sandbox";
          cashfreeRef.current = await loadCashfree({ mode });
        }

        const checkoutResult = await cashfreeRef.current.checkout({
          paymentSessionId: data.paymentSessionId,
          redirectTarget: "_modal",
        });

        if (checkoutResult?.error) {
          throw new Error(checkoutResult.error.message || "Payment retry failed");
        }

        navigate(`/payment/success?order_id=${encodeURIComponent(data.orderId || "")}`);
      }
    } catch (err) {
      console.error("Retry payment error:", err);
      setError(
        err.response?.data?.message ||
          "Failed to initiate payment retry. Please try again."
      );
    } finally {
      setRetrying(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!order) return;

    if (!window.confirm(
      "Are you sure you want to cancel this order? You can always place a new order later."
    )) {
      return;
    }

    try {
      setRetrying(true);
      await API.post(`/api/orders/${order._id}/cancel`);
      
      // Redirect to cart
      navigate("/cart");
    } catch (err) {
      console.error("Cancel order error:", err);
      setError(
        err.response?.data?.message ||
          "Failed to cancel order. Please try again."
      );
    } finally {
      setRetrying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading order details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          {/* Failed Header */}
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center mb-6">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-10 h-10 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>

            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              Payment Failed
            </h1>
            <p className="text-gray-600 text-lg">
              Unfortunately, your payment could not be processed.
            </p>
          </div>

          {/* Error Details */}
          {(txStatus || txMsg || order?.paymentError) && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <svg
                  className="w-6 h-6 text-red-500 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <div>
                  <p className="font-medium text-red-800">
                    {txMsg || order?.paymentError || "Payment was declined"}
                  </p>
                  {txStatus && (
                    <p className="text-sm text-red-600 mt-1">
                      Status: {txStatus}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

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
                  <p className="text-sm text-gray-500">Amount</p>
                  <p className="font-bold text-xl text-gray-800">
                    {formatCurrencyINR(order.total)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Order Status</p>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-700">
                    {order.status?.charAt(0).toUpperCase() + order.status?.slice(1)}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Payment Status</p>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700">
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
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                    Failed
                  </span>
                </div>
              </div>

              {/* Items */}
              <div className="border-t border-gray-100 pt-4">
                <h3 className="font-semibold text-gray-700 mb-3">Items in Order</h3>
                <div className="space-y-2">
                  {order.items?.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded overflow-hidden">
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
                          <p className="text-sm text-gray-500">Qty: {item.qty}</p>
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

          {/* Help Card */}
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
                  Common Reasons for Payment Failure
                </p>
                <ul className="text-sm text-blue-700 mt-2 space-y-1">
                  <li>• Insufficient balance in your account</li>
                  <li>• Invalid or expired card details</li>
                  <li>• Bank transaction limit exceeded</li>
                  <li>• Network connectivity issues</li>
                  <li>• UPI app not linked to your account</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4">
            {/* Retry Payment */}
            <button
              onClick={handleRetryPayment}
              disabled={retrying || !order}
              className="w-full py-4 bg-blue-600 text-white rounded-xl font-semibold text-lg hover:bg-blue-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {retrying ? (
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
              ) : (
                <>
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
                      d="M4 4v5h.582m2A8.001 8.15.356 001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Try Payment Again
                </>
              )}
            </button>

            {/* Cancel Order */}
            <button
              onClick={handleCancelOrder}
              disabled={retrying || !order}
              className="w-full py-3 px-6 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition font-medium disabled:opacity-50"
            >
              Cancel Order & Remove from Cart
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Contact Support */}
          <div className="mt-6 pt-6 border-t border-gray-200 text-center">
            <p className="text-gray-500 text-sm mb-2">
              Still having issues? Our support team is here to help.
            </p>
            <a
              href="mailto:support@fationhub.com"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Contact Support
            </a>
          </div>

          {/* Back to Home */}
          <div className="text-center mt-4">
            <Link
              to="/"
              className="inline-flex items-center text-gray-600 hover:text-gray-800"
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
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentFailed;
