import React, { useState, useEffect } from 'react';

const PayrollRunForm = ({ selectedEmployee, onRunPayrollTrigger, isLoading }) => {
  const [regularDays, setRegularDays] = useState('');
  const [overtimeHours, setOvertimeHours] = useState('');
  const [overtimeRateFactor, setOvertimeRateFactor] = useState('1.25');
  const [payPeriod, setPayPeriod] = useState('');
  const [standardWorkHoursPerDay, setStandardWorkHoursPerDay] = useState('8');
  const [deductions, setDeductions] = useState([{ description: '', amount: '' }]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    // Reset form fields when a new employee is selected
    if (selectedEmployee) {
      setRegularDays('');
      setOvertimeHours('');
      setPayPeriod('');
      setDeductions([{ description: '', amount: '' }]);
      setNotes('');
    }
  }, [selectedEmployee]);

  // If no employee is selected, show a placeholder message.
  if (!selectedEmployee) {
    return (
        <div className="p-4 border rounded-lg bg-gray-50 text-center text-gray-500 italic shadow-inner">
            Select an employee from the list to run payroll.
        </div>
    );
  }

  const handleDeductionChange = (index, field, value) => {
    const newDeductions = [...deductions];
    newDeductions[index][field] = value;
    setDeductions(newDeductions);
  };

  const addDeductionField = () => {
    setDeductions([...deductions, { description: '', amount: '' }]);
  };

  const removeDeductionField = (index) => {
    // Keep at least one deduction field
    if (deductions.length <= 1) {
        setDeductions([{description: '', amount: ''}]);
        return;
    }
    const newDeductions = deductions.filter((_, i) => i !== index);
    setDeductions(newDeductions);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const regDays = parseFloat(regularDays);
    const otHours = parseFloat(overtimeHours) || 0; // Default to 0 if empty
    const otFactor = parseFloat(overtimeRateFactor);
    const workHoursPerDay = parseFloat(standardWorkHoursPerDay);

    // Form Validation
    if (isNaN(regDays) || regDays < 0) { alert('Valid regular days worked are required.'); return; }
    if (overtimeHours.trim() !== '' && (isNaN(otHours) || otHours < 0)) { alert('Overtime hours must be a valid positive number or zero.'); return; }
    if (isNaN(otFactor) || otFactor < 1) { alert('Valid overtime rate factor is required (e.g., 1.25).'); return; }
    if (!payPeriod.trim()) { alert('Pay period description is required.'); return; }
    if (isNaN(workHoursPerDay) || workHoursPerDay <= 0) { alert('Standard work hours per day must be a positive number for OT calculation.'); return; }

    const validDeductions = deductions
      .filter(d => d.description.trim() !== '' && d.amount.trim() !== '' && !isNaN(parseFloat(d.amount)) && parseFloat(d.amount) >= 0)
      .map(d => ({ description: d.description.trim(), amount: parseFloat(d.amount) }));

    // Trigger the submission function passed from the parent component
    onRunPayrollTrigger({
      employeeId: selectedEmployee._id,
      name: selectedEmployee.name,
      role: selectedEmployee.role,
      dailyRate: selectedEmployee.dailyRate, // Expects 'dailyRate'
      regularDays: regDays,
      overtimeHours: otHours,
      overtimeRateFactor: otFactor,
      payPeriod: payPeriod.trim(),
      standardWorkHoursPerDay: workHoursPerDay,
      deductions: validDeductions,
      notes: notes.trim(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-white shadow-lg rounded-lg border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-800">
        Run Payroll for: <span className="text-indigo-600 font-bold">{selectedEmployee.name}</span>
        <span className="text-gray-500 font-normal ml-2">({selectedEmployee.role})</span>
      </h3>

      <div>
          <label htmlFor="payPeriod" className="block text-sm font-medium text-gray-700">Pay Period</label>
          <input type="text" id="payPeriod" value={payPeriod} onChange={(e) => setPayPeriod(e.target.value)} required placeholder="e.g., June 1-15, 2025" className="mt-1 block w-full input input-bordered input-sm" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
            <label htmlFor="pr_regularDays" className="block text-sm font-medium text-gray-700">Regular Days Worked</label>
            <input type="number" id="pr_regularDays" value={regularDays} onChange={(e) => setRegularDays(e.target.value)} step="0.1" min="0" required className="mt-1 block w-full input input-bordered input-sm" />
        </div>
        <div>
            <label htmlFor="pr_overtimeHours" className="block text-sm font-medium text-gray-700">Overtime Hours Worked</label>
            <input type="number" id="pr_overtimeHours" value={overtimeHours} onChange={(e) => setOvertimeHours(e.target.value)} step="0.01" min="0" placeholder="0" className="mt-1 block w-full input input-bordered input-sm" />
        </div>
        <div>
            <label htmlFor="pr_standardWorkHoursPerDay" className="block text-sm font-medium text-gray-700">Std. Work Hours/Day</label>
            <input type="number" id="pr_standardWorkHoursPerDay" value={standardWorkHoursPerDay} onChange={(e) => setStandardWorkHoursPerDay(e.target.value)} step="0.1" min="1" required className="mt-1 block w-full input input-bordered input-sm" />
        </div>
        <div>
            <label htmlFor="pr_overtimeRateFactor" className="block text-sm font-medium text-gray-700">Overtime Rate Factor</label>
            <input type="number" id="pr_overtimeRateFactor" value={overtimeRateFactor} onChange={(e) => setOvertimeRateFactor(e.target.value)} step="0.01" min="1" required className="mt-1 block w-full input input-bordered input-sm" />
        </div>
      </div>
      
      <div className="space-y-3 pt-4 border-t mt-4">
        <h4 className="text-md font-medium text-gray-700">Deductions</h4>
        {deductions.map((deduction, index) => (
          <div key={index} className="flex items-center gap-2">
            <input type="text" placeholder="Deduction Description (e.g., Cash Advance)" value={deduction.description} onChange={(e) => handleDeductionChange(index, 'description', e.target.value)} className="input input-bordered input-sm flex-grow" />
            <input type="number" placeholder="Amount" value={deduction.amount} onChange={(e) => handleDeductionChange(index, 'amount', e.target.value)} step="0.01" min="0" className="input input-bordered input-sm w-32" />
            <button type="button" onClick={() => removeDeductionField(index)} className="btn btn-xs btn-circle btn-error btn-outline" aria-label="Remove deduction">
                &times;
            </button>
          </div>
        ))}
        <button type="button" onClick={addDeductionField} className="btn btn-xs btn-outline btn-accent mt-1">Add Deduction Field</button>
      </div>
      
      <div>
        <label htmlFor="pr_notes" className="block text-sm font-medium text-gray-700">Notes (Optional)</label>
        <textarea id="pr_notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows="2" className="mt-1 block w-full textarea textarea-bordered textarea-sm"></textarea>
      </div>
      
      <button type="submit" className="w-full btn btn-primary mt-4" disabled={isLoading}>
        {isLoading ? (
            <>
                <span className="loading loading-spinner"></span>
                Processing...
            </>
        ) : "Calculate & Save Payroll"}
      </button>
    </form>
  );
};

export default PayrollRunForm;