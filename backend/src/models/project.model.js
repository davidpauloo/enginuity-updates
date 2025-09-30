import mongoose from "mongoose";

// Employees embedded in the project
const EmployeeSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  role: { type: String, required: true, trim: true },
  wagePerDay: { type: Number, required: true, min: 0 },
  startDate: { type: Date, required: true },
  dueDate: { type: Date }, // maps to endDate on the frontend for employees
  assignedAt: { type: Date, default: Date.now },
});

// Activities embedded in the project
const ActivitySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    startDate: { type: Date, required: true },
    dueDate: { type: Date, required: true }, // maps to endDate on the frontend for activities
    status: { type: String, enum: ["pending", "completed"], default: "pending" },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

// Documents embedded in the project
const DocumentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  url: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now },
});

const ProjectSchema = new mongoose.Schema(
  {
    // Relational fields used by controllers and population
    client: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // optional to support legacy
    projectManager: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // primary PM
    projectExtras: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // additional PMs

    // Legacy/free-text project display name used by previous frontend
    clientName: { type: String, trim: true }, // optional to avoid validation errors on existing docs

    // Core metadata
    location: { type: String, trim: true },
    description: { type: String, trim: true },

    startDate: { type: Date, required: true },
    targetDeadline: { type: Date, required: true }, // aligns with current form fields

    status: {
      type: String,
      enum: ["pending", "in-progress", "completed", "cancelled"],
      default: "pending",
    },

    budget: { type: Number, default: 0 },
    expenses: { type: Number, default: 0 },

    // Cover photo URL saved from Cloudinary upload
    imageUrl: { type: String, default: "" },

    // Auto-calculated from activities completion ratio
    progress: { type: Number, default: 0 },

    // Embedded collections
    employees: [EmployeeSchema],
    activities: [ActivitySchema],
    documents: [DocumentSchema],
  },
  { timestamps: true }
);

// Auto-calc progress from activities
ProjectSchema.pre("save", function (next) {
  if (Array.isArray(this.activities) && this.activities.length > 0) {
    const completed = this.activities.filter((a) => a.status === "completed").length;
    this.progress = Math.round((completed / this.activities.length) * 100);
  } else {
    this.progress = 0;
  }
  next();
});

export default mongoose.model("Project", ProjectSchema);
