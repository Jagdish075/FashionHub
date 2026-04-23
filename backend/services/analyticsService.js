import Order from '../models/Order.js'
import Product from '../models/Product.js'
import User from '../models/User.js'

const startOfDay = (date) => {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export const getDateRange = (from, to) => {
  const now = new Date()
  const end = to ? new Date(to) : now
  end.setHours(23, 59, 59, 999)
  const start = from ? new Date(from) : new Date(end.getTime() - 29 * 24 * 60 * 60 * 1000)
  start.setHours(0, 0, 0, 0)
  return { start, end }
}

export const getSalesSummary = async ({ start, end }) => {
  const [users, products, paidOrdersAgg, totalOrders] = await Promise.all([
    User.countDocuments({ createdAt: { $lte: end } }),
    Product.countDocuments({ createdAt: { $lte: end } }),
    Order.aggregate([
      { $match: { paymentStatus: 'paid', createdAt: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: null,
          revenue: { $sum: '$total' },
          orders: { $sum: 1 },
          itemsSold: { $sum: { $sum: '$items.qty' } }
        }
      }
    ]),
    Order.countDocuments({ createdAt: { $gte: start, $lte: end } })
  ])

  const paid = paidOrdersAgg[0] || { revenue: 0, orders: 0, itemsSold: 0 }
  const avgOrderValue = paid.orders > 0 ? paid.revenue / paid.orders : 0

  return {
    users,
    products,
    totalOrders,
    paidOrders: paid.orders,
    revenue: Number(paid.revenue || 0),
    itemsSold: Number(paid.itemsSold || 0),
    avgOrderValue: Number(avgOrderValue.toFixed(2))
  }
}

export const getSalesSeries = async ({ start, end, groupBy = 'day' }) => {
  const format = groupBy === 'month' ? '%Y-%m' : '%Y-%m-%d'

  return Order.aggregate([
    { $match: { paymentStatus: 'paid', createdAt: { $gte: start, $lte: end } } },
    {
      $group: {
        _id: { $dateToString: { format, date: '$createdAt' } },
        revenue: { $sum: '$total' },
        orders: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ])
}

export const getCategorySales = async ({ start, end }) => {
  return Order.aggregate([
    { $match: { paymentStatus: 'paid', createdAt: { $gte: start, $lte: end } } },
    { $unwind: '$items' },
    {
      $lookup: {
        from: 'products',
        localField: 'items.product',
        foreignField: '_id',
        as: 'product'
      }
    },
    { $unwind: '$product' },
    {
      $group: {
        _id: '$product.category',
        revenue: { $sum: { $multiply: ['$items.qty', '$items.price'] } },
        qty: { $sum: '$items.qty' }
      }
    },
    { $sort: { revenue: -1 } }
  ])
}

export const getTopProducts = async ({ start, end, limit = 10 }) => {
  return Order.aggregate([
    { $match: { paymentStatus: 'paid', createdAt: { $gte: start, $lte: end } } },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.product',
        qty: { $sum: '$items.qty' },
        revenue: { $sum: { $multiply: ['$items.qty', '$items.price'] } }
      }
    },
    { $sort: { revenue: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'products',
        localField: '_id',
        foreignField: '_id',
        as: 'product'
      }
    },
    { $unwind: '$product' },
    {
      $project: {
        _id: 1,
        qty: 1,
        revenue: 1,
        title: '$product.title',
        image: '$product.image',
        category: '$product.category'
      }
    }
  ])
}

export const getTodayRevenue = async () => {
  const today = startOfDay(new Date())
  const result = await Order.aggregate([
    { $match: { paymentStatus: 'paid', createdAt: { $gte: today } } },
    { $group: { _id: null, revenue: { $sum: '$total' } } }
  ])
  return Number(result[0]?.revenue || 0)
}

export default {
  getDateRange,
  getSalesSummary,
  getSalesSeries,
  getCategorySales,
  getTopProducts,
  getTodayRevenue
}
