import React, { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import API from '../utils/api'
import { useAuth } from '../context/AuthContext'

const ReviewForm = ({ productId, onSubmitted }) => {
  const { isAuthenticated } = useAuth()
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [eligibilityLoading, setEligibilityLoading] = useState(false)
  const [canReview, setCanReview] = useState(false)
  const [reason, setReason] = useState('')

  useEffect(() => {
    let mounted = true

    const checkEligibility = async () => {
      if (!isAuthenticated || !productId) {
        setCanReview(false)
        setReason('Login and complete a delivered purchase to review this product.')
        return
      }

      setEligibilityLoading(true)
      try {
        const { data } = await API.get(`/api/reviews/eligibility/${productId}`)
        if (!mounted) return
        setCanReview(Boolean(data?.canReview))
        setReason(data?.reason || '')
      } catch (err) {
        if (!mounted) return
        setCanReview(false)
        setReason(err.response?.data?.message || 'Unable to verify review eligibility right now.')
      } finally {
        if (mounted) setEligibilityLoading(false)
      }
    }

    checkEligibility()
    return () => {
      mounted = false
    }
  }, [isAuthenticated, productId])

  const stars = useMemo(() => [1, 2, 3, 4, 5], [])

  const submitReview = async (e) => {
    e.preventDefault()
    if (!isAuthenticated) {
      toast.info('Please login to submit a review')
      return
    }
    if (!canReview) {
      toast.info(reason || 'You can review this product after it is delivered.')
      return
    }

    setLoading(true)
    try {
      const { data } = await API.post(`/api/reviews/product/${productId}`, {
        rating,
        comment
      })
      toast.success('Review submitted')
      setComment('')
      onSubmitted?.(data)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit review')
    } finally {
      setLoading(false)
    }
  }

  if (eligibilityLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <p className="text-sm text-gray-500">Checking review eligibility...</p>
      </div>
    )
  }

  if (!canReview) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <h3 className="font-semibold text-gray-800 mb-1">Review this product</h3>
        <p className="text-sm text-gray-600">
          {reason || 'Only users with delivered orders can add reviews.'}
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={submitReview} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
      <h3 className="font-semibold text-gray-800">Write a review</h3>

      <div>
        <label className="block text-sm text-gray-600 mb-2">Your Rating</label>
        <div className="flex items-center gap-2">
          {stars.map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              className={`text-2xl leading-none ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
              aria-label={`Rate ${star} star`}
            >
              ★
            </button>
          ))}
          <span className="text-sm text-gray-600 ml-2">{rating}/5</span>
        </div>
      </div>

      <div>
        <label className="block text-sm text-gray-600 mb-1">Comment</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          placeholder="Share your experience with this product"
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-blue-300"
      >
        {loading ? 'Submitting...' : 'Submit Review'}
      </button>
    </form>
  )
}

export default ReviewForm
