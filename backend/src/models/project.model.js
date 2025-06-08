import mongoose from 'mongoose';

const EmployeeSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    role: { type: String, required: true, trim: true },
    wagePerDay: { type: Number, required: true, min: 0 },
    startDate: { type: Date, required: true },
    dueDate: { type: Date }, // This maps to endDate on the frontend for employees
    assignedAt: { type: Date, default: Date.now }
});

const ActivitySchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    startDate: { type: Date, required: true },
    dueDate: { type: Date, required: true }, // This maps to endDate on the frontend for activities
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
    clientName: { type: String, required: true, trim: true }, // This will be the project's name
    location: { type: String, trim: true }, // <-- ADDED THIS LINE: The project's physical location
    description: { type: String, trim: true },
    startDate: { type: Date, required: true },
    targetDeadline: { type: Date, required: true }, // Changed from 'endDate' to 'targetDeadline' to match your form
    status: { type: String, enum: ['pending', 'in-progress', 'completed', 'cancelled'], default: 'pending' },
    budget: { type: Number, default: 0 },
    expenses: { type: Number, default: 0 },
    imageUrl: { type: String }, // For the cover photo
    progress: { type: Number, default: 0 },
    employees: [EmployeeSchema],
    activities: [ActivitySchema],
    documents: [DocumentSchema]
}, { timestamps: true });

// Pre-save hook to calculate progress based on activities
ProjectSchema.pre('save', function(next) {
    // Only calculate if activities array exists and has items
    if (this.activities && this.activities.length > 0) {
        const completedCount = this.activities.filter(activity => activity.status === 'completed').length;
        this.progress = Math.round((completedCount / this.activities.length) * 100);
    } else {
        this.progress = 0; // If no activities, progress is 0
    }
    next();
});

export default mongoose.model('Project', ProjectSchema);