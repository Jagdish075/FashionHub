import mongoose from 'mongoose'

const sizeInventorySchema = new mongoose.Schema(
  {
    size: { type: String, required: true, trim: true, uppercase: true },
    quantity: { type: Number, required: true, min: 0, default: 0 }
  },
  { _id: false }
)

const productSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  price: { 
    type: Number, 
    required: true,
    min: [0.01, 'Price must be greater than 0 rupees']
  },
  image: String,
  category: { type: String, default: 'Uncategorized' },
  sizes: [{ type: String, trim: true, uppercase: true }],
  sizeInventory: [sizeInventorySchema],
  stockQuantity: { type: Number, default: 10, min: 0 },
  // legacy field retained for compatibility with existing code paths
  stock: { type: Number, default: 10, min: 0 },
  totalSold: { type: Number, default: 0, min: 0 },
  averageRating: { type: Number, default: 0, min: 0, max: 5 },
  reviewCount: { type: Number, default: 0, min: 0 },
  slug: { type: String, unique: true }
}, { timestamps: true })

// Keep legacy stock and stockQuantity in sync.
productSchema.pre('validate', function(next) {
  if (Array.isArray(this.sizeInventory) && this.sizeInventory.length > 0) {
    const normalized = this.sizeInventory
      .map((entry) => ({
        size: String(entry.size || '').trim().toUpperCase(),
        quantity: Number(entry.quantity || 0)
      }))
      .filter((entry) => entry.size)

    this.sizeInventory = normalized
    this.sizes = [...new Set(normalized.map((entry) => entry.size))]
    this.stockQuantity = normalized.reduce((sum, entry) => sum + Math.max(0, entry.quantity), 0)
  }

  if (this.stockQuantity === undefined || this.stockQuantity === null) {
    this.stockQuantity = this.stock ?? 0
  }
  this.stock = this.stockQuantity
  next()
})

// Generate slug from title before saving
productSchema.pre('save', function(next) {
  if (this.isModified('title') || this.isNew) {
    // Create slug from title: lowercase, replace spaces with hyphens, remove special chars
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .trim()
      .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
  }
  next()
})

productSchema.index({ title: 'text', description: 'text' })
productSchema.index({ category: 1, price: 1, createdAt: -1 })
productSchema.index({ averageRating: -1, totalSold: -1, createdAt: -1 })

const Product = mongoose.model('Product', productSchema)
export default Product
