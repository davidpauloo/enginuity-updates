// controllers/payrollRecord.controller.js
import PayrollRecord from '../models/payrollRecord.model.js';
import Employee from '../models/employee.model.js'; // To verify employee exists

// Create a new payroll record (this is where the "Run Payroll" data is saved)
export const createPayrollRecord = async (req, res) => {
  try {
    // Destructure the fields now expected from the frontend
    const {
      employeeId,
      employeeName,
      role,
      payPeriod,
      dailyRate,
      regularDaysWorked,
      overtimeHours,
      standardWorkHoursPerDay,
      effectiveHourlyRateUsedForOT,
      overtimeRateFactor,
      regularPay,
      overtimePay,
      grossWage,
      deductions, // Array of { description: String, amount: Number }
      totalDeductions,
      netPay,
      notes,
    } = req.body;

    // Updated basic validation to reflect the new required fields
    // Note: overtimeRateFactor, regularPay, overtimePay are calculated on frontend and passed;
    // their presence is implicitly validated by grossWage and netPay calculations.
    if (
      !employeeId || !payPeriod ||
      dailyRate === undefined || regularDaysWorked === undefined ||
      standardWorkHoursPerDay === undefined || effectiveHourlyRateUsedForOT === undefined ||
      grossWage === undefined || totalDeductions === undefined || netPay === undefined
    ) {
      return res.status(400).json({
        message: "Missing required payroll data. Ensure employeeId, payPeriod, dailyRate, regularDaysWorked, standardWorkHoursPerDay, effectiveHourlyRateUsedForOT, grossWage, totalDeductions, and netPay are provided.",
        // For debugging, you might want to log or send back the received body:
        // receivedBody: req.body 
      });
    }

    // Optional: Verify employee exists
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found for payroll record." });
    }

    // Validate deductions array structure if provided
    if (deductions && !Array.isArray(deductions)) {
        return res.status(400).json({ message: "Deductions must be an array." });
    }
    if (deductions) {
        for (const ded of deductions) {
            if (!ded || typeof ded.description !== 'string' || typeof ded.amount !== 'number' || ded.amount < 0) {
                return res.status(400).json({ message: "Each deduction must have a valid description (string) and a non-negative amount (number)." });
            }
        }
    }

    // Create new PayrollRecord instance with the corrected fields
    const newPayrollRecord = new PayrollRecord({
      employeeId,
      employeeName: employeeName || employee.name,
      role: role || employee.role,
      payPeriod,
      dailyRate: Number(dailyRate),
      regularDaysWorked: Number(regularDaysWorked),
      overtimeHours: Number(overtimeHours) || 0,
      standardWorkHoursPerDay: Number(standardWorkHoursPerDay),
      effectiveHourlyRateUsedForOT: Number(effectiveHourlyRateUsedForOT),
      overtimeRateFactor: Number(overtimeRateFactor) || 1.0,
      regularPay: Number(regularPay),
      overtimePay: Number(overtimePay) || 0,
      grossWage: Number(grossWage),
      deductions: deductions || [], // Default to empty array if not provided
      totalDeductions: Number(totalDeductions) || 0,
      netPay: Number(netPay),
      notes: notes || '', // Default to empty string
      processedDate: new Date(),
    });

    const savedRecord = await newPayrollRecord.save();
    res.status(201).json(savedRecord); // Send back the full saved record

  } catch (error) {
    console.error("Error creating payroll record:", error); // THIS LOG IS VERY IMPORTANT
    if (error.name === 'ValidationError') {
      // Construct a more detailed error message from Mongoose validation
      let errors = {};
      for (let field in error.errors) {
        errors[field] = error.errors[field].message;
      }
      return res.status(400).json({ message: "Validation failed for payroll record. Check backend logs for details.", errors: errors });
    }
    // General server error
    res.status(500).json({ message: "Failed to create payroll record", error: error.message });
  }
};

// Get all payroll records (for history/audit)
export const getPayrollRecords = async (req, res) => {
  try {
    const query = {};
    if (req.query.employeeId) query.employeeId = req.query.employeeId;
    if (req.query.payPeriod) query.payPeriod = { $regex: req.query.payPeriod, $options: 'i' };
    if (req.query.employeeName) query.employeeName = { $regex: req.query.employeeName, $options: 'i' };
   
    const records = await PayrollRecord.find(query).sort({ processedDate: -1 }); 
    res.status(200).json(records);
  } catch (error) {
    console.error("Error fetching payroll records:", error);
    res.status(500).json({ message: "Failed to fetch payroll records", error: error.message });
  }
};

// Get a single payroll record by ID (optional)
export const getPayrollRecordById = async (req, res) => {
    try {
        const record = await PayrollRecord.findById(req.params.id);
        if (!record) {
            return res.status(404).json({ message: "Payroll record not found." });
        }
        res.status(200).json(record);
    } catch (error) {
        console.error("Error fetching payroll record by ID:", error);
        if (error.kind === 'ObjectId') { 
            return res.status(400).json({ message: "Invalid payroll record ID format" });
        }
        res.status(500).json({ message: "Failed to fetch payroll record", error: error.message });
    }
};
