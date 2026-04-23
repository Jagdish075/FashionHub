import mongoose from 'mongoose'

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  name: String,
  qty: Number,
  price: Number,
  image: String,
  size: String,
})

const trackingHistorySchema = new mongoose.Schema({
  status: { type: String, required: true },
  message: String,
  location: String,
  timestamp: { type: Date, default: Date.now }
})

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  items: [orderItemSchema],
  total: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'], 
    default: 'pending' 
  },
  trackingId: { type: String, unique: true },
  
  // Enhanced tracking fields
  trackingHistory: [trackingHistorySchema],
  estimatedDeliveryDate: Date,
  
  // Shipping details
  shippingCarrier: String,
  shippingTrackingNumber: String,
  shippingAddress: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  
  // Order notes
  adminNotes: String,
  customerNotes: String,
  
  // Payment info - Enhanced for Cashfree
  paymentMethod: { type: String, default: 'online' },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'failed', 'refunded', 'cancelled'], default: 'pending' },
  // Business-level order state separate from shipping lifecycle
  orderStatus: { type: String, enum: ['created', 'confirmed', 'cancelled'], default: 'created' },
  paymentId: { type: String }, // Cashfree payment ID
  cashfreeOrderId: { type: String }, // Cashfree order ID
  paymentSessionId: { type: String }, // Cashfree payment session ID
  paymentGateway: { type: String, default: 'cashfree' },
  bankReference: String,
  paymentError: String,
  paidAt: Date,
  inventoryAdjusted: { type: Boolean, default: false },
  
}, { timestamps: true })

// Add tracking history entry when status changes
orderSchema.pre('save', function(next) {
  if (this.isModified('status') && !this.trackingHistory.some(h => h.status === this.status)) {
    this.trackingHistory.push({
      status: this.status,
      message: `Order status updated to ${this.status}`,
      timestamp: new Date()
    })
  }
  // Set paidAt when payment status changes to paid
  if (this.isModified('paymentStatus') && this.paymentStatus === 'paid' && !this.paidAt) {
    this.paidAt = new Date()
    // Also update main status if still pending
    if (this.status === 'pending') {
      this.status = 'processing'
    }
  }
  next()
})

// Index for faster queries
orderSchema.index({ user: 1, createdAt: -1 })
orderSchema.index({ trackingId: 1 })
orderSchema.index({ paymentStatus: 1 })
orderSchema.index({ cashfreeOrderId: 1 })

const Order = mongoose.model('Order', orderSchema)
export default Order
