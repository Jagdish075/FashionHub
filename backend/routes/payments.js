/**
 * Payment Routes - Cashfree Integration
 * 
 * This module handles all payment-related operations using Cashfree.
 * ONLY uses TEST/SANDBOX environment - no live payments enabled.
 * 
 * Endpoints:
 * - POST /api/payments/create - Create a new payment order
 * - POST /api/payments/verify - Verify payment status
 * - POST /api/payments/callback - Handle Cashfree webhook callback
 * - GET /api/payments/status/:orderId - Get payment status
 * - POST /api/payments/refund - Process refund (admin only)
 */

import express from 'express'
import crypto from 'crypto'
import { protect, requireAdmin } from '../middleware/auth.js'
import { paymentRateLimiter } from '../middleware/rateLimiter.js'
import Order from '../models/Order.js'
import User from '../models/User.js'
import Address from '../models/Address.js'
import Product from '../models/Product.js'
import cashfreeService from '../services/cashfreeService.js'
// import { sendOrderUpdateEmail } from '../services/emailService.js'

const router = express.Router()

const sendOrderEmailSafe = async (order, fallbackUser = null) => {
  try {
    // Temporarily disabled due to nodemailer ES module issues
    // let userData = fallbackUser
    // if (!userData?.email && order?.user) {
    //   const userId = typeof order.user === 'object' ? order.user?._id : order.user
    //   const dbUser = await User.findById(userId).select('name email')
    //   userData = dbUser
    // }
    // await sendOrderUpdateEmail({ order, user: userData })
  } catch (mailErr) {
    console.error('[Payment] Order email error:', mailErr.message)
  }
}

/**
 * Save or update user address
 */
const saveUserAddress = async (userId, addressData) => {
  try {
    let address = await Address.findOne({ user: userId })

    if (address) {
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
      console.log(`[Payment] Address updated for user: ${userId}`)
    } else {
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
      console.log(`[Payment] Address created for user: ${userId}`)
    }
    return address
  } catch (error) {
    console.error('[Payment] Error saving address:', error)
    return null
  }
}

/**
 * Validate incoming payment request
 */
const validatePaymentRequest = (req, res, next) => {
  const { amount } = req.body

  if (!amount || amount <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Valid amount is required'
    })
  }

  next()
}

/**
 * Generate a unique Cashfree-compatible order ID
 */
const generateCashfreeOrderId = () => {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return `CF_${timestamp}_${random}`
}

const applyInventoryForItems = async (items = []) => {
  const productIds = [...new Set(items.map((item) => item?.product?.toString()).filter(Boolean))]
  if (productIds.length === 0) {
    throw new Error('No valid product items found for inventory update')
  }

  const products = await Product.find({ _id: { $in: productIds } })
  const productMap = new Map(products.map((p) => [p._id.toString(), p]))

  for (const item of items) {
    const productId = item?.product?.toString()
    const qty = Number(item?.qty || 0)
    const size = String(item?.size || '').trim().toUpperCase()
    const product = productMap.get(productId)
    if (!product) {
      throw new Error(`Product not found for item ${item?.name || productId}`)
    }
    let available = Number(product.stockQuantity ?? product.stock ?? 0)
    if (size && Array.isArray(product.sizeInventory) && product.sizeInventory.length > 0) {
      const entry = product.sizeInventory.find((x) => x.size === size)
      available = Number(entry?.quantity || 0)
    }
    if (available < qty) {
      if (size) {
        throw new Error(`${product.title} (${size}) has only ${available} items in stock`)
      }
      throw new Error(`${product.title} has only ${available} items in stock`)
    }
  }

  for (const item of items) {
    const size = String(item?.size || '').trim().toUpperCase()
    const qty = item.qty || 1

    if (size) {
      await Product.updateOne(
        { _id: item.product, 'sizeInventory.size': size },
        {
          $inc: {
            'sizeInventory.$.quantity': -qty,
            stockQuantity: -qty,
            stock: -qty,
            totalSold: qty
          }
        }
      )
    } else {
      await Product.updateOne(
        { _id: item.product },
        {
          $inc: {
            stockQuantity: -qty,
            stock: -qty,
            totalSold: qty
          }
        }
      )
    }
  }
}

