
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import User from "./models/User.js";

dotenv.config();

const resetAdminPassword = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/megaproject");
    console.log("Connected to MongoDB");

      const adminEmail = process.env.ADMIN_EMAIL || "admin@fashionhub.com";
      const adminPass = process.env.ADMIN_PASS || "admin123";

    const admin = await User.findOne({ email: adminEmail });
    if (!admin) {
      console.log("Admin user not found!");
      process.exit(1);
    }

    // Reset password: set plain password so pre-save middleware hashes it once
    admin.password = adminPass;
    await admin.save();

    console.log("Admin password reset successfully!");
    console.log("Admin details:", {
      id: admin._id,
      email: admin.email,
      isAdmin: admin.isAdmin,
    });
    console.log("\nYou can now login with:");
      console.log("Email:", adminEmail);
      console.log("Password:", adminPass);

    process.exit(0);
  } catch (error) {
    console.error("Error resetting admin password:", error.message);
    process.exit(1);
  }
};

resetAdminPassword();

