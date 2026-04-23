import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatCurrencyINR } from '../utils/currency'
import { toast } from 'react-toastify'
import { tryApiGetWishlist, tryApiRemoveWishlist } from '../utils/wishlistClient'

const Wishlist = () => {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchWishlist = async () => {
    setLoading(true)
    try {
      const { items: wishlistItems } = await tryApiGetWishlist()
      setItems(wishlistItems)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load wishlist')
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWishlist()
  }, [])

  const removeItem = async (productId) => {
    try {
      await tryApiRemoveWishlist(String(productId))
      setItems((prev) => prev.filter((item) => item._id !== productId))
      toast.success('Removed from wishlist')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove item')
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading wishlist...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">My Wishlist</h1>

        {items.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center">
            <p className="text-gray-600 mb-4">No products in your wishlist yet.</p>
            <Link to="/products" className="bg-blue-600 text-white px-4 py-2 rounded-lg">Browse Products</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {items.map((product) => (
              <div key={product._id} className="bg-white rounded-xl border border-gray-200 p-3">
                <Link to={`/product/${product._id}`}>
                  <img src={product.image} alt={product.title} className="w-full h-52 rounded-lg object-cover" />
                </Link>
                <p className="font-semibold text-gray-800 mt-2 line-clamp-2">{product.title}</p>
                <p className="text-blue-700 font-semibold mt-1">{formatCurrencyINR(product.price)}</p>
                <div className="mt-3 flex gap-2">
                  <Link to={`/product/${product._id}`} className="flex-1 text-center bg-gray-900 text-white py-2 rounded-lg text-sm">View</Link>
                  <button
                    onClick={() => removeItem(product._id)}
                    className="flex-1 text-center border border-red-300 text-red-600 py-2 rounded-lg text-sm"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Wishlist
