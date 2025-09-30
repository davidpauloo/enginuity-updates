// models/superAdmin.model.js
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const superAdminSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minLength: 8, // align with user model and controllers
      select: true,
    },
    profilePic: { type: String, default: "" },
    permissions: {
      type: [String],
      default: ["all"],
    },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date },
    loginAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date },

    // Optional but recommended to align with auth.middleware invalidation
    passwordChangedAt: { type: Date },
  },
  { timestamps: true }
);

// Hash password on save if modified
superAdminSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  // For session invalidation checks
  this.passwordChangedAt = new Date(Date.now() - 1000);
  next();
});

// Optional helper to mirror User model API
superAdminSchema.methods.changedPasswordAfter = function (JWTTimestampSec) {
  if (!this.passwordChangedAt) return false;
  const pwdChangedAtSec = Math.floor(this.passwordChangedAt.getTime() / 1000);
  return pwdChangedAtSec > JWTTimestampSec;
};

const SuperAdmin = mongoose.model("SuperAdmin", superAdminSchema);
export default SuperAdmin;
