import mongoose from 'mongoose'

const wishlistItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    addedAt: { type: Date, default: Date.now }
  },
  { _id: false }
)

const wishlistSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    items: [wishlistItemSchema]
  },
  { timestamps: true }
)

wishlistSchema.index({ user: 1, 'items.product': 1 })

const Wishlist = mongoose.model('Wishlist', wishlistSchema)
export default Wishlist
