// backend/src/models/project.model.js
import mongoose from 'mongoose';

const EmployeeSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    role: { type: String, required: true, trim: true },
    wagePerDay: { type: Number, required: true, min: 0 },
    startDate: { type: Date, required: true },
    dueDate: { type: Date },
    assignedAt: { type: Date, default: Date.now }
});

const ActivitySchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    startDate: { type: Date, required: true },
    dueDate: { type: Date, required: true },
    status: { type: String, enum: ['pending', 'completed'], default: 'pending' },
    completedAt: { type: Date },
    createdAt: { type: Date, default: Date.now }
});

const DocumentSchema = new mongoose.Schema({
    name: { type: String, required: true },
    url: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now }
});

const ProjectSchema = new mongoose.Schema({
    // Removed 'name' as a required field here if 'clientName' is the primary identifier for the project's title.
    // If 'name' is truly a separate required field (e.g., internal project code),
    // you'll need to add it to your frontend form.
    // For now, assuming 'clientName' serves the purpose of the project's main identifier/name.
    // name: { type: String, required: true, trim: true }, // <--- This line is likely the problem causing 'name' required error

    clientName: { type: String, required: true, trim: true }, // This will be the project's name
    description: { type: String, trim: true },
    startDate: { type: Date, required: true },
    targetDeadline: { type: Date, required: true }, // Changed from 'endDate' to 'targetDeadline' to match your form
    status: { type: String, enum: ['pending', 'in-progress', 'completed', 'cancelled'], default: 'pending' },
    budget: { type: Number, default: 0 },
    expenses: { type: Number, default: 0 },
    imageUrl: { type: String },
    progress: { type: Number, default: 0 },
    employees: [EmployeeSchema],
    activities: [ActivitySchema],
    documents: [DocumentSchema]
}, { timestamps: true });

// Pre-save hook to calculate progress
ProjectSchema.pre('save', function(next) {
    if (this.activities && this.activities.length > 0) {
        const completedCount = this.activities.filter(activity => activity.status === 'completed').length;
        this.progress = Math.round((completedCount / this.activities.length) * 100);
    } else {
        this.progress = 0;
    }
    next();
});

export default mongoose.model('Project', ProjectSchema);