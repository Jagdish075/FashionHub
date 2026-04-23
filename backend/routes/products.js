import express from 'express'
import mongoose from 'mongoose'
import Product from '../models/Product.js'
import Order from '../models/Order.js'
import Offer from '../models/Offer.js'
import { getRelatedProducts, getFrequentlyBoughtTogether } from '../services/recommendationService.js'

const router = express.Router()
const allowedCategories = ['men', 'women', 'kids']

const normalizeCategory = (category) => {
  const normalized = (category || '').toLowerCase().trim()
  if (allowedCategories.includes(normalized)) return normalized
  if (normalized === 'accessories' || normalized === 'shoes') return 'kids'
  return 'kids'
}

const attachOfferPricing = async (products = []) => {
  if (!products.length) return []

  const productIds = products.map((p) => p._id)
  const activeOffers = await Offer.find({
    isActive: true,
    products: { $in: productIds }
  })

  const productOfferMap = new Map()
  for (const offer of activeOffers) {
    for (const productId of offer.products || []) {
      const key = productId.toString()
      const existing = productOfferMap.get(key)
      if (!existing || offer.discountPercentage > existing.discountPercentage) {
        productOfferMap.set(key, {
          offerId: offer._id,
          offerTitle: offer.title,
          discountPercentage: offer.discountPercentage
        })
      }
    }
  }

  return products.map((product) => {
    const p = typeof product.toObject === 'function' ? product.toObject() : { ...product }
    p.category = normalizeCategory(p.category)
    const matchedOffer = productOfferMap.get(p._id.toString())
    if (matchedOffer) {
      const discounted = p.price - (p.price * matchedOffer.discountPercentage / 100)
      p.originalPrice = p.price
      p.discountedPrice = Math.max(0, Number(discounted.toFixed(2)))
      p.offer = matchedOffer
    } else {
      p.originalPrice = p.price
      p.discountedPrice = null
      p.offer = null
    }
    p.stockQuantity = p.stockQuantity ?? p.stock ?? 0
    p.stock = p.stockQuantity
    p.rating = Number(p.averageRating ?? p.rating ?? 0)
    p.reviews = Number(p.reviewCount ?? p.reviews ?? 0)
    return p
  })
}

const buildFilter = (query) => {
  const filter = {}

  if (query.category && allowedCategories.includes(String(query.category).toLowerCase())) {
    filter.category = String(query.category).toLowerCase()
  }

  const minPrice = Number(query.minPrice)
  const maxPrice = Number(query.maxPrice)
  if (Number.isFinite(minPrice) || Number.isFinite(maxPrice)) {
    filter.price = {}
    if (Number.isFinite(minPrice)) filter.price.$gte = minPrice
    if (Number.isFinite(maxPrice)) filter.price.$lte = maxPrice
  }

  if (query.search && String(query.search).trim()) {
    filter.$or = [
      { title: { $regex: String(query.search).trim(), $options: 'i' } },
      { description: { $regex: String(query.search).trim(), $options: 'i' } }
    ]
  }

  return filter
}

const getSort = (sortBy) => {
  switch (String(sortBy || '').toLowerCase()) {
    case 'price_low':
    case 'price-low':
      return { price: 1 }
    case 'price_high':
    case 'price-high':
      return { price: -1 }
    case 'popularity':
      return { totalSold: -1, createdAt: -1 }
    case 'rating':
      return { averageRating: -1, reviewCount: -1 }
    case 'newest':
      return { createdAt: -1 }
    case 'name':
    default:
      return { title: 1 }
  }
}

