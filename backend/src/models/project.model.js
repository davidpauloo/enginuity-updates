import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
  clientName: { type: String, required: true, trim: true },
  location: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  startDate: { type: Date, required: true },
  targetDeadline: { type: Date, required: true }, // This is the overall project deadline
  progress: { type: Number, default: 0, min: 0, max: 100 },

  // Project team members
  employees: [{
    name: { type: String, required: true, trim: true },
    role: { type: String, required: true, trim: true },
    wagePerDay: { type: Number, required: true, min: 0 },
    startDate: { type: Date, required: true },
    endDate: { type: Date }, // Optional
    assignedAt: { type: Date, default: Date.now }
  }],

  // Project activities/tasks
  activities: [{
    name: { type: String, required: true, trim: true }, 
    description: { type: String, trim: true },
    startDate: { type: Date, required: true },
    dueDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed'],
      default: 'pending'
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    completedAt: { type: Date },
    createdAt: { type: Date, default: Date.now }
  }],

  // Important documents regarding the construction project
  documents: [{
    fileName: { type: String, required: true },
    filePath: { type: String, required: true },
    fileType: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now }
  }],

  // Project status
  status: {
    type: String,
    enum: ['planning', 'in-progress', 'on-hold', 'completed', 'cancelled'],
    default: 'planning'
  },

  // Budget information
  budget: {
    estimated: { type: Number },
    spent: { type: Number, default: 0 },
    currency: { type: String, default: 'USD' }
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Remove any indexes that were specifically for 'employees._id' if it was a User ref.
// If you had: projectSchema.index({ 'employees._id': 1 }); // REMOVE THIS
// New index for employee name, if needed for search:
// projectSchema.index({ 'employees.name': 1 });

const Project = mongoose.model('Project', projectSchema);
export default Project;