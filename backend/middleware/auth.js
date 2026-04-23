import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import Token from '../models/Token.js'

// JWT Configuration
// IMPORTANT: Uses 30-minute expiry for session-based authentication
const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET
  if (!secret || !secret.trim()) {
    throw new Error('JWT_SECRET is required in environment variables')
  }
  return secret
}
const JWT_EXPIRY = process.env.JWT_EXPIRY || '30m' // 30 minutes - short session for security

/**
 * Verify JWT token with expiry check
 */
const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, getJwtSecret())
    return { valid: true, decoded }
  } catch (err) {
    return { valid: false, error: err.message }
  }
}

/**
 * Authentication Middleware
 * 
 * Features:
 * - Validates JWT token
 * - Checks if token is not blacklisted
 * - Attaches user info to request
 * - Handles expired tokens with specific error
 */
export const protect = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        message: 'Not authorized. Please login to continue.',
        code: 'NO_TOKEN'
      })
    }

    const token = authHeader.split(' ')[1]

    // Verify token format
    if (!token || token.length < 10) {
      return res.status(401).json({ 
        message: 'Invalid token format',
        code: 'INVALID_TOKEN'
      })
    }

    // Check if token is blacklisted
    const blacklistedToken = await Token.findOne({ token })
    if (blacklistedToken) {
      return res.status(401).json({ 
        message: 'Token has been invalidated. Please login again.',
        code: 'TOKEN_BLACKLISTED'
      })
    }

    // Verify token and check expiry
    const { valid, decoded, error } = verifyToken(token)
    
    if (!valid) {
      if (error === 'jwt expired') {
        return res.status(401).json({ 
          message: 'Session expired. Please login again.',
          code: 'TOKEN_EXPIRED'
        })
      }
      return res.status(401).json({ 
        message: 'Invalid token',
        code: 'INVALID_TOKEN'
      })
    }

    // Fetch fresh user data
    const user = await User.findById(decoded.id).select('-password')
    
    if (!user) {
      return res.status(401).json({ 
        message: 'User not found. Please register or login again.',
        code: 'USER_NOT_FOUND'
      })
    }

    // Check if user is still active (not banned)
    if (user.isActive === false) {
      return res.status(403).json({ 
        message: 'Your account has been deactivated. Please contact support.',
        code: 'USER_INACTIVE'
      })
    }

    // Attach user and token info to request
    req.user = {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      isAdmin: user.isAdmin,
    }
    req.token = token

    next()
  } catch (err) {
    console.error('Auth middleware error:', err)
    return res.status(500).json({ 
      message: 'Authentication error',
      code: 'AUTH_ERROR'
    })
  }
}

/**
 * Admin Authorization Middleware
 * 
 * Requires:
 * - Valid authentication (protect middleware must run first)
 * - Admin role check
 */
export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      message: 'Authentication required',
      code: 'NOT_AUTHENTICATED'
    })
  }

  if (!req.user.isAdmin) {
    return res.status(403).json({ 
      message: 'Access denied. Admin privileges required.',
      code: 'NOT_ADMIN'
    })
  }

  next()
}

/**
 * Optional Authentication Middleware
 * 
 * Attempts to authenticate but doesn't fail if not logged in.
 * Useful for getting user info when available.
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next()
    }

    const token = authHeader.split(' ')[1]

    if (!token || token.length < 10) {
      return next()
    }

    // Check blacklist
    const blacklistedToken = await Token.findOne({ token })
    if (blacklistedToken) {
      return next()
    }

    // Verify token
    const { valid, decoded } = verifyToken(token)
    
    if (valid) {
      const user = await User.findById(decoded.id).select('-password')
      
      if (user && user.isActive !== false) {
        req.user = {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          isAdmin: user.isAdmin,
        }
        req.token = token
      }
    }

    next()
  } catch (err) {
    // Continue without auth on error
    next()
  }
}

/**
 * Generate JWT Token with expiry
 */
export const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin
    },
    getJwtSecret(),
    { expiresIn: JWT_EXPIRY }
  )
}

/**
 * Generate refresh token (longer expiry)
 */
export const generateRefreshToken = (user) => {
  const refreshSecret = process.env.JWT_REFRESH_SECRET
  if (!refreshSecret || !refreshSecret.trim()) {
    throw new Error('JWT_REFRESH_SECRET is required in environment variables')
  }
  return jwt.sign(
    { id: user._id },
    refreshSecret,
    { expiresIn: '7d' }
  )
}

export default {
  protect,
  requireAdmin,
  optionalAuth,
  generateToken,
  generateRefreshToken
}
