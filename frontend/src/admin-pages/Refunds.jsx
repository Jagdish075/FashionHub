import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import API from "../utils/api";
import { formatCurrencyINR } from "../utils/currency";

const Refunds = () => {
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState("");
  const [refunds, setRefunds] = useState([]);
  const [filter, setFilter] = useState("all");
  const [adminNotes, setAdminNotes] = useState({});

  useEffect(() => {
    fetchRefunds();
  }, []);

  const fetchRefunds = async () => {
    setLoading(true);
    try {
      const { data } = await API.get("/api/admin/refunds");
      setRefunds(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to fetch refund requests");
    } finally {
      setLoading(false);
    }
  };

  const filteredRefunds = useMemo(() => {
    if (filter === "all") return refunds;
    return refunds.filter((r) => r.status === filter);
  }, [refunds, filter]);

  const stats = {
    total: refunds.length,
    pending: refunds.filter((r) => r.status === "pending").length,
    approved: refunds.filter((r) => r.status === "approved").length,
    rejected: refunds.filter((r) => r.status === "rejected").length,
  };

  const handleAction = async (refundId, action) => {
    setUpdatingId(refundId);
    try {
      const { data } = await API.put(`/api/admin/refunds/${refundId}`, {
        action,
        adminNote: adminNotes[refundId] || "",
      });
      toast.success(data?.message || `Refund ${action}d`);
      fetchRefunds();
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${action} refund`);
    } finally {
      setUpdatingId("");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading refund requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Refund Requests</h1>
            <p className="text-gray-600">Approve or reject customer refund requests.</p>
          </div>
          <button
            onClick={fetchRefunds}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <button onClick={() => setFilter("all")} className="bg-white p-4 rounded-xl shadow-sm text-left">
            <p className="text-sm text-gray-500">Total</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </button>
          <button onClick={() => setFilter("pending")} className="bg-yellow-50 p-4 rounded-xl shadow-sm text-left">
            <p className="text-sm text-yellow-700">Pending</p>
            <p className="text-2xl font-bold text-yellow-800">{stats.pending}</p>
          </button>
          <button onClick={() => setFilter("approved")} className="bg-green-50 p-4 rounded-xl shadow-sm text-left">
            <p className="text-sm text-green-700">Approved</p>
            <p className="text-2xl font-bold text-green-800">{stats.approved}</p>
          </button>
          <button onClick={() => setFilter("rejected")} className="bg-red-50 p-4 rounded-xl shadow-sm text-left">
            <p className="text-sm text-red-700">Rejected</p>
            <p className="text-2xl font-bold text-red-800">{stats.rejected}</p>
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5">
          {filteredRefunds.length === 0 ? (
            <p className="text-sm text-gray-600">No refund requests found.</p>
          ) : (
            <div className="space-y-4">
              {filteredRefunds.map((refund) => (
                <div key={refund._id} className="border border-gray-100 rounded-lg p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-800">
                        #{refund.trackingId} - {formatCurrencyINR(refund.amount || 0)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {refund.user?.name} ({refund.user?.email})
                      </p>
                    </div>
                    <span className="text-xs px-3 py-1 rounded-full bg-gray-100 text-gray-700 uppercase">
                      {refund.status}
                    </span>
                  </div>

                  <p className="text-sm text-gray-700 mt-2">{refund.reason}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Requested: {new Date(refund.createdAt).toLocaleString()}
                  </p>

                  {refund.status === "pending" ? (
                    <div className="mt-3">
                      <textarea
                        rows={2}
                        value={adminNotes[refund._id] || ""}
                        onChange={(e) =>
                          setAdminNotes((prev) => ({ ...prev, [refund._id]: e.target.value }))
                        }
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        placeholder="Optional admin note..."
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => handleAction(refund._id, "approve")}
                          disabled={updatingId === refund._id}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-60"
                        >
                          Approve & Credit
                        </button>
                        <button
                          onClick={() => handleAction(refund._id, "reject")}
                          disabled={updatingId === refund._id}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-60"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-600 mt-2">
                      Admin note: {refund.adminNote || "N/A"}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Refunds;
