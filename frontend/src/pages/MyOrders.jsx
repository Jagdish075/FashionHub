import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { formatCurrencyINR } from "../utils/currency";
import { toast } from "react-toastify";
import { getImageUrl, setImageFallback } from "../utils/image";

const MyOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, new, completed
  const [reviewTarget, setReviewTarget] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const navigate = useNavigate();
  
  // Use AuthContext for user state
  const { user, isAuthenticated, token } = useAuth();

  useEffect(() => {
    // Check authentication
    if (!isAuthenticated || !token) {
      navigate("/login?redirect=/my-orders");
      return;
    }
    fetchOrders();
  }, [isAuthenticated, token, navigate]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data } = await API.get("/api/orders/my");
      setOrders(data);
    } catch (err) {
      console.error("Failed to fetch orders", err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
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
      case "cancelled":
        return "bg-red-100 text-red-700 border-red-300";
      default:
        return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Filter orders
  const filteredOrders = orders.filter((order) => {
    if (filter === "new") {
      return ["pending", "processing", "shipped"].includes(order.status);
    } else if (filter === "completed") {
      return order.status === "delivered" || order.status === "cancelled";
    }
    return true;
  });

  // Calculate stats
  const stats = {
    total: orders.length,
    new: orders.filter((o) => ["pending", "processing", "shipped"].includes(o.status))
      .length,
    completed: orders.filter(
      (o) => o.status === "delivered" || o.status === "cancelled"
    ).length,
  };

  const extractProductId = (productRef) => {
    if (!productRef) return "";
    if (typeof productRef === "string") return productRef;
    if (typeof productRef === "object") return String(productRef._id || productRef.id || "");
    return "";
  };

  const openReviewModal = (order, item) => {
    const productId = extractProductId(item?.product);
    if (!productId) {
      toast.error("Unable to review this item");
      return;
    }
    setReviewTarget({
      orderId: order._id,
      productId,
      productName: item.name || "Product",
    });
    setReviewRating(5);
    setReviewComment("");
  };

  const closeReviewModal = () => {
    if (reviewSubmitting) return;
    setReviewTarget(null);
    setReviewRating(5);
    setReviewComment("");
  };

  const submitReview = async (e) => {
    e.preventDefault();
    if (!reviewTarget?.productId) return;
    setReviewSubmitting(true);
    try {
      const payload = {
        rating: reviewRating,
        comment: reviewComment.trim(),
      };
      try {
        await API.post(`/api/reviews/product/${reviewTarget.productId}`, payload);
      } catch (primaryErr) {
        if (primaryErr.response?.status !== 404) throw primaryErr;
        try {
          await API.post(`/reviews/product/${reviewTarget.productId}`, payload);
        } catch (secondaryErr) {
          if (secondaryErr.response?.status !== 404) throw secondaryErr;
          await API.post(`/api/api/reviews/product/${reviewTarget.productId}`, payload);
        }
      }
      toast.success("Review submitted successfully");
      closeReviewModal();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit review");
    } finally {
      setReviewSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-gray-800 mb-1">
            📦 My Orders
          </h1>
          <p className="text-sm text-gray-600">
            {user ? `Welcome back, ${user.name}!` : "View your order history"}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <button
            onClick={() => setFilter("all")}
            className={`p-3 rounded-lg shadow-sm transition-all ${
              filter === "all"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-800 hover:shadow-lg"
            }`}
          >
            <p className="text-xs opacity-80">Total</p>
            <p className="text-xl font-bold">{stats.total}</p>
          </button>
          <button
            onClick={() => setFilter("new")}
            className={`p-3 rounded-lg shadow-sm transition-all ${
              filter === "new"
                ? "bg-yellow-500 text-white"
                : "bg-white text-gray-800 hover:shadow-lg"
            }`}
          >
            <p className="text-xs opacity-80">Active</p>
            <p className="text-xl font-bold">{stats.new}</p>
          </button>
          <button
            onClick={() => setFilter("completed")}
            className={`p-3 rounded-lg shadow-sm transition-all ${
              filter === "completed"
                ? "bg-green-600 text-white"
                : "bg-white text-gray-800 hover:shadow-lg"
            }`}
          >
            <p className="text-xs opacity-80">Done</p>
            <p className="text-xl font-bold">{stats.completed}</p>
          </button>
        </div>

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-md p-12 text-center">
            <div className="text-6xl mb-4">📭</div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              {filter === "all"
                ? "No orders yet"
                : filter === "new"
                ? "No new orders"
                : "No completed orders"}
            </h2>
            <p className="text-gray-600 mb-8">
              {filter === "all"
                ? "Looks like you haven't placed any orders yet."
                : filter === "new"
                ? "All your orders have been completed!"
                : "You haven't completed any orders yet."}
            </p>
            <Link
              to="/products"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition font-medium"
            >
              {filter === "all" ? "Start Shopping" : "View All Orders"}
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredOrders.map((order) => {
              const FREE_SHIPPING_THRESHOLD = 1000;
              const DELIVERY_FEE = 100;
              const itemsSubtotal = (order.items || []).reduce(
                (sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0),
                0
              );
              const shippingFee =
                itemsSubtotal > 0 && itemsSubtotal < FREE_SHIPPING_THRESHOLD ? DELIVERY_FEE : 0;
              const calculatedTotal = itemsSubtotal + shippingFee;
              const displayTotal =
                Number(order.total || 0) > 0
                  ? Math.max(Number(order.total), calculatedTotal)
                  : calculatedTotal;

              return (
                <div
                  key={order._id}
                  className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="p-4">
                  {/* Order Header */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between mb-3">
                    <div className="flex items-center gap-4">
                      <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center">
                        <span className="text-lg">📦</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-gray-800">
                            #{order.trackingId}
                          </span>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                              order.status
                            )}`}
                          >
                            {order.status.charAt(0).toUpperCase() +
                              order.status.slice(1)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">
                          Ordered on {formatDate(order.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 md:mt-0 flex items-center gap-3">
                      <span className="text-xl font-bold text-gray-900">
                        {formatCurrencyINR(displayTotal)}
                      </span>
                    </div>
                  </div>

                  {/* Order Items Preview */}
                  <div className="border-t border-gray-100 pt-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm text-gray-500">
                        {order.items?.length || 0} items
                      </span>
                    </div>
                    <div className="mb-2 space-y-1 text-sm">
                      <div className="flex justify-between text-gray-600">
                        <span>Subtotal</span>
                        <span>{formatCurrencyINR(itemsSubtotal)}</span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>Shipping</span>
                        <span className={shippingFee === 0 ? "text-green-600" : ""}>
                          {shippingFee === 0 ? "Free" : formatCurrencyINR(shippingFee)}
                        </span>
                      </div>
                      <div className="flex justify-between font-semibold text-gray-900">
                        <span>Total</span>
                        <span>{formatCurrencyINR(displayTotal)}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {order.items?.slice(0, 3).map((item, index) => (
                        <div
                          key={index}
                          className="w-10 h-10 bg-gray-100 rounded-md overflow-hidden"
                        >
                          {item.image && (
                            <img
                              src={getImageUrl(item.image)}
                              alt={item.name}
                              className="w-full h-full object-cover"
                              onError={setImageFallback}
                            />
                          )}
                        </div>
                      ))}
                      {order.items?.length > 3 && (
                        <div className="w-10 h-10 bg-gray-100 rounded-md flex items-center justify-center text-xs text-gray-500">
                          +{order.items.length - 3}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Order Actions */}
                  <div className="border-t border-gray-100 pt-3 mt-3 flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={() => navigate(`/order/${order.trackingId}`)}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium flex items-center justify-center gap-2"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                      View Details
                    </button>
                    {order.status === "delivered" && (
                      <button
                        onClick={() => navigate(`/products`)}
                        className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium"
                      >
                        Buy Again
                      </button>
                    )}
                  </div>
                  {order.status === "delivered" && (
                    <div className="border-t border-gray-100 pt-3 mt-3">
                      <p className="text-sm font-medium text-gray-700 mb-2">Rate Delivered Items</p>
                      <div className="flex flex-wrap gap-2">
                        {(order.items || []).map((item, idx) => (
                          <button
                            key={`${order._id}-review-${idx}`}
                            onClick={() => openReviewModal(order, item)}
                            className="px-3 py-1.5 rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-50 text-sm"
                          >
                            Review {item.name || `Item ${idx + 1}`}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Help Section */}
        <div className="mt-12 bg-blue-50 rounded-2xl p-6">
          <h3 className="font-semibold text-blue-800 mb-2">Need Help?</h3>
          <p className="text-blue-700 mb-4">
            If you have any questions about your orders, please contact our support
            team.
          </p>
          <Link
            to="/contact"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
          >
            Contact Support
          </Link>
        </div>
      </div>

      {reviewTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Review Product</h3>
                <p className="text-sm text-gray-600">{reviewTarget.productName}</p>
              </div>
              <button
                onClick={closeReviewModal}
                className="text-gray-400 hover:text-gray-600"
                disabled={reviewSubmitting}
              >
                ✕
              </button>
            </div>

            <form onSubmit={submitReview} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-2">Rating</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className={`text-2xl ${star <= reviewRating ? "text-yellow-400" : "text-gray-300"}`}
                      aria-label={`Rate ${star} star`}
                    >
                      ★
                    </button>
                  ))}
                  <span className="text-sm text-gray-600 ml-1">{reviewRating}/5</span>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Comment</label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  rows={4}
                  placeholder="Share your experience"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeReviewModal}
                  disabled={reviewSubmitting}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reviewSubmitting}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300"
                >
                  {reviewSubmitting ? "Submitting..." : "Submit Review"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyOrders;
