import React, { useState } from "react";
import { Link } from "react-router-dom";
import API from "../utils/api";
import { formatCurrencyINR } from "../utils/currency";
import OrderTimeline from "../components/OrderTimeline";
import { getImageUrl, setImageFallback } from "../utils/image";

const TrackOrder = () => {
  const [trackingId, setTrackingId] = useState("");
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [myOrders, setMyOrders] = useState([]);
  const [showMyOrders, setShowMyOrders] = useState(false);

  const statusSteps = [
    { status: "pending", label: "Order Placed", icon: "📦" },
    { status: "processing", label: "Processing", icon: "⚙️" },
    { status: "shipped", label: "Shipped", icon: "🚚" },
    { status: "delivered", label: "Delivered", icon: "✅" },
  ];

  const handleTrack = async (e) => {
    e.preventDefault();
    if (!trackingId.trim()) {
      setError("Please enter a tracking ID");
      return;
    }

    setLoading(true);
    setError("");
    setOrder(null);

    try {
      const { data } = await API.get(`/api/orders/track/${trackingId}`);
      setOrder(data);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Order not found. Please check your tracking ID.");
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyOrders = async () => {
    try {
      const { data } = await API.get("/api/orders/my");
      setMyOrders(data);
      setShowMyOrders(true);
    } catch (err) {
      console.error("Failed to fetch orders", err);
    }
  };

  const getCurrentStepIndex = (orderStatus) => {
    const index = statusSteps.findIndex((step) => step.status === orderStatus);
    return index >= 0 ? index : 0;
  };

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
      default:
        return "bg-gray-100 text-gray-700 border-gray-300";
    }
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

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">Track Your Order</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Enter your tracking ID to see the current status of your order, or view your recent orders.
          </p>
        </div>

        {/* Search Form */}
        <div className="max-w-2xl mx-auto mb-12">
          <form
            onSubmit={handleTrack}
            className="bg-white rounded-2xl shadow-md p-6"
          >
            <label className="block text-gray-700 font-medium mb-2">
              Tracking ID
            </label>
            <div className="flex gap-4">
              <input
                type="text"
                value={trackingId}
                onChange={(e) => setTrackingId(e.target.value)}
                placeholder="Enter your tracking ID (e.g., a1b2c3d4e5f6)"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition disabled:bg-blue-300 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
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
                    Tracking...
                  </span>
                ) : (
                  "Track"
                )}
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Tip: Your tracking ID was sent to your email after checkout.
            </p>
          </form>

          {/* View My Orders Button */}
          <div className="text-center mt-6">
            <button
              onClick={fetchMyOrders}
              className="text-blue-600 hover:text-blue-700 font-medium underline"
            >
              Or view your recent orders
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="max-w-2xl mx-auto mb-8">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
              <svg className="w-6 h-6 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Order Not Found */}
        {!order && !error && !loading && !showMyOrders && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              Track your order
            </h3>
            <p className="text-gray-600">
              Enter your tracking ID above to see your order status
            </p>
          </div>
        )}

        {/* My Orders List */}
        {showMyOrders && myOrders.length === 0 && (
          <div className="max-w-4xl mx-auto">
            <div className="text-center py-16">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                No orders yet
              </h3>
              <p className="text-gray-600 mb-6">
                You haven't placed any orders yet.
              </p>
              <Link
                to="/products"
                className="inline-block bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition font-medium"
              >
                Browse Products
              </Link>
            </div>
          </div>
        )}

        {showMyOrders && myOrders.length > 0 && (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Your Recent Orders</h2>
            <div className="space-y-4">
              {myOrders.map((ord) => (
                <div
                  key={ord._id}
                  className="bg-white rounded-xl shadow-md p-4 hover:shadow-lg transition cursor-pointer"
                  onClick={() => {
                    setTrackingId(ord.trackingId);
                    handleTrack({ preventDefault: () => {} });
                    setShowMyOrders(false);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-800">Order #{ord.trackingId}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(ord.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(ord.status)}`}>
                        {ord.status.charAt(0).toUpperCase() + ord.status.slice(1)}
                      </span>
                      <span className="font-bold text-gray-900">
                        {formatCurrencyINR(ord.total)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Order Found - Show Details */}
        {order && (
          <div className="max-w-4xl mx-auto">
            {/* Order Header */}
            <div className="bg-white rounded-2xl shadow-md overflow-hidden mb-6">
              <div className="bg-gray-800 text-white p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-300">Tracking ID</p>
                    <p className="text-2xl font-bold font-mono">{order.trackingId}</p>
                  </div>
                  <span className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(order.status)}`}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </span>
                </div>
              </div>

              {/* Order Timeline */}
              <div className="p-6">
                <h3 className="font-semibold text-gray-800 mb-6">Order Progress</h3>
                <div className="relative">
                  {/* Progress Line */}
                  <div className="absolute top-5 left-5 right-5 h-1 bg-gray-200 rounded"></div>
                  <div
                    className="absolute top-5 left-5 h-1 bg-blue-600 rounded transition-all duration-500"
                    style={{
                      width: `${(getCurrentStepIndex(order.status) / (statusSteps.length - 1)) * 90}%`,
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
                            className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold z-10 transition-all duration-300 ${
                              isCompleted
                                ? "bg-blue-600 text-white"
                                : "bg-gray-200 text-gray-500"
                            } ${isCurrent ? "ring-4 ring-blue-200" : ""}`}
                          >
                            {isCompleted ? (isCurrent ? "●" : "✓") : index + 1}
                          </div>
                          <p
                            className={`mt-3 text-sm font-medium ${
                              isCompleted ? "text-gray-800" : "text-gray-400"
                            }`}
                          >
                            {step.label}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
              <h3 className="font-semibold text-gray-800 mb-4">Detailed Timeline</h3>
              <OrderTimeline status={order.status} history={order.trackingHistory || []} />
            </div>

            {/* Order Details */}
            <div className="bg-white rounded-2xl shadow-md p-6">
              <h3 className="font-semibold text-gray-800 mb-4">Order Details</h3>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-500">Order Date</p>
                  <p className="font-medium text-gray-800">{formatDate(order.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Amount</p>
                  <p className="font-medium text-gray-800 text-xl">{formatCurrencyINR(order.total)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Items</p>
                  <p className="font-medium text-gray-800">{order.items?.length || 0} items</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <p className="font-medium text-gray-800 capitalize">{order.status}</p>
                </div>
              </div>

              {/* Items List */}
              {order.items && order.items.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-700 mb-3">Items Ordered</h4>
                  <div className="space-y-3">
                    {order.items.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden">
                          {item.image && (
                            <img
                              src={getImageUrl(item.image)}
                              alt={item.name}
                              className="w-full h-full object-cover"
                              onError={setImageFallback}
                            />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-800">{item.name}</p>
                          <p className="text-sm text-gray-600">Qty: {item.qty}</p>
                        </div>
                        <p className="font-semibold text-gray-900">
                          {formatCurrencyINR(item.price * item.qty)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Help Section */}
            <div className="mt-6 bg-blue-50 rounded-2xl p-6">
              <h3 className="font-semibold text-blue-800 mb-2">Need Help?</h3>
              <p className="text-blue-700 mb-4">
                If you have any questions about your order, please contact our support team.
              </p>
              <div className="flex gap-4">
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium">
                  Contact Support
                </button>
                <button
                  onClick={() => {
                    setOrder(null);
                    setTrackingId("");
                  }}
                  className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition font-medium"
                >
                  Track Another Order
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrackOrder;
