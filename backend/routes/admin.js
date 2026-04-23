import express from 'express'
import Product from '../models/Product.js'
import Order from '../models/Order.js'
import User from '../models/User.js'
import Offer from '../models/Offer.js'
import SiteSettings from '../models/SiteSettings.js'
import RefundRequest from '../models/RefundRequest.js'
import { protect, requireAdmin } from '../middleware/auth.js'
import {
  sendOrderUpdateEmail,
  sendRefundUpdateEmail
} from '../services/emailService.js'

const router = express.Router()
const allowedProductCategories = ['men', 'women', 'kids']
const defaultSiteSettings = {
  siteName: 'FashionHub',
  siteDescription: 'Your premier fashion destination',
  contactEmail: 'support@fashionhub.com',
  contactPhone: '+91 90000 00000',
  contactAddress: 'Mumbai, India',
  currency: 'INR',
  timezone: 'Asia/Kolkata',
  maintenanceMode: false,
  allowRegistration: true,
  emailNotifications: true,
  orderNotifications: true
}

const getOrCreateSiteSettings = async () => {
  let settings = await SiteSettings.findOne()
  if (!settings) {
    settings = await SiteSettings.create(defaultSiteSettings)
  }
  return settings
}

const sumOrderRevenueExpression = {
  $ifNull: [
    '$total',
    {
      $sum: {
        $map: {
          input: { $ifNull: ['$items', []] },
          as: 'item',
          in: {
            $multiply: [
              { $ifNull: ['$$item.qty', 0] },
              { $ifNull: ['$$item.price', 0] }
            ]
          }
        }
      }
    }
  ]
}

const revenuePaymentStatuses = ['paid', 'refunded']

