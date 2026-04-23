import express from 'express'
import { protect, optionalAuth } from '../middleware/auth.js'
import Cart from '../models/Cart.js'
import Product from '../models/Product.js'
import Offer from '../models/Offer.js'
import { validateQuantity, sanitizeString } from '../middleware/validation.js'

const router = express.Router()

const getEffectivePrice = async (product) => {
  const bestOffer = await Offer.findOne({
    isActive: true,
    products: product._id
  }).sort({ discountPercentage: -1 })

  if (!bestOffer) {
    return { effectivePrice: product.price, originalPrice: product.price, discountPercentage: 0 }
  }

  const discounted = product.price - (product.price * bestOffer.discountPercentage / 100)
  return {
    effectivePrice: Math.max(0, Number(discounted.toFixed(2))),
    originalPrice: product.price,
    discountPercentage: bestOffer.discountPercentage
  }
}

/**
 * Get session ID from header or generate one
 */
const getSessionId = (req) => {
  return req.headers['x-session-id'] || req.cookies?.sessionId || req.ip
}

const getAvailableStockForSize = (product, size) => {
  const normalizedSize = String(size || '').trim().toUpperCase()
  if (normalizedSize && Array.isArray(product?.sizeInventory) && product.sizeInventory.length > 0) {
    const entry = product.sizeInventory.find((item) => item.size === normalizedSize)
    return Number(entry?.quantity || 0)
  }
  return Number(product?.stockQuantity ?? product?.stock ?? 0)
}

/**
 * Validate cart item data
 */
const validateCartItem = (req, res, next) => {
  const { productId, quantity, size, color } = req.body

  if (!productId) {
    return res.status(400).json({ message: 'Product ID is required', field: 'productId' })
  }

  // Validate quantity
  const qtyValidation = validateQuantity(quantity, 1, 99)
  if (!qtyValidation.valid) {
    return res.status(400).json({ message: qtyValidation.message, field: 'quantity' })
  }

  // Validate size (optional but if provided, sanitize)
  if (size) {
    const sanitizedSize = sanitizeString(size)
    if (sanitizedSize.length > 20) {
      return res.status(400).json({ message: 'Invalid size', field: 'size' })
    }
    req.body.size = sanitizedSize
  }

  // Validate color (optional but if provided, sanitize)
  if (color) {
    const sanitizedColor = sanitizeString(color)
    if (sanitizedColor.length > 30) {
      return res.status(400).json({ message: 'Invalid color', field: 'color' })
    }
    req.body.color = sanitizedColor
  }

  req.body.quantity = parseInt(quantity, 10)
  next()
}

/**
 * GET /api/cart
 * 
 * Get cart for logged in user OR guest via session
 */
router.get('/', optionalAuth, async (req, res) => {
  try {
    let cart
    
    if (req.user) {
      // Logged in user - get their cart
      cart = await Cart.findOne({ user: req.user.id }).populate('items.productId')
    } else {
      // Guest user - could implement session-based cart
      // For now, return empty cart for guests
      return res.json({ items: [], isGuest: true })
    }

    if (!cart) {
      return res.json({ items: [] })
    }

    // Transform populated cart items with stock validation
    const items = cart.items.map(item => {
      const product = item.productId
      const availableStock = getAvailableStockForSize(product, item.size)
      const isAvailable = product && availableStock >= item.quantity
      
      return {
        _id: item._id,
        productId: product?._id || item.productId,
        title: item.name || product?.title || product?.name || 'Unknown Product',
        image: item.image || product?.image,
        price: item.price,
        qty: item.quantity,
        size: item.size,
        color: item.color,
        stock: availableStock,
        stockQuantity: availableStock,
        isAvailable: isAvailable !== false,
        maxQuantity: availableStock || 99
      }
    }).filter(item => item.productId) // Remove invalid items

    // Check if any items are unavailable
    const hasUnavailableItems = items.some(item => !item.isAvailable)

    res.json({ 
      items,
      totalItems: items.reduce((sum, item) => sum + item.qty, 0),
      hasUnavailableItems,
      isGuest: false
    })
  } catch (err) {
    console.error('Get cart error:', err)
    res.status(500).json({ message: 'Failed to get cart' })
  }
})

