import express from 'express'
import { protect, requireAdmin } from '../middleware/auth.js'
import {
  getDateRange,
  getSalesSummary,
  getSalesSeries,
  getCategorySales,
  getTopProducts,
  getTodayRevenue
} from '../services/analyticsService.js'

const router = express.Router()

router.get('/summary', protect, requireAdmin, async (req, res) => {
  try {
    const { start, end } = getDateRange(req.query.from, req.query.to)
    const [summary, todayRevenue] = await Promise.all([
      getSalesSummary({ start, end }),
      getTodayRevenue()
    ])

    return res.json({
      from: start,
      to: end,
      ...summary,
      todayRevenue
    })
  } catch (err) {
    return res.status(500).json({ message: err.message })
  }
})

router.get('/sales-series', protect, requireAdmin, async (req, res) => {
  try {
    const { start, end } = getDateRange(req.query.from, req.query.to)
    const groupBy = ['day', 'month'].includes(req.query.groupBy) ? req.query.groupBy : 'day'
    const rows = await getSalesSeries({ start, end, groupBy })
    return res.json({ groupBy, rows })
  } catch (err) {
    return res.status(500).json({ message: err.message })
  }
})

router.get('/category-sales', protect, requireAdmin, async (req, res) => {
  try {
    const { start, end } = getDateRange(req.query.from, req.query.to)
    const rows = await getCategorySales({ start, end })
    return res.json(rows)
  } catch (err) {
    return res.status(500).json({ message: err.message })
  }
})

router.get('/top-products', protect, requireAdmin, async (req, res) => {
  try {
    const { start, end } = getDateRange(req.query.from, req.query.to)
    const limit = Math.min(Math.max(Number(req.query.limit || 8), 1), 20)
    const rows = await getTopProducts({ start, end, limit })
    return res.json(rows)
  } catch (err) {
    return res.status(500).json({ message: err.message })
  }
})

export default router
