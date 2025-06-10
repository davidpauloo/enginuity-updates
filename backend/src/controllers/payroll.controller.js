import PayrollRecord from '../models/payrollRecord.model.js';
import asyncHandler from '../middleware/asyncHandler.js';
import mongoose from 'mongoose';

// @desc    Create a new payroll record
// @route   POST /api/payrolls
// @access  Private
const createPayrollRecord = asyncHandler(async (req, res) => {
    // The entire calculated payload from the frontend comes in the body
    const payrollData = req.body;

    if (!payrollData.projectId || !payrollData.employeeId) {
        res.status(400);
        throw new Error('Project ID and Employee ID are required to save a payroll record.');
    }

    const record = new PayrollRecord(payrollData);
    const savedRecord = await record.save();

    res.status(201).json(savedRecord);
});

// @desc    Get all payroll records for a specific project
// @route   GET /api/projects/:projectId/payroll-history
// @access  Private
// NOTE: We will place the ROUTE for this in project.routes.js for logical grouping.
const getPayrollHistoryForProject = asyncHandler(async (req, res) => {
    const { projectId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
        res.status(400);
        throw new Error('Invalid Project ID format');
    }

    const history = await PayrollRecord.find({ projectId: projectId })
        .sort({ processedDate: -1 }); // Show newest first

    res.status(200).json(history);
});

export {
    createPayrollRecord,
    getPayrollHistoryForProject
};