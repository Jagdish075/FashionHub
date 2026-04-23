/**
 * Validation Utilities
 * 
 * Provides comprehensive validation functions for:
 * - Email format
 * - Phone numbers (India)
 * - Pin codes
 * - Password strength
 * - Names and addresses
 */

import crypto from 'crypto';

/**
 * Generate a secure random token
 */
export const generateToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {object} - { valid: boolean, message: string }
 */
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !email.trim()) {
    return { valid: false, message: 'Email is required' };
  }
  if (!emailRegex.test(email)) {
    return { valid: false, message: 'Please enter a valid email address' };
  }
  return { valid: true, message: '' };
};

/**
 * Validate Indian phone number (10 digits)
 * @param {string} phone - Phone number to validate
 * @returns {object} - { valid: boolean, message: string }
 */
export const validatePhone = (phone) => {
  if (!phone || !phone.trim()) {
    return { valid: true, message: '' }; // Phone is optional
  }
  const phoneRegex = /^[6-9]\d{9}$/;
  if (!phoneRegex.test(phone)) {
    return { valid: false, message: 'Please enter a valid 10-digit phone number' };
  }
  return { valid: true, message: '' };
};

/**
 * Validate Indian pincode (6 digits)
 * @param {string} pincode - Pincode to validate
 * @returns {object} - { valid: boolean, message: string }
 */
export const validatePincode = (pincode) => {
  if (!pincode || !pincode.trim()) {
    return { valid: false, message: 'PIN code is required' };
  }
  const pincodeRegex = /^[1-9]\d{5}$/;
  if (!pincodeRegex.test(pincode)) {
    return { valid: false, message: 'Please enter a valid 6-digit PIN code' };
  }
  return { valid: true, message: '' };
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {object} - { valid: boolean, message: string }
 */
export const validatePassword = (password) => {
  if (!password || !password.trim()) {
    return { valid: false, message: 'Password is required' };
  }
  if (password.length < 6) {
    return { valid: false, message: 'Password must be at least 6 characters' };
  }
  if (password.length > 128) {
    return { valid: false, message: 'Password must be less than 128 characters' };
  }
  // Check for at least one number
  if (!/\d/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }
  return { valid: true, message: '' };
};

/**
 * Validate name (min 2 chars, no special chars except spaces and hyphens)
 * @param {string} name - Name to validate
 * @param {string} fieldName - Field name for error message
 * @returns {object} - { valid: boolean, message: string }
 */
export const validateName = (name, fieldName = 'Name') => {
  if (!name || !name.trim()) {
    return { valid: false, message: `${fieldName} is required` };
  }
  if (name.trim().length < 2) {
    return { valid: false, message: `${fieldName} must be at least 2 characters` };
  }
  if (name.trim().length > 50) {
    return { valid: false, message: `${fieldName} must be less than 50 characters` };
  }
  // Allow letters, spaces, hyphens, and apostrophes
  const nameRegex = /^[a-zA-Z\s\-']+$/;
  if (!nameRegex.test(name.trim())) {
    return { valid: false, message: `${fieldName} can only contain letters, spaces, hyphens, and apostrophes` };
  }
  return { valid: true, message: '' };
};

/**
 * Validate address
 * @param {string} address - Address to validate
 * @returns {object} - { valid: boolean, message: string }
 */
export const validateAddress = (address) => {
  if (!address || !address.trim()) {
    return { valid: false, message: 'Address is required' };
  }
  if (address.trim().length < 10) {
    return { valid: false, message: 'Address must be at least 10 characters' };
  }
  if (address.trim().length > 200) {
    return { valid: false, message: 'Address must be less than 200 characters' };
  }
  return { valid: true, message: '' };
};

/**
 * Validate city
 * @param {string} city - City to validate
 * @returns {object} - { valid: boolean, message: string }
 */
export const validateCity = (city) => {
  if (!city || !city.trim()) {
    return { valid: false, message: 'City is required' };
  }
  if (city.trim().length < 2) {
    return { valid: false, message: 'Please enter a valid city name' };
  }
  if (city.trim().length > 50) {
    return { valid: false, message: 'City name must be less than 50 characters' };
  }
  return { valid: true, message: '' };
};

/**
 * Validate state
 * @param {string} state - State to validate
 * @returns {object} - { valid: boolean, message: string }
 */
export const validateState = (state) => {
  if (!state || !state.trim()) {
    return { valid: false, message: 'State is required' };
  }
  if (state.trim().length < 2) {
    return { valid: false, message: 'Please enter a valid state name' };
  }
  return { valid: true, message: '' };
};

/**
 * Validate quantity (positive integer)
 * @param {number} quantity - Quantity to validate
 * @param {number} min - Minimum quantity
 * @param {number} max - Maximum quantity
 * @returns {object} - { valid: boolean, message: string }
 */
export const validateQuantity = (quantity, min = 1, max = 99) => {
  if (quantity === undefined || quantity === null) {
    return { valid: false, message: 'Quantity is required' };
  }
  const qty = parseInt(quantity, 10);
  if (isNaN(qty)) {
    return { valid: false, message: 'Quantity must be a number' };
  }
  if (qty < min) {
    return { valid: false, message: `Quantity must be at least ${min}` };
  }
  if (qty > max) {
    return { valid: false, message: `Quantity cannot exceed ${max}` };
  }
  return { valid: true, message: '' };
};

/**
 * Validate price (positive number)
 * @param {number} price - Price to validate
 * @returns {object} - { valid: boolean, message: string }
 */
export const validatePrice = (price) => {
  if (price === undefined || price === null) {
    return { valid: false, message: 'Price is required' };
  }
  const p = parseFloat(price);
  if (isNaN(p)) {
    return { valid: false, message: 'Price must be a number' };
  }
  if (p < 0) {
    return { valid: false, message: 'Price cannot be negative' };
  }
  if (p > 1000000) {
    return { valid: false, message: 'Price seems too high' };
  }
  return { valid: true, message: '' };
};

/**
 * Validate product title
 * @param {string} title - Title to validate
 * @returns {object} - { valid: boolean, message: string }
 */
export const validateProductTitle = (title) => {
  if (!title || !title.trim()) {
    return { valid: false, message: 'Product title is required' };
  }
  if (title.trim().length < 3) {
    return { valid: false, message: 'Product title must be at least 3 characters' };
  }
  if (title.trim().length > 100) {
    return { valid: false, message: 'Product title must be less than 100 characters' };
  }
  return { valid: true, message: '' };
};

/**
 * Validate category
 * @param {string} category - Category to validate
 * @returns {object} - { valid: boolean, message: string }
 */
export const validateCategory = (category) => {
  const validCategories = ['men', 'women', 'kids'];
  if (!category || !category.trim()) {
    return { valid: false, message: 'Category is required' };
  }
  const normalizedCategory = category.toLowerCase().trim();
  if (!validCategories.includes(normalizedCategory)) {
    return { valid: false, message: `Invalid category. Must be one of: ${validCategories.join(', ')}` };
  }
  return { valid: true, message: '' };
};

/**
 * Sanitize string (trim and remove extra spaces)
 * @param {string} str - String to sanitize
 * @returns {string} - Sanitized string
 */
export const sanitizeString = (str) => {
  if (!str || typeof str !== 'string') {
    return '';
  }
  return str.trim().replace(/\s+/g, ' ');
};

/**
 * Validate order total
 * @param {number} total - Total amount
 * @returns {object} - { valid: boolean, message: string }
 */
export const validateOrderTotal = (total) => {
  if (total === undefined || total === null) {
    return { valid: false, message: 'Order total is required' };
  }
  const t = parseFloat(total);
  if (isNaN(t)) {
    return { valid: false, message: 'Invalid order total' };
  }
  if (t <= 0) {
    return { valid: false, message: 'Order total must be greater than zero' };
  }
  if (t > 100000) {
    return { valid: false, message: 'Order total exceeds maximum allowed' };
  }
  return { valid: true, message: '' };
};

/**
 * Validate tracking ID format
 * @param {string} trackingId - Tracking ID to validate
 * @returns {object} - { valid: boolean, message: string }
 */
export const validateTrackingId = (trackingId) => {
  if (!trackingId || !trackingId.trim()) {
    return { valid: false, message: 'Tracking ID is required' };
  }
  // Tracking ID format: alphanumeric, 8-20 characters
  const trackingRegex = /^[a-zA-Z0-9]{8,20}$/;
  if (!trackingRegex.test(trackingId.trim())) {
    return { valid: false, message: 'Invalid tracking ID format' };
  }
  return { valid: true, message: '' };
};

/**
 * Validate coupon/offer code
 * @param {string} code - Coupon code
 * @returns {object} - { valid: boolean, message: string }
 */
export const validateCouponCode = (code) => {
  if (!code || !code.trim()) {
    return { valid: false, message: 'Coupon code is required' };
  }
  if (code.trim().length < 3) {
    return { valid: false, message: 'Coupon code must be at least 3 characters' };
  }
  if (code.trim().length > 20) {
    return { valid: false, message: 'Coupon code must be less than 20 characters' };
  }
  // Only allow uppercase letters, numbers, and hyphens
  const codeRegex = /^[A-Z0-9\-]+$/;
  if (!codeRegex.test(code.trim().toUpperCase())) {
    return { valid: false, message: 'Coupon code can only contain uppercase letters, numbers, and hyphens' };
  }
  return { valid: true, message: '' };
};

export default {
  validateEmail,
  validatePhone,
  validatePincode,
  validatePassword,
  validateName,
  validateAddress,
  validateCity,
  validateState,
  validateQuantity,
  validatePrice,
  validateProductTitle,
  validateCategory,
  validateOrderTotal,
  validateTrackingId,
  validateCouponCode,
  sanitizeString,
  generateToken
};
