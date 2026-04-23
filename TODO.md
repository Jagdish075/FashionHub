# Checkout Page Fixes - TODO List

## 1. Fix Network Error
- [x] Change API URL from localhost:5005 to localhost:5001 in frontend/src/utils/api.js

## 2. Backend - Create Address Model
- [ ] Create backend/models/Address.js with fields: name, phone, street, city, state, zipCode, country, user (reference)

## 3. Backend - Create Address Routes
- [ ] Create backend/routes/address.js with:
  - GET /api/address/me - returns saved address
  - POST /api/address - saves or updates address
- [ ] Update backend/server.js to use address routes

## 4. Fix Payment Flow
- [ ] Fix return_url in backend/services/cashfreeService.js to properly replace order_id

## 5. Frontend - Update Checkout.jsx
- [ ] Remove delivery location radio buttons (existing, home, office, custom)
- [ ] Show single address form
- [ ] Fetch saved address on load and show "Use saved address" card
- [ ] Allow editing saved address
- [ ] Fix validation to show errors only after submit

## 6. Test and Verify
- [ ] Test address save/load flow
- [ ] Test payment flow
- [ ] Verify all fixes work correctly
