import mongoose from 'mongoose'

const inventoryLogSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', index: true },
    size: { type: String, trim: true, uppercase: true },
    changeType: {
      type: String,
      enum: ['reserve', 'release', 'sale', 'restock'],
      required: true
    },
    quantity: { type: Number, required: true },
    note: { type: String, trim: true, default: '' }
  },
  { timestamps: true }
)

inventoryLogSchema.index({ createdAt: -1 })

const InventoryLog = mongoose.model('InventoryLog', inventoryLogSchema)
export default InventoryLog
