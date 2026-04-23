import mongoose from 'mongoose'

const reviewSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 1000, default: '' }
  },
  { timestamps: true }
)

reviewSchema.index({ user: 1, product: 1 }, { unique: true })
reviewSchema.index({ product: 1, createdAt: -1 })

const Review = mongoose.model('Review', reviewSchema)
export default Review