/**
 * POST /api/payments/create
 * 
 * Create a new payment order with Cashfree
 * 
 * Request Body:
 * - orderId: Internal order ID (optional, will generate if not provided)
 * - amount: Payment amount
 * 
 * Response:
 * - success: true/false
 * - paymentSessionId: Cashfree session ID for checkout
 * - orderId: Cashfree order ID
 * - orderAmount: Amount for this order
 */
router.post('/create', protect, paymentRateLimiter, validatePaymentRequest, async (req, res) => {
  try {
    const { orderId: internalOrderId, amount, shippingAddress, currency } = req.body
    const userId = req.user.id

    // Log incoming request payload for debugging
    console.info('[Payment/Create] Request payload:', {
      userId,
      internalOrderId,
      amount,
      currency,
      shippingAddress: shippingAddress ? { ...shippingAddress, street: shippingAddress.street ? shippingAddress.street.substring(0,50) : '' } : null
    })

    // Basic validations
    if (!req.user) {
      console.error('[Payment/Create] Missing authenticated user')
      return res.status(401).json({ success: false, message: 'User not authenticated' })
    }
    if (!amount || Number(amount) <= 0) {
      console.error('[Payment/Create] Invalid amount:', amount)
      return res.status(400).json({ success: false, message: 'Invalid amount' })
    }
    if (currency && currency !== 'INR') {
      return res.status(400).json({ success: false, message: 'Only INR currency is supported' })
    }
    if (!shippingAddress) {
      console.error('[Payment/Create] Missing shippingAddress in request')
      return res.status(400).json({ success: false, message: 'Shipping address is required' })
    }

    // Fetch user details
    const user = await User.findById(userId)
    if (!user) {
      console.error('[Payment/Create] User not found:', userId)
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      })
    }

    // Save user address (best-effort)
    try {
      await saveUserAddress(userId, shippingAddress)
    } catch (addrErr) {
      console.warn('[Payment/Create] Failed to save address:', addrErr.message)
    }

    // Ensure gateway credentials present
    const missingKeys = []
    if (!process.env.CASHFREE_APP_ID) missingKeys.push('CASHFREE_APP_ID')
    if (!process.env.CASHFREE_CLIENT_SECRET) missingKeys.push('CASHFREE_CLIENT_SECRET')
    if (missingKeys.length) {
      console.error('[Payment/Create] Missing Cashfree keys:', missingKeys.join(','))
      return res.status(500).json({ success: false, message: `Payment configuration missing: ${missingKeys.join(',')}` })
    }

    // Generate Cashfree order ID
    const cashfreeOrderId = generateCashfreeOrderId()

    // Create Cashfree payment order (payment session)
    let cashfreeResult
    try {
      cashfreeResult = await cashfreeService.createCashfreeOrder({
        orderId: cashfreeOrderId,
        orderAmount: Number(amount),
        customerName: user.name,
        customerEmail: user.email,
        customerPhone: user.phone || '9999999999',
        orderNote: `Checkout for user ${user.email}`
      })
    } catch (cfErr) {
      console.error('[Payment/Create] Cashfree create error:', cfErr.message, cfErr.details || '')
      const dev = process.env.NODE_ENV === 'development'
      const gatewayMessage = cfErr.details?.message || cfErr.message || 'Failed to create payment order'
      return res.status(502).json({
        success: false,
        message: dev
          ? `Failed to create payment order: ${gatewayMessage}. Run GET /api/payments/diagnose after login for upstream details.`
          : 'Failed to create payment order',
        error: dev ? { message: gatewayMessage, details: cfErr.details || null } : undefined
      })
    }

    // Return payment session info to frontend. Order will be created only after successful payment verification.
    res.json({
      success: true,
      paymentSessionId: cashfreeResult.paymentSessionId,
      orderId: cashfreeResult.orderId,
      orderAmount: cashfreeResult.orderAmount
    })

  } catch (error) {
    console.error('[Payment] Create order error:', error)
    const debugInfo = process.env.NODE_ENV === 'development' ? {
      message: error.message,
      details: error.details || null,
      stack: error.stack
    } : undefined

    res.status(500).json({ 
      success: false, 
      message: 'Failed to create payment order',
      error: debugInfo
    })
  }
})

