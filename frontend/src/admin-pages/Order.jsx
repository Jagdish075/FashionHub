import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import API from "../utils/api";
import { formatCurrencyINR } from "../utils/currency";

const Order = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [updating, setUpdating] = useState(false);

  // Form state for editing
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    status: "",
    shippingCarrier: "",
    shippingTrackingNumber: "",
    estimatedDeliveryDate: "",
    adminNotes: "",
  });

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data } = await API.get("/api/admin/orders");
      setOrders(data);
    } catch (err) {
      console.error("Failed to fetch orders", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    setUpdating(true);
    try {
      const { data } = await API.put(`/api/admin/orders/${orderId}`, { status: newStatus });
      setOrders(orders.map((order) => (order._id === orderId ? data : order)));
      if (selectedOrder && selectedOrder._id === orderId) {
        setSelectedOrder(data);
      }
    } catch (err) {
      console.error("Failed to update status", err);
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm("Are you sure you want to delete this order?")) return;
    try {
      await API.delete(`/api/admin/orders/${orderId}`);
      setOrders(orders.filter((order) => order._id !== orderId));
      if (selectedOrder && selectedOrder._id === orderId) {
        setSelectedOrder(null);
      }
    } catch (err) {
      console.error("Failed to delete order", err);
    }
  };

  const openEditModal = (order) => {
    setEditForm({
      status: order.status,
      shippingCarrier: order.shippingCarrier || "",
      shippingTrackingNumber: order.shippingTrackingNumber || "",
      estimatedDeliveryDate: order.estimatedDeliveryDate
        ? new Date(order.estimatedDeliveryDate).toISOString().split("T")[0]
        : "",
      adminNotes: order.adminNotes || "",
    });
    setSelectedOrder(order);
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedOrder) return;
    setUpdating(true);
    try {
      const { data } = await API.put(`/api/admin/orders/${selectedOrder._id}`, editForm);
      setOrders(orders.map((order) => (order._id === selectedOrder._id ? data : order)));
      setSelectedOrder(data);
      setShowEditModal(false);
    } catch (err) {
      console.error("Failed to update order", err);
    } finally {
      setUpdating(false);
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

const getPaymentStatusColor = (status) => {
  switch (status) {
    case "paid":
      return "bg-green-100 text-green-700 border-green-300";
    case "pending":
      return "bg-yellow-100 text-yellow-700 border-yellow-300";
    case "failed":
      return "bg-red-100 text-red-700 border-red-300";
    case "refunded":
      return "bg-purple-100 text-purple-700 border-purple-300";
    default:
      return "bg-gray-100 text-gray-700 border-gray-300";
  }
};

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const statusOptions = [
    "pending",
    "processing",
    "shipped",
    "delivered",
    "cancelled",
  ];

  const filteredOrders = orders.filter((order) => {
    const matchesStatus = filterStatus === "all" || order.status === filterStatus;
    const matchesSearch =
      order.trackingId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.user?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const orderStats = {
    total: orders.length,
    pending: orders.filter((o) => o.status === "pending").length,
    processing: orders.filter((o) => o.status === "processing").length,
    shipped: orders.filter((o) => o.status === "shipped").length,
    delivered: orders.filter((o) => o.status === "delivered").length,
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Orders Management</h1>
            <p className="text-gray-600">Manage and track all customer orders</p>
          </div>
          <button
            onClick={fetchOrders}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            🔄 Refresh
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-md p-4">
            <p className="text-sm text-gray-500">Total Orders</p>
            <p className="text-2xl font-bold text-gray-800">{orderStats.total}</p>
          </div>
          <div className="bg-yellow-50 rounded-xl shadow-md p-4">
            <p className="text-sm text-yellow-600">Pending</p>
            <p className="text-2xl font-bold text-yellow-700">{orderStats.pending}</p>
          </div>
          <div className="bg-blue-50 rounded-xl shadow-md p-4">
            <p className="text-sm text-blue-600">Processing</p>
            <p className="text-2xl font-bold text-blue-700">{orderStats.processing}</p>
          </div>
          <div className="bg-purple-50 rounded-xl shadow-md p-4">
            <p className="text-sm text-purple-600">Shipped</p>
            <p className="text-2xl font-bold text-purple-700">{orderStats.shipped}</p>
          </div>
          <div className="bg-green-50 rounded-xl shadow-md p-4">
            <p className="text-sm text-green-600">Delivered</p>
            <p className="text-2xl font-bold text-green-700">{orderStats.delivered}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Orders List */}
          <div className="lg:col-span-2">
            {/* Filters */}
            <div className="bg-white rounded-xl shadow-md p-4 mb-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Search by tracking ID, customer name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {/* Orders Table */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              {filteredOrders.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📋</div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">
                    No orders found
                  </h3>
                  <p className="text-gray-600">
                    {searchTerm || filterStatus !== "all"
                      ? "Try adjusting your filters"
                      : "No orders have been placed yet"}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">
                          Tracking ID
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">
                          Customer
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">
                          Date
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">
                          Total
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">
                          Order Status
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">
                          Payment
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.map((order) => (
                        <tr
                          key={order._id}
                          className={`border-t border-gray-100 hover:bg-gray-50 cursor-pointer ${
                            selectedOrder?._id === order._id ? "bg-blue-50" : ""
                          }`}
                          onClick={() => setSelectedOrder(order)}
                        >
                          <td className="px-4 py-3">
                            <span className="font-mono text-sm text-gray-800">
                              {order.trackingId}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium text-gray-800">
                                {order.user?.name || "Guest"}
                              </p>
                              <p className="text-sm text-gray-500">
                                {order.user?.email || "No email"}
                              </p>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {formatDate(order.createdAt)}
                          </td>
                          <td className="px-4 py-3 font-semibold text-gray-800">
                            {formatCurrencyINR(order.total)}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                                order.status
                              )}`}
                            >
                              {order.status.charAt(0).toUpperCase() +
                                order.status.slice(1)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium border ${getPaymentStatusColor(
                                order.paymentStatus || 'pending'
                              )}`}
                            >
                              {(order.paymentStatus || 'pending').charAt(0).toUpperCase() +
                                (order.paymentStatus || 'pending').slice(1)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditModal(order);
                                }}
                                className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition"
                                title="Edit Order"
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
                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                  />
                                </svg>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteOrder(order._id);
                                }}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                                title="Delete Order"
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
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Order Details Panel */}
          <div className="lg:col-span-1">
            {selectedOrder ? (
              <div className="bg-white rounded-xl shadow-md p-6 sticky top-4">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-800">Order Details</h2>
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="text-gray-400 hover:text-gray-600"
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
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                {/* Tracking ID */}
                <div className="bg-gray-100 rounded-lg p-3 mb-4">
                  <p className="text-sm text-gray-500">Tracking ID</p>
                  <p className="font-mono font-bold text-gray-800">
                    {selectedOrder.trackingId}
                  </p>
                </div>

                {/* Customer Info */}
                <div className="mb-4">
                  <h3 className="font-semibold text-gray-700 mb-2">
                    Customer Information
                  </h3>
                  <div className="space-y-1 text-sm">
                    <p className="text-gray-800">
                      <span className="font-medium">Name:</span>{" "}
                      {selectedOrder.user?.name || "Guest"}
                    </p>
                    <p className="text-gray-800">
                      <span className="font-medium">Email:</span>{" "}
                      {selectedOrder.user?.email || "N/A"}
                    </p>
                    <p className="text-gray-800">
                      <span className="font-medium">Phone:</span>{" "}
                      {selectedOrder.user?.phone || "N/A"}
                    </p>
                  </div>
                </div>

                {/* Order Info */}
                <div className="mb-4">
                  <h3 className="font-semibold text-gray-700 mb-2">
                    Order Information
                  </h3>
                  <div className="space-y-1 text-sm">
                    <p className="text-gray-800">
                      <span className="font-medium">Date:</span>{" "}
                      {formatDate(selectedOrder.createdAt)}
                    </p>
                    <p className="text-gray-800">
                      <span className="font-medium">Total:</span>{" "}
                      {formatCurrencyINR(selectedOrder.total)}
                    </p>
                    <p className="text-gray-800">
                      <span className="font-medium">Items:</span>{" "}
                      {selectedOrder.items?.length || 0}
                    </p>
                  </div>
                </div>

                {/* Shipping Info */}
                {selectedOrder.shippingCarrier && (
                  <div className="mb-4">
                    <h3 className="font-semibold text-gray-700 mb-2">
                      Shipping Information
                    </h3>
                    <div className="space-y-1 text-sm">
                      <p className="text-gray-800">
                        <span className="font-medium">Carrier:</span>{" "}
                        {selectedOrder.shippingCarrier}
                      </p>
                      <p className="text-gray-800">
                        <span className="font-medium">Tracking #:</span>{" "}
                        {selectedOrder.shippingTrackingNumber || "N/A"}
                      </p>
                      {selectedOrder.estimatedDeliveryDate && (
                        <p className="text-gray-800">
                          <span className="font-medium">Est. Delivery:</span>{" "}
                          {new Date(
                            selectedOrder.estimatedDeliveryDate
                          ).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Update Status */}
                <div className="mb-4">
                  <h3 className="font-semibold text-gray-700 mb-2">
                    Update Status
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {statusOptions.map((status) => (
                      <button
                        key={status}
                        onClick={() =>
                          handleUpdateStatus(selectedOrder._id, status)
                        }
                        disabled={updating || selectedOrder.status === status}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition border ${
                          selectedOrder.status === status
                            ? getStatusColor(status)
                            : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                        } ${
                          updating ? "opacity-50 cursor-not-allowed" : ""
                        }`}
                      >
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Edit Button */}
                <div className="mb-4">
                  <button
                    onClick={() => openEditModal(selectedOrder)}
                    className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium flex items-center justify-center gap-2"
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
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                    Edit Order Details
                  </button>
                </div>

                {/* Items List */}
                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">Items</h3>
                  <div className="space-y-2">
                    {selectedOrder.items?.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg"
                      >
                        <div className="w-10 h-10 bg-gray-200 rounded overflow-hidden">
                          {item.image && (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">
                            {item.name}
                          </p>
                          <p className="text-xs text-gray-500">Qty: {item.qty}</p>
                        </div>
                        <p className="text-sm font-semibold text-gray-800">
                          {formatCurrencyINR(item.price * item.qty)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-md p-6 text-center">
                <div className="text-6xl mb-4">📦</div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  Select an Order
                </h3>
                <p className="text-gray-600 text-sm">
                  Click on an order from the list to view details and update status
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-800">
                  Edit Order - {selectedOrder?.trackingId}
                </h2>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
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
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={editForm.status}
                    onChange={(e) =>
                      setEditForm({ ...editForm, status: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Shipping Carrier */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Shipping Carrier
                  </label>
                  <input
                    type="text"
                    value={editForm.shippingCarrier}
                    onChange={(e) =>
                      setEditForm({ ...editForm, shippingCarrier: e.target.value })
                    }
                    placeholder="e.g., FedEx, UPS, DHL"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Tracking Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tracking Number
                  </label>
                  <input
                    type="text"
                    value={editForm.shippingTrackingNumber}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        shippingTrackingNumber: e.target.value,
                      })
                    }
                    placeholder="Enter tracking number"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Estimated Delivery Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estimated Delivery Date
                  </label>
                  <input
                    type="date"
                    value={editForm.estimatedDeliveryDate}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        estimatedDeliveryDate: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Admin Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Admin Notes
                  </label>
                  <textarea
                    value={editForm.adminNotes}
                    onChange={(e) =>
                      setEditForm({ ...editForm, adminNotes: e.target.value })
                    }
                    placeholder="Add internal notes about this order..."
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleSaveEdit}
                  disabled={updating}
                  className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50"
                >
                  {updating ? "Saving..." : "Save Changes"}
                </button>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Order;
