import mongoose from "mongoose";

const pendingRegistrationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
      unique: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    // Stores bcrypt hash, not raw password
    passwordHash: {
      type: String,
      required: true,
    },
    // Backward compatibility for old pending records
    password: {
      type: String,
      required: false,
      select: false,
    },
    otpHash: {
      type: String,
      required: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

pendingRegistrationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const PendingRegistration = mongoose.model("PendingRegistration", pendingRegistrationSchema);
export default PendingRegistration;
