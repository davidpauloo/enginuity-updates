// models/employee.model.js
import mongoose from 'mongoose';

const employeeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Employee name is required."], // REQUIRED
    trim: true,
  },
  role: {
    type: String,
    required: [true, "Employee role is required."], // REQUIRED
    trim: true,
  },
  dailyRate: {
    type: Number,
    required: [true, "Daily rate is required."],    // REQUIRED
    min: [0, "Daily rate cannot be negative."],
  },
}, {
  timestamps: true,
});

const Employee = mongoose.model('Employee', employeeSchema);
export default Employee;