import express from 'express';
import { createPayrollRecord } from '../controllers/payroll.controller.js';
// Make sure to import your authentication middleware (e.g., protect)
// import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// This route will handle the creation of new payroll records.
// The frontend will POST to /api/payrolls
router.route('/').post(/* protect, */ createPayrollRecord);

export default router;