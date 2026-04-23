import mongoose from "mongoose";
import dotenv from "dotenv";
import Order from "./models/Order.js";
import User from "./models/User.js";
import Product from "./models/Product.js";
import crypto from "crypto";

dotenv.config();

const seedOrders = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/fationhub");
    console.log("Connected to MongoDB");

    // Check if orders already exist
    const existingOrders = await Order.countDocuments();
    if (existingOrders > 0) {
      console.log(`${existingOrders} orders already exist! Skipping seeding.`);
      process.exit(0);
    }

    // Get some users and products
    const users = await User.find().limit(3);
    const products = await Product.find().limit(5);

    if (users.length === 0 || products.length === 0) {
      console.log("No users or products found. Please seed users and products first.");
      process.exit(1);
    }

    // Create sample orders
    const sampleOrders = [
      {
        user: users[0]._id,
        items: [
          {
            product: products[0]._id,
            name: products[0].title,
            qty: 2,
            price: products[0].price,
            image: products[0].image
          },
          {
            product: products[1]._id,
            name: products[1].title,
            qty: 1,
            price: products[1].price,
            image: products[1].image
          }
        ],
        total: (products[0].price * 2) + products[1].price,
        status: 'pending',
        trackingId: crypto.randomBytes(6).toString('hex'),
        trackingHistory: [{
          status: 'pending',
          message: 'Order has been placed',
          timestamp: new Date()
        }],
        shippingAddress: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'USA'
        },
        paymentMethod: 'cod',
        paymentStatus: 'pending'
      },
      {
        user: users[1]?._id || users[0]._id,
        items: [
          {
            product: products[2]._id,
            name: products[2].title,
            qty: 1,
            price: products[2].price,
            image: products[2].image
          }
        ],
        total: products[2].price,
        status: 'processing',
        trackingId: crypto.randomBytes(6).toString('hex'),
        trackingHistory: [
          {
            status: 'pending',
            message: 'Order has been placed',
            timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
          },
          {
            status: 'processing',
            message: 'Order is being processed',
            timestamp: new Date()
          }
        ],
        shippingCarrier: 'FedEx',
        shippingTrackingNumber: 'FDX123456789',
        estimatedDeliveryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        shippingAddress: {
          street: '456 Oak Ave',
          city: 'Los Angeles',
          state: 'CA',
          zipCode: '90210',
          country: 'USA'
        },
        paymentMethod: 'cod',
        paymentStatus: 'pending'
      },
      {
        user: users[2]?._id || users[0]._id,
        items: [
          {
            product: products[3]._id,
            name: products[3].title,
            qty: 3,
            price: products[3].price,
            image: products[3].image
          },
          {
            product: products[4]._id,
            name: products[4].title,
            qty: 1,
            price: products[4].price,
            image: products[4].image
          }
        ],
        total: (products[3].price * 3) + products[4].price,
        status: 'shipped',
        trackingId: crypto.randomBytes(6).toString('hex'),
        trackingHistory: [
          {
            status: 'pending',
            message: 'Order has been placed',
            timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
          },
          {
            status: 'processing',
            message: 'Order is being processed',
            timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
          },
          {
            status: 'shipped',
            message: 'Order has been shipped',
            timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
          }
        ],
        shippingCarrier: 'UPS',
        shippingTrackingNumber: 'UPS987654321',
        estimatedDeliveryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        shippingAddress: {
          street: '789 Pine St',
          city: 'Chicago',
          state: 'IL',
          zipCode: '60601',
          country: 'USA'
        },
        paymentMethod: 'cod',
        paymentStatus: 'paid'
      }
    ];

    const createdOrders = await Order.insertMany(sampleOrders);
    console.log(`${createdOrders.length} sample orders created successfully!`);

    // Log the tracking IDs for reference
    createdOrders.forEach((order, index) => {
      console.log(`Order ${index + 1} - Tracking ID: ${order.trackingId}`);
    });

    process.exit(0);
  } catch (error) {
    console.error("Error seeding orders:", error.message);
    process.exit(1);
  }
};

seedOrders();
