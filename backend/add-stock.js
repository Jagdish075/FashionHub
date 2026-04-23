import mongoose from "mongoose";
import dotenv from "dotenv";
import Product from "./models/Product.js";

dotenv.config();

const addStockToProducts = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/fashionhub");
    console.log("Connected to MongoDB");

    const result = await Product.updateMany(
      { stock: { $exists: false } },
      { $set: { stock: 10 } }
    );

    console.log(`Updated ${result.modifiedCount} products with stock`);
    process.exit(0);
  } catch (error) {
    console.error("Error adding stock:", error.message);
    process.exit(1);
  }
};

addStockToProducts();