import React, { useCallback, useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import API from "../utils/api";
import { formatCurrencyINR } from "../utils/currency";
import OrderTimeline from "../components/OrderTimeline";
import { getImageUrl, setImageFallback } from "../utils/image";

const OrderDetails = () => {
  const { trackingId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchOrder = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const normalizedTrackingId = String(trackingId || "").replace("#", "");

      // Primary source for users: full order details endpoint
      const { data: fullOrder } = await API.get(`/api/orders/${normalizedTrackingId}`);
      setOrder(fullOrder);
    } catch (err) {
      console.error("Failed to fetch order", err);
      // Fallback: tracking-only data (limited fields)
      try {
        const normalizedTrackingId = String(trackingId || "").replace("#", "");
        const { data } = await API.get(`/api/orders/track/${normalizedTrackingId}`);
        setOrder((prev) => ({ ...(prev || {}), ...data }));
        setError("Some order details are unavailable right now.");
      } catch {
        setError(err.response?.data?.message || "Order not found");
      }
    } finally {
      setLoading(false);
    }
  }, [trackingId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const statusSteps = [
    { status: "pending", label: "Order Placed", icon: "📦", description: "Your order has been placed" },
    { status: "processing", label: "Processing", icon: "⚙️", description: "Your order is being prepared" },
    { status: "shipped", label: "Shipped", icon: "🚚", description: "Your order is on the way" },
    { status: "delivered", label: "Delivered", icon: "✅", description: "Your order has been delivered" },
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-700 border-yellow-300";
      case "processing":
        return "bg-blue-100 text-blue-700 border-blue-300";
      case "shipped":
        return "bg-purple-100 text-purple-700 border-purple-300";
      case "delivered":
        return "bg-green-100 text-green-700 border-green-300";
      case "cancelled":
        return "bg-red-100 text-red-700 border-red-300";
      default:
        return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  const getCurrentStepIndex = (orderStatus) => {
    const index = statusSteps.findIndex((step) => step.status === orderStatus);
    return index >= 0 ? index : 0;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStepDescription = (status) => {
    const step = statusSteps.find((s) => s.status === status);
    return step ? step.description : "";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <div className="text-6xl mb-4">😕</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Order Not Found</h2>
            <p className="text-gray-600 mb-8">
              We couldn't find the order you're looking for. Please check your tracking ID
              and try again.
            </p>
            <div className="space-x-4">
              <Link
                to="/my-orders"
                className="inline-block px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-medium"
              >
                View My Orders
              </Link>
              <Link
                to="/"
                className="inline-block px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition font-medium"
              >
                Go Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!order) return null;

  const itemCount = (order.items || []).reduce((sum, item) => sum + Number(item.qty || 0), 0);
  const itemsSubtotal = (order.items || []).reduce(
    (sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0),
    0
  );
  const displayTotal = Number(order.total || 0) > 0 ? Number(order.total) : itemsSubtotal;

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        {/* Back Button */}
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-600 hover:text-blue-600 transition-colors"
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
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to Orders
          </button>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Order Details</h1>
          <p className="text-gray-600">
            Tracking ID:{" "}
            <span className="font-mono font-bold text-gray-800">
              {order.trackingId}
            </span>
          </p>
          {order.status === "delivered" && order.paymentStatus === "paid" && (
            <Link
              to={`/returns?trackingId=${encodeURIComponent(order.trackingId || "")}`}
              className="inline-block mt-3 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
            >
              Request Return / Refund
            </Link>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Status Card */}
            <div className="bg-white rounded-2xl shadow-md overflow-hidden">
              <div className="bg-gray-800 text-white p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-300">Order Status</p>
                    <p
                      className={`text-2xl font-bold capitalize ${
                        order.status === "delivered"
                          ? "text-green-400"
                          : order.status === "cancelled"
                          ? "text-red-400"
                          : "text-white"
                      }`}
                    >
                      {order.status}
                    </p>
                    <p className="text-sm text-gray-300 mt-1">
                      {getStepDescription(order.status)}
                    </p>
                  </div>
                  <span
                    className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(
                      order.status
                    )}`}
                  >
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </span>
                </div>
              </div>

              {/* Progress Timeline */}
              <div className="p-6">
                <h3 className="font-semibold text-gray-800 mb-6">Order Progress</h3>
                <div className="relative">
                  {/* Progress Line */}
                  <div className="absolute top-5 left-5 right-5 h-1 bg-gray-200 rounded"></div>
                  <div
                    className="absolute top-5 left-5 h-1 bg-blue-600 rounded transition-all duration-500"
                    style={{
                      width: `${Math.max(
                        0,
                        Math.min(
                          100,
                          (getCurrentStepIndex(order.status) / (statusSteps.length - 1)) * 90
                        )
                      )}%`,
                    }}
                  ></div>

                  {/* Steps */}
                  <div className="relative flex justify-between">
                    {statusSteps.map((step, index) => {
                      const isCompleted = index <= getCurrentStepIndex(order.status);
                      const isCurrent = step.status === order.status;

                      return (
                        <div key={step.status} className="flex flex-col items-center">
                          <div
                            className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold z-10 transition-all duration-300 ${
                              isCompleted
                                ? order.status === "cancelled" && index < statusSteps.length - 1
                                  ? "bg-gray-400 text-white"
                                  : "bg-blue-600 text-white"
                                : "bg-gray-200 text-gray-500"
                            } ${isCurrent && order.status !== "cancelled" ? "ring-4 ring-blue-200 scale-110" : ""}`}
                          >
                            {isCompleted ? (
                              order.status === "cancelled" && index < statusSteps.length - 1 ? (
                                "×"
                              ) : isCurrent ? (
                                <span className="animate-pulse">●</span>
                              ) : (
                                <svg
                                  className="w-6 h-6"
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
                              )
                            ) : (
                              index + 1
                            )}
                          </div>
                          <p
                            className={`mt-3 text-sm font-medium ${
                              isCompleted
                                ? order.status === "cancelled" && index < statusSteps.length - 1
                                  ? "text-gray-400"
                                  : "text-gray-800"
                                : "text-gray-400"
                            }`}
                          >
                            {step.label}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Order Date */}
                <div className="mt-8 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <svg
                      className="w-5 h-5 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <div>
                      <p className="text-sm text-gray-500">Order Date</p>
                      <p className="font-medium text-gray-800">
                        {formatDate(order.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-md p-6">
              <h3 className="font-semibold text-gray-800 mb-4">Status Timeline</h3>
              <OrderTimeline status={order.status} history={order.trackingHistory || []} />
            </div>

            {/* Order Items */}
            <div className="bg-white rounded-2xl shadow-md p-6">
              <h3 className="font-semibold text-gray-800 mb-4">Items Ordered</h3>
              <div className="space-y-4">
                {order.items?.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl"
                  >
                    <div className="w-20 h-20 bg-white rounded-lg overflow-hidden flex-shrink-0">
                      {item.image ? (
                        <img
                          src={getImageUrl(item.image)}
                          alt={item.name}
                          className="w-full h-full object-cover"
                          onError={setImageFallback}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          No Image
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-800 truncate">
                        {item.name}
                      </h4>
                      <p className="text-sm text-gray-500">Qty: {item.qty}</p>
                      <p className="text-sm text-gray-500">
                        {formatCurrencyINR(item.price || 0)} each
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">
                        {formatCurrencyINR((item.price || 0) * item.qty)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Order Summary */}
              <div className="border-t border-gray-100 mt-6 pt-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span>{formatCurrencyINR(displayTotal)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Shipping</span>
                    <span className="text-green-600">Free</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>Total</span>
                    <span>{formatCurrencyINR(displayTotal)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Order Info Card */}
            <div className="bg-white rounded-2xl shadow-md p-6">
              <h3 className="font-semibold text-gray-800 mb-4">Order Information</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Tracking ID</p>
                  <p className="font-mono font-bold text-gray-800">
                    {order.trackingId}
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
                  <p className="font-bold text-xl text-gray-900">
                    {formatCurrencyINR(displayTotal)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Number of Items</p>
                  <p className="font-medium text-gray-800">
                    {itemCount} items
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <span
                    className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                      order.status
                    )}`}
                  >
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </span>
                </div>
              </div>
            </div>

            {/* Customer/Shipping Info (if available) */}
            {(order.user || order.shippingAddress) && (
              <div className="bg-white rounded-2xl shadow-md p-6">
                <h3 className="font-semibold text-gray-800 mb-4">Shipping To</h3>
                <div className="space-y-2 text-sm">
                  {order.user?.name && <p className="font-medium text-gray-800">{order.user.name}</p>}
                  {order.user?.email && <p className="text-gray-600">{order.user.email}</p>}
                  {order.user?.phone && <p className="text-gray-600">{order.user.phone}</p>}
                  {order.user?.address && <p className="text-gray-600">{order.user.address}</p>}
                  {order.shippingAddress?.street && (
                    <p className="text-gray-600">
                      {order.shippingAddress.street}
                      {order.shippingAddress.city ? `, ${order.shippingAddress.city}` : ""}
                      {order.shippingAddress.state ? `, ${order.shippingAddress.state}` : ""}
                      {order.shippingAddress.zipCode ? ` - ${order.shippingAddress.zipCode}` : ""}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="bg-white rounded-2xl shadow-md p-6">
              <h3 className="font-semibold text-gray-800 mb-4">Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={() => navigate("/my-orders")}
                  className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                >
                  View All Orders
                </button>
                {order.status === "delivered" && (
                  <button
                    onClick={() => navigate("/products")}
                    className="w-full py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
                  >
                    Buy Again
                  </button>
                )}
              </div>
            </div>

            {/* Help Card */}
            <div className="bg-blue-50 rounded-2xl p-6">
              <h3 className="font-semibold text-blue-800 mb-2">Need Help?</h3>
              <p className="text-blue-700 text-sm mb-4">
                If you have any questions about this order, please contact our support
                team.
              </p>
              <Link
                to="/contact"
                className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-sm"
              >
                Contact Support
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetails;