// GET /api/admin/settings - fetch current site settings
router.get('/settings', protect, requireAdmin, async (req, res) => {
  try {
    const settings = await getOrCreateSiteSettings()
    res.json(settings)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// PUT /api/admin/settings - update site settings
router.put('/settings', protect, requireAdmin, async (req, res) => {
  try {
    const settings = await getOrCreateSiteSettings()
    const payload = req.body || {}

    settings.siteName = payload.siteName ?? settings.siteName
    settings.siteDescription = payload.siteDescription ?? settings.siteDescription
    settings.contactEmail = payload.contactEmail ?? settings.contactEmail
    settings.contactPhone = payload.contactPhone ?? settings.contactPhone
    settings.contactAddress = payload.contactAddress ?? settings.contactAddress
    settings.currency = 'INR'
    settings.timezone = payload.timezone ?? settings.timezone
    settings.maintenanceMode = payload.maintenanceMode !== undefined ? Boolean(payload.maintenanceMode) : settings.maintenanceMode
    settings.allowRegistration = payload.allowRegistration !== undefined ? Boolean(payload.allowRegistration) : settings.allowRegistration
    settings.emailNotifications = payload.emailNotifications !== undefined ? Boolean(payload.emailNotifications) : settings.emailNotifications
    settings.orderNotifications = payload.orderNotifications !== undefined ? Boolean(payload.orderNotifications) : settings.orderNotifications

    const saved = await settings.save()
    res.json(saved)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

// GET /api/admin/summary - admin-only summary counts
router.get('/summary', protect, requireAdmin, async (req, res) => {
  try {
    const products = await Product.countDocuments()
    const orders = await Order.countDocuments()
    const users = await User.countDocuments()
    const paidRevenueAgg = await Order.aggregate([
      { $match: { paymentStatus: { $in: revenuePaymentStatuses } } },
      { $group: { _id: null, revenue: { $sum: sumOrderRevenueExpression } } }
    ])
    res.json({ products, orders, users, revenue: paidRevenueAgg[0]?.revenue || 0 })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET /api/admin/analytics - realtime dashboard analytics
router.get('/analytics', protect, requireAdmin, async (req, res) => {
  try {
    const now = new Date()
    const sevenDaysAgo = new Date(now)
    sevenDaysAgo.setDate(now.getDate() - 6)
    sevenDaysAgo.setHours(0, 0, 0, 0)

    const startOfToday = new Date(now)
    startOfToday.setHours(0, 0, 0, 0)

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const [products, users, totalOrders, paidOrders, pendingOrders, revenueAgg, todayRevenueAgg, monthRevenueAgg] =
      await Promise.all([
        Product.countDocuments(),
        User.countDocuments(),
        Order.countDocuments(),
        Order.countDocuments({ paymentStatus: 'paid' }),
        Order.countDocuments({ status: { $in: ['pending', 'processing'] } }),
        Order.aggregate([
          { $match: { paymentStatus: { $in: revenuePaymentStatuses } } },
          { $group: { _id: null, revenue: { $sum: sumOrderRevenueExpression } } }
        ]),
        Order.aggregate([
          {
            $match: {
              paymentStatus: { $in: revenuePaymentStatuses },
              $or: [
                { paidAt: { $gte: startOfToday } },
                { paidAt: null, createdAt: { $gte: startOfToday } }
              ]
            }
          },
          { $group: { _id: null, revenue: { $sum: sumOrderRevenueExpression } } }
        ]),
        Order.aggregate([
          {
            $match: {
              paymentStatus: { $in: revenuePaymentStatuses },
              $or: [
                { paidAt: { $gte: startOfMonth } },
                { paidAt: null, createdAt: { $gte: startOfMonth } }
              ]
            }
          },
          { $group: { _id: null, revenue: { $sum: sumOrderRevenueExpression } } }
        ])
      ])

    const trendAgg = await Order.aggregate([
      {
        $match: {
          paymentStatus: { $in: revenuePaymentStatuses },
          $or: [
            { paidAt: { $gte: sevenDaysAgo } },
            { paidAt: null, createdAt: { $gte: sevenDaysAgo } }
          ]
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: { $ifNull: ['$paidAt', '$createdAt'] }
            }
          },
          orders: { $sum: 1 },
          revenue: { $sum: sumOrderRevenueExpression }
        }
      },
      { $sort: { _id: 1 } }
    ])

    const trendMap = new Map(trendAgg.map((row) => [row._id, row]))
    const orderTrends = []
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date(now)
      d.setDate(now.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      const row = trendMap.get(key)
      orderTrends.push({
        date: key,
        orders: row?.orders || 0,
        revenue: row?.revenue || 0
      })
    }

    const categoryAgg = await Order.aggregate([
      { $match: { paymentStatus: { $in: revenuePaymentStatuses } } },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'productDoc'
        }
      },
      {
        $addFields: {
          productCategory: {
            $toLower: {
              $ifNull: [{ $arrayElemAt: ['$productDoc.category', 0] }, 'other']
            }
          }
        }
      },
      {
        $group: {
          _id: '$productCategory',
          units: { $sum: '$items.qty' },
          revenue: { $sum: { $multiply: ['$items.qty', '$items.price'] } }
        }
      },
      { $sort: { units: -1 } },
      { $limit: 5 }
    ])

    const totalUnits = categoryAgg.reduce((sum, row) => sum + (row.units || 0), 0) || 1
    const topCategories = categoryAgg.map((row) => ({
      category: row._id || 'other',
      units: row.units || 0,
      revenue: row.revenue || 0,
      percentage: Math.round(((row.units || 0) / totalUnits) * 100)
    }))

    const recentOrders = await Order.find({ paymentStatus: 'paid' })
      .populate('user', 'name email phone')
      .sort({ createdAt: -1 })
      .limit(5)

    // Refunds stats
    const refundAgg = await RefundRequest.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ])
    const refundMap = new Map(refundAgg.map((r) => [r._id, r.count]))
    const refundsSummary = {
      total: refundAgg.reduce((s, r) => s + (r.count || 0), 0),
      pending: refundMap.get('pending') || 0,
      approved: refundMap.get('approved') || 0,
      rejected: refundMap.get('rejected') || 0
    }

    res.json({
      overview: {
        products,
        users,
        totalOrders,
        paidOrders,
        pendingOrders,
        totalRevenue: revenueAgg[0]?.revenue || 0,
        revenueToday: todayRevenueAgg[0]?.revenue || 0,
        revenueThisMonth: monthRevenueAgg[0]?.revenue || 0
      ,
      refunds: refundsSummary
      },
      orderTrends,
      topCategories,
      recentOrders,
      generatedAt: new Date().toISOString()
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET /api/admin/products - Get all products (admin view)
router.get('/products', protect, requireAdmin, async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 })
    res.json(products)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// POST /api/admin/products - Create new product
router.post('/products', protect, requireAdmin, async (req, res) => {
  try {
    const { title, description, price, image, category, sizes, stockQuantity, sizeInventory } = req.body
    const normalizedCategory = (category || '').toLowerCase().trim()
    if (!allowedProductCategories.includes(normalizedCategory)) {
      return res.status(400).json({ message: `Category must be one of: ${allowedProductCategories.join(', ')}` })
    }
    const parsedPrice = Number(price)
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      return res.status(400).json({ message: 'Price must be greater than 0 rupees' })
    }

    const parsedStock = Number(stockQuantity ?? 0)
    if (!Number.isFinite(parsedStock) || parsedStock < 0) {
      return res.status(400).json({ message: 'stockQuantity must be a valid non-negative number' })
    }

    const normalizedSizes = Array.isArray(sizes)
      ? [...new Set(sizes.map((s) => String(s).trim().toUpperCase()).filter(Boolean))]
      : []
    const normalizedSizeInventory = Array.isArray(sizeInventory)
      ? sizeInventory
          .map((item) => ({
            size: String(item?.size || '').trim().toUpperCase(),
            quantity: Number(item?.quantity || 0)
          }))
          .filter((item) => item.size)
      : []

    const product = new Product({
      title,
      description,
      price: parsedPrice,
      image,
      category: normalizedCategory,
      sizes: normalizedSizes,
      sizeInventory: normalizedSizeInventory,
      stockQuantity: parsedStock
    })
    const savedProduct = await product.save()
    res.status(201).json(savedProduct)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

// PUT /api/admin/products/:id - Update product
router.put('/products/:id', protect, requireAdmin, async (req, res) => {
  try {
    const { title, description, price, image, category, sizes, stockQuantity, sizeInventory } = req.body
    const normalizedCategory = (category || '').toLowerCase().trim()
    if (!allowedProductCategories.includes(normalizedCategory)) {
      return res.status(400).json({ message: `Category must be one of: ${allowedProductCategories.join(', ')}` })
    }
    const parsedPrice = Number(price)
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      return res.status(400).json({ message: 'Price must be greater than 0 rupees' })
    }

    const parsedStock = Number(stockQuantity ?? 0)
    if (!Number.isFinite(parsedStock) || parsedStock < 0) {
      return res.status(400).json({ message: 'stockQuantity must be a valid non-negative number' })
    }

    const normalizedSizes = Array.isArray(sizes)
      ? [...new Set(sizes.map((s) => String(s).trim().toUpperCase()).filter(Boolean))]
      : []
    const normalizedSizeInventory = Array.isArray(sizeInventory)
      ? sizeInventory
          .map((item) => ({
            size: String(item?.size || '').trim().toUpperCase(),
            quantity: Number(item?.quantity || 0)
          }))
          .filter((item) => item.size)
      : []

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      {
        title,
        description,
        price: parsedPrice,
        image,
        category: normalizedCategory,
        sizes: normalizedSizes,
        sizeInventory: normalizedSizeInventory,
        stockQuantity: parsedStock
      },
      { new: true, runValidators: true }
    )
    if (!product) {
      return res.status(404).json({ message: 'Product not found' })
    }
    res.json(product)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

// DELETE /api/admin/products/:id - Delete product
router.delete('/products/:id', protect, requireAdmin, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id)
    if (!product) {
      return res.status(404).json({ message: 'Product not found' })
    }
    res.json({ message: 'Product deleted successfully' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET /api/admin/users - Get all users (admin view)
router.get('/users', protect, requireAdmin, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 })
    res.json(users)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET /api/admin/users/:id - Get single user by ID
router.get('/users/:id', protect, requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password')
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }
    res.json(user)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// PUT /api/admin/users/:id - Update user
router.put('/users/:id', protect, requireAdmin, async (req, res) => {
  return res.status(403).json({ message: 'Editing users is disabled. Use restrict/unrestrict only.' })
})

// DELETE /api/admin/users/:id - Delete user
router.delete('/users/:id', protect, requireAdmin, async (req, res) => {
  return res.status(403).json({ message: 'Deleting users is disabled. Use restrict/unrestrict only.' })
})

// PATCH /api/admin/users/:id/status - Restrict/Unrestrict user
router.patch('/users/:id/status', protect, requireAdmin, async (req, res) => {
  try {
    const { isActive } = req.body
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ message: 'isActive must be a boolean value' })
    }

    const targetUser = await User.findById(req.params.id).select('-password')
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' })
    }

    if (String(targetUser._id) === String(req.user.id)) {
      return res.status(400).json({ message: 'You cannot change your own access status' })
    }

    if (targetUser.isAdmin && !isActive) {
      return res.status(400).json({ message: 'Admin accounts cannot be restricted' })
    }

    targetUser.isActive = isActive
    await targetUser.save()

    res.json(targetUser)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

// GET /api/admin/orders - Get all paid/confirmed orders (admin view)
router.get('/orders', protect, requireAdmin, async (req, res) => {
  try {
    const orders = await Order.find({ paymentStatus: 'paid' })
      .populate('user', 'name email phone')
      .sort({ createdAt: -1 })
    res.json(orders)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET /api/admin/orders/:id - Get single order by ID (admin)
router.get('/orders/:id', protect, requireAdmin, async (req, res) => {
  try {
    // Support both ObjectId and trackingId
    let order
    if (req.params.id.length === 24) {
      order = await Order.findById(req.params.id)
        .populate('user', 'name email phone address')
    } else {
      order = await Order.findOne({ trackingId: req.params.id })
        .populate('user', 'name email phone address')
    }
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' })
    }
    res.json(order)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// PUT /api/admin/orders/:id - Update order with enhanced fields
router.put('/orders/:id', protect, requireAdmin, async (req, res) => {
  try {
    const { 
      status, 
      shippingCarrier, 
      shippingTrackingNumber, 
      estimatedDeliveryDate,
      adminNotes,
      customerNotes,
      shippingAddress
    } = req.body
    
    // Build update object
    const updateData = {}
    if (status) updateData.status = status
    if (shippingCarrier !== undefined) updateData.shippingCarrier = shippingCarrier
    if (shippingTrackingNumber !== undefined) updateData.shippingTrackingNumber = shippingTrackingNumber
    if (estimatedDeliveryDate !== undefined) updateData.estimatedDeliveryDate = estimatedDeliveryDate
    if (adminNotes !== undefined) updateData.adminNotes = adminNotes
    if (customerNotes !== undefined) updateData.customerNotes = customerNotes
    if (shippingAddress !== undefined) updateData.shippingAddress = shippingAddress

    // Find order first to get current status
    let order
    if (req.params.id.length === 24) {
      order = await Order.findById(req.params.id)
    } else {
      order = await Order.findOne({ trackingId: req.params.id })
    }
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' })
    }

    // Add to tracking history if status changed
    const previousStatus = order.status
    if (status && status !== order.status) {
      const statusMessages = {
        pending: 'Order is pending',
        processing: 'Order is being processed',
        shipped: 'Order has been shipped',
        delivered: 'Order has been delivered',
        cancelled: 'Order has been cancelled'
      }
      
      order.trackingHistory.push({
        status: status,
        message: statusMessages[status] || `Status updated to ${status}`,
        timestamp: new Date()
      })
    }

    // Apply updates
    Object.assign(order, updateData)
    const updatedOrder = await order.save()

    if (status && status !== previousStatus) {
      try {
        const orderUser = await User.findById(updatedOrder.user).select('name email')
        await sendOrderUpdateEmail({ order: updatedOrder, user: orderUser })
      } catch (mailErr) {
        console.error('Order status email error:', mailErr.message)
      }
    }
    
    res.json(updatedOrder)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

// DELETE /api/admin/orders/:id - Delete order
router.delete('/orders/:id', protect, requireAdmin, async (req, res) => {
  try {
    let order
    if (req.params.id.length === 24) {
      order = await Order.findByIdAndDelete(req.params.id)
    } else {
      order = await Order.findOneAndDelete({ trackingId: req.params.id })
    }
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' })
    }
    res.json({ message: 'Order deleted successfully' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET /api/admin/refunds - list refund requests
router.get('/refunds', protect, requireAdmin, async (req, res) => {
  try {
    const refunds = await RefundRequest.find()
      .populate('user', 'name email phone')
      .populate('order', 'trackingId total status paymentStatus')
      .sort({ createdAt: -1 })
    res.json(refunds)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// PUT /api/admin/refunds/:id - approve or reject refund request
router.put('/refunds/:id', protect, requireAdmin, async (req, res) => {
  try {
    const { action, adminNote } = req.body
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'action must be approve or reject' })
    }

    const refund = await RefundRequest.findById(req.params.id)
      .populate('user', 'name email phone refundBalance totalRefunded')
      .populate('order')

    if (!refund) {
      return res.status(404).json({ message: 'Refund request not found' })
    }

    if (refund.status !== 'pending') {
      return res.status(400).json({ message: `Refund request already ${refund.status}` })
    }

    refund.adminNote = adminNote ? String(adminNote).trim() : ''
    refund.processedBy = req.user.id
    refund.processedAt = new Date()

    if (action === 'approve') {
      refund.status = 'approved'

      const targetUser = await User.findById(refund.user._id)
      if (!targetUser) {
        return res.status(404).json({ message: 'User not found for refund credit' })
      }

      const refundAmount = Number(refund.amount || 0)
      targetUser.refundBalance = Number(targetUser.refundBalance || 0) + refundAmount
      targetUser.totalRefunded = Number(targetUser.totalRefunded || 0) + refundAmount
      await targetUser.save()

      if (refund.order) {
        refund.order.paymentStatus = 'refunded'
        await refund.order.save()
      }
    } else {
      refund.status = 'rejected'
    }

    await refund.save()

    try {
      await sendRefundUpdateEmail({
        user: refund.user,
        refund,
        action
      })
    } catch (mailErr) {
      console.error('Refund update email error:', mailErr.message)
    }

    const updated = await RefundRequest.findById(refund._id)
      .populate('user', 'name email phone refundBalance totalRefunded')
      .populate('order', 'trackingId total status paymentStatus')

    res.json({
      message: action === 'approve' ? 'Refund approved and credited to user balance' : 'Refund request rejected',
      refund: updated
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET /api/admin/offers - list all offers
router.get('/offers', protect, requireAdmin, async (req, res) => {
  try {
    const offers = await Offer.find()
      .populate('products', 'title image price stockQuantity')
      .sort({ updatedAt: -1, createdAt: -1 })
    res.json(offers)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// POST /api/admin/offers - create offer
router.post('/offers', protect, requireAdmin, async (req, res) => {
  try {
    const { title, description, discountPercentage, bannerText, products, isActive } = req.body

    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Offer title is required' })
    }

    const parsedDiscount = Number(discountPercentage)
    if (!Number.isFinite(parsedDiscount) || parsedDiscount <= 0 || parsedDiscount > 100) {
      return res.status(400).json({ message: 'Discount percentage must be between 0 and 100' })
    }

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ message: 'Select at least one product for this offer' })
    }

    const uniqueProductIds = [...new Set(products)]
    const existingProductsCount = await Product.countDocuments({ _id: { $in: uniqueProductIds } })
    if (existingProductsCount !== uniqueProductIds.length) {
      return res.status(400).json({ message: 'One or more selected products are invalid' })
    }

    const offer = await Offer.create({
      title: title.trim(),
      description: (description || '').trim(),
      discountPercentage: parsedDiscount,
      bannerText: (bannerText || '').trim(),
      products: uniqueProductIds,
      isActive: typeof isActive === 'boolean' ? isActive : true,
      createdBy: req.user.id
    })

    const populatedOffer = await Offer.findById(offer._id).populate('products', 'title image price stockQuantity')
    res.status(201).json(populatedOffer)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

// PUT /api/admin/offers/:id - update offer
router.put('/offers/:id', protect, requireAdmin, async (req, res) => {
  try {
    const { title, description, discountPercentage, bannerText, products, isActive } = req.body

    const updateData = {}
    if (title !== undefined) updateData.title = title?.trim()
    if (description !== undefined) updateData.description = description?.trim()
    if (bannerText !== undefined) updateData.bannerText = bannerText?.trim()
    if (typeof isActive === 'boolean') updateData.isActive = isActive

    if (discountPercentage !== undefined) {
      const parsedDiscount = Number(discountPercentage)
      if (!Number.isFinite(parsedDiscount) || parsedDiscount <= 0 || parsedDiscount > 100) {
        return res.status(400).json({ message: 'Discount percentage must be between 0 and 100' })
      }
      updateData.discountPercentage = parsedDiscount
    }

    if (products !== undefined) {
      if (!Array.isArray(products) || products.length === 0) {
        return res.status(400).json({ message: 'Select at least one product for this offer' })
      }
      const uniqueProductIds = [...new Set(products)]
      const existingProductsCount = await Product.countDocuments({ _id: { $in: uniqueProductIds } })
      if (existingProductsCount !== uniqueProductIds.length) {
        return res.status(400).json({ message: 'One or more selected products are invalid' })
      }
      updateData.products = uniqueProductIds
    }

    const offer = await Offer.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('products', 'title image price stockQuantity')

    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' })
    }

    res.json(offer)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

// DELETE /api/admin/offers/:id - delete offer
router.delete('/offers/:id', protect, requireAdmin, async (req, res) => {
  try {
    const offer = await Offer.findByIdAndDelete(req.params.id)
    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' })
    }
    res.json({ message: 'Offer deleted successfully' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

export default router;
