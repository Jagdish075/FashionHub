# E-Commerce Production Implementation Plan

## Phase 1: Authentication & Session Fix (CRITICAL)

### 1.1 Backend Changes
**File: `backend/middleware/auth.js`**
- [ ] Change JWT_EXPIRY from '24h' to '30m' (30 minutes)
- [ ] Update token generation to include short expiry
- [ ] Add proper session management

**File: `backend/routes/auth.js`**
- [ ] Ensure logout properly blacklists tokens
- [ ] Add token expiry in response

### 1.2 Frontend Changes
**File: `frontend/src/context/AuthContext.jsx`**
- [ ] Replace `localStorage` with `sessionStorage`
- [ ] Remove persistence of auth state
- [ ] Auto-logout on browser close/tab close
- [ ] Implement 30-minute timeout
- [ ] Add session warning popup at 2 minutes before expiry

**File: `frontend/src/utils/api.js`**
- [ ] Switch from `localStorage` to `sessionStorage`

---

## Phase 2: Login Modal & Guest Actions

### 2.1 Enhanced Login Modal
**File: `frontend/src/components/LoginModal.jsx`**
- [ ] Add `pendingAction` state to store action to resume after login
- [ ] On successful login, check for pending action and redirect
- [ ] Store pending action in sessionStorage

### 2.2 Protected Actions
**File: `frontend/src/components/NavBar.jsx`**
- [ ] Modify cart icon click for guests: show login modal
- [ ] Add `handleProtectedAction` function
- [ ] Update checkout button to use login modal for guests

**File: `frontend/src/components/SlideInCart.jsx`**
- [ ] Add login modal trigger for checkout when guest

**File: `frontend/src/pages/ProductDetails.jsx`**
- [ ] Replace login redirect with login modal trigger
- [ ] Store intended action (add to cart / buy now) before showing modal

---

## Phase 3: Cart UX Improvements

### 3.1 Add to Cart Notifications
**File: `frontend/src/pages/ProductDetails.jsx`**
- [ ] Add `toast.success` on successful add to cart (already in try but also needs in success case)
- [ ] Add to cart animation

**File: `frontend/src/pages/Products.jsx`**
- [ ] Add quick add to cart button on product cards
- [ ] Add toast notification on quick add

### 3.2 Cart Badge Updates
**File: `frontend/src/components/NavBar.jsx`**
- [ ] Listen for cart update events
- [ ] Update badge in real-time

**File: `frontend/src/context/AuthContext.jsx`**
- [ ] Add cart state management
- [ ] Emit cart update events

---

## Phase 4: Checkout Flow Enhancements

### 4.1 Multi-step Checkout
**File: `frontend/src/pages/Checkout.jsx`**
- [ ] Implement step indicator (Cart → Address → Payment)
- [ ] Add step navigation (back/next buttons)
- [ ] Validate each step before proceeding

### 4.2 Address Validation
**File: `frontend/src/pages/Checkout.jsx`**
- [ ] Add required field validation
- [ ] Phone number format validation (10 digits)
- [ ] PIN code validation (6 digits)
- [ ] Show inline error messages

### 4.3 Cart Validation Before Checkout
**File: `backend/routes/cart.js`**
- [ ] Ensure cart validation endpoint is called
- [ ] Handle out-of-stock items

---

## Phase 5: Cashfree Payment Integration

### 5.1 Environment Setup
**File: `backend/.env.example`** (create new file)
- [ ] Add CASHFREE_APP_ID
- [ ] Add CASHFREE_CLIENT_SECRET
- [ ] Add CASHFREE_ENVIRONMENT=sandbox

**File: `frontend/.env.example`** (create new file)
- [ ] Add VITE_CASHFREE_APP_ID

### 5.2 Backend Payment Routes
**File: `backend/routes/payments.js`**
- [ ] Add duplicate payment prevention
- [ ] Add order creation with items
- [ ] Handle COD orders properly

### 5.3 Frontend Payment Flow
**File: `frontend/src/pages/Checkout.jsx`**
- [ ] Implement Cashfree SDK integration
- [ ] Add payment loading states
- [ ] Handle payment redirect properly

---

## Phase 6: Orders & Tracking

### 6.1 Order Status Flow
**File: `backend/models/Order.js`**
- [ ] Add status enum: pending → paid → processing → shipped → delivered
- [ ] Add tracking history entries for each status change

### 6.2 Admin Order Management
**File: `frontend/src/admin pages/Order.jsx`**
- [ ] Add order status update dropdown
- [ ] Add timeline view for each order
- [ ] Add payment status indicator

### 6.3 User Order Tracking
**File: `frontend/src/pages/TrackOrder.jsx`**
- [ ] Implement visual timeline UI
- [ ] Show order progress
- [ ] Add estimated delivery date

