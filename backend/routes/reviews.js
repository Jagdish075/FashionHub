import express from 'express'
import mongoose from 'mongoose'
import Review from '../models/Review.js'
import Product from '../models/Product.js'
import Order from '../models/Order.js'
import { protect } from '../middleware/auth.js'

const router = express.Router()

const recomputeProductReviewStats = async (productId) => {
  const stats = await Review.aggregate([
    { $match: { product: new mongoose.Types.ObjectId(productId) } },
    {
      $group: {
        _id: '$product',
        avg: { $avg: '$rating' },
        count: { $sum: 1 }
      }
    }
  ])

  await Product.findByIdAndUpdate(productId, {
    averageRating: Number((stats[0]?.avg || 0).toFixed(2)),
    reviewCount: Number(stats[0]?.count || 0)
  })
}

router.get('/product/:productId', async (req, res) => {
  try {
    const { productId } = req.params
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1)
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50)
    const skip = (page - 1) * limit

    const [reviews, total] = await Promise.all([
      Review.find({ product: productId })
        .populate('user', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Review.countDocuments({ product: productId })
    ])

    return res.json({
      reviews,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (err) {
    return res.status(500).json({ message: err.message })
  }
})

router.get('/eligibility/:productId', protect, async (req, res) => {
  try {
    const { productId } = req.params
    const deliveredOrder = await Order.findOne({
      user: req.user.id,
      status: 'delivered',
      'items.product': productId
    }).sort({ createdAt: -1 })

    return res.json({
      canReview: Boolean(deliveredOrder),
      reason: deliveredOrder ? null : 'Review is available only after purchase and delivery.'
    })
  } catch (err) {
    return res.status(500).json({ message: err.message })
  }
})

router.post('/product/:productId', protect, async (req, res) => {
  try {
    const { productId } = req.params
    const rating = Number(req.body?.rating)
    const comment = String(req.body?.comment || '').trim()

    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' })
    }

    const product = await Product.findById(productId)
    if (!product) return res.status(404).json({ message: 'Product not found' })

    const deliveredOrder = await Order.findOne({
      user: req.user.id,
      status: 'delivered',
      'items.product': productId
    }).sort({ createdAt: -1 })

    if (!deliveredOrder) {
      return res.status(403).json({ message: 'You can review only products that were delivered to you.' })
    }

    const review = await Review.findOneAndUpdate(
      { user: req.user.id, product: productId },
      {
        user: req.user.id,
        product: productId,
        order: deliveredOrder._id,
        rating,
        comment
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).populate('user', 'name')

    await recomputeProductReviewStats(productId)

    return res.status(201).json(review)
  } catch (err) {
    return res.status(500).json({ message: err.message })
  }
})

router.delete('/:reviewId', protect, async (req, res) => {
  try {
    const review = await Review.findById(req.params.reviewId)
    if (!review) return res.status(404).json({ message: 'Review not found' })

    const isOwner = review.user.toString() === String(req.user.id)
    if (!isOwner && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Not allowed to delete this review' })
    }

    const productId = review.product
    await review.deleteOne()
    await recomputeProductReviewStats(productId)

    return res.json({ message: 'Review deleted' })
  } catch (err) {
    return res.status(500).json({ message: err.message })
  }
})

export default router
