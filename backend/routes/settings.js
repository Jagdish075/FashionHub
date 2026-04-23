import express from 'express'
import SiteSettings from '../models/SiteSettings.js'

const router = express.Router()

const defaultSettings = {
  siteName: 'FashionHub',
  siteDescription: 'Your premier fashion destination',
  contactEmail: 'support@fashionhub.com',
  contactPhone: '+91 90000 00000',
  contactAddress: 'Mumbai, India',
  currency: 'INR',
  timezone: 'Asia/Kolkata',
  maintenanceMode: false,
  allowRegistration: true,
  emailNotifications: true,
  orderNotifications: true
}

const getOrCreateSettings = async () => {
  let settings = await SiteSettings.findOne()
  if (!settings) {
    settings = await SiteSettings.create(defaultSettings)
  }
  return settings
}

// GET /api/settings - public settings for user panel
router.get('/', async (req, res) => {
  try {
    const settings = await getOrCreateSettings()
    res.json(settings)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

export default router