**File: `frontend/src/pages/MyOrders.jsx`**
- [ ] Add order cards with status
- [ ] Add "Track Order" button
- [ ] Add "View Details" button

**File: `frontend/src/pages/OrderDetails.jsx`**
- [ ] Add tracking timeline
- [ ] Show payment details
- [ ] Add order status badge

---

## Phase 7: Offers & Discounts

### 7.1 Backend Support
**File: `backend/models/Order.js`**
- [ ] Add discount field
- [ ] Add couponCode field

**File: `backend/routes/orders.js`**
- [ ] Add coupon validation endpoint
- [ ] Calculate discounts
- [ ] Prevent expired coupons

### 7.2 Frontend Discount UI
**File: `frontend/src/pages/Cart.jsx`**
- [ ] Add coupon code input field
- [ ] Show discount amount
- [ ] Show "You saved ₹X" message

**File: `frontend/src/pages/Checkout.jsx`**
- [ ] Display applied discount
- [ ] Show original vs discounted total

---

## Phase 8: Complete Validations

### 8.1 Backend Validation
**File: `backend/middleware/validation.js`**
- [ ] Add email format regex
- [ ] Add phone validation (10 digits)
- [ ] Add price validation (positive numbers)
- [ ] Add quantity validation (1-99)
- [ ] Add string sanitization

### 8.2 Frontend Validation
**File: `frontend/src/pages/Register.jsx`**
- [ ] Add all field validations
- [ ] Show inline errors
- [ ] Prevent duplicate submissions

**File: `frontend/src/pages/Login.jsx`**
- [ ] Add email format validation
- [ ] Show error messages

**File: `frontend/src/pages/Checkout.jsx`**
- [ ] Validate all address fields
- [ ] Validate phone format
- [ ] Disable submit until valid

---

## Phase 9: UI/UX Improvements

### 9.1 Loading States
- [ ] Add skeleton loaders on product pages
- [ ] Add loading spinners on buttons
- [ ] Add shimmer effects on cards

### 9.2 Empty States
- [ ] Design empty cart page
- [ ] Design empty orders page
- [ ] Design 404 page

### 9.3 Responsive Design
- [ ] Fix mobile menu interactions
- [ ] Optimize product grid for mobile
- [ ] Fix checkout form on mobile

---

## Phase 10: Admin Route Protection

### 10.1 Frontend Protection
**File: `frontend/src/App.jsx`**
- [ ] Add AdminRoute wrapper component
- [ ] Check admin status before rendering admin pages
- [ ] Redirect unauthorized users

### 10.2 Backend Protection
**File: `backend/routes/admin.js`**
- [ ] Add requireAdmin middleware to all routes
- [ ] Add additional verification checks

---

## Implementation Order

### Priority 1 (Must Fix - Session & Auth)
1. Switch AuthContext to sessionStorage
2. Change JWT expiry to 30 minutes
3. Fix API utility to use sessionStorage
4. Test logout on browser close

### Priority 2 (Core Functionality)
1. Login modal resume action
2. Cart add notifications
3. Checkout validation
4. Payment integration

### Priority 3 (Enhancements)
1. Order tracking UI
2. Admin order management
3. Discount system
4. UI/UX improvements

---

## Files to Modify

### Backend Files
- [ ] `backend/middleware/auth.js` - JWT expiry
- [ ] `backend/routes/auth.js` - Token handling
- [ ] `backend/routes/payments.js` - COD support
- [ ] `backend/models/Order.js` - Status tracking

### Frontend Files
- [ ] `frontend/src/context/AuthContext.jsx` - Session storage
- [ ] `frontend/src/utils/api.js` - sessionStorage
- [ ] `frontend/src/components/LoginModal.jsx` - Resume action
- [ ] `frontend/src/components/NavBar.jsx` - Protected actions
- [ ] `frontend/src/components/SlideInCart.jsx` - Guest checkout
- [ ] `frontend/src/pages/ProductDetails.jsx` - Toast notifications
- [ ] `frontend/src/pages/Checkout.jsx` - Multi-step, validation
- [ ] `frontend/src/pages/TrackOrder.jsx` - Timeline UI
- [ ] `frontend/src/pages/MyOrders.jsx` - Order cards
- [ ] `frontend/src/pages/OrderDetails.jsx` - Full details
- [ ] `frontend/src/admin pages/Order.jsx` - Status updates

### New Files to Create
- [ ] `backend/.env.example`
- [ ] `frontend/.env.example`

---

## Testing Checklist

- [ ] User stays logged in during session
- [ ] User logged out on browser close
- [ ] User logged out after 30 minutes inactivity
- [ ] Login modal appears for guests on restricted actions
- [ ] Action resumes after login
- [ ] Add to cart shows toast notification
- [ ] Cart badge updates in real-time
- [ ] Checkout validates all fields
- [ ] Payment processes correctly
- [ ] Order tracking shows status timeline
- [ ] Admin can update order status

