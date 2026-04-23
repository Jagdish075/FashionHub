
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import User from "./models/User.js";

dotenv.config();

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/megaproject");
    console.log("Connected to MongoDB");

    const adminEmail = process.env.ADMIN_EMAIL || "admin@fashionhub.com";
    const adminPass = process.env.ADMIN_PASS || "admin123";

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (existingAdmin) {
      console.log("Admin user already exists!");
      console.log("Admin details:", {
        id: existingAdmin._id,
        email: existingAdmin.email,
        isAdmin: existingAdmin.isAdmin,
      });
      process.exit(0);
    }

    // Create admin user (pass plain password so pre-save middleware hashes it once)
    const admin = await User.create({
      name: "Admin",
      email: adminEmail,
      password: adminPass,
      isAdmin: true,
    });

    console.log("Admin user created successfully!");
    console.log("Admin details:", {
      id: admin._id,
      email: admin.email,
      isAdmin: admin.isAdmin,
    });

    process.exit(0);
  } catch (error) {
    console.error("Error seeding admin:", error.message);
    process.exit(1);
  }
};

seedAdmin();