/**
 * POST /api/cart
 * 
 * Add item to cart
 * 
 * Body:
 * - productId: Product ID
 * - quantity: Number (1-99)
 * - size: Optional size variant
 * - color: Optional color variant
 */
router.post('/', optionalAuth, validateCartItem, async (req, res) => {
  const { productId, quantity, size, color } = req.body

  try {
    // Validate product exists and has stock
    const product = await Product.findById(productId)
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found', field: 'productId' })
    }

    const availableStock = getAvailableStockForSize(product, size)
    const hasSizeVariants = Array.isArray(product.sizes) && product.sizes.length > 0
    if (hasSizeVariants && !size) {
      return res.status(400).json({
        message: 'Please select a size for this product',
        field: 'size'
      })
    }
    if (hasSizeVariants && size && !product.sizes.includes(String(size).trim().toUpperCase())) {
      return res.status(400).json({
        message: 'Selected size is not available for this product',
        field: 'size'
      })
    }
    const pricing = await getEffectivePrice(product)

    if (!availableStock || availableStock < 1) {
      return res.status(400).json({ message: 'Product is out of stock', field: 'productId' })
    }

    if (availableStock < quantity) {
      return res.status(400).json({ 
        message: `Only ${availableStock} items available in stock`,
        field: 'quantity',
        availableStock
      })
    }

    let cart

    if (req.user) {
      // Logged in user
      cart = await Cart.findOne({ user: req.user.id })
    } else {
      // Guest user - require session for guest cart
      if (!req.headers['x-session-id']) {
        return res.status(401).json({ 
          message: 'Please login to add items to cart, or provide a session ID',
          code: 'AUTH_REQUIRED'
        })
      }
      cart = await Cart.findOne({ sessionId: req.headers['x-session-id'] })
    }

    // Create new cart if doesn't exist
    if (!cart) {
      const cartData = {
        user: req.user?.id,
        sessionId: !req.user ? req.headers['x-session-id'] : undefined,
        items: []
      }
      cart = new Cart(cartData)
    }

    // Check if item already exists in cart (same product, size, color)
    const existingItemIndex = cart.items.findIndex(
      item => {
        const sameProduct = item.productId.toString() === productId
        const sameSize = item.size === size
        const sameColor = item.color === color
        return sameProduct && sameSize && sameColor
      }
    )

    if (existingItemIndex > -1) {
      // Update quantity of existing item
      const newQuantity = cart.items[existingItemIndex].quantity + quantity
      
      // Check stock limit
      if (newQuantity > availableStock) {
        return res.status(400).json({ 
          message: `Cannot add more. Only ${availableStock} items available`,
          field: 'quantity',
          availableStock: availableStock - cart.items[existingItemIndex].quantity
        })
      }

      cart.items[existingItemIndex].quantity = newQuantity
      cart.items[existingItemIndex].price = pricing.effectivePrice // update to current offer price
    } else {
      // Add new item
      cart.items.push({
        productId,
        name: product.title || product.name,
        image: product.image,
        price: pricing.effectivePrice,
        quantity,
        size,
        color,
      })
    }

    await cart.save()

    // Return transformed items
    const items = cart.items.map(item => ({
      _id: item._id,
      productId: item.productId,
      title: item.name,
      image: item.image,
      price: item.price,
      qty: item.quantity,
      size: item.size,
      color: item.color,
    }))

    res.status(201).json({ 
      items, 
      message: 'Item added to cart',
      totalItems: items.reduce((sum, item) => sum + item.qty, 0)
    })
  } catch (err) {
    console.error('Add to cart error:', err)
    res.status(500).json({ message: 'Failed to add item to cart' })
  }
})