/**
 * POST /api/payments/verify
 * 
 * Verify payment status for an order
 * 
 * Request Body:
 * - orderId: Internal tracking ID
 * 
 * Response:
 * - success: true/false
 * - paymentStatus: pending/paid/failed/cancelled
 * - orderDetails: Full order information
 */
router.post('/verify', protect, async (req, res) => {
  try {
    const { trackingId, cashfreeOrderId, paymentId, shippingAddress } = req.body

    // If trackingId provided, verify existing order (backwards compatible)
    if (trackingId) {
      const order = await Order.findOne({ trackingId: trackingId, user: req.user.id }).populate('user', 'name email phone')
      if (!order) return res.status(404).json({ success: false, message: 'Order not found' })

      if (order.cashfreeOrderId) {
        let verificationResult
        try {
          verificationResult = await cashfreeService.verifyPayment(order.cashfreeOrderId)
        } catch (verifyErr) {
          return res.status(502).json({
            success: false,
            message: `Unable to verify payment with Cashfree: ${verifyErr.message}`
          })
        }
        if ((verificationResult.orderStatus || '').toUpperCase() === 'PAID' && order.paymentStatus !== 'paid') {
          if (!order.inventoryAdjusted) {
            try {
              await applyInventoryForItems(order.items || [])
            } catch (inventoryErr) {
              return res.status(400).json({
                success: false,
                message: inventoryErr.message
              })
            }
            order.inventoryAdjusted = true
          }
          if (!Array.isArray(order.trackingHistory)) order.trackingHistory = []
          order.paymentStatus = 'paid'
          order.paymentId = verificationResult.paymentId
          order.bankReference = verificationResult.bankReference
          order.paidAt = new Date()
          order.orderStatus = 'confirmed'
          // progress shipping status
          if (order.status === 'pending') order.status = 'processing'
          order.trackingHistory.push({ status: 'paid', message: 'Payment successful', timestamp: new Date() })
          await order.save()
          await sendOrderEmailSafe(order, order.user)
        }
        if ((verificationResult.orderStatus || '').toUpperCase() !== 'PAID') {
          return res.status(400).json({
            success: false,
            message: 'Payment not successful',
            paymentStatus: verificationResult.status,
            verification: verificationResult
          })
        }
      }

      return res.json({ success: true, orderId: order.trackingId, paymentStatus: order.paymentStatus, order })
    }

    // If cashfreeOrderId provided, verify and CREATE order if payment successful
    if (!cashfreeOrderId) {
      return res.status(400).json({ success: false, message: 'trackingId or cashfreeOrderId is required' })
    }

    // Check if order already exists for this cashfreeOrderId (idempotency)
    // Fast-path: if already paid, skip gateway verification
    let existing = await Order.findOne({ cashfreeOrderId: cashfreeOrderId })
    if (existing) {
      if (existing.user?.toString() !== String(req.user.id)) {
        return res.status(403).json({ success: false, message: 'Not authorized to verify this order' })
      }

      if (existing.paymentStatus === 'paid') {
        return res.json({ success: true, message: 'Order already processed', order: existing })
      }
    }

    // Verify payment with gateway
    let verification
    try {
      verification = await cashfreeService.verifyPayment(cashfreeOrderId)
    } catch (verifyErr) {
      return res.status(502).json({
        success: false,
        message: `Unable to verify payment with Cashfree: ${verifyErr.message}`
      })
    }

    if ((verification.orderStatus || '').toUpperCase() !== 'PAID') {
      return res.status(400).json({
        success: false,
        message: 'Payment not successful',
        paymentStatus: verification.status,
        verification
      })
    }

    // Re-check order after gateway verification (idempotent update)
    existing = await Order.findOne({ cashfreeOrderId: cashfreeOrderId })
    if (existing) {
      if (existing.user?.toString() !== String(req.user.id)) {
        return res.status(403).json({ success: false, message: 'Not authorized to verify this order' })
      }

      if (existing.paymentStatus !== 'paid') {
        if (!existing.inventoryAdjusted) {
          try {
            await applyInventoryForItems(existing.items || [])
          } catch (inventoryErr) {
            return res.status(400).json({
              success: false,
              message: inventoryErr.message
            })
          }
          existing.inventoryAdjusted = true
        }
        if (!Array.isArray(existing.trackingHistory)) existing.trackingHistory = []
        existing.paymentStatus = 'paid'
        existing.paymentId = verification.paymentId || paymentId || existing.paymentId || null
        existing.bankReference = verification.bankReference || existing.bankReference || null
        existing.paidAt = existing.paidAt || new Date()
        existing.orderStatus = existing.orderStatus || 'confirmed'
        if (existing.status === 'pending') existing.status = 'processing'
        existing.trackingHistory.push({ status: 'paid', message: 'Payment verified as paid', timestamp: new Date() })
        await existing.save()
        await sendOrderEmailSafe(existing)
      }
      return res.json({ success: true, message: 'Order already processed', order: existing })
    }
    
    // Payment success: create order from user's cart
    const Cart = (await import('../models/Cart.js')).default
    const cart = await Cart.findOne({ user: req.user.id })
    if (!cart || !cart.items || cart.items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart is empty' })
    }

    // Optionally save provided shippingAddress
    if (shippingAddress) {
      await saveUserAddress(req.user.id, shippingAddress)
    }

    // Build order items
    const orderItems = cart.items.map(i => ({
      product: i.productId,
      name: i.name,
      qty: i.quantity || i.qty || 1,
      price: i.price,
      image: i.image,
      size: String(i.size || '').trim().toUpperCase()
    }))

    const totalAmount = cart.items.reduce((s, it) => s + (it.price || 0) * (it.quantity || it.qty || 1), 0)

    const trackingIdNew = crypto.randomBytes(6).toString('hex')
    // Check and adjust inventory before creating confirmed paid order
    try {
      await applyInventoryForItems(orderItems)
    } catch (inventoryErr) {
      return res.status(400).json({
        success: false,
        message: inventoryErr.message
      })
    }

    const order = new Order({
      user: req.user.id,
      items: orderItems,
      total: totalAmount,
      trackingId: trackingIdNew,
      status: 'processing',
      orderStatus: 'confirmed',
      paymentStatus: 'paid',
      paymentMethod: 'online',
      paymentId: verification.paymentId || paymentId || null,
      cashfreeOrderId: cashfreeOrderId,
      paymentSessionId: verification.paymentSessionId || null,
      paymentGateway: 'cashfree',
      bankReference: verification.bankReference || null,
      paidAt: new Date(),
      inventoryAdjusted: true,
      shippingAddress: shippingAddress || {}
    })

    // Add initial tracking history
    order.trackingHistory = [{ status: 'created', message: 'Order created after payment confirmation', timestamp: new Date() }]

    await order.save()
    await sendOrderEmailSafe(order, req.user)

    // Clear user's cart
    if (cart) {
      cart.items = []
      await cart.save()
    }

    return res.json({ success: true, message: 'Order created', order })

  } catch (error) {
    console.error('[Payment] Verify error:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Failed to verify payment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

/**
 * POST /api/payments/callback
 * 
 * Handle Cashfree webhook callback
 * This endpoint is called by Cashfree after payment completion
 * 
 * Headers:
 * - x-cashfree-signature: HMAC signature for verification
 */
router.post('/callback', express.json(), async (req, res) => {
  try {
    const signature = req.headers['x-cashfree-signature']
    const callbackData = req.body

    console.log('[Payment] Callback received:', JSON.stringify(callbackData))

    // Process callback
    const result = cashfreeService.processCallback(callbackData, signature)

    if (!result.valid) {
      console.error('[Payment] Invalid callback signature')
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid signature' 
      })
    }

    // Find order by Cashfree order ID
    const order = await Order.findOne({ 
      cashfreeOrderId: result.orderId 
    })

    if (!order) {
      console.error('[Payment] Order not found for callback:', result.orderId)
      return res.status(404).json({ 
        success: false, 
        message: 'Order not found' 
      })
    }

    // Update order based on payment status
    const paymentStatus = result.paymentStatus?.toLowerCase()
    
    if (paymentStatus === 'success') {
      if (!order.inventoryAdjusted) {
        try {
          await applyInventoryForItems(order.items || [])
          order.inventoryAdjusted = true
        } catch (inventoryErr) {
          console.error('[Payment] Callback inventory error:', inventoryErr.message)
          order.paymentStatus = 'failed'
          order.paymentError = inventoryErr.message
          await order.save()
          return res.status(200).json({ success: false, message: 'Inventory validation failed' })
        }
      }
      order.paymentStatus = 'paid'
      order.paymentId = result.transactionId
      order.bankReference = callbackData.transaction?.bank_reference || null
      order.paidAt = result.timestamp
      order.status = 'processing' // Auto-progress order
      
      // Add to tracking history
      order.trackingHistory.push({
        status: 'paid',
        message: 'Payment successful',
        timestamp: new Date()
      })
      
      await order.save()
      await sendOrderEmailSafe(order)
      console.log(`[Payment] Order ${order.trackingId} marked as paid`)
    } else if (paymentStatus === 'failed') {
      order.paymentStatus = 'failed'
      order.paymentError = callbackData.transaction?.payment_error || 'Payment failed'
      
      await order.save()
      console.log(`[Payment] Order ${order.trackingId} payment failed`)
    }

    // Always respond with 200 OK to Cashfree
    res.status(200).json({ 
      success: true, 
      message: 'Callback processed' 
    })

  } catch (error) {
    console.error('[Payment] Callback error:', error)
    // Still respond 200 to prevent Cashfree retries
    res.status(200).json({ 
      success: false, 
      message: 'Callback processing error' 
    })
  }
})

/**
 * GET /api/payments/status/:trackingId
 * 
 * Get payment status for an order
 * Accessible by the order owner or admin
 */
router.get('/status/:trackingId', protect, async (req, res) => {
  try {
    const { trackingId } = req.params

    const order = await Order.findOne({ 
      trackingId: trackingId 
    }).populate('user', 'name email phone')

    if (!order) {
      return res.status(404).json({ 
        success: false, 
        message: 'Order not found' 
      })
    }

    // Check authorization
    if (order.user._id.toString() !== String(req.user.id) && !req.user.isAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to view this order' 
      })
    }

    // If we have Cashfree details, verify current status
    if (order.cashfreeOrderId && order.paymentStatus === 'pending') {
      try {
        const verification = await cashfreeService.verifyPayment(order.cashfreeOrderId)
        
        if (verification.status === 'success' && order.paymentStatus !== 'paid') {
          order.paymentStatus = 'paid'
          order.paymentId = verification.paymentId
          order.bankReference = verification.bankReference
          order.paidAt = new Date()
          order.status = 'processing'
          await order.save()
        }
      } catch (verifyError) {
        console.error('[Payment] Status verification error:', verifyError)
      }
    }

    res.json({
      success: true,
      trackingId: order.trackingId,
      paymentStatus: order.paymentStatus,
      orderStatus: order.status,
      paymentDetails: {
        paymentId: order.paymentId,
        cashfreeOrderId: order.cashfreeOrderId,
        paymentMethod: order.paymentMethod,
        paidAt: order.paidAt,
        total: order.total,
        bankReference: order.bankReference
      }
    })

  } catch (error) {
    console.error('[Payment] Status error:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get payment status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

/**
 * POST /api/payments/refund
 * 
 * Process a refund for an order (Admin only)
 * 
 * Request Body:
 * - orderId: Internal tracking ID
 * - amount: Refund amount (optional, defaults to full amount)
 * - reason: Reason for refund
 */
router.post('/refund', protect, requireAdmin, async (req, res) => {
  try {
    const { orderId, amount, reason } = req.body

    if (!orderId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Order ID is required' 
      })
    }

    const order = await Order.findOne({ trackingId: orderId })

    if (!order) {
      return res.status(404).json({ 
        success: false, 
        message: 'Order not found' 
      })
    }

    if (order.paymentStatus !== 'paid') {
      return res.status(400).json({ 
        success: false, 
        message: 'Can only refund paid orders' 
      })
    }

    if (!order.cashfreeOrderId) {
      return res.status(400).json({ 
        success: false, 
        message: 'This order was not paid via Cashfree' 
      })
    }

    // Process refund through Cashfree
    const refundResult = await cashfreeService.refundPayment(
      order.cashfreeOrderId,
      amount || order.total,
      reason || 'Customer requested refund'
    )

    // Update order
    order.paymentStatus = 'refunded'
    order.trackingHistory.push({
      status: 'refunded',
      message: `Refund processed: ${refundResult.refundId}`,
      timestamp: new Date()
    })
    await order.save()

    console.log(`[Payment] Refund processed for order ${orderId}: ${refundResult.refundId}`)

    res.json({
      success: true,
      message: 'Refund processed successfully',
      refund: {
        refundId: refundResult.refundId,
        status: refundResult.status,
        amount: refundResult.amount
      }
    })

  } catch (error) {
    console.error('[Payment] Refund error:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Failed to process refund',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

/**
 * POST /api/payments/retry
 * 
 * Retry payment for an order that failed or has pending status
 */
router.post('/retry', protect, paymentRateLimiter, async (req, res) => {
  try {
    const { orderId } = req.body

    if (!orderId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Order ID is required' 
      })
    }

    const order = await Order.findOne({ 
      trackingId: orderId,
      user: req.user.id
    })

    if (!order) {
      return res.status(404).json({ 
        success: false, 
        message: 'Order not found' 
      })
    }

    if (!['pending', 'failed'].includes(order.paymentStatus)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot retry payment for this order' 
      })
    }

    // Create new Cashfree order
    const cashfreeOrderId = generateCashfreeOrderId()
    const cashfreeResult = await cashfreeService.createCashfreeOrder({
      orderId: cashfreeOrderId,
      orderAmount: order.total,
      customerName: order.user?.name || 'Customer',
      customerEmail: order.user?.email || 'customer@example.com',
      customerPhone: order.user?.phone || '9999999999',
      orderNote: `Retry Order ${order.trackingId}`
    })

    // Update order
    order.cashfreeOrderId = cashfreeOrderId
    order.paymentSessionId = cashfreeResult.paymentSessionId
    order.paymentStatus = 'pending'
    await order.save()

    res.json({
      success: true,
      paymentSessionId: cashfreeResult.paymentSessionId,
      orderId: cashfreeResult.orderId,
      orderAmount: cashfreeResult.orderAmount
    })

  } catch (error) {
    console.error('[Payment] Retry error:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Failed to retry payment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

/**
 * GET /api/payments/config
 * 
 * Get public Cashfree configuration (for frontend)
 * Returns app ID and environment info
 */
router.get('/config', (req, res) => {
  const config = cashfreeService.getCashfreeConfig()
  res.json({
    success: true,
    config: {
      appId: config.appId,
      environment: config.environment,
      isTestMode: config.isTestMode
    }
  })
})

/**
 * GET /api/payments/diagnose
 *
 * Quick diagnostic endpoint for Cashfree upstream response.
 */
router.get('/diagnose', protect, async (req, res) => {
  try {
    const diagnostics = await cashfreeService.diagnoseCashfreeConnection()
    res.status(diagnostics.ok ? 200 : 502).json({
      success: diagnostics.ok,
      diagnostics
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to run gateway diagnostics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

export default router
