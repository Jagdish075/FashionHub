import mongoose from 'mongoose'

const siteSettingsSchema = new mongoose.Schema(
  {
    siteName: {
      type: String,
      trim: true,
      default: 'FashionHub'
    },
    siteDescription: {
      type: String,
      trim: true,
      default: 'Your premier fashion destination'
    },
    contactEmail: {
      type: String,
      trim: true,
      default: 'support@fashionhub.com'
    },
    contactPhone: {
      type: String,
      trim: true,
      default: '+91 90000 00000'
    },
    contactAddress: {
      type: String,
      trim: true,
      default: 'Mumbai, India'
    },
    currency: {
      type: String,
      enum: ['INR'],
      default: 'INR'
    },
    timezone: {
      type: String,
      trim: true,
      default: 'Asia/Kolkata'
    },
    maintenanceMode: {
      type: Boolean,
      default: false
    },
    allowRegistration: {
      type: Boolean,
      default: true
    },
    emailNotifications: {
      type: Boolean,
      default: true
    },
    orderNotifications: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
)

const SiteSettings = mongoose.model('SiteSettings', siteSettingsSchema)
export default SiteSettings
