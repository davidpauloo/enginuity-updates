// routes/payrollRecord.routes.js
import express from 'express';
// Ensure this path is correct and the controller file exports the functions as named exports
import {
  createPayrollRecord,
  getPayrollRecords,
  getPayrollRecordById,
} from '../controllers/payrollRecord.controller.js'; // Verify this path

const router = express.Router();

// POST a new payroll record (when payroll is "run")
// This route uses the createPayrollRecord controller function
router.post('/', createPayrollRecord);

// GET all payroll records (for history/audit)
// This route uses the getPayrollRecords controller function
router.get('/', getPayrollRecords);

// GET a specific payroll record by its ID (optional)
// This route uses the getPayrollRecordById controller function
router.get('/:id', getPayrollRecordById);

export default router;
