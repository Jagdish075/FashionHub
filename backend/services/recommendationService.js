import mongoose from 'mongoose'
import Product from '../models/Product.js'
import Order from '../models/Order.js'

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))

export const getRelatedProducts = async (productId, limit = 8) => {
  const current = await Product.findById(productId)
  if (!current) return []

  const candidates = await Product.find({
    _id: { $ne: current._id },
    category: current.category
  })
    .sort({ createdAt: -1 })
    .limit(50)

  const currentPrice = Number(current.price || 0)

  const scored = candidates
    .map((item) => {
      const price = Number(item.price || 0)
      const avgRating = Number(item.averageRating || 0)
      const popularity = Number(item.totalSold || 0)

      const priceDelta = currentPrice > 0 ? Math.abs(price - currentPrice) / currentPrice : 1
      const priceScore = 1 - clamp(priceDelta, 0, 1)
      const ratingScore = clamp(avgRating / 5, 0, 1)
      const popularityScore = clamp(popularity / 200, 0, 1)

      const score = Number((priceScore * 0.45 + ratingScore * 0.35 + popularityScore * 0.2).toFixed(4))

      return { product: item, score }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)

  return scored.map((entry) => ({ ...entry.product.toObject(), recommendationScore: entry.score }))
}

export const getFrequentlyBoughtTogether = async (productId, limit = 6) => {
  const objectId = new mongoose.Types.ObjectId(productId)

  const related = await Order.aggregate([
    { $match: { paymentStatus: 'paid', 'items.product': objectId } },
    { $project: { items: 1 } },
    { $unwind: '$items' },
    { $match: { 'items.product': { $ne: objectId } } },
    {
      $group: {
        _id: '$items.product',
        score: { $sum: '$items.qty' }
      }
    },
    { $sort: { score: -1 } },
    { $limit: limit }
  ])

  if (!related.length) return []

  const ids = related.map((r) => r._id)
  const products = await Product.find({ _id: { $in: ids } })
  const productMap = new Map(products.map((p) => [p._id.toString(), p.toObject()]))

  return related
    .map((entry) => {
      const product = productMap.get(entry._id.toString())
      if (!product) return null
      return { ...product, togetherScore: entry.score }
    })
    .filter(Boolean)
}

export default {
  getRelatedProducts,
  getFrequentlyBoughtTogether
}
