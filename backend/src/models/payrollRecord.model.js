import mongoose from 'mongoose';

// A small schema for individual deduction lines
const DeductionSchema = new mongoose.Schema({
    description: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 }
});

const PayrollRecordSchema = new mongoose.Schema({
    // This creates the essential link to the project
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true,
        index: true // Speeds up queries for a project's history
    },
    employeeId: {
        type: String, // You can use String if employee IDs are from the sub-document
        required: true
    },
    employeeName: {
        type: String,
        required: true
    },
    payPeriod: {
        type: String,
        required: true
    },
    dailyRate: { type: Number, required: true },
    regularDaysWorked: { type: Number, default: 0 },
    overtimeHours: { type: Number, default: 0 },
    grossWage: { type: Number, required: true },
    netPay: { type: Number, required: true },
    deductions: [DeductionSchema],
    totalDeductions: { type: Number, default: 0 },
    notes: { type: String },
    processedDate: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true // Adds createdAt and updatedAt automatically
});

const PayrollRecord = mongoose.model('PayrollRecord', PayrollRecordSchema);

export default PayrollRecord;