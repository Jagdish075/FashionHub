import mongoose from 'mongoose'

const offerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: ''
    },
    discountPercentage: {
      type: Number,
      min: 1,
      max: 100,
      required: true
    },
    bannerText: {
      type: String,
      trim: true,
      maxlength: 200,
      default: ''
    },
    products: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
      }
    ],
    isActive: {
      type: Boolean,
      default: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  { timestamps: true }
)

offerSchema.index({ isActive: 1, updatedAt: -1 })
offerSchema.index({ products: 1 })

const Offer = mongoose.model('Offer', offerSchema)
export default Offer
