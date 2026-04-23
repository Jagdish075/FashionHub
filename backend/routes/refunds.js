import express from "express";
import { protect } from "../middleware/auth.js";
import Order from "../models/Order.js";
import RefundRequest from "../models/RefundRequest.js";

const router = express.Router();

// GET /api/refunds/my - list current user's refund requests
router.get("/my", protect, async (req, res) => {
  try {
    const refunds = await RefundRequest.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .populate("order", "trackingId total status paymentStatus");

    res.json(refunds);
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to fetch refund requests" });
  }
});

// POST /api/refunds/request - create a refund request for an order
router.post("/request", protect, async (req, res) => {
  try {
    const { orderId, reason } = req.body;

    if (!orderId) {
      return res.status(400).json({ message: "Order ID is required" });
    }
    if (!reason || !String(reason).trim()) {
      return res.status(400).json({ message: "Refund reason is required" });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (String(order.user) !== String(req.user.id)) {
      return res.status(403).json({ message: "You can request refund only for your own order" });
    }

    if (order.status !== "delivered") {
      return res.status(400).json({ message: "Refund can be requested only for delivered orders" });
    }

    if (order.paymentStatus !== "paid") {
      return res.status(400).json({ message: "Refund can be requested only for paid orders" });
    }

    const existingOpenRequest = await RefundRequest.findOne({
      order: order._id,
      status: { $in: ["pending", "approved"] },
    });
    if (existingOpenRequest) {
      return res.status(400).json({ message: "Refund request already exists for this order" });
    }

    const refund = await RefundRequest.create({
      user: req.user.id,
      order: order._id,
      trackingId: order.trackingId || String(order._id),
      amount: Number(order.total || 0),
      reason: String(reason).trim(),
      status: "pending",
    });

    res.status(201).json({
      message: "Refund request submitted successfully",
      refund,
    });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to submit refund request" });
  }
});

export default router;
