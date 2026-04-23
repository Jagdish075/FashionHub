import express from 'express'
import { protect } from '../middleware/auth.js'
import Order from '../models/Order.js'
import Address from '../models/Address.js'
import Product from '../models/Product.js'
import crypto from 'crypto'
import { sendOrderUpdateEmail } from '../services/emailService.js'

const router = express.Router()

/**
 * Save or update user address
 */
const saveUserAddress = async (userId, addressData) => {
  try {
    // Check if address already exists for this user
    let address = await Address.findOne({ user: userId })

    if (address) {
      // Update existing address
      address = await Address.findOneAndUpdate(
        { user: userId },
        {
          name: addressData.name,
          phone: addressData.phone,
          street: addressData.street,
          city: addressData.city,
          state: addressData.state,
          zipCode: addressData.zipCode,
          country: addressData.country || 'India',
          isDefault: true
        },
        { new: true, runValidators: true }
      )
      console.log(`[Orders] Address updated for user: ${userId}`)
    } else {
      // Create new address
      address = await Address.create({
        user: userId,
        name: addressData.name,
        phone: addressData.phone,
        street: addressData.street,
        city: addressData.city,
        state: addressData.state,
        zipCode: addressData.zipCode,
        country: addressData.country || 'India',
        isDefault: true
      })
      console.log(`[Orders] Address created for user: ${userId}`)
    }
    return address
  } catch (error) {
    console.error('[Orders] Error saving address:', error)
    // Don't throw - we don't want to fail order placement if address save fails
    return null
  }
}

const normalizeOrderItems = (items = []) =>
  items
    .map((item) => ({
      product: item.product || item.productId,
      name: item.name || item.title,
      qty: Number(item.qty || item.quantity || 1),
      price: Number(item.price || 0),
      image: item.image,
      size: String(item.size || '').trim().toUpperCase()
    }))
    .filter((item) => item.product && item.qty > 0)

const applyInventoryForItems = async (items = []) => {
  const productIds = [...new Set(items.map((item) => item.product.toString()))]
  const products = await Product.find({ _id: { $in: productIds } })
  const productMap = new Map(products.map((p) => [p._id.toString(), p]))

  for (const item of items) {
    const product = productMap.get(item.product.toString())
    if (!product) {
      throw new Error(`Product not found for item: ${item.name || item.product}`)
    }

    let available = Number(product.stockQuantity ?? product.stock ?? 0)
    if (item.size && Array.isArray(product.sizeInventory) && product.sizeInventory.length > 0) {
      const entry = product.sizeInventory.find((x) => x.size === item.size)
      available = Number(entry?.quantity || 0)
    }
    if (available < item.qty) {
      if (item.size) {
        throw new Error(`${product.title} (${item.size}) has only ${available} items in stock`)
      }
      throw new Error(`${product.title} has only ${available} items in stock`)
    }
  }

  for (const item of items) {
    if (item.size) {
      await Product.updateOne(
        { _id: item.product, 'sizeInventory.size': item.size },
        {
          $inc: {
            'sizeInventory.$.quantity': -item.qty,
            stockQuantity: -item.qty,
            stock: -item.qty,
            totalSold: item.qty
          }
        }
      )
    } else {
      await Product.updateOne(
        { _id: item.product },
        {
          $inc: {
            stockQuantity: -item.qty,
            stock: -item.qty,
            totalSold: item.qty
          }
        }
      )
    }
  }
}

// Create order
router.post('/', protect, async (req, res) => {
  const { items, total, shippingAddress, paymentMethod, paymentStatus } = req.body
  try {
    const trackingId = crypto.randomBytes(6).toString('hex')
    
    // Save user address if provided
    if (shippingAddress) {
      await saveUserAddress(req.user.id, shippingAddress)
    }
    
    // Only allow creation for COD or admin-triggered orders. Online payments should be created after verification.
    if (paymentMethod && paymentMethod !== 'cod') {
      return res.status(400).json({ message: 'Direct creation for online payments is not allowed. Orders are created after payment confirmation.' })
    }

    const normalizedItems = normalizeOrderItems(items)
    if (normalizedItems.length === 0) {
      return res.status(400).json({ message: 'No valid order items found' })
    }

    // Reserve and update inventory for COD flow.
    try {
      await applyInventoryForItems(normalizedItems)
    } catch (inventoryErr) {
      return res.status(400).json({ message: inventoryErr.message })
    }

    const order = await Order.create({ 
      user: req.user.id, 
      items: normalizedItems,
      total,
      shippingAddress,
      paymentMethod: paymentMethod || 'cod',
      paymentStatus: paymentStatus || 'pending',
      orderStatus: 'created',
      inventoryAdjusted: true,
      trackingHistory: [{
        status: 'pending',
        message: 'Order has been placed',
        timestamp: new Date()
      }]
    })
    try {
      await sendOrderUpdateEmail({
        order,
        user: { name: req.user.name, email: req.user.email }
      })
    } catch (mailErr) {
      console.error('[Orders] Order email error:', mailErr.message)
    }
    res.json(order)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// Get user's orders
router.get('/my', protect, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id }).sort({ createdAt: -1 }).limit(100)
    res.json(orders)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// Track order by trackingId
router.get('/track/:trackingId', async (req, res) => {
  try {
    const order = await Order.findOne({ trackingId: req.params.trackingId })
    if (!order) return res.status(404).json({ message: 'Order not found' })
    res.json({ 
      status: order.status, 
      createdAt: order.createdAt,
      trackingId: order.trackingId,
      trackingHistory: order.trackingHistory,
      estimatedDeliveryDate: order.estimatedDeliveryDate,
      shippingCarrier: order.shippingCarrier,
      shippingTrackingNumber: order.shippingTrackingNumber
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// Get single order by trackingId (for user)
router.get('/:trackingId', protect, async (req, res) => {
  try {
    const order = await Order.findOne({ trackingId: req.params.trackingId })
    if (!order) return res.status(404).json({ message: 'Order not found' })
    
    // Check if user owns this order or is admin
    if (order.user.toString() !== String(req.user.id) && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Not authorized' })
    }
    
    res.json(order)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// Cancel order (user)
router.post('/:orderId/cancel', protect, async (req, res) => {
  try {
    const order = await Order.findOne({ 
      _id: req.params.orderId,
      user: req.user.id 
    })
    
    if (!order) return res.status(404).json({ message: 'Order not found' })
    
    if (!['pending', 'processing'].includes(order.status)) {
      return res.status(400).json({ message: 'Cannot cancel order at this stage' })
    }
    
    order.status = 'cancelled'
    order.trackingHistory.push({
      status: 'cancelled',
      message: 'Order cancelled by customer',
      timestamp: new Date()
    })
    
    await order.save()
    try {
      await sendOrderUpdateEmail({
        order,
        user: { name: req.user.name, email: req.user.email }
      })
    } catch (mailErr) {
      console.error('[Orders] Cancel email error:', mailErr.message)
    }
    res.json(order)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

export default router;
