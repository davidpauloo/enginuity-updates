// src/components/PayrollManager.jsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { DollarSign, FileClock, X, User } from 'lucide-react';

// Import the shared form component
import PayrollRunForm from './PayrollRunForm'; 
import ConfirmationModal from './ConfirmationModal';

const API_BASE_URL = 'http://localhost:5001/api';

const PayrollManager = ({ projectId }) => {
    // State for data
    const [employees, setEmployees] = useState([]);
    const [payrollHistory, setPayrollHistory] = useState([]);
    
    // State for modals
    const [isRunPayrollModalOpen, setIsRunPayrollModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    
    // State for actions within modals
    const [selectedEmployeeForPayroll, setSelectedEmployeeForPayroll] = useState(null);
    const [payrollResult, setPayrollResult] = useState(null);
    const [historySearchTerm, setHistorySearchTerm] = useState('');
    
    // General loading and error states
    const [isLoading, setIsLoading] = useState({ employees: false, payrollRun: false, history: false });
    
    // State for confirmation pop-ups
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [modalAction, setModalAction] = useState(null);
    const [modalData, setModalData] = useState(null);
    const [modalContent, setModalContent] = useState({ title: '', message: '', confirmText: 'Confirm' });

    const formatNumberDisplay = (num) => (typeof num === 'number' ? num.toFixed(2) : '0.00');

    // --- Data Fetching ---
    const fetchEmployees = useCallback(async () => {
        setIsLoading(prev => ({ ...prev, employees: true }));
        // This function uses the projectId prop to fetch the correct employees
        let url = projectId ? `${API_BASE_URL}/projects/${projectId}/employees` : `${API_BASE_URL}/employees`;
        try {
            const response = await axios.get(url);
            const fetchedEmployees = response.data.map(emp => ({
                ...emp,
                _id: emp._id || emp.id,
                dailyRate: emp.dailyRate !== undefined ? emp.dailyRate : (emp.wagePerDay !== undefined ? emp.wagePerDay : 0)
            }));
            setEmployees(fetchedEmployees.sort((a,b) => (a.name || "").localeCompare(b.name || "")));
        } catch (err) {
            toast.error("Failed to load employees for this project.");
            setEmployees([]); // Clear employees on error
        } finally {
            setIsLoading(prev => ({ ...prev, employees: false }));
        }
    }, [projectId]);

    const fetchPayrollHistory = useCallback(async () => {
        setIsLoading(prev => ({ ...prev, history: true }));
         // This function uses the projectId prop to fetch the correct history
        let url = projectId ? `${API_BASE_URL}/payroll-records?projectId=${projectId}` : `${API_BASE_URL}/payroll-records`;
        try {
            const response = await axios.get(url);
            setPayrollHistory(response.data.sort((a,b) => new Date(b.processedDate || b.createdAt) - new Date(a.processedDate || a.createdAt)));
        } catch (err) {
            toast.error("Failed to load payroll history for this project.");
        } finally {
            setIsLoading(prev => ({ ...prev, history: false }));
        }
    }, [projectId]);

    // Fetch data when a modal is opened
    useEffect(() => {
        if (isRunPayrollModalOpen) {
            fetchEmployees();
        }
    }, [isRunPayrollModalOpen, fetchEmployees]);

    useEffect(() => {
        if (isHistoryModalOpen) {
            fetchPayrollHistory();
        }
    }, [isHistoryModalOpen, fetchPayrollHistory]);

    // --- Action Handlers ---
    const handleProcessPayrollTrigger = (payrollDataFromForm) => {
        setModalData(payrollDataFromForm);
        setModalAction(() => () => executeProcessPayroll(payrollDataFromForm));
        setShowConfirmModal(true);
        setModalContent({ title: "Confirm Payroll Run", message: `Process payroll for ${payrollDataFromForm.name}?`, confirmText: "Process" });
    };

    const executeProcessPayroll = async (payrollDataFromForm) => {
        setIsLoading(prev => ({ ...prev, payrollRun: true }));
        setPayrollResult(null);
        try {
            const { employeeId, name, ...rest } = payrollDataFromForm;
            const payloadToSave = { employeeId, employeeName: name, ...rest, processedDate: new Date().toISOString(), ...(projectId && { projectId }) };
            const response = await axios.post(`${API_BASE_URL}/payroll-records`, payloadToSave);
            setPayrollResult(response.data);
            toast.success(`Payroll for ${name} processed successfully!`);
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to process payroll.");
        } finally {
            setIsLoading(prev => ({ ...prev, payrollRun: false }));
        }
    };
    
    const closeRunPayrollModal = () => {
        setIsRunPayrollModalOpen(false);
        setSelectedEmployeeForPayroll(null);
        setPayrollResult(null);
    }
    
    const displayedPayrollHistory = useMemo(() => payrollHistory.filter(record =>
        (record.employeeName || "").toLowerCase().includes(historySearchTerm.toLowerCase()) ||
        (record.payPeriod || "").toLowerCase().includes(historySearchTerm.toLowerCase())
    ), [payrollHistory, historySearchTerm]);

    return (
        <div className="w-full">
            <div className="flex justify-start items-center gap-4 p-4 bg-gray-100 rounded-lg shadow-inner">
                <button onClick={() => setIsRunPayrollModalOpen(true)} className="btn btn-primary">
                    <DollarSign className="mr-2 h-5 w-5"/> Run Payroll
                </button>
                <button onClick={() => setIsHistoryModalOpen(true)} className="btn btn-secondary">
                    <FileClock className="mr-2 h-5 w-5"/> View Payroll History
                </button>
            </div>

            {isRunPayrollModalOpen && (
                <div className="modal modal-open">
                    <div className="modal-box w-11/12 max-w-4xl">
                        <div className="flex justify-between items-center border-b pb-3 mb-4">
                            <h3 className="font-bold text-xl">Run Payroll</h3>
                            <button onClick={closeRunPayrollModal} className="btn btn-sm btn-circle btn-ghost"><X /></button>
                        </div>
                        <div className="flex flex-col lg:flex-row gap-6">
                            <div className="lg:w-1/3 w-full bg-base-200 p-3 rounded-lg">
                                <h4 className="font-semibold mb-2">Select Employee for Project:</h4>
                                <div className="max-h-96 overflow-y-auto space-y-1">
                                    {isLoading.employees ? <p className="text-center p-4">Loading...</p> : 
                                     employees.length === 0 ? <p className="text-center p-4 text-sm italic">No employees found for this project.</p> :
                                     employees.map(emp => (
                                        <div key={emp._id} onClick={() => setSelectedEmployeeForPayroll(emp)}
                                            className={`p-3 rounded-lg cursor-pointer ${selectedEmployeeForPayroll?._id === emp._id ? 'bg-primary text-white shadow-md' : 'hover:bg-gray-300 bg-white'}`}>
                                            <p className="font-semibold flex items-center gap-2"><User size={14}/>{emp.name}</p>
                                            <p className="text-xs opacity-80 pl-6">{emp.role}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="lg:w-2/3 w-full">
                                <PayrollRunForm
                                    selectedEmployee={selectedEmployeeForPayroll}
                                    onRunPayrollTrigger={handleProcessPayrollTrigger}
                                    isLoading={isLoading.payrollRun}
                                />
                                {payrollResult && (
                                     <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg text-sm">
                                         <h4 className="font-bold text-green-800">Result for {payrollResult.employeeName}:</h4>
                                         <p><strong>Gross Wage:</strong> ₱{formatNumberDisplay(payrollResult.grossWage)}</p>
                                         <p><strong>Total Deductions:</strong> ₱{formatNumberDisplay(payrollResult.totalDeductions)}</p>
                                         <p className="font-bold mt-1"><strong>Net Pay:</strong> ₱{formatNumberDisplay(payrollResult.netPay)}</p>
                                     </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isHistoryModalOpen && (
                <div className="modal modal-open">
                    <div className="modal-box w-11/12 max-w-5xl">
                         <div className="flex justify-between items-center border-b pb-3 mb-4">
                            <h3 className="font-bold text-xl">Payroll History</h3>
                            <button onClick={() => setIsHistoryModalOpen(false)} className="btn btn-sm btn-circle btn-ghost"><X /></button>
                        </div>
                        <input type="text" placeholder="Search History..." value={historySearchTerm} onChange={(e) => setHistorySearchTerm(e.target.value)} className="input input-bordered input-sm w-full mb-4" />
                        {isLoading.history && <p className="text-center p-4">Loading...</p>}
                        {!isLoading.history && (
                            <div className="overflow-auto max-h-[70vh]">
                                <table className="table table-sm w-full">
                                    <thead><tr><th>Pay Period</th><th>Employee</th><th>Net Pay</th><th>Date</th></tr></thead>
                                    <tbody>
                                        {displayedPayrollHistory.map(record => (
                                            <tr key={record._id} className="hover">
                                                <td>{record.payPeriod}</td>
                                                <td>{record.employeeName}</td>
                                                <td>₱{formatNumberDisplay(record.netPay)}</td>
                                                <td>{new Date(record.processedDate).toLocaleDateString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {displayedPayrollHistory.length === 0 && <p className="text-center p-4 italic text-gray-500">No payroll history found for this project.</p>}
                            </div>
                        )}
                    </div>
                </div>
            )}
            
            <ConfirmationModal 
                isOpen={showConfirmModal} 
                onClose={() => setShowConfirmModal(false)} 
                onConfirm={() => { if (typeof modalAction === 'function') modalAction(); setShowConfirmModal(false); }}
                title={modalContent.title} 
                message={modalContent.message} 
                confirmText={modalContent.confirmText} 
            />
        </div>
    );
};

export default PayrollManager; 