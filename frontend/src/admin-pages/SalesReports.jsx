import React, { useState } from 'react'
import API from '../utils/api'

const SalesReports = () => {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const download = async (type) => {
    const params = new URLSearchParams()
    if (from) params.set('from', from)
    if (to) params.set('to', to)

    const url = `/api/admin/reports/sales.${type}${params.toString() ? `?${params.toString()}` : ''}`
    const response = await API.get(url, { responseType: 'blob' })

    const blob = new Blob([response.data], {
      type:
        type === 'pdf'
          ? 'application/pdf'
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })

    const link = document.createElement('a')
    link.href = window.URL.createObjectURL(blob)
    link.download = `sales-report.${type}`
    link.click()
    window.URL.revokeObjectURL(link.href)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Sales Reports Export</h1>
      <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-4 max-w-2xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-gray-600">From</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full border rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="text-sm text-gray-600">To</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full border rounded-lg px-3 py-2" />
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={() => download('pdf')} className="bg-red-600 text-white px-4 py-2 rounded-lg">Download PDF</button>
          <button onClick={() => download('xlsx')} className="bg-green-600 text-white px-4 py-2 rounded-lg">Download Excel</button>
        </div>
      </div>
    </div>
  )
}

export default SalesReports
