import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import API from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { formatCurrencyINR } from "../utils/currency";

const initialProfile = {
  name: "",
  email: "",
  phone: "",
  address: "",
  currentPassword: "",
};

const initialPassword = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

const Profile = () => {
  const navigate = useNavigate();
  const { user, token, isAuthenticated, setAuthData, logout } = useAuth();

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [profileForm, setProfileForm] = useState(initialProfile);
  const [passwordForm, setPasswordForm] = useState(initialPassword);
  const [orders, setOrders] = useState([]);
  const [savedAddress, setSavedAddress] = useState(null);
  const [refundInfo, setRefundInfo] = useState({ refundBalance: 0, totalRefunded: 0 });
  const [deactivatePassword, setDeactivatePassword] = useState("");
  const [deactivating, setDeactivating] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);

  const fetchProfileData = useCallback(async () => {
    setLoading(true);
    try {
      const [meRes, ordersRes, addressRes] = await Promise.all([
        API.get("/api/users/me"),
        API.get("/api/orders/my"),
        API.get("/api/address/me"),
      ]);

      const meUser = meRes.data?.user || {};
      setProfileForm({
        name: meUser.name || "",
        email: meUser.email || "",
        phone: meUser.phone || "",
        address: meUser.address || "",
        currentPassword: "",
      });
      setRefundInfo({
        refundBalance: Number(meUser.refundBalance || 0),
        totalRefunded: Number(meUser.totalRefunded || 0),
      });
      setOrders(Array.isArray(ordersRes.data) ? ordersRes.data : []);
      setSavedAddress(addressRes.data?.address || null);
    } catch (err) {
      console.error("Failed to fetch profile data", err);
      toast.error(err.response?.data?.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      navigate("/login?redirect=/profile");
      return;
    }
    fetchProfileData();
  }, [fetchProfileData, isAuthenticated, token, navigate]);

  const orderStats = useMemo(() => {
    const totalOrders = orders.length;
    const deliveredOrders = orders.filter(
      (o) => (o.orderStatus || o.status) === "delivered"
    ).length;
    const totalSpent = orders.reduce((sum, o) => sum + Number(o.total || 0), 0);
    const latestOrder = orders[0] || null;

    return {
      totalOrders,
      deliveredOrders,
      totalSpent,
      latestOrder,
    };
  }, [orders]);

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const payload = {
        name: profileForm.name,
        phone: profileForm.phone,
        address: profileForm.address,
        currentPassword: profileForm.currentPassword,
      };

      const { data } = await API.put("/api/users/profile", payload);
      const updatedUser = data?.user;
      if (updatedUser && token) {
        setAuthData(token, updatedUser);
        setRefundInfo({
          refundBalance: Number(updatedUser.refundBalance || 0),
          totalRefunded: Number(updatedUser.totalRefunded || 0),
        });
      }
      setProfileForm((prev) => ({ ...prev, currentPassword: "" }));
      toast.success(data?.message || "Profile updated successfully");
    } catch (err) {
      console.error("Profile update failed", err);
      toast.error(err.response?.data?.message || "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("New password and confirm password do not match");
      return;
    }

    setChangingPassword(true);
    try {
      const { data } = await API.post("/api/users/change-password", {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });

      toast.success(data?.message || "Password changed successfully");
      setPasswordForm(initialPassword);
    } catch (err) {
      console.error("Password change failed", err);
      toast.error(err.response?.data?.message || "Failed to change password");
    } finally {
      setChangingPassword(false);
    }
  };

  const handleDeactivateAccount = async (e) => {
    e.preventDefault();
    if (!deactivatePassword.trim()) {
      toast.error("Please enter your current password");
      return;
    }

    setDeactivating(true);
    try {
      const { data } = await API.post("/api/users/deactivate", {
        currentPassword: deactivatePassword,
      });
      toast.success(data?.message || "Account deactivated");
      await logout();
      navigate("/login?deactivated=true", { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to deactivate account");
    } finally {
      setDeactivating(false);
      setDeactivatePassword("");
    }
  };

  const handleDeleteAccount = async (e) => {
    e.preventDefault();

    if (!deletePassword.trim()) {
      toast.error("Please enter your current password");
      return;
    }
    if (deleteConfirmation.trim().toUpperCase() !== "DELETE") {
      toast.error("Type DELETE to confirm account deletion");
      return;
    }

    setDeleting(true);
    try {
      const { data } = await API.delete("/api/users", {
        data: {
          currentPassword: deletePassword,
          confirmation: deleteConfirmation,
        },
      });
      toast.success(data?.message || "Account deleted");
      await logout();
      navigate("/", { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete account");
    } finally {
      setDeleting(false);
      setDeletePassword("");
      setDeleteConfirmation("");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">My Profile</h1>
          <p className="text-sm text-gray-600">
            Manage your personal details and account information.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-xs text-gray-500">Total Orders</p>
            <p className="text-2xl font-bold text-gray-900">{orderStats.totalOrders}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-xs text-gray-500">Delivered Orders</p>
            <p className="text-2xl font-bold text-gray-900">{orderStats.deliveredOrders}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-xs text-gray-500">Total Spent</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrencyINR(orderStats.totalSpent)}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-xs text-gray-500">Refund Balance</p>
            <p className="text-2xl font-bold text-green-700">
              {formatCurrencyINR(refundInfo.refundBalance)}
            </p>
            <p className="text-xs text-gray-500">
              Total refunded: {formatCurrencyINR(refundInfo.totalRefunded)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <form onSubmit={handleUpdateProfile} className="bg-white rounded-xl shadow-sm p-5 mb-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Profile Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1" htmlFor="name">
                    Full Name
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={profileForm.name}
                    onChange={handleProfileChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1" htmlFor="email">
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={profileForm.email}
                    className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-gray-500 cursor-not-allowed"
                    disabled
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1" htmlFor="phone">
                    Phone
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="text"
                    value={profileForm.phone}
                    onChange={handleProfileChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter 10-digit phone"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-600 mb-1" htmlFor="address">
                    Address
                  </label>
                  <textarea
                    id="address"
                    name="address"
                    value={profileForm.address}
                    onChange={handleProfileChange}
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your address"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-600 mb-1" htmlFor="profileCurrentPassword">
                    Confirm Current Password
                  </label>
                  <input
                    id="profileCurrentPassword"
                    name="currentPassword"
                    type="password"
                    value={profileForm.currentPassword}
                    onChange={handleProfileChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your current password to save changes"
                    required
                  />
                </div>
              </div>
              <div className="mt-4">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-60"
                >
                  {savingProfile ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>

            <form onSubmit={handleChangePassword} className="bg-white rounded-xl shadow-sm p-5">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Change Password</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1" htmlFor="currentPassword">
                    Current Password
                  </label>
                  <input
                    id="currentPassword"
                    name="currentPassword"
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={handlePasswordChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1" htmlFor="newPassword">
                    New Password
                  </label>
                  <input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={handlePasswordChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1" htmlFor="confirmPassword">
                    Confirm Password
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={handlePasswordChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
              <div className="mt-4">
                <button
                  type="submit"
                  disabled={changingPassword}
                  className="bg-gray-900 text-white px-5 py-2 rounded-lg hover:bg-black disabled:opacity-60"
                >
                  {changingPassword ? "Updating..." : "Update Password"}
                </button>
              </div>
            </form>
          </div>

          <div>
            <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">Account Summary</h2>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-gray-500">Name</p>
                  <p className="text-gray-900 font-medium">{profileForm.name || "-"}</p>
                </div>
                <div>
                  <p className="text-gray-500">Email</p>
                  <p className="text-gray-900 font-medium">{profileForm.email || "-"}</p>
                </div>
                <div>
                  <p className="text-gray-500">Phone</p>
                  <p className="text-gray-900 font-medium">{profileForm.phone || "-"}</p>
                </div>
                <div>
                  <p className="text-gray-500">Role</p>
                  <p className="text-gray-900 font-medium">{user?.isAdmin ? "Admin" : "Customer"}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">Saved Shipping Address</h2>
              {savedAddress ? (
                <div className="text-sm text-gray-700 leading-6">
                  <p className="font-medium text-gray-900">{savedAddress.name}</p>
                  <p>{savedAddress.phone}</p>
                  <p>{savedAddress.street}</p>
                  <p>
                    {savedAddress.city}, {savedAddress.state} - {savedAddress.zipCode}
                  </p>
                  <p>{savedAddress.country}</p>
                </div>
              ) : (
                <p className="text-sm text-gray-600">No saved shipping address yet.</p>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm p-5">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">Recent Activity</h2>
              {orderStats.latestOrder ? (
                <div className="text-sm text-gray-700">
                  <p className="text-gray-500">Latest Order</p>
                  <p className="font-medium text-gray-900">
                    #{orderStats.latestOrder.trackingId}
                  </p>
                  <p className="text-gray-600">
                    {new Date(orderStats.latestOrder.createdAt).toLocaleDateString()}
                  </p>
                  <Link
                    to={`/order/${orderStats.latestOrder.trackingId}`}
                    className="inline-block mt-3 text-blue-600 hover:text-blue-700 font-medium"
                  >
                    View Order
                  </Link>
                </div>
              ) : (
                <p className="text-sm text-gray-600">No recent orders found.</p>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm p-5 mt-6 border border-red-200">
              <h2 className="text-lg font-semibold text-red-700 mb-3">Danger Zone</h2>

              <form onSubmit={handleDeactivateAccount} className="mb-5">
                <p className="text-sm text-gray-700 mb-2">Deactivate Account</p>
                <p className="text-xs text-gray-500 mb-2">
                  You can login later to reactivate with admin help.
                </p>
                <input
                  type="password"
                  value={deactivatePassword}
                  onChange={(e) => setDeactivatePassword(e.target.value)}
                  placeholder="Current password"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <button
                  type="submit"
                  disabled={deactivating}
                  className="w-full bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 disabled:opacity-60"
                >
                  {deactivating ? "Deactivating..." : "Deactivate My Account"}
                </button>
              </form>

              <form onSubmit={handleDeleteAccount}>
                <p className="text-sm text-gray-700 mb-2">Delete Account Permanently</p>
                <p className="text-xs text-gray-500 mb-2">
                  This will remove your profile and related data permanently.
                </p>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Current password"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <input
                  type="text"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  placeholder='Type "DELETE" to confirm'
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <button
                  type="submit"
                  disabled={deleting}
                  className="w-full bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-60"
                >
                  {deleting ? "Deleting..." : "Delete My Account"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
