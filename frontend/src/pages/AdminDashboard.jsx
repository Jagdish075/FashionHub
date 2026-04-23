import React from 'react'
import API from '../utils/api'
import Adminsidebar from '../components/Adminsidebar'
import { Outlet, Link } from 'react-router-dom'
import { formatCurrencyINR } from '../utils/currency'

const AdminDashboard = () => {
  const [sidebarOpen, setSidebarOpen] = React.useState(false)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <Adminsidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="flex-1 md:ml-64 px-4 py-12 overflow-y-auto">
          {/* Mobile header with toggle */}
          <div className="flex items-center justify-between md:hidden mb-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-md bg-white shadow-sm"
              aria-label="Open sidebar"
            >
              <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div />
          </div>

          <Outlet />
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard

// Enhanced Dashboard Stats Component - rendered as index route
export const DashboardStats = () => {
  const [overview, setOverview] = React.useState(null)
  const [recentOrders, setRecentOrders] = React.useState([])
  const [orderTrends, setOrderTrends] = React.useState([])
  const [topCategories, setTopCategories] = React.useState([])
  const [lastUpdated, setLastUpdated] = React.useState(null)
  const [error, setError] = React.useState('')
  const [loading, setLoading] = React.useState(true)
  const [recentRefunds, setRecentRefunds] = React.useState([])

  React.useEffect(() => {
    let intervalId

    const fetchDashboardData = async (initial = false) => {
      try {
        if (initial) setLoading(true)
        const { data } = await API.get('/api/admin/analytics')
        setOverview(data.overview || null)
        setRecentOrders(Array.isArray(data.recentOrders) ? data.recentOrders : [])
        setOrderTrends(Array.isArray(data.orderTrends) ? data.orderTrends : [])
        setTopCategories(Array.isArray(data.topCategories) ? data.topCategories : [])
        setLastUpdated(data.generatedAt || new Date().toISOString())
        setError('')

        // fetch recent refunds separately (show latest 5)
        try {
          const r = await API.get('/api/admin/refunds')
          setRecentRefunds(Array.isArray(r.data) ? r.data.slice(0, 5) : [])
        } catch {
          // ignore refunds fetch errors for dashboard
        }

      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load dashboard data')
      } finally {
        if (initial) setLoading(false)
      }
    }

    fetchDashboardData(true)
    intervalId = setInterval(() => {
      fetchDashboardData(false)
    }, 15000)

    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [])

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'processing': return 'bg-blue-100 text-blue-800'
      case 'shipped': return 'bg-purple-100 text-purple-800'
      case 'delivered': return 'bg-green-100 text-green-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getRefundColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'approved':
        return 'bg-green-100 text-green-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
        <div className="text-sm text-gray-500">
          Last updated: {lastUpdated ? new Date(lastUpdated).toLocaleString() : '-'}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Products</p>
              <p className="text-3xl font-bold text-gray-900">{overview?.products || 0}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Orders</p>
              <p className="text-3xl font-bold text-gray-900">{overview?.totalOrders || 0}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Users</p>
              <p className="text-3xl font-bold text-gray-900">{overview?.users || 0}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Revenue</p>
              <p className="text-3xl font-bold text-gray-900">{formatCurrencyINR(overview?.totalRevenue || 0)}</p>
              <p className="text-xs text-gray-500">
                This month {formatCurrencyINR(overview?.revenueThisMonth || 0)} • Today {formatCurrencyINR(overview?.revenueToday || 0)}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Link
            to="/admin/products"
            className="flex flex-col items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
          >
            <svg className="w-8 h-8 text-blue-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span className="text-sm font-medium text-blue-700">Add Product</span>
          </Link>

          <Link
            to="/admin/orders"
            className="flex flex-col items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition"
          >
            <svg className="w-8 h-8 text-green-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-sm font-medium text-green-700">View Orders</span>
          </Link>

          <Link
            to="/admin/users"
            className="flex flex-col items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition"
          >
            <svg className="w-8 h-8 text-purple-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
            <span className="text-sm font-medium text-purple-700">Manage Users</span>
          </Link>

          <Link
            to="/admin/refunds"
            className="flex flex-col items-center p-4 bg-red-50 rounded-lg hover:bg-red-100 transition"
          >
            <svg className="w-8 h-8 text-red-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3v6h6M21 21v-6h-6M3 21h6v-6M21 3h-6v6" />
            </svg>
            <span className="text-sm font-medium text-red-700">Refunds</span>
            <span className="text-xs text-red-600 mt-1">
              Total: {overview?.refunds?.total || 0} • Pending: {overview?.refunds?.pending || 0}
            </span>
          </Link>

          <button
            onClick={() => window.location.reload()}
            className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
          >
            <svg className="w-8 h-8 text-gray-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="text-sm font-medium text-gray-700">Refresh Data</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Orders */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-800">Recent Orders</h2>
              <Link
                to="/admin/orders"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                View All →
              </Link>
            </div>
          </div>
          <div className="p-6">
            {recentOrders.length === 0 ? (
              <div className="text-center py-8">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-gray-500">No orders yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentOrders.map((order) => (
                  <div key={order._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{order.trackingId}</p>
                        <p className="text-sm text-gray-500">{order.user?.name || 'Guest'} • {formatDate(order.createdAt)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{formatCurrencyINR(order.total)}</p>
                      <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Refunds */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mt-6">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-800">Recent Refunds</h2>
              <Link
                to="/admin/refunds"
                className="text-sm text-red-600 hover:text-red-700 font-medium"
              >
                View All →
              </Link>
            </div>
          </div>
          <div className="p-6">
            {recentRefunds.length === 0 ? (
              <div className="text-center py-8">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-gray-500">No refund requests</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentRefunds.map((r) => (
                  <div key={r._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{r.trackingId || `#${r._id}`}</p>
                        <p className="text-sm text-gray-500">{r.user?.name || 'Unknown'} • {formatDate(r.createdAt)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{formatCurrencyINR(r.amount || 0)}</p>
                      <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getRefundColor(r.status)}`}>
                        {r.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Analytics Overview */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-800">Analytics Overview</h2>
              <Link
                to="/admin"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Live Refreshing
              </Link>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Order Trends */}
              <div className="text-center">
                <h3 className="text-sm font-medium text-gray-500 mb-4">Order Trends (Last 7 Days)</h3>
              <div className="flex items-end justify-center space-x-2 h-20">
                  {(orderTrends.length ? orderTrends : [{ orders: 0 }]).map((item, index) => {
                    const maxOrders = Math.max(...(orderTrends.map((d) => d.orders) || [1]), 1)
                    const value = item.orders || 0
                    return (
                    <div
                      key={index}
                      className="bg-blue-500 rounded-t w-6"
                      style={{ height: `${(value / maxOrders) * 100}%` }}
                    ></div>
                  )})}
                </div>
                <p className="text-xs text-gray-500 mt-2">Daily orders</p>
              </div>

              {/* Revenue Chart */}
              <div className="text-center">
                <h3 className="text-sm font-medium text-gray-500 mb-4">Revenue Growth</h3>
                <div className="relative h-20 flex items-center justify-center">
                  <svg className="w-20 h-20" viewBox="0 0 36 36">
                    <path
                      d="m18,2.0845 a 15.9155,15.9155 0 0,1 0,31.831 a 15.9155,15.9155 0 0,1 0,-31.831"
                      fill="none"
                      stroke="#e5e7eb"
                      strokeWidth="2"
                    />
                    <path
                      d="m18,2.0845 a 15.9155,15.9155 0 0,1 0,31.831 a 15.9155,15.9155 0 0,1 0,-31.831"
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="2"
                      strokeDasharray={`${Math.min(100, Math.round(((overview?.paidOrders || 0) / Math.max(overview?.totalOrders || 1, 1)) * 100))}, 100`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold text-gray-800">
                      {Math.min(100, Math.round(((overview?.paidOrders || 0) / Math.max(overview?.totalOrders || 1, 1)) * 100))}%
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">Paid order ratio</p>
              </div>

              {/* Top Categories */}
              <div className="text-center">
                <h3 className="text-sm font-medium text-gray-500 mb-4">Top Categories</h3>
                <div className="space-y-2">
                  {(topCategories.length ? topCategories : [{ category: 'n/a', percentage: 0 }]).slice(0, 3).map((cat, idx) => {
                    const barColors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500']
                    return (
                      <div key={cat.category + idx} className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 capitalize">{cat.category}</span>
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div className={`${barColors[idx % barColors.length]} h-2 rounded-full`} style={{ width: `${cat.percentage || 0}%` }}></div>
                        </div>
                        <span className="text-sm font-medium">{cat.percentage || 0}%</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
