import express from 'express'
import Offer from '../models/Offer.js'

const router = express.Router()

// GET /api/offers - public active offers
router.get('/', async (req, res) => {
  try {
    const offers = await Offer.find({ isActive: true })
      .populate('products', 'title image price category stockQuantity totalSold')
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(10)

    const normalized = offers.map((offer) => {
      const item = offer.toObject()
      item.products = (item.products || []).map((p) => {
        const discount = item.discountPercentage || 0
        const discountedPrice = p.price - (p.price * discount / 100)
        return {
          ...p,
          originalPrice: p.price,
          discountedPrice: Math.max(0, Number(discountedPrice.toFixed(2))),
          discountPercentage: discount
        }
      })
      return item
    })

    res.json(normalized)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

export default router
