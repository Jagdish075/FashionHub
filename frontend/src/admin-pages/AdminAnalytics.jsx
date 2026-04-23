import React, { useEffect, useMemo, useState } from 'react'
import API from '../utils/api'
import { formatCurrencyINR } from '../utils/currency'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js'
import { Line, Bar, Doughnut } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend)

const AdminAnalytics = () => {
  const [summary, setSummary] = useState(null)
  const [salesSeries, setSalesSeries] = useState([])
  const [categorySales, setCategorySales] = useState([])
  const [topProducts, setTopProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const [s, series, categories, top] = await Promise.all([
          API.get('/api/admin/analytics/summary'),
          API.get('/api/admin/analytics/sales-series?groupBy=day'),
          API.get('/api/admin/analytics/category-sales'),
          API.get('/api/admin/analytics/top-products')
        ])

        setSummary(s.data)
        setSalesSeries(series.data.rows || [])
        setCategorySales(categories.data || [])
        setTopProducts(top.data || [])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const revenueLine = useMemo(() => ({
    labels: salesSeries.map((r) => r._id),
    datasets: [
      {
        label: 'Revenue',
        data: salesSeries.map((r) => Number(r.revenue || 0)),
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37,99,235,0.15)',
        tension: 0.3,
        fill: true
      }
    ]
  }), [salesSeries])

  const categoryBar = useMemo(() => ({
    labels: categorySales.map((r) => String(r._id || 'unknown').toUpperCase()),
    datasets: [
      {
        label: 'Category Revenue',
        data: categorySales.map((r) => Number(r.revenue || 0)),
        backgroundColor: ['#2563eb', '#16a34a', '#ea580c', '#7c3aed']
      }
    ]
  }), [categorySales])

  const ordersVsPaid = useMemo(() => ({
    labels: ['Total Orders', 'Paid Orders'],
    datasets: [
      {
        label: 'Orders',
        data: [Number(summary?.totalOrders || 0), Number(summary?.paidOrders || 0)],
        backgroundColor: ['#64748b', '#2563eb']
      }
    ]
  }), [summary])

  if (loading) return <div className="p-6">Loading analytics...</div>

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Sales Analytics</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-sm text-gray-500">Revenue</p>
          <p className="text-xl font-bold text-gray-900">{formatCurrencyINR(summary?.revenue || 0)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-sm text-gray-500">Orders</p>
          <p className="text-xl font-bold text-gray-900">{summary?.totalOrders || 0}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-sm text-gray-500">Users</p>
          <p className="text-xl font-bold text-gray-900">{summary?.users || 0}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-sm text-gray-500">Avg Order Value</p>
          <p className="text-xl font-bold text-gray-900">{formatCurrencyINR(summary?.avgOrderValue || 0)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <h2 className="font-semibold text-gray-800 mb-3">Revenue Trend</h2>
          <Line data={revenueLine} />
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <h2 className="font-semibold text-gray-800 mb-3">Orders Snapshot</h2>
          <Doughnut data={ordersVsPaid} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <h2 className="font-semibold text-gray-800 mb-3">Category Revenue</h2>
          <Bar data={categoryBar} />
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <h2 className="font-semibold text-gray-800 mb-3">Top Products</h2>
          <div className="space-y-2">
            {topProducts.map((item) => (
              <div key={item._id} className="flex justify-between border-b border-gray-100 pb-2">
                <p className="text-sm text-gray-700 line-clamp-1">{item.title}</p>
                <p className="text-sm font-semibold text-gray-900">{formatCurrencyINR(item.revenue || 0)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminAnalytics
