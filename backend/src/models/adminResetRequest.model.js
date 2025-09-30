// models/adminResetRequest.model.js
import mongoose from "mongoose";

const { Schema } = mongoose;

const adminResetRequestSchema = new Schema(
  {
    managerUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "denied"],
      default: "pending",
      index: true,
    },
    requestedAt: { type: Date, default: Date.now },
    processedAt: { type: Date },
    processedBy: { type: Schema.Types.ObjectId, ref: "User" },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

// IMPORTANT: default export
const AdminResetRequest = mongoose.model("AdminResetRequest", adminResetRequestSchema);
export default AdminResetRequest;
