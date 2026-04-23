import express from 'express'
import Wishlist from '../models/Wishlist.js'
import Product from '../models/Product.js'
import { protect } from '../middleware/auth.js'

const router = express.Router()

router.get('/', protect, async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne({ user: req.user.id }).populate('items.product')
    return res.json(wishlist || { user: req.user.id, items: [] })
  } catch (err) {
    return res.status(500).json({ message: err.message })
  }
})

router.post('/:productId', protect, async (req, res) => {
  try {
    const { productId } = req.params

    const product = await Product.findById(productId)
    if (!product) return res.status(404).json({ message: 'Product not found' })

    let wishlist = await Wishlist.findOne({ user: req.user.id })
    if (!wishlist) {
      wishlist = await Wishlist.create({ user: req.user.id, items: [] })
    }

    const exists = wishlist.items.some((item) => item.product.toString() === String(productId))
    if (!exists) {
      wishlist.items.unshift({ product: productId, addedAt: new Date() })
      await wishlist.save()
    }

    const populated = await Wishlist.findOne({ user: req.user.id }).populate('items.product')
    return res.status(201).json(populated)
  } catch (err) {
    return res.status(500).json({ message: err.message })
  }
})

router.delete('/:productId', protect, async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne({ user: req.user.id })
    if (!wishlist) return res.json({ user: req.user.id, items: [] })

    wishlist.items = wishlist.items.filter((item) => item.product.toString() !== String(req.params.productId))
    await wishlist.save()

    const populated = await Wishlist.findOne({ user: req.user.id }).populate('items.product')
    return res.json(populated || { user: req.user.id, items: [] })
  } catch (err) {
    return res.status(500).json({ message: err.message })
  }
})

export default router
