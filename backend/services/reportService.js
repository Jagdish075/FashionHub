import ExcelJS from 'exceljs'
import PDFDocument from 'pdfkit'

export const buildSalesExcel = async ({ summary, rows }) => {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Sales Report')

  sheet.columns = [
    { header: 'Date', key: 'date', width: 18 },
    { header: 'Orders', key: 'orders', width: 14 },
    { header: 'Revenue', key: 'revenue', width: 18 }
  ]

  rows.forEach((row) => {
    sheet.addRow({
      date: row._id,
      orders: row.orders,
      revenue: Number(row.revenue || 0)
    })
  })

  sheet.getRow(1).font = { bold: true }
  sheet.addRow({})
  sheet.addRow({ date: 'Total Orders', orders: summary.paidOrders, revenue: summary.revenue })
  sheet.addRow({ date: 'AOV', orders: '', revenue: summary.avgOrderValue })

  return workbook
}

export const streamSalesPdf = ({ res, from, to, summary, rows }) => {
  const doc = new PDFDocument({ margin: 40, size: 'A4' })
  doc.pipe(res)

  doc.fontSize(18).text('FashionHub Sales Report', { align: 'center' })
  doc.moveDown(0.5)
  doc.fontSize(10).fillColor('#444').text(`Range: ${from} to ${to}`, { align: 'center' })

  doc.moveDown(1.2)
  doc.fillColor('#111').fontSize(12)
  doc.text(`Paid Orders: ${summary.paidOrders}`)
  doc.text(`Revenue: INR ${Number(summary.revenue || 0).toFixed(2)}`)
  doc.text(`Average Order Value: INR ${Number(summary.avgOrderValue || 0).toFixed(2)}`)

  doc.moveDown(1)
  doc.fontSize(12).text('Daily Breakdown', { underline: true })
  doc.moveDown(0.5)

  rows.forEach((row) => {
    doc.fontSize(10).text(`${row._id}  |  Orders: ${row.orders}  |  Revenue: INR ${Number(row.revenue || 0).toFixed(2)}`)
  })

  doc.end()
}

export default {
  buildSalesExcel,
  streamSalesPdf
}
