import React, { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { useAuth } from '../context/AuthContext'
import { isInLocalWishlist, tryApiAddWishlist, tryApiGetWishlist, tryApiRemoveWishlist } from '../utils/wishlistClient'

const WishlistButton = ({ productId, className = '' }) => {
  const { isAuthenticated } = useAuth()
  const [inWishlist, setInWishlist] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let mounted = true

    const checkWishlist = async () => {
      if (!isAuthenticated || !productId) return
      try {
        const { items } = await tryApiGetWishlist()
        const exists = items.some((item) => String(item?._id || item) === String(productId))
        if (mounted) setInWishlist(exists)
      } catch {
        if (mounted) setInWishlist(isInLocalWishlist(String(productId)))
      }
    }

    checkWishlist()
    return () => {
      mounted = false
    }
  }, [isAuthenticated, productId])

  const toggleWishlist = async () => {
    if (!isAuthenticated) {
      toast.info('Please login to use wishlist')
      return
    }

    if (!productId || loading) return
    setLoading(true)
    try {
      if (inWishlist) {
        await tryApiRemoveWishlist(String(productId))
        setInWishlist(false)
        toast.success('Removed from wishlist')
      } else {
        await tryApiAddWishlist(String(productId))
        setInWishlist(true)
        toast.success('Added to wishlist')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update wishlist')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={toggleWishlist}
      disabled={loading}
      aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
      className={`inline-flex items-center justify-center rounded-full border px-3 py-2 text-sm transition ${
        inWishlist
          ? 'border-red-300 bg-red-50 text-red-600 hover:bg-red-100'
          : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-100'
      } ${className}`}
    >
      {inWishlist ? '♥ Wishlisted' : '♡ Wishlist'}
    </button>
  )
}

export default WishlistButton
