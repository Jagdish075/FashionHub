import React, { useEffect, useState } from 'react'
import API from '../utils/api'

const ProductReviews = ({ productId, refreshKey = 0 }) => {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const fetchReviews = async () => {
      setLoading(true)
      try {
        const { data } = await API.get(`/api/reviews/product/${productId}?page=1&limit=8`)
        if (mounted) setReviews(data.reviews || [])
      } catch {
        if (mounted) setReviews([])
      } finally {
        if (mounted) setLoading(false)
      }
    }

    if (productId) fetchReviews()
    return () => {
      mounted = false
    }
  }, [productId, refreshKey])

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <h3 className="font-semibold text-gray-800 mb-4">Customer Reviews</h3>
      {loading ? (
        <p className="text-sm text-gray-500">Loading reviews...</p>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-gray-500">No reviews yet. Be the first to review.</p>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <div key={review._id} className="border-b border-gray-100 pb-3 last:border-b-0">
              <div className="flex items-center justify-between">
                <p className="font-medium text-gray-800">{review.user?.name || 'User'}</p>
                <p className="text-yellow-500">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</p>
              </div>
              <p className="text-sm text-gray-600 mt-1">{review.comment || 'No comment provided.'}</p>
              <p className="text-xs text-gray-400 mt-1">{new Date(review.createdAt).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default ProductReviews
