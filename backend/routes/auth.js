import express from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import User from "../models/User.js";
import Token from "../models/Token.js";
import PendingRegistration from "../models/PendingRegistration.js";
import Cart from "../models/Cart.js";
import Address from "../models/Address.js";
import Order from "../models/Order.js";
import RefundRequest from "../models/RefundRequest.js";
import { authRateLimiter } from "../middleware/rateLimiter.js";
import { sendRegistrationOtpEmail } from "../services/emailService.js";
import { 
  validateEmail, 
  validatePassword, 
  validateName, 
  validatePhone,
  sanitizeString 
} from "../middleware/validation.js";
import { generateToken, protect, requireAdmin } from "../middleware/auth.js";

const router = express.Router();
const OTP_EXPIRY_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;

const buildOtpHash = (email, otp) =>
  crypto.createHash("sha256").update(`${email.toLowerCase()}::${otp}`).digest("hex");

const generateOtp = () => String(crypto.randomInt(100000, 1000000));

/**
 * Validate incoming registration data
 */
const validateRegistration = (req, res, next) => {
  const { name, email, password, phone, confirmPassword } = req.body;

  // Validate name
  const nameValidation = validateName(name, 'Name');
  if (!nameValidation.valid) {
    return res.status(400).json({ message: nameValidation.message, field: 'name' });
  }

  // Validate email
  const emailValidation = validateEmail(email);
  if (!emailValidation.valid) {
    return res.status(400).json({ message: emailValidation.message, field: 'email' });
  }

  // Validate password
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    return res.status(400).json({ message: passwordValidation.message, field: 'password' });
  }

  // Validate phone (optional)
  if (!phone || !phone.trim()) {
    return res.status(400).json({ message: 'Phone number is required', field: 'phone' });
  }
  const phoneValidation = validatePhone(phone);
  if (!phoneValidation.valid) {
    return res.status(400).json({ message: phoneValidation.message, field: 'phone' });
  }

  if (confirmPassword !== undefined && password !== confirmPassword) {
    return res.status(400).json({ message: 'Password and confirm password do not match', field: 'confirmPassword' });
  }

  // Sanitize inputs
  req.body.name = sanitizeString(name);
  req.body.email = sanitizeString(email).toLowerCase();
  if (phone) req.body.phone = sanitizeString(phone);
  if (confirmPassword !== undefined) req.body.confirmPassword = sanitizeString(confirmPassword);

  next();
};

/**
 * REQUEST OTP FOR REGISTRATION
 *
 * POST /api/users/register/request-otp
 */
router.post("/register/request-otp", authRateLimiter, validateRegistration, async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    const normalizedEmail = email.toLowerCase();

    const existingEmail = await User.findOne({ email: normalizedEmail });
    if (existingEmail) {
      return res.status(400).json({
        message: "This email is already registered. Please login instead.",
        field: "email",
      });
    }

    const existingPhone = await User.findOne({ phone });
    if (existingPhone) {
      return res.status(400).json({
        message: "This phone number is already linked to an account.",
        field: "phone",
      });
    }

    const existingUsername = await User.findOne({ name: { $regex: new RegExp(`^${name}$`, "i") } });
    if (existingUsername) {
      return res.status(400).json({
        message: "This username is already taken. Please choose a different name.",
        field: "name",
      });
    }

    const otp = generateOtp();
    const otpHash = buildOtpHash(normalizedEmail, otp);
    const passwordHash = await bcrypt.hash(password, 12);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await PendingRegistration.findOneAndUpdate(
      { email: normalizedEmail },
      {
        name,
        email: normalizedEmail,
        phone,
        passwordHash,
        otpHash,
        attempts: 0,
        expiresAt,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const emailResult = await sendRegistrationOtpEmail({
      email: normalizedEmail,
      name,
      otp,
      expiresInMinutes: OTP_EXPIRY_MINUTES,
    });

    if (emailResult?.skipped) {
      return res.status(500).json({
        message: "OTP email service is not configured. Please contact support.",
      });
    }

    if (process.env.NODE_ENV === "development") {
      console.log(`[REGISTER OTP] OTP generated for ${normalizedEmail}`);
    }

    return res.json({
      message: `OTP sent successfully. It is valid for ${OTP_EXPIRY_MINUTES} minutes.`,
      expiresIn: OTP_EXPIRY_MINUTES * 60,
    });
  } catch (error) {
    console.error("REGISTER REQUEST OTP error:", error);
    return res.status(500).json({ message: "Failed to send OTP. Please try again." });
  }
});

/**
 * VERIFY OTP AND COMPLETE REGISTRATION
 *
 * POST /api/users/register/verify-otp
 */
router.post("/register/verify-otp", authRateLimiter, async (req, res) => {
  try {
    const email = sanitizeString(req.body?.email || "").toLowerCase();
    const otp = sanitizeString(req.body?.otp || "");

    if (!email) {
      return res.status(400).json({ message: "Email is required", field: "email" });
    }
    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({ message: "Please enter a valid 6-digit OTP", field: "otp" });
    }

    const pending = await PendingRegistration.findOne({ email });
    if (!pending) {
      return res.status(400).json({
        message: "No pending registration found. Please request OTP again.",
      });
    }

    if (pending.expiresAt < new Date()) {
      await PendingRegistration.deleteOne({ _id: pending._id });
      return res.status(400).json({
        message: "OTP expired. Please request a new OTP.",
        field: "otp",
      });
    }

    if (pending.attempts >= OTP_MAX_ATTEMPTS) {
      await PendingRegistration.deleteOne({ _id: pending._id });
      return res.status(429).json({
        message: "Too many invalid OTP attempts. Please request a new OTP.",
      });
    }

    const expectedHash = buildOtpHash(email, otp);
    if (expectedHash !== pending.otpHash) {
      pending.attempts += 1;
      await pending.save();
      return res.status(400).json({
        message: "Invalid OTP. Please try again.",
        field: "otp",
      });
    }

    const duplicateEmail = await User.findOne({ email });
    if (duplicateEmail) {
      await PendingRegistration.deleteOne({ _id: pending._id });
      return res.status(400).json({
        message: "This email is already registered. Please login.",
        field: "email",
      });
    }

    const duplicatePhone = await User.findOne({ phone: pending.phone });
    if (duplicatePhone) {
      await PendingRegistration.deleteOne({ _id: pending._id });
      return res.status(400).json({
        message: "This phone number is already linked to an account.",
        field: "phone",
      });
    }

    const duplicateName = await User.findOne({ name: { $regex: new RegExp(`^${pending.name}$`, "i") } });
    if (duplicateName) {
      await PendingRegistration.deleteOne({ _id: pending._id });
      return res.status(400).json({
        message: "This username is already taken. Please choose a different name.",
        field: "name",
      });
    }

    const user = await User.create({
      name: pending.name,
      email: pending.email,
      phone: pending.phone,
      password: pending.passwordHash || pending.password,
      address: "",
    });

    await PendingRegistration.deleteOne({ _id: pending._id });

    const token = generateToken(user);

    return res.status(201).json({
      message: "Account created successfully! Welcome to FationHub.",
      token,
      expiresIn: 1800,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        address: user.address || "",
        isAdmin: user.isAdmin || false,
        refundBalance: user.refundBalance || 0,
        totalRefunded: user.totalRefunded || 0,
      },
    });
  } catch (error) {
    console.error("REGISTER VERIFY OTP error:", error);
    return res.status(500).json({ message: "Failed to verify OTP. Please try again." });
  }
});

/**
 * Validate incoming login data
 */
const validateLogin = (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !email.trim()) {
    return res.status(400).json({ message: 'Email is required', field: 'email' });
  }

  if (!password || !password.trim()) {
    return res.status(400).json({ message: 'Password is required', field: 'password' });
  }

  // Validate email format
  const emailValidation = validateEmail(email);
  if (!emailValidation.valid) {
    return res.status(400).json({ message: emailValidation.message, field: 'email' });
  }

  req.body.email = sanitizeString(email).toLowerCase();
  next();
};

/**
 * REGISTER
 * 
 * POST /api/users/register
 */
router.post("/register", authRateLimiter, validateRegistration, async (req, res) => {
  try {
    const { name, email, password, phone, address } = req.body;

    console.log('REGISTER request received:', { name, email, phone: phone ? 'provided' : 'not provided' });

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      console.log('REGISTER failed: Email already registered:', email);
      return res.status(400).json({ 
        message: 'This email is already registered. Please login instead.',
        field: 'email'
      });
    }

    const existingPhone = await User.findOne({ phone });
    if (existingPhone) {
      console.log('REGISTER failed: Phone already registered:', phone);
      return res.status(400).json({
        message: 'This phone number is already linked to an account.',
        field: 'phone'
      });
    }

    // Check if username already exists
    const existingUsername = await User.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (existingUsername) {
      console.log('REGISTER failed: Username already taken:', name);
      return res.status(400).json({ 
        message: 'This username is already taken. Please choose a different name.',
        field: 'name'
      });
    }

    await PendingRegistration.deleteOne({ email: email.toLowerCase() });

    // Create user (password will be hashed by pre-save middleware)
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password, // Let the pre-save middleware handle hashing
      phone: phone || '',
      address: address || '',
    });

    // Generate token using generateToken from middleware (uses 30m expiry)
    const token = generateToken(user);
    const tokenExpiry = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes - matches JWT_EXPIRY

    console.log('REGISTER success: User created:', user._id);

    res.status(201).json({
      message: "Account created successfully! Welcome to FationHub.",
      token,
      expiresIn: 1800, // 30 minutes in seconds (matches JWT_EXPIRY)
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        address: user.address || '',
        isAdmin: user.isAdmin || false,
        refundBalance: user.refundBalance || 0,
        totalRefunded: user.totalRefunded || 0,
      },
    });
  } catch (error) {
    console.error('REGISTER error:', error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ 
        message: `This ${field} is already in use.`,
        field 
      });
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    
    res.status(500).json({ message: "Failed to create account. Please try again." });
  }
});

/**
 * LOGIN
 * 
 * POST /api/users/login
 */
router.post('/login', authRateLimiter, validateLogin, async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('LOGIN request for:', email);

    // Find user by email with password
    const user = await User.findByEmail(email);
    
    if (!user) {
      console.log('LOGIN failed: User not found:', email);
      return res.status(401).json({ 
        message: 'Invalid email or password',
        field: 'email'
      });
    }

    // Check if user account is active
    if (user.isActive === false) {
      console.log('LOGIN failed: Account deactivated:', email);
      return res.status(403).json({ 
        message: 'Your account has been deactivated. Please contact support.'
      });
    }

    if (user.isLocked) {
      console.log('LOGIN failed: Account locked:', email);
      return res.status(423).json({
        message: 'Too many failed login attempts. Please try again later.',
      });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      console.log('LOGIN failed: Wrong password for:', email);
      await user.incLoginAttempts();

      return res.status(401).json({ 
        message: 'Invalid email or password',
        field: 'password'
      });
    }

    // Reset login attempts on successful login
    await user.resetLoginAttempts();

    // Generate token using generateToken from middleware (uses 30m expiry)
    const token = generateToken(user);
    const tokenExpiry = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes - matches JWT_EXPIRY

    console.log('LOGIN success:', email, '| User ID:', user._id);

    res.json({ 
      message: `Welcome back, ${user.name}!`,
      token,
      expiresIn: 1800, // 30 minutes in seconds (matches JWT_EXPIRY)
      user: {
        id: user._id, 
        name: user.name, 
        email: user.email, 
        phone: user.phone,
        isAdmin: user.isAdmin,
        refundBalance: user.refundBalance || 0,
        totalRefunded: user.totalRefunded || 0,
      } 
    });
  } catch (err) {
    console.error('LOGIN error:', err);
    res.status(500).json({ message: "Login failed. Please try again." });
  }
});

/**
 * LOGOUT
 * 
 * POST /api/users/logout
 * 
 * Blacklists the current token immediately
 */
router.post('/logout', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(200).json({ message: 'Logged out successfully' });
    }

    const token = authHeader.split(' ')[1];

    // Blacklist the token
    await Token.blacklistToken({
      token,
      user: req.body.userId || req.user?.id,
      type: 'access',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Keep in blacklist until original expiry
      reason: 'logout'
    });

    console.log('LOGOUT: Token blacklisted');
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error('LOGOUT error:', err);
    // Still return success to client
    res.status(200).json({ message: 'Logged out successfully' });
  }
});

/**
 * LOGOUT ALL (Log out from all devices)
 * 
 * POST /api/users/logout-all
 * 
 * Blacklists all tokens for the user
 */
router.post('/logout-all', protect, async (req, res) => {
  try {
    const userId = req.body.userId || req.user?.id;
    
    if (!userId) {
      return res.status(400).json({ message: 'User ID required' });
    }

    // Revoke all tokens
    await Token.revokeAllUserTokens(userId, 'logout');

    console.log('LOGOUT ALL: All tokens revoked for user:', userId);
    res.json({ message: 'Logged out from all devices' });
  } catch (err) {
    console.error('LOGOUT ALL error:', err);
    res.status(500).json({ message: 'Failed to logout from all devices' });
  }
});

/**
 * GET CURRENT USER
 * 
 * GET /api/users/me
 * 
 * Returns current authenticated user's profile
 */
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.isActive === false) {
      return res.status(403).json({ message: 'Account is deactivated' });
    }

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        address: user.address || '',
        isAdmin: user.isAdmin,
        refundBalance: user.refundBalance || 0,
        totalRefunded: user.totalRefunded || 0,
      }
    });
  } catch (err) {
    console.error('GET ME error:', err);
    res.status(500).json({ message: 'Failed to get user profile' });
  }
});

/**
 * UPDATE USER PROFILE
 * 
 * PUT /api/users/profile
 * 
 * Updates the current user's profile
 */
router.put('/profile', protect, async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { name, phone, address, currentPassword } = req.body;

    if (!currentPassword) {
      return res.status(400).json({
        message: 'Current password is required to update profile details',
        field: 'currentPassword'
      });
    }

    const existingUser = await User.findById(userId).select('+password');
    if (!existingUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, existingUser.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        message: 'Current password is incorrect',
        field: 'currentPassword'
      });
    }

    // Validate name
    if (name) {
      const nameValidation = validateName(name, 'Name');
      if (!nameValidation.valid) {
        return res.status(400).json({ message: nameValidation.message, field: 'name' });
      }
    }

    // Validate phone
    if (phone) {
      const phoneValidation = validatePhone(phone);
      if (!phoneValidation.valid) {
        return res.status(400).json({ message: phoneValidation.message, field: 'phone' });
      }
    }

    // Build update object
    const updateData = {};
    if (name) updateData.name = sanitizeString(name);
    if (phone) updateData.phone = sanitizeString(phone);
    if (address !== undefined) updateData.address = sanitizeString(address) || '';

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('PROFILE UPDATE: User updated:', userId);

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        address: user.address || '',
        isAdmin: user.isAdmin,
        refundBalance: user.refundBalance || 0,
        totalRefunded: user.totalRefunded || 0,
      }
    });
  } catch (err) {
    console.error('PROFILE UPDATE error:', err);
    
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

/**
 * CHANGE PASSWORD
 * 
 * POST /api/users/change-password
 * 
 * Changes the current user's password
 */
router.post('/change-password', protect, async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword) {
      return res.status(400).json({ message: 'Current password is required', field: 'currentPassword' });
    }

    if (!newPassword) {
      return res.status(400).json({ message: 'New password is required', field: 'newPassword' });
    }

    // Validate new password
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return res.status(400).json({ message: passwordValidation.message, field: 'newPassword' });
    }

    // Find user with password
    const user = await User.findById(userId).select('+password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    
    if (!isMatch) {
      console.log('CHANGE PASSWORD failed: Wrong current password');
      return res.status(401).json({ message: 'Current password is incorrect', field: 'currentPassword' });
    }

    // Check if new password is same as current
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({ message: 'New password must be different from current password', field: 'newPassword' });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Invalidate all other sessions
    await Token.revokeAllUserTokens(userId, 'password_change');

    console.log('CHANGE PASSWORD: Password changed for user:', userId);

    res.json({ 
      message: 'Password changed successfully. Please login again with your new password.',
      requiresRelogin: true
    });
  } catch (err) {
    console.error('CHANGE PASSWORD error:', err);
    res.status(500).json({ message: 'Failed to change password' });
  }
});

/**
 * DEACTIVATE ACCOUNT
 *
 * POST /api/users/deactivate
 *
 * Deactivates current user account after password verification.
 */
router.post('/deactivate', protect, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { currentPassword } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!currentPassword || !currentPassword.trim()) {
      return res.status(400).json({
        message: 'Current password is required',
        field: 'currentPassword'
      });
    }

    const user = await User.findById(userId).select('+password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({
        message: 'Current password is incorrect',
        field: 'currentPassword'
      });
    }

    user.isActive = false;
    await user.save();

    await Token.revokeAllUserTokens(userId, 'security');

    return res.json({
      message: 'Your account has been deactivated successfully.',
      requiresRelogin: true
    });
  } catch (err) {
    console.error('DEACTIVATE ACCOUNT error:', err);
    return res.status(500).json({ message: 'Failed to deactivate account' });
  }
});

/**
 * DELETE ACCOUNT
 *
 * DELETE /api/users
 *
 * Permanently deletes current user account and related data after password verification.
 */
router.delete('/', protect, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { currentPassword, confirmation } = req.body || {};

    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!currentPassword || !currentPassword.trim()) {
      return res.status(400).json({
        message: 'Current password is required',
        field: 'currentPassword'
      });
    }

    if (String(confirmation || '').trim().toUpperCase() !== 'DELETE') {
      return res.status(400).json({
        message: 'Type DELETE to confirm account deletion',
        field: 'confirmation'
      });
    }

    const user = await User.findById(userId).select('+password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({
        message: 'Current password is incorrect',
        field: 'currentPassword'
      });
    }

    await Promise.all([
      Cart.deleteOne({ user: userId }),
      Address.deleteOne({ user: userId }),
      RefundRequest.deleteMany({ user: userId }),
      Token.deleteMany({ user: userId }),
      Order.deleteMany({ user: userId }),
      PendingRegistration.deleteMany({ email: user.email }),
      User.deleteOne({ _id: userId })
    ]);

    return res.json({ message: 'Your account has been permanently deleted.' });
  } catch (err) {
    console.error('DELETE ACCOUNT error:', err);
    return res.status(500).json({ message: 'Failed to delete account' });
  }
});

/**
 * Seed admin user
 * POST /api/users/seed-admin
 */
router.post('/seed-admin', protect, requireAdmin, async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ message: 'This endpoint is disabled in production' });
    }

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@fationhub.com';
    const adminPass = process.env.ADMIN_PASS || 'admin123';
    
    const exists = await User.findOne({ email: adminEmail.toLowerCase() });
    if (exists) {
      return res.json({ 
        message: 'Admin account already exists',
        credentials: {
          email: adminEmail,
          note: 'Admin account is already present'
        }
      });
    }

    // Validate admin password strength
    const passwordValidation = validatePassword(adminPass);
    if (!passwordValidation.valid) {
      return res.status(400).json({ 
        message: 'Admin password does not meet security requirements',
        requirement: 'Minimum 6 characters with at least one number'
      });
    }

    const admin = await User.create({ 
      name: 'Admin', 
      email: adminEmail.toLowerCase(), 
      password: adminPass, // Let pre-save middleware handle hashing
      isAdmin: true 
    });

    console.log('Admin account created:', adminEmail);

    res.json({ 
      message: 'Admin account created successfully',
      credentials: {
        email: adminEmail,
        note: 'Please share credentials securely from environment variables only'
      }
    });
  } catch (err) {
    console.error('Seed admin error:', err);
    res.status(500).json({ message: err.message });
  }
});

export default router;