// Get products with advanced filtering and sorting
router.get('/', async (req, res) => {
  try {
    let products = await Product.find().limit(50)

    if (products.length === 0) {
      const demoProducts = [
        {
          title: 'Classic Cotton T-Shirt',
          description: 'A timeless essential made from premium cotton for everyday comfort. This classic tee features a relaxed fit, breathable fabric, and durable construction.',
          price: 1499,
          image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600',
          category: 'men',
          stockQuantity: 50,
          stock: 50,
          averageRating: 4.5,
          reviewCount: 110
        },
        {
          title: 'Elegant Summer Dress',
          description: 'Beautiful summer dress perfect for any occasion. Features a flattering silhouette and comfortable fabric.',
          price: 2799,
          image: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=600',
          category: 'women',
          stockQuantity: 30,
          stock: 30,
          averageRating: 4.8,
          reviewCount: 92
        },
        {
          title: 'Boys Cotton Hoodie',
          description: 'Comfortable and warm cotton hoodie for kids. Soft inner lining with breathable fabric.',
          price: 1899,
          image: 'https://images.unsplash.com/photo-1519238359922-989348752efb?w=600',
          category: 'kids',
          stockQuantity: 20,
          stock: 20,
          averageRating: 4.6,
          reviewCount: 65
        },
        {
          title: 'Kids Sport Sneakers',
          description: 'Lightweight sneakers for active kids. Flexible sole and sturdy grip for all-day play.',
          price: 2399,
          image: 'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=600',
          category: 'kids',
          stockQuantity: 45,
          stock: 45,
          averageRating: 4.7,
          reviewCount: 54
        },
        {
          title: 'Denim Jacket',
          description: 'Classic denim jacket for casual wear. Perfect for layering in any season.',
          price: 3299,
          image: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=600',
          category: 'men',
          stockQuantity: 35,
          stock: 35,
          averageRating: 4.4,
          reviewCount: 40
        },
        {
          title: 'Floral Blouse',
          description: 'Beautiful floral blouse for everyday wear. Light and comfortable fabric.',
          price: 1799,
          image: 'https://images.unsplash.com/photo-1598554747436-c9293d6a588f?w=600',
          category: 'women',
          stockQuantity: 40,
          stock: 40,
          averageRating: 4.3,
          reviewCount: 36
        },
        {
          title: 'Girls Party Frock',
          description: 'Stylish and comfortable party frock for girls with soft fabric and bright colors.',
          price: 2099,
          image: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600',
          category: 'kids',
          stockQuantity: 60,
          stock: 60,
          averageRating: 4.5,
          reviewCount: 70
        },
        {
          title: 'Kids Casual Set',
          description: 'Two-piece casual outfit set for kids, designed for comfort and everyday style.',
          price: 1599,
          image: 'https://images.unsplash.com/photo-1519340241574-2cec6aef0c01?w=600',
          category: 'kids',
          stockQuantity: 55,
          stock: 55,
          averageRating: 4.2,
          reviewCount: 31
        }
      ]

      await Product.insertMany(demoProducts)
      products = await Product.find().limit(50)
      console.log('Demo products seeded successfully')
    }

    const filter = buildFilter(req.query)
    const sort = getSort(req.query.sort || req.query.sortBy)
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1)
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 24, 1), 100)
    const skip = (page - 1) * limit

    const filtered = await Product.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)

    const mappedProducts = await attachOfferPricing(filtered)

    if (String(req.query.withMeta || '') === '1') {
      const total = await Product.countDocuments(filter)
      return res.json({
        items: mappedProducts,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      })
    }

    return res.json(mappedProducts)
  } catch (err) {
    console.error('Error fetching products:', err)
    return res.status(500).json({ message: err.message })
  }
})

router.get('/latest', async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 8, 1), 20)
    const products = await Product.find()
      .sort({ createdAt: -1 })
      .limit(limit)

    const mappedProducts = await attachOfferPricing(products)
    res.json(mappedProducts)
  } catch (err) {
    console.error('Error fetching latest products:', err)
    res.status(500).json({ message: err.message })
  }
})

router.get('/most-purchased', async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 8, 1), 20)

    const sales = await Order.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          totalSold: { $sum: '$items.qty' }
        }
      },
      { $sort: { totalSold: -1 } },
      { $limit: limit }
    ])

    const ids = sales.map((s) => s._id).filter(Boolean)
    const products = await Product.find({ _id: { $in: ids } })
    const productMap = new Map(products.map((p) => [p._id.toString(), p]))

    const salesMap = new Map(sales.map((s) => [s._id?.toString(), s.totalSold || 0]))
    const orderedProducts = sales
      .map((sale) => productMap.get(sale._id?.toString()))
      .filter(Boolean)

    if (orderedProducts.length > 0) {
      const enriched = await attachOfferPricing(orderedProducts)
      return res.json(
        enriched.map((item) => ({
          ...item,
          totalSold: salesMap.get(item._id?.toString()) ?? item.totalSold
        }))
      )
    }

    const fallback = await Product.find()
      .sort({ totalSold: -1, createdAt: -1 })
      .limit(limit)

    const fallbackMapped = await attachOfferPricing(fallback)
    return res.json(fallbackMapped)
  } catch (err) {
    console.error('Error fetching most purchased products:', err)
    res.status(500).json({ message: err.message })
  }
})

router.get('/:id/recommendations', async (req, res) => {
  try {
    const { id } = req.params
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid product id' })
    }

    const [related, frequentlyBoughtTogether] = await Promise.all([
      getRelatedProducts(id, 8),
      getFrequentlyBoughtTogether(id, 6)
    ])

    const [relatedWithOffers, fbWithOffers] = await Promise.all([
      attachOfferPricing(related),
      attachOfferPricing(frequentlyBoughtTogether)
    ])

    return res.json({ related: relatedWithOffers, frequentlyBoughtTogether: fbWithOffers })
  } catch (err) {
    return res.status(500).json({ message: err.message })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
    if (!product) {
      return res.status(404).json({ message: 'Product not found' })
    }
    const [enriched] = await attachOfferPricing([product])
    res.json(enriched)
  } catch (err) {
    console.error('Error fetching product:', err)
    res.status(500).json({ message: err.message })
  }
})

router.post('/seed', async (req, res) => {
  try {
    const items = req.body.items || [
      { title: 'Classic Tee', price: 1499, description: 'Premium cotton tee' },
      { title: 'Slim Jeans', price: 2799, description: 'Comfort stretch denim' }
    ]
    await Product.insertMany(items)
    res.json({ message: 'Seeded' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

export default router
