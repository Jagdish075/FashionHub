import mongoose from 'mongoose'

/**
 * Token Model
 * 
 * Stores blacklisted tokens for immediate invalidation on logout.
 * Tokens are automatically deleted after expiry.
 */
const tokenSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: ['access', 'refresh', 'reset'],
      default: 'access'
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true
    },
    revokedAt: {
      type: Date,
      default: Date.now
    },
    reason: {
      type: String,
      enum: ['logout', 'password_change', 'security', 'admin_revoke', 'session_expired'],
      default: 'logout'
    },
    ipAddress: {
      type: String
    },
    userAgent: {
      type: String
    }
  },
  { timestamps: true }
)

// TTL Index - Automatically delete expired tokens
tokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

// Compound index for cleanup queries
tokenSchema.index({ user: 1, type: 1 })

/**
 * Static method to blacklist a token
 */
tokenSchema.statics.blacklistToken = async function(tokenData) {
  try {
    const token = new this(tokenData)
    await token.save()
    return token
  } catch (err) {
    console.error('Error blacklisting token:', err)
    return null
  }
}

/**
 * Static method to check if token is blacklisted
 */
tokenSchema.statics.isBlacklisted = async function(token) {
  try {
    const blacklisted = await this.findOne({ token })
    return !!blacklisted
  } catch (err) {
    console.error('Error checking token blacklist:', err)
    return false
  }
}

/**
 * Static method to revoke all tokens for a user
 */
tokenSchema.statics.revokeAllUserTokens = async function(userId, reason = 'security') {
  try {
    const now = new Date()
    await this.updateMany(
      { user: userId, expiresAt: { $gt: now } },
      { 
        $set: { 
          revokedAt: now,
          reason 
        } 
      }
    )
    return { success: true }
  } catch (err) {
    console.error('Error revoking user tokens:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Static method to clean up old tokens
 */
tokenSchema.statics.cleanup = async function() {
  try {
    const result = await this.deleteMany({
      expiresAt: { $lt: new Date() }
    })
    console.log(`Cleaned up ${result.deletedCount} expired tokens`)
    return result
  } catch (err) {
    console.error('Error cleaning up tokens:', err)
    return null
  }
}

const Token = mongoose.model('Token', tokenSchema)

export default Token

