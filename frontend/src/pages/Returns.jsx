import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import API from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { formatCurrencyINR } from "../utils/currency";

const Returns = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const presetTrackingId = searchParams.get("trackingId");
  const { isAuthenticated, token } = useAuth();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [orders, setOrders] = useState([]);
  const [refunds, setRefunds] = useState([]);
  const [form, setForm] = useState({
    orderId: "",
    reason: "",
  });

  useEffect(() => {
    if (!isAuthenticated || !token) {
      navigate("/login?redirect=/returns");
      return;
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, token, navigate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ordersRes, refundsRes] = await Promise.all([
        API.get("/api/orders/my"),
        API.get("/api/refunds/my"),
      ]);
      const fetchedOrders = Array.isArray(ordersRes.data) ? ordersRes.data : [];
      const fetchedRefunds = Array.isArray(refundsRes.data) ? refundsRes.data : [];

      setOrders(fetchedOrders);
      setRefunds(fetchedRefunds);

      if (presetTrackingId) {
        const presetOrder = fetchedOrders.find(
          (o) => String(o.trackingId) === String(presetTrackingId)
        );
        if (presetOrder) {
          setForm((prev) => ({ ...prev, orderId: presetOrder._id }));
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load return section");
    } finally {
      setLoading(false);
    }
  };

  const eligibleOrders = useMemo(
    () =>
      orders.filter((o) => {
        const alreadyExists = refunds.some((r) => String(r.order?._id || r.order) === String(o._id) && ["pending", "approved"].includes(r.status));
        return o.status === "delivered" && o.paymentStatus === "paid" && !alreadyExists;
      }),
    [orders, refunds]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.orderId) {
      toast.error("Please select an order");
      return;
    }
    if (!form.reason.trim()) {
      toast.error("Please enter return/refund reason");
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await API.post("/api/refunds/request", {
        orderId: form.orderId,
        reason: form.reason,
      });
      toast.success(data?.message || "Refund request submitted");
      setForm({ orderId: "", reason: "" });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit refund request");
    } finally {
      setSubmitting(false);
    }
  };

  const statusBadge = (status) => {
    if (status === "approved") return "bg-green-100 text-green-700";
    if (status === "rejected") return "bg-red-100 text-red-700";
    return "bg-yellow-100 text-yellow-700";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading returns...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Returns & Refunds</h1>
          <p className="text-sm text-gray-600">Request refunds and track approval status.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-5">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Request Refund</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Select Delivered Order</label>
                  <select
                    value={form.orderId}
                    onChange={(e) => setForm((prev) => ({ ...prev, orderId: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="">Select order</option>
                    {eligibleOrders.map((order) => (
                      <option key={order._id} value={order._id}>
                        {order.trackingId} - {formatCurrencyINR(order.total)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Reason</label>
                  <textarea
                    value={form.reason}
                    onChange={(e) => setForm((prev) => ({ ...prev, reason: e.target.value }))}
                    rows={4}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="Tell us why you want a refund"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-blue-600 text-white rounded-lg py-2 hover:bg-blue-700 disabled:opacity-60"
                >
                  {submitting ? "Submitting..." : "Submit Refund Request"}
                </button>
                {eligibleOrders.length === 0 && (
                  <p className="text-xs text-gray-500">
                    No eligible delivered paid orders available for new refund request.
                  </p>
                )}
              </div>
            </form>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-800">My Refund Requests</h2>
                <Link to="/my-orders" className="text-sm text-blue-600 hover:text-blue-700">
                  View Orders
                </Link>
              </div>
              {refunds.length === 0 ? (
                <p className="text-gray-600 text-sm">No refund requests yet.</p>
              ) : (
                <div className="space-y-3">
                  {refunds.map((refund) => (
                    <div key={refund._id} className="border border-gray-100 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-800">
                            Order #{refund.trackingId}
                          </p>
                          <p className="text-xs text-gray-500">
                            Requested on {new Date(refund.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${statusBadge(
                            refund.status
                          )}`}
                        >
                          {refund.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mt-2">{refund.reason}</p>
                      <p className="text-sm font-semibold text-gray-900 mt-2">
                        Amount: {formatCurrencyINR(refund.amount || 0)}
                      </p>
                      {refund.adminNote ? (
                        <p className="text-xs text-gray-600 mt-1">
                          Admin Note: {refund.adminNote}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Returns;
