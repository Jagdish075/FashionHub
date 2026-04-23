# Bug Fixes Implementation Plan

## Critical Authentication Bugs Fixed

### ✅ 1. AuthContext.jsx - Fix guestSessionId
- **Issue**: guestSessionId generates new value on every render
- **Fix**: Store in sessionStorage and use useState with initializer function for stability

### ✅ 2. LoginModal.jsx - Use AuthContext login function  
- **Issue**: Has its own login logic instead of using AuthContext's login()
- **Fix**: Use AuthContext's login() function and pending action system

### ✅ 3. Home.jsx - Use AuthContext + LoginModal
- **Issue**: Uses localStorage.getItem("token") instead of AuthContext
- **Fix**: Use useAuth() hook + store pending action for add to cart

### ✅ 4. ProductDetails.jsx - Use AuthContext + LoginModal
- **Issue**: Uses localStorage.getItem("token") instead of AuthContext
- **Fix**: Use useAuth() hook + store pending action for add to cart and buy now

### ✅ 5. Products.jsx - Use AuthContext + LoginModal
- **Issue**: Uses localStorage.getItem("token") instead of AuthContext
- **Fix**: Use useAuth() hook + store pending action for add to cart

### ✅ 6. NavBar.jsx - Already integrated with LoginModal
- **Issue**: Cart actions properly trigger LoginModal via AuthContext
- **Fix**: Already properly integrated - no changes needed

### ✅ 7. Backend auth.js - Align JWT expiry
- **Issue**: Different JWT_EXPIRY values in middleware vs routes (30m vs 24h)
- **Fix**: Use consistent 30m expiry across all auth files
- **Added**: Export JWT_SECRET from middleware for consistent usage

## Files Modified
1. ✅ frontend/src/context/AuthContext.jsx
2. ✅ frontend/src/components/LoginModal.jsx
3. ✅ frontend/src/pages/Home.jsx
4. ✅ frontend/src/pages/ProductDetails.jsx
5. ✅ frontend/src/pages/Products.jsx
6. ✅ backend/routes/auth.js
7. ✅ backend/middleware/auth.js

## Implementation Order (Completed)
1. ✅ AuthContext.jsx - Fix guestSessionId
2. ✅ LoginModal.jsx - Use AuthContext
3. ✅ Home.jsx - Fix auth + LoginModal
4. ✅ ProductDetails.jsx - Fix auth + LoginModal
5. ✅ Products.jsx - Fix auth + LoginModal
6. ✅ Backend auth.js - Align JWT settings

## Testing Checklist
- [ ] Guest users can browse products
- [ ] Add to cart shows toast info for guests
- [ ] LoginModal appears when needed
- [ ] LoginModal redirects after successful login
- [ ] Auth session persists correctly
- [ ] Logout clears session properly
- [ ] Admin routes protected correctly
- [ ] JWT tokens expire after 30 minutes

