/**
 * Address Routes
 * 
 * This module handles address-related operations for authenticated users.
 * 
 * Endpoints:
 * - GET /api/address/me → returns saved address
 * - POST /api/address → saves or updates address
 */

import express from 'express'
import { protect } from '../middleware/auth.js'
import Address from '../models/Address.js'

const router = express.Router()

/**
 * Validate address request
 */
const validateAddress = (req, res, next) => {
  const { name, phone, street, city, state, zipCode } = req.body

  // Validate name
  if (!name || !name.trim()) {
    return res.status(400).json({ 
      success: false, 
      message: 'Name is required',
      field: 'name'
    })
  }

  if (name.trim().length < 2) {
    return res.status(400).json({ 
      success: false, 
      message: 'Name must be at least 2 characters',
      field: 'name'
    })
  }

  // Validate phone
  if (!phone || !phone.trim()) {
    return res.status(400).json({ 
      success: false, 
      message: 'Phone number is required',
      field: 'phone'
    })
  }

  // Basic phone validation (10 digits)
  const phoneRegex = /^[6-9]\d{9}$/
  if (!phoneRegex.test(phone.trim())) {
    return res.status(400).json({ 
      success: false, 
      message: 'Please enter a valid 10-digit phone number',
      field: 'phone'
    })
  }

  // Validate street address
  if (!street || !street.trim()) {
    return res.status(400).json({ 
      success: false, 
      message: 'Street address is required',
      field: 'street'
    })
  }

  // Validate city
  if (!city || !city.trim()) {
    return res.status(400).json({ 
      success: false, 
      message: 'City is required',
      field: 'city'
    })
  }

  // Validate state
  if (!state || !state.trim()) {
    return res.status(400).json({ 
      success: false, 
      message: 'State is required',
      field: 'state'
    })
  }

  // Validate PIN code
  if (!zipCode || !zipCode.trim()) {
    return res.status(400).json({ 
      success: false, 
      message: 'PIN code is required',
      field: 'zipCode'
    })
  }

  next()
}

/**
 * GET /api/address/me
 * 
 * Get the saved address for the authenticated user
 */
router.get('/me', protect, async (req, res) => {
  try {
    const userId = req.user.id

    // Find address for user
    const address = await Address.findOne({ user: userId })

    if (!address) {
      return res.json({
        success: true,
        hasAddress: false,
        address: null
      })
    }

    res.json({
      success: true,
      hasAddress: true,
      address: {
        id: address._id,
        name: address.name,
        phone: address.phone,
        street: address.street,
        city: address.city,
        state: address.state,
        zipCode: address.zipCode,
        country: address.country,
        isDefault: address.isDefault,
        createdAt: address.createdAt,
        updatedAt: address.updatedAt
      }
    })
  } catch (error) {
    console.error('[Address] Get address error:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get address',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

/**
 * POST /api/address
 * 
 * Save or update the address for the authenticated user
 * If an address exists, it will be updated; otherwise, a new one will be created
 */
router.post('/', protect, validateAddress, async (req, res) => {
  try {
    const userId = req.user.id
    const { name, phone, street, city, state, zipCode, country } = req.body

    // Trim all string fields
    const trimmedData = {
      name: name.trim(),
      phone: phone.trim(),
      street: street.trim(),
      city: city.trim(),
      state: state.trim(),
      zipCode: zipCode.trim(),
      country: country?.trim() || 'India'
    }

    // Check if address already exists for this user
    let address = await Address.findOne({ user: userId })

    if (address) {
      // Update existing address
      address = await Address.findOneAndUpdate(
        { user: userId },
        { 
          name: trimmedData.name,
          phone: trimmedData.phone,
          street: trimmedData.street,
          city: trimmedData.city,
          state: trimmedData.state,
          zipCode: trimmedData.zipCode,
          country: trimmedData.country,
          isDefault: true
        },
        { new: true, runValidators: true }
      )

      console.log(`[Address] Address updated for user: ${userId}`)

      res.json({
        success: true,
        message: 'Address updated successfully',
        address: {
          id: address._id,
          name: address.name,
          phone: address.phone,
          street: address.street,
          city: address.city,
          state: address.state,
          zipCode: address.zipCode,
          country: address.country,
          isDefault: address.isDefault
        }
      })
    } else {
      // Create new address
      address = await Address.create({
        user: userId,
        name: trimmedData.name,
        phone: trimmedData.phone,
        street: trimmedData.street,
        city: trimmedData.city,
        state: trimmedData.state,
        zipCode: trimmedData.zipCode,
        country: trimmedData.country,
        isDefault: true
      })

      console.log(`[Address] Address created for user: ${userId}`)

      res.status(201).json({
        success: true,
        message: 'Address saved successfully',
        address: {
          id: address._id,
          name: address.name,
          phone: address.phone,
          street: address.street,
          city: address.city,
          state: address.state,
          zipCode: address.zipCode,
          country: address.country,
          isDefault: address.isDefault
        }
      })
    }
  } catch (error) {
    console.error('[Address] Save address error:', error)

    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        message: 'Address already exists for this user'
      })
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message)
      return res.status(400).json({ 
        success: false, 
        message: messages.join(', ')
      })
    }

    res.status(500).json({ 
      success: false, 
      message: 'Failed to save address',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

/**
 * DELETE /api/address
 * 
 * Delete the saved address for the authenticated user
 */
router.delete('/', protect, async (req, res) => {
  try {
    const userId = req.user.id

    const result = await Address.deleteOne({ user: userId })

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'No address found to delete'
      })
    }

    console.log(`[Address] Address deleted for user: ${userId}`)

    res.json({
      success: true,
      message: 'Address deleted successfully'
    })
  } catch (error) {
    console.error('[Address] Delete address error:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete address',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

export default router
