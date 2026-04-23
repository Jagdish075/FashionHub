import express from 'express'
import { protect, requireAdmin } from '../middleware/auth.js'
import { getDateRange, getSalesSummary, getSalesSeries } from '../services/analyticsService.js'

const router = express.Router()
const loadReportService = () => import('../services/reportService.js')

router.get('/sales.xlsx', protect, requireAdmin, async (req, res) => {
  try {
    const { buildSalesExcel } = await loadReportService()
    const { start, end } = getDateRange(req.query.from, req.query.to)
    const [summary, rows] = await Promise.all([
      getSalesSummary({ start, end }),
      getSalesSeries({ start, end, groupBy: 'day' })
    ])

    const workbook = await buildSalesExcel({ summary, rows })
    const filename = `sales-report-${start.toISOString().slice(0, 10)}-to-${end.toISOString().slice(0, 10)}.xlsx`

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)

    await workbook.xlsx.write(res)
    return res.end()
  } catch (err) {
    return res.status(500).json({ message: err.message })
  }
})

router.get('/sales.pdf', protect, requireAdmin, async (req, res) => {
  try {
    const { streamSalesPdf } = await loadReportService()
    const { start, end } = getDateRange(req.query.from, req.query.to)
    const [summary, rows] = await Promise.all([
      getSalesSummary({ start, end }),
      getSalesSeries({ start, end, groupBy: 'day' })
    ])

    const filename = `sales-report-${start.toISOString().slice(0, 10)}-to-${end.toISOString().slice(0, 10)}.pdf`
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)

    streamSalesPdf({
      res,
      from: start.toISOString().slice(0, 10),
      to: end.toISOString().slice(0, 10),
      summary,
      rows
    })
  } catch (err) {
    return res.status(500).json({ message: err.message })
  }
})

export default router
