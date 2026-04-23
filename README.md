# FationHub Ecommerce (MERN)

Full-stack ecommerce project built with React (Vite) + Node/Express + MongoDB.

## Features
- User auth with JWT, session timeout, OTP-based registration flow
- Product listing, search/filter, cart, checkout
- Cashfree payment integration (sandbox/test)
- COD orders, order tracking, returns/refund requests
- Admin panel for products, orders, users, offers, refunds, settings

## Tech Stack
- Frontend: React, React Router, Axios, Tailwind CSS, React Toastify
- Backend: Express, Mongoose, JWT, Bcrypt, Multer
- Database: MongoDB

## Project Structure
- `frontend/` React client
- `backend/` Express API

## Environment Setup

### Backend (`backend/.env`)
Required:
- `PORT=5001`
- `MONGO_URI=mongodb://localhost:27017/fationhub_ecommerce`
- `JWT_SECRET=...`
- `JWT_REFRESH_SECRET=...`
- `CASHFREE_APP_ID=...`
- `CASHFREE_CLIENT_SECRET=...`
- `CASHFREE_ENVIRONMENT=sandbox`
- `SMTP_HOST=...`
- `SMTP_PORT=587`
- `SMTP_SECURE=false`
- `SMTP_USER=...`
- `SMTP_PASS=...`
- `SMTP_FROM="FationHub <no-reply@yourdomain.com>"`

You can start from `backend/.env.example`.

### Frontend (`frontend/.env`)
- `VITE_API_URL=http://localhost:5001`

## Run Locally

1. Backend
```bash
cd backend
npm install
npm run dev
```

2. Frontend
```bash
cd frontend
npm install
npm run dev
```

## Presentation Demo Flow
1. Register/Login user
2. Browse products and add to cart
3. Checkout (Cashfree sandbox or COD)
4. View tracking and order details
5. Submit refund request
6. Login as admin and manage products/orders/refunds/offers

## Notes
- Upload API is admin-protected.
- `seed-admin` route is disabled for production and restricted to admin users.
- Do not use test secrets in production.
# FashionHub
