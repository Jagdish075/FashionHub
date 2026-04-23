import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import compression from "compression";
import mongoSanitize from "express-mongo-sanitize";
import xss from "xss-clean";
import connectDB from "./config/db.js";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { protect, requireAdmin } from "./middleware/auth.js";
import { uploadRateLimiter } from "./middleware/rateLimiter.js";

// Routes
import authRoutes from "./routes/auth.js";
import adminRoutes from "./routes/admin.js";
import productsRoutes from "./routes/products.js";
import ordersRoutes from "./routes/orders.js";
import cartRoutes from "./routes/cart.js";
import paymentsRoutes from "./routes/payments.js";
import addressRoutes from "./routes/address.js";
import offersRoutes from "./routes/offers.js";
import settingsRoutes from "./routes/settings.js";
import refundsRoutes from "./routes/refunds.js";
import reviewsRoutes from "./routes/reviews.js";
import wishlistRoutes from "./routes/wishlist.js";
import analyticsRoutes from "./routes/analytics.js";
import reportsRoutes from "./routes/reports.js";

dotenv.config();
const app = express();

const requiredEnv = ["JWT_SECRET", "JWT_REFRESH_SECRET"];
for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`${key} is required in backend/.env`);
  }
}

/* ===============================
   BASIC MIDDLEWARES
================================ */

// ✅ CORS (FIXED – allows multiple frontend ports)
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174", 
  "http://localhost:5175",
  "http://localhost:5176",
  "http://localhost:5177",
  "http://localhost:5178",
  "http://localhost:5179",
  "http://localhost:5180",
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      // For development, allow any localhost port
      if (origin.startsWith("http://localhost:")) {
        return callback(null, true);
      }
      // For development, allow any 127.0.0.1 port (Vite might use this)
      if (origin.startsWith("http://127.0.0.1:")) {
        return callback(null, true);
      }
      // For development, allow file:// origins (when opening HTML directly)
      if (origin.startsWith("file://")) {
        return callback(null, true);
      }
      console.warn(`CORS blocked origin: ${origin}`);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Session-ID"],
  })
);

// ✅ Parse JSON body
app.use(express.json());
app.use(
  helmet({
    // Allow frontend on a different origin/port to embed uploaded images.
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(compression());
app.use(mongoSanitize());
app.use(xss());

/* ===============================
   FILE UPLOAD CONFIG
================================ */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve uploaded files statically
app.use(
  "/uploads",
  (req, res, next) => {
    // Keep this explicit for static uploads even if global helmet config changes later.
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    next();
  },
  express.static(uploadsDir)
);

// Multer configuration for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error("Only image files are allowed!"));
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

/* ===============================
   ROUTES
================================ */
app.use("/api/users", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/products", productsRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/api/address", addressRoutes);
app.use("/api/offers", offersRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/refunds", refundsRoutes);
app.use("/api/reviews", reviewsRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/admin/analytics", analyticsRoutes);
app.use("/api/admin/reports", reportsRoutes);
// Compatibility aliases for deployments with different API base prefixes.
app.use("/reviews", reviewsRoutes);
app.use("/api/api/reviews", reviewsRoutes);
app.use("/wishlist", wishlistRoutes);
app.use("/api/api/wishlist", wishlistRoutes);

// File upload endpoint
app.post("/api/upload", protect, requireAdmin, uploadRateLimiter, upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }
  const imageUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
  res.json({ url: imageUrl });
});

/* ===============================
   DEFAULT ROUTE
================================ */
app.get("/", (req, res) => {
  res.send("🚀 MERN Ecommerce API is running...");
});

/* ===============================
   ERROR HANDLING
================================ */
// Global error handler - catch all unhandled errors
app.use((err, req, res, next) => {
  // Handle CORS errors specifically
  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({
      message: "Not allowed by CORS",
    });
  }
  
  console.error("Error:", err);
  res.status(err.status || 500).json({
    message: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

/* ===============================
   SERVER
================================ */
const PORT = process.env.PORT || 5001;

const startServer = async () => {
  try {
    console.log("Starting server...");
    await connectDB();
    console.log("DB connected");

    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`🌐 CORS enabled for all localhost development ports`);
    });
  } catch (error) {
    console.error("Failed to start backend server:", error.message);
    process.exit(1);
  }
};

startServer();
