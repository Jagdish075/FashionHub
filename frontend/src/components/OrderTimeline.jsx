import React from 'react'

const defaultSteps = [
  { status: 'pending', label: 'Order Placed' },
  { status: 'processing', label: 'Processing' },
  { status: 'shipped', label: 'Shipped' },
  { status: 'delivered', label: 'Delivered' }
]

const OrderTimeline = ({ status = 'pending', history = [] }) => {
  const currentIndex = Math.max(defaultSteps.findIndex((step) => step.status === status), 0)

  return (
    <div className="space-y-4">
      <div className="relative flex justify-between">
        <div className="absolute top-5 left-5 right-5 h-1 bg-gray-200 rounded" />
        <div
          className="absolute top-5 left-5 h-1 bg-blue-600 rounded transition-all"
          style={{ width: `${(currentIndex / (defaultSteps.length - 1)) * 90}%` }}
        />
        {defaultSteps.map((step, index) => {
          const done = index <= currentIndex
          return (
            <div key={step.status} className="relative z-10 flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${done ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                {done ? '✓' : index + 1}
              </div>
              <p className={`mt-2 text-sm ${done ? 'text-gray-800' : 'text-gray-400'}`}>{step.label}</p>
            </div>
          )
        })}
      </div>

      {history.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-sm font-semibold text-gray-800 mb-2">Status History</p>
          <div className="space-y-1">
            {history
              .slice()
              .sort((a, b) => new Date(b.timestamp || b.at) - new Date(a.timestamp || a.at))
              .map((entry, idx) => (
                <div key={`${entry.status}-${idx}`} className="text-xs text-gray-600 flex justify-between gap-4">
                  <span className="capitalize">{entry.status}</span>
                  <span>{new Date(entry.timestamp || entry.at).toLocaleString()}</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default OrderTimeline
