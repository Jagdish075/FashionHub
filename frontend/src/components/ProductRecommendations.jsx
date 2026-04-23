import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import API from '../utils/api'
import { formatCurrencyINR } from '../utils/currency'

const RecommendationBlock = ({ title, items }) => {
  if (!items.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <h3 className="font-semibold text-gray-800 mb-3">{title}</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {items.map((item) => (
          <Link key={item._id} to={`/product/${item._id}`} className="border border-gray-100 rounded-lg p-3 hover:shadow-sm">
            <img src={item.image} alt={item.title} className="w-full h-32 object-cover rounded" />
            <p className="text-sm font-medium text-gray-800 mt-2 line-clamp-2">{item.title}</p>
            <p className="text-sm text-blue-700 font-semibold mt-1">{formatCurrencyINR(item.discountedPrice || item.price)}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}

const uniqueById = (items = []) => {
  const map = new Map()
  items.forEach((item) => {
    if (item?._id) map.set(String(item._id), item)
  })
  return Array.from(map.values())
}

const normalizeCategory = (category) => {
  const value = String(category || '').trim().toLowerCase()
  if (value.includes('men')) return 'men'
  if (value.includes('women')) return 'women'
  if (value.includes('kid')) return 'kids'
  return ''
}

const ProductRecommendations = ({ productId, category }) => {
  const [related, setRelated] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let mounted = true

    const fetchRecommendations = async () => {
      setLoading(true)
      try {
        const normalizedCategory = normalizeCategory(category)
        if (!normalizedCategory) {
          setRelated([])
          return
        }

        const response = await API.get(`/api/products?category=${encodeURIComponent(normalizedCategory)}&sort=popularity&limit=16`)
        const items = Array.isArray(response.data) ? response.data : response.data?.items || []
        const sameCategory = uniqueById(items)
          .filter((item) => String(item._id) !== String(productId))
          .slice(0, 8)
        if (!mounted) return
        setRelated(sameCategory)
      } catch {
        if (!mounted) return
        setRelated([])
      } finally {
        if (mounted) setLoading(false)
      }
    }

    if (productId) fetchRecommendations()
    return () => {
      mounted = false
    }
  }, [productId, category])

  return (
    <div className="space-y-4">
      {loading && <p className="text-sm text-gray-500">Loading suggested products...</p>}
      <RecommendationBlock title="Suggested Products (Same Category)" items={related} />
    </div>
  )
}

export default ProductRecommendations