/**
 * PUT /api/cart/:itemId
 * 
 * Update cart item quantity
 */
router.put('/:itemId', optionalAuth, async (req, res) => {
  try {
    const { quantity } = req.body

    // Validate quantity
    const qtyValidation = validateQuantity(quantity, 1, 99)
    if (!qtyValidation.valid) {
      return res.status(400).json({ message: qtyValidation.message, field: 'quantity' })
    }

    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' })
    }

    const cart = await Cart.findOne({ user: req.user.id })
    
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' })
    }

    const item = cart.items.id(req.params.itemId)
    
    if (!item) {
      return res.status(404).json({ message: 'Item not found in cart' })
    }

    // Get product to check stock
    const product = await Product.findById(item.productId)
    
    const availableStock = getAvailableStockForSize(product, item.size)
    if (product && availableStock < quantity) {
      return res.status(400).json({ 
        message: `Only ${availableStock} items available in stock`,
        field: 'quantity',
        availableStock
      })
    }

    item.quantity = parseInt(quantity, 10)
    await cart.save()

    const items = cart.items.map(item => ({
      _id: item._id,
      productId: item.productId,
      title: item.name,
      image: item.image,
      price: item.price,
      qty: item.quantity,
      size: item.size,
      color: item.color,
    }))

    res.json({ 
      items,
      message: 'Cart updated',
      totalItems: items.reduce((sum, item) => sum + item.qty, 0)
    })
  } catch (err) {
    console.error('Update cart error:', err)
    res.status(500).json({ message: 'Failed to update cart' })
  }
})

/**
 * DELETE /api/cart/:itemId
 * 
 * Remove item from cart
 */
router.delete('/:itemId', optionalAuth, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' })
    }

    const cart = await Cart.findOne({ user: req.user.id })
    
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' })
    }

    const item = cart.items.id(req.params.itemId)
    
    if (!item) {
      return res.status(404).json({ message: 'Item not found in cart' })
    }

    cart.items.pull(req.params.itemId)
    await cart.save()

    const items = cart.items.map(item => ({
      _id: item._id,
      productId: item.productId,
      title: item.name,
      image: item.image,
      price: item.price,
      qty: item.quantity,
      size: item.size,
      color: item.color,
    }))

    res.json({ 
      items,
      message: 'Item removed from cart',
      totalItems: items.reduce((sum, item) => sum + item.qty, 0)
    })
  } catch (err) {
    console.error('Remove cart item error:', err)
    res.status(500).json({ message: 'Failed to remove item' })
  }
})

/**
 * DELETE /api/cart
 * 
 * Clear entire cart
 */
router.delete('/', optionalAuth, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' })
    }

    await Cart.findOneAndDelete({ user: req.user.id })
    res.json({ items: [], message: 'Cart cleared', totalItems: 0 })
  } catch (err) {
    console.error('Clear cart error:', err)
    res.status(500).json({ message: 'Failed to clear cart' })
  }
})

/**
 * POST /api/cart/merge
 * 
 * Merge guest cart into user cart on login
 * 
 * Body:
 * - guestSessionId: Guest session ID
 */
router.post('/merge', optionalAuth, async (req, res) => {
  try {
    const { guestSessionId } = req.body

    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' })
    }

    if (!guestSessionId) {
      return res.status(400).json({ message: 'Guest session ID required' })
    }

    // Get guest cart
    const guestCart = await Cart.findOne({ sessionId: guestSessionId })
    
    if (!guestCart || guestCart.items.length === 0) {
      return res.json({ message: 'No guest cart to merge', merged: false })
    }

    // Get user cart
    let userCart = await Cart.findOne({ user: req.user.id })

    // Merge items
    for (const guestItem of guestCart.items) {
      // Check product stock
      const product = await Product.findById(guestItem.productId)
      
      if (!product) continue // Skip invalid products
      const availableStock = getAvailableStockForSize(product, guestItem.size)
      
      if (availableStock < guestItem.quantity) {
        guestItem.quantity = Math.min(guestItem.quantity, availableStock || 1)
      }

      // Check if item exists in user cart
      const existingIndex = userCart?.items.findIndex(
        item => 
          item.productId.toString() === guestItem.productId.toString() &&
          item.size === guestItem.size &&
          item.color === guestItem.color
      )

      if (existingIndex > -1 && userCart) {
        // Merge quantities
        const newQty = userCart.items[existingIndex].quantity + guestItem.quantity
        
        if (newQty > availableStock) {
          userCart.items[existingIndex].quantity = availableStock
        } else {
          userCart.items[existingIndex].quantity = newQty
        }
      } else {
        const pricing = await getEffectivePrice(product)
        // Add new item
        if (!userCart) {
          userCart = new Cart({ user: req.user.id, items: [] })
        }
        userCart.items.push({
          productId: guestItem.productId,
          name: guestItem.name,
          image: guestItem.image,
          price: pricing.effectivePrice,
          quantity: guestItem.quantity,
          size: guestItem.size,
          color: guestItem.color,
        })
      }
    }

    // Save user cart
    if (userCart) {
      await userCart.save()
    }

    // Delete guest cart
    await Cart.findOneAndDelete({ sessionId: guestSessionId })

    // Return updated cart
    const updatedCart = await Cart.findOne({ user: req.user.id })
    const items = updatedCart?.items.map(item => ({
      _id: item._id,
      productId: item.productId,
      title: item.name,
      image: item.image,
      price: item.price,
      qty: item.quantity,
      size: item.size,
      color: item.color,
    })) || []

    res.json({ 
      message: 'Cart merged successfully',
      merged: true,
      items,
      totalItems: items.reduce((sum, item) => sum + item.qty, 0)
    })
  } catch (err) {
    console.error('Merge cart error:', err)
    res.status(500).json({ message: 'Failed to merge carts' })
  }
})

/**
 * POST /api/cart/validate
 * 
 * Validate cart before checkout
 * Checks stock availability and pricing
 */
router.post('/validate', optionalAuth, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' })
    }

    const cart = await Cart.findOne({ user: req.user.id }).populate('items.productId')
    
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ 
        message: 'Cart is empty',
        code: 'EMPTY_CART'
      })
    }

    const validationResult = {
      valid: true,
      items: [],
      total: 0,
      issues: []
    }

    for (const item of cart.items) {
      const product = item.productId
      const itemData = {
        id: item._id,
        name: item.name,
        image: item.image,
        requestedQty: item.quantity,
        price: item.price,
        total: item.price * item.quantity,
        issues: []
      }

      // Check if product still exists
      if (!product) {
        itemData.issues.push('Product no longer available')
        validationResult.valid = false
      } else {
        const availableStock = getAvailableStockForSize(product, item.size)
        // Check stock
        if (!availableStock || availableStock < 1) {
          itemData.issues.push('Out of stock')
          validationResult.valid = false
        } else if (availableStock < item.quantity) {
          itemData.issues.push(`Only ${availableStock} available`)
          itemData.availableStock = availableStock
          validationResult.valid = false
        }

        // Check price (if price changed)
        if (product.price !== item.price) {
          itemData.priceUpdated = true
          itemData.oldPrice = item.price
          itemData.newPrice = product.price
          itemData.issues.push('Price updated')
        }
      }

      validationResult.items.push(itemData)
      validationResult.total += itemData.total
    }

    if (!validationResult.valid) {
      validationResult.message = 'Some items have issues'
    }

    res.json(validationResult)
  } catch (err) {
    console.error('Validate cart error:', err)
    res.status(500).json({ message: 'Failed to validate cart' })
  }
})

export default router
