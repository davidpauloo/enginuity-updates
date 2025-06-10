import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { FileText, Trash2, Download, Eye, X, User, CheckCircle2, Calendar, Clock, AlertCircle, Plus, DollarSign, Briefcase, ChevronLeft } from "lucide-react";
import { axiosInstance } from "../lib/axios";

import PayrollRunForm from "../components/PayrollRunForm"; // <-- ADD THIS
import ConfirmationModal from "../components/ConfirmationModal";

const PREDEFINED_ROLES_PROJECT = [
    "Laborer", "Skilled Laborer", "Carpenter", "Mason", "Electrician", "Plumber",
    "Welder", "Painter", "Heavy Equipment Operator", "Driver", "Foreman",
    "Site Engineer", "Project Manager", "Safety Officer", "Quantity Surveyor", "Administrative Staff"
].sort();

const formatDate = (dateString) => {
    if (!dateString) return 'N/A'; // Handle null/empty date strings gracefully
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date'; // Handle invalid date objects
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
};

const formatNumberDisplay = (num) => (typeof num === 'number' ? num.toFixed(2) : '0.00'); // <-- ADD THIS
const getBackendUrl = () => {
    return import.meta.env.MODE === "development" ? "http://localhost:5001/api" : "/api";
};

const ProjectDetailsPage = () => {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const [previewFile, setPreviewFile] = useState(null);
    const [isAddingActivity, setIsAddingActivity] = useState(false);
    const [isAddingEmployee, setIsAddingEmployee] = useState(false);
    const [newEmployee, setNewEmployee] = useState({
        name: '',
        role: '',
        wagePerDay: '',
        startDate: '',
        endDate: '' // This maps to dueDate on the backend for employees
    });
    const [newActivity, setNewActivity] = useState({
        name: '', // This will map to 'name' on the backend for activities as per your routes
        description: '',
        startDate: '',
        endDate: '' // This maps to dueDate on the backend for activities
    });
    const [error, setError] = useState(null);
    const [isDeleteEmployeeModalOpen, setIsDeleteEmployeeModalOpen] = useState(false);
    const [employeeToDelete, setEmployeeToDelete] = useState(null);
    const [employeeSearch, setEmployeeSearch] = useState('');
    const [selectedCoverFile, setSelectedCoverFile] = useState(null);
    const [uploadingCover, setUploadingCover] = useState(false);
    const [uploadCoverError, setUploadCoverError] = useState(null);
    const [coverPhotoPreview, setCoverPhotoPreview] = useState(null);
    const [coverImageUrl, setCoverImageUrl] = useState(null);
    const [isImageLoading, setIsImageLoading] = useState(true);
    const [isToggleActivityModalOpen, setIsToggleActivityModalOpen] = useState(false);
    const [activityToToggle, setActivityToToggle] = useState(null);
    const [showProjectPayrollModal, setShowProjectPayrollModal] = useState(false);
    const [selectedProjectEmployeeForPayroll, setSelectedProjectEmployeeForPayroll] = useState(null);
    const [isProcessingProjectPayroll, setIsProcessingProjectPayroll] = useState(false);
    const [payrollResultForProject, setPayrollResultForProject] = useState(null);
    const [projectPayrollError, setProjectPayrollError] = useState(null);
    const [payrollSearchTerm, setPayrollSearchTerm] = useState('');
    

    const [showConfirmModalProjectPayroll, setShowConfirmModalProjectPayroll] = useState(false);
    const [modalActionProjectPayroll, setModalActionProjectPayroll] = useState(null);

    const [payrollHistory, setPayrollHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [selectedPayrollRecord, setSelectedPayrollRecord] = useState(null);
    

    const fetchProjectDetails = useCallback(async () => {
        setLoading(true);
        setHistoryLoading(true); // Manages loading state for history card
        setError(null);
        try {
            // This now fetches both endpoints at once
            const [projectRes, historyRes] = await Promise.all([
                axiosInstance.get(`/projects/${projectId}`),
                axiosInstance.get(`/projects/${projectId}/payroll-history`)
            ]);
            
            setProject(projectRes.data);
            setPayrollHistory(historyRes.data); // Set the payroll history state

        } catch (err) {
            console.error('Error fetching project data:', err.response?.data || err.message);
            const errMsg = err.response?.data?.message || 'Failed to load project details.';
            setError(errMsg);
            toast.error(errMsg);
        } finally {
            setLoading(false);
            setHistoryLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        if (projectId) {
            fetchProjectDetails();
        }
    }, [projectId]);

    useEffect(() => {
        if (project?.imageUrl) {
            console.log('Setting initial image URL:', project.imageUrl);
            setCoverImageUrl(project.imageUrl);
        }
    }, [project]);

    // --- PASTE THIS ENTIRE BLOCK for Payroll and History Logic ---
    const fetchPayrollHistory = useCallback(async () => {
        if (!projectId) return;
        try {
            const historyRes = await axiosInstance.get(`/projects/${projectId}/payroll-history`);
            setPayrollHistory(historyRes.data);
        } catch (err) {
            console.error('Could not fetch payroll history', err);
            toast.error("Could not load payroll history.");
        }
    }, [projectId]);

    const handleProjectPayrollButtonClick = () => {
        resetPayrollModal();
        setShowProjectPayrollModal(true);
    };
    
    const handleProjectPayrollSubmitTrigger = (payrollDataFromForm) => {
        const modalContent = {
            title: "Confirm Payroll Run",
            message: `Process payroll for ${payrollDataFromForm.name} (Period: ${payrollDataFromForm.payPeriod})?`,
            confirmText: "Process"
        };
        setModalActionProjectPayroll({ 
            action: () => () => executeProjectPayrollProcessing(payrollDataFromForm),
            content: modalContent 
        });
        setShowProjectPayrollModal(false);
        setShowConfirmModalProjectPayroll(true);
    };

    const executeProjectPayrollProcessing = async (payrollDataFromForm) => {
        setIsProcessingProjectPayroll(true);
        setProjectPayrollError(null);
        setPayrollResultForProject(null);

        const { employeeId, name, role, dailyRate, regularDays, overtimeHours, overtimeRateFactor, payPeriod, standardWorkHoursPerDay, deductions, notes } = payrollDataFromForm;
        
        const ratePerDay = parseFloat(dailyRate);
        const regDays = parseFloat(regularDays);
        const otHours = parseFloat(overtimeHours);
        const otFactor = parseFloat(overtimeRateFactor);
        const workHoursPerDay = parseFloat(standardWorkHoursPerDay);

        const effectiveHourlyRateForOT = workHoursPerDay > 0 ? ratePerDay / workHoursPerDay : 0;
        const calculatedRegularPay = regDays * ratePerDay;
        const calculatedOvertimePay = otHours * effectiveHourlyRateForOT * otFactor;
        const calculatedGrossWage = calculatedRegularPay + calculatedOvertimePay;
        
        const processedDeductions = (Array.isArray(deductions) ? deductions : [])
            .filter(d => d.description?.trim() && !isNaN(parseFloat(d.amount)) && parseFloat(d.amount) >= 0)
            .map(d => ({ description: d.description.trim(), amount: parseFloat(d.amount) }));
            
        const calculatedTotalDeductions = processedDeductions.reduce((sum, d) => sum + d.amount, 0);
        const calculatedNetPay = calculatedGrossWage - calculatedTotalDeductions;

        const payloadToSave = {
            employeeId: employeeId || name,
            employeeName: name,
            role, payPeriod, regularDaysWorked: regDays, overtimeHours: otHours, dailyRate: ratePerDay,
            standardWorkHoursPerDay: workHoursPerDay, effectiveHourlyRateUsedForOT: effectiveHourlyRateForOT,
            overtimeRateFactor: otFactor, regularPay: calculatedRegularPay, overtimePay: calculatedOvertimePay,
            grossWage: calculatedGrossWage, deductions: processedDeductions, totalDeductions: calculatedTotalDeductions,
            netPay: calculatedNetPay, notes: notes || '', processedDate: new Date().toISOString(), projectId: projectId 
        };

        try {
            const response = await axiosInstance.post(`/payrolls`, payloadToSave);
            setPayrollResultForProject(response.data);
            toast.success(`Payroll for ${name} saved successfully!`);
            await fetchPayrollHistory();
            setSelectedPayrollRecord(response.data);
        } catch (err) {
            console.error("Error saving project payroll:", err);
            const errMsg = err.response?.data?.message || "Failed to save payroll record.";
            setProjectPayrollError(errMsg);
            toast.error(errMsg);
            setPayrollResultForProject(payloadToSave);
        } finally {
            setIsProcessingProjectPayroll(false);
        }
    };

    const handleModalConfirmProjectPayroll = () => {
        if (modalActionProjectPayroll && typeof modalActionProjectPayroll.action === 'function') {
            modalActionProjectPayroll.action()();
        }
        setShowConfirmModalProjectPayroll(false);
    };

    const handleModalCloseProjectPayroll = () => {
        setShowConfirmModalProjectPayroll(false);
    };

    const resetPayrollModal = () => {
        setSelectedProjectEmployeeForPayroll(null);
        setPayrollResultForProject(null);
        setProjectPayrollError(null);
    };
    // --- END OF BLOCK ---

    const handleFileUpload = async () => {
        if (!selectedFile) {
            toast.error("Please select a file to upload.");
            return;
        }
        if (!project) {
            toast.error("Project details not loaded yet.");
            return;
        }

        setUploading(true);
        const formData = new FormData();
        formData.append('document', selectedFile);

        try {
            const response = await axiosInstance.post(`/projects/${projectId}/documents`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            // The backend should return the updated project object
            setProject(response.data.project); // Assuming backend sends { project: updatedProject }
            toast.success('Document uploaded successfully!');
            setSelectedFile(null);
            setIsUploadModalOpen(false);
            if (document.getElementById('fileUploadInputModal')) {
                document.getElementById('fileUploadInputModal').value = "";
            }
        } catch (err) {
            console.error('Error uploading document:', err.response?.data || err.message);
            toast.error(err.response?.data?.message || 'Failed to upload document.');
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteDocument = async (documentId) => {
        if (!project || !window.confirm("Are you sure you want to delete this document?")) return;

        try {
            const response = await axiosInstance.delete(`/projects/${projectId}/documents/${documentId}`);
            // The backend should return the updated project object
            setProject(response.data.project); // Assuming backend sends { project: updatedProject }
            toast.success('Document deleted successfully!');
        } catch (err) {
            console.error('Error deleting document:', err.response?.data || err.message);
            toast.error(err.response?.data?.message || 'Failed to delete document.');
        }
    };

    const handleAddActivity = async (e) => {
        e.preventDefault();

        // Frontend validation for activities
        if (!newActivity.name.trim()) {
            toast.error("Activity name is required.");
            return;
        }
        if (!newActivity.startDate) {
            toast.error("Activity start date is required.");
            return;
        }
        if (!newActivity.endDate) {
            toast.error("Activity target end date is required.");
            return;
        }

        const startDateObj = new Date(newActivity.startDate);
        const endDateObj = new Date(newActivity.endDate);

        if (isNaN(startDateObj.getTime())) {
            toast.error("Invalid start date for activity.");
            return;
        }
        if (isNaN(endDateObj.getTime())) {
            toast.error("Invalid target end date for activity.");
            return;
        }
        if (startDateObj > endDateObj) {
            toast.error("Activity start date cannot be after end date.");
            return;
        }

        try {
            setLoading(true);

            const activityData = {
                name: newActivity.name.trim(),
                description: newActivity.description ? newActivity.description.trim() : '',
                startDate: startDateObj.toISOString(),
                dueDate: endDateObj.toISOString(), // Correctly map to 'dueDate' for backend
                status: 'pending' // Default status
            };

            console.log('Sending activity data:', JSON.stringify(activityData, null, 2)); 

            const response = await axiosInstance.post(`/projects/${projectId}/activities`, activityData);
            console.log('Server response for add activity:', response.data);

    
            if (response.data && response.data.activities) { 
                setProject(response.data); 
                setActivities(response.data.activities); 
                toast.success("Activity added successfully");
            } else {
                
                fetchProjectDetails(); 
                toast.success("Activity added successfully (data refreshed)");
            }

            // Reset the form
            setNewActivity({
                name: '',
                description: '',
                startDate: '',
                endDate: ''
            });
            setIsAddingActivity(false);

        } catch (error) {
            console.error('Error adding activity:', error.response?.data || error.message);
            const errorMessage = error.response?.data?.message || error.message || 'Failed to add activity';
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

 const handleToggleActivity = (activityId) => { // No longer needs to be async
    const activityToUpdate = project.activities.find(a => (a._id) === activityId); // <-- FIX: Use project.activities
    if (!activityToUpdate) return;
    
    setActivityToToggle(activityToUpdate);
    setIsToggleActivityModalOpen(true);
};

    // AFTER
const confirmToggleActivity = async () => {
    if (!activityToToggle) return;

    try {
        const newStatus = activityToToggle.status === 'completed' ? 'pending' : 'completed';
        
        // The backend already returns the full updated project object.
        // We just need to save it to our state.
        const response = await axiosInstance.patch(
            `/projects/${projectId}/activities/${activityToToggle._id}`, 
            { status: newStatus }
        );

        setProject(response.data); // <-- FIX: This is all we need to update the UI
        toast.success(`Activity status updated!`);

    } catch (error) {
        console.error('Error updating activity:', error.response?.data || error.message);
        toast.error(error.response?.data?.message || 'Failed to update activity status');
        // If it fails, refresh all data from the server to be safe
        fetchProjectDetails(); 
    } finally {
        setIsToggleActivityModalOpen(false);
        setActivityToToggle(null);
    }
};

    // Modified to accept activities array to calculate progress based on specific state
    // BEFORE
// AFTER
const calculateProgress = () => { // It no longer needs an argument
    const currentActivities = project?.activities || [];
    if (currentActivities.length === 0) return 0;
    const completedCount = currentActivities.filter(activity => activity.status === 'completed').length;
    return Math.round((completedCount / currentActivities.length) * 100);
};

   // BEFORE
const getUpcomingDeadlines = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return (project?.activities || []) // This part was already correct
        .filter(activity => new Date(activity.dueDate) >= today && activity.status !== 'completed')
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
        .slice(0, 5);
};

    const handleAddEmployee = async (e) => {
        e.preventDefault();

        // Frontend validation for employees
        if (!newEmployee.name.trim()) {
            toast.error("Employee name is required.");
            return;
        }
        if (!newEmployee.role.trim()) {
            toast.error("Employee role is required.");
            return;
        }
        if (!newEmployee.wagePerDay || isNaN(parseFloat(newEmployee.wagePerDay))) {
            toast.error("Wage per day is required and must be a number.");
            return;
        }
        if (parseFloat(newEmployee.wagePerDay) < 0) {
            toast.error("Wage per day cannot be negative.");
            return;
        }
        if (!newEmployee.startDate) {
            toast.error("Employee start date is required.");
            return;
        }

        const employeeStartDateObj = new Date(newEmployee.startDate);
        if (isNaN(employeeStartDateObj.getTime())) {
            toast.error("Invalid employee start date.");
            return;
        }

        let employeeEndDateIso = null;
        if (newEmployee.endDate) {
            const employeeEndDateObj = new Date(newEmployee.endDate);
            if (isNaN(employeeEndDateObj.getTime())) {
                toast.error("Invalid employee end date.");
                return;
            }
            if (employeeStartDateObj > employeeEndDateObj) {
                toast.error("Employee start date cannot be after end date.");
                return;
            }
            employeeEndDateIso = employeeEndDateObj.toISOString();
        }

        try {
            setLoading(true);
            const employeeData = {
                name: newEmployee.name.trim(),
                role: newEmployee.role.trim(),
                wagePerDay: parseFloat(newEmployee.wagePerDay),
                startDate: employeeStartDateObj.toISOString(),
                dueDate: employeeEndDateIso 
            };

            console.log('Sending employee data:', JSON.stringify(employeeData, null, 2)); 

            const response = await axiosInstance.post(`/projects/${projectId}/employees`, employeeData);
            console.log('Server response for add employee:', response.data); 

           
            if (response.data && response.data.employees) { 
                setProject(response.data); 
                toast.success("Employee added successfully");
            } else {
                fetchProjectDetails(); 
                toast.success("Employee added successfully (data refreshed)");
            }

  
            setNewEmployee({
                name: '',
                role: '',
                wagePerDay: '',
                startDate: '',
                endDate: ''
            });
            setIsAddingEmployee(false);

        } catch (error) {
            console.error('Error adding employee:', error.response?.data || error.message);
            const errorMessage = error.response?.data?.message || error.message || 'Failed to add employee';
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveEmployee = async () => {
        if (!employeeToDelete) return;

        try {
            // Access the _id of the employee object directly
            const employeeIdToRemove = employeeToDelete._id;

            const response = await axiosInstance.delete(`/projects/${projectId}/employees/${employeeIdToRemove}`);
            // Backend should return the entire updated project object
            if (response.data && response.data.employees) { // Assuming response.data is the updated project
                setProject(response.data); // Update project state from backend response
                toast.success("Employee removed successfully");
            } else {
                fetchProjectDetails(); 
                toast.success("Employee removed successfully (data refreshed)");
            }
            setIsDeleteEmployeeModalOpen(false);
            setEmployeeToDelete(null);
        } catch (error) {
            console.error('Error removing employee:', error.response?.data || error.message);
            toast.error(error.response?.data?.message || error.message || 'Failed to remove employee');
        }
    };

    const confirmDeleteEmployee = (employee) => {
        setEmployeeToDelete(employee); // Store the full employee object
        setIsDeleteEmployeeModalOpen(true);
    };

    const handleCoverFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file type
            const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
            if (!validTypes.includes(file.type)) {
                toast.error('Please select a valid image file (JPEG, PNG, WebP, or GIF)');
                e.target.value = ''; // Clear the input
                return;
            }

            // Validate file size (max 5MB)
            const maxSize = 5 * 1024 * 1024;
            if (file.size > maxSize) {
                toast.error('Image file size must be less than 5MB');
                e.target.value = '';
                return;
            }

            setSelectedCoverFile(file);
            
            // Create preview URL
            const previewUrl = URL.createObjectURL(file);
            setCoverPhotoPreview(previewUrl);
            
            // Auto-upload
            handleUploadCoverPhoto(file);
        }
    };

    const handleImageLoad = () => {
        setIsImageLoading(false);
    };

    const handleUploadCoverPhoto = async (file) => {
        if (!file) {
            toast.error('Please select an image file to upload as cover photo.');
            return;
        }

        setUploadingCover(true);
        setUploadCoverError(null);
        setIsImageLoading(true); // Set loading state when starting upload

        const formData = new FormData();
        formData.append('coverPhoto', file);

        try {
            const res = await axiosInstance.patch(`/projects/${projectId}/imageUrl`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            // Update project with new image URL
            setProject(prev => ({
                ...prev,
                imageUrl: res.data.imageUrl || res.data,
                lastUpdated: new Date().toISOString()
            }));

            setCoverImageUrl(res.data.imageUrl || res.data);

            // Clean up
            if (coverPhotoPreview) {
                URL.revokeObjectURL(coverPhotoPreview);
                setCoverPhotoPreview(null);
            }
            setSelectedCoverFile(null);
            
            toast.success('Cover photo updated successfully!');

        } catch (err) {
            console.error('Error uploading cover photo:', err);
            setUploadCoverError(err.response?.data?.message || 'Failed to upload cover photo.');
            toast.error(err.response?.data?.message || 'Failed to upload cover photo.');
            setIsImageLoading(false); // Reset loading state on error
        } finally {
            setUploadingCover(false);
        }
    };

    // Drag and drop handlers
    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDragEnter = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const files = e.dataTransfer.files;
        if (files && files[0]) {
            const file = files[0];
            handleCoverFileChange({ target: { files: [file] } });
        }
    };

    // Cleanup effect
    useEffect(() => {
        return () => {
            if (coverPhotoPreview) {
                URL.revokeObjectURL(coverPhotoPreview);
            }
        };
    }, [coverPhotoPreview]);
    const filteredPayrollHistory = payrollHistory.filter(record =>
        record.employeeName.toLowerCase().includes(payrollSearchTerm.toLowerCase())
    );

    // Banner Section Component
    const BannerSection = () => {
        const navigate = useNavigate();
        const getImageUrl = () => {
            if (coverPhotoPreview) return coverPhotoPreview;
            if (project?.imageUrl) return `${project.imageUrl}?t=${Date.now()}`;
            return 'https://placehold.co/1920x1080/000000/ffffff?text=No+Cover';
        };

        return (
            <div className="relative">
                <div 
                    key={`banner-${project?.imageUrl}-${project?.lastUpdated || Date.now()}`}
                    className="relative h-[400px] rounded-lg overflow-hidden"
                    onDragOver={handleDragOver}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    {/* Background Image */}
                    <div
                        className="absolute inset-0 bg-cover bg-center transition-all duration-300"
                        style={{ 
                            backgroundImage: `url(${getImageUrl()})`,
                            backgroundPosition: 'center',
                            backgroundSize: 'cover'
                        }}
                    >
                        {/* Dark Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/70"></div>
                    </div>

                        {/* Back Button */}
                        <div className="absolute top-6 left-6 z-20">
                            <button
                                onClick={() => navigate(-1)}
                                className="btn btn-sm btn-circle glass hover:bg-base-100/20"
                            >
                                <ChevronLeft size={24} className="text-white" />
                            </button>
                        </div>

                        {/* Upload Button */}
                        <div className="absolute top-6 right-6 z-20">
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="file"
                                        id="coverPhotoInput"
                                        accept="image/*"
                                        onChange={handleCoverFileChange}
                                        className="hidden"
                                    />
                                    <label
                                        htmlFor="coverPhotoInput"
                                        className={`btn btn-sm glass hover:bg-base-100/20 text-white border-white/20 ${
                                        uploadingCover ? 'btn-disabled' : ''
                                    }`}
                                >
                                    {uploadingCover ? (
                                        <>
                                            <span className="loading loading-spinner loading-sm"></span>
                                            Uploading...
                                        </>
                                    ) : (
                                        <>
                                            <Plus size={16} className="mr-2" />
                                            Change Cover
                                        </>
                                    )}
                                </label>
                            </div>

                            {/* Upload Status Messages */}
                            {selectedCoverFile && !uploadingCover && (
                                <div className="text-xs text-white bg-black/50 p-2 rounded backdrop-blur-sm">
                                    Selected: {selectedCoverFile.name.length > 20 
                                        ? `${selectedCoverFile.name.substring(0, 20)}...` 
                                        : selectedCoverFile.name}
                                </div>
                            )}
                            
                            {uploadCoverError && (
                                <div className="text-xs text-error bg-black/50 p-2 rounded backdrop-blur-sm">
                                    Error: {uploadCoverError}
                                </div>
                            )}

                            {uploadingCover && (
                                <div className="text-xs text-white bg-black/50 p-2 rounded backdrop-blur-sm">
                                    <div className="flex items-center gap-2">
                                        <span className="loading loading-spinner loading-xs"></span>
                                        Uploading...
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Project Title and Description */}
                    <div className="absolute bottom-0 left-0 right-0 p-8">
                        <div className="text-white">
                            <h1 className="text-4xl md:text-5xl font-bold mb-3">{projectName}</h1>
                            <p className="text-xl text-white/90">
                                {project?.location || 'No location available'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const projectImageUrl = project?.imageUrl || 'https://placehold.co/1200x300/2563eb/ffffff?text=Project+Banner';
    const projectName = project?.name || project?.clientName || 'Project Name';
    const projectDescription = project?.description || 'No description available.';

    const assignedEmployees = project?.employees && Array.isArray(project?.employees)
        ? project.employees
        : [];

    const filteredEmployees = assignedEmployees.filter(employee =>
        employee.name.toLowerCase().includes(employeeSearch.toLowerCase()) ||
        employee.role.toLowerCase().includes(employeeSearch.toLowerCase())
    );

    
// AFTER
const projectProgress = calculateProgress();
    return (
        <div className="p-0 sm:p-0 md:p-0 lg:p-0 xl:p-0 2xl:p-0">
            {loading ? (
                <div className="flex justify-center items-center min-h-screen">
                    <div className="loading loading-spinner loading-lg"></div>
                </div>
            ) : error ? (
                <div className="alert alert-error shadow-lg">
                    <div>
                        <AlertCircle className="stroke-current flex-shrink-0 h-6 w-6" />
                        <span>{error}</span>
                    </div>
                </div>
            ) : (
                <>
                    <BannerSection />
                    {/* Existing Content */}
                    <div className="flex flex-col lg:flex-row gap-8">
                        {/* Left Column - Description, Deadlines, Employees, Activities */}
                        <div className="flex-1 lg:w-2/3">
                            {/* Project Description */}
                            <div className="card bg-base-100 shadow-md mb-8">
                                <div className="card-body">
                                    <h2 className="text-2xl font-semibold text-base-content mb-4">Project Description</h2>
                                    <p className="text-base-content/80 leading-relaxed">
                                        {projectDescription}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Deadlines Card */}
                                <div className="card bg-base-100 shadow-md">
                                    <div className="card-body">
                                        <h3 className="text-xl font-semibold mb-4 text-base-content">Upcoming Deadlines</h3>
                                        {/* ADD max-h-[400px], overflow-y-auto, and pr-2 here */}
                                        <ul className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                                            {getUpcomingDeadlines().length > 0 ? (
                                                getUpcomingDeadlines().map((activity) => (
                                                    <li key={activity.id || activity._id} className="flex items-start gap-3 p-3 bg-base-200 rounded-lg">
                                                        <input
                                                            type="checkbox"
                                                            checked={activity.status === 'completed'}
                                                            onChange={() => handleToggleActivity(activity.id || activity._id)}
                                                            className="checkbox checkbox-primary mt-1"
                                                        />
                                                        <div className="flex-1">
                                                            <div className="flex items-center justify-between">
                                                                <span className={`font-medium ${activity.status === 'completed' ? 'line-through text-base-content/50' : ''}`}>
                                                                    {activity.name}
                                                                </span>
                                                                <span className="text-sm text-base-content/70">
                                                                    {formatDate(activity.dueDate)}
                                                                </span>
                                                            </div>
                                                            {activity.description && (
                                                                <p className="text-sm text-base-content/70 mt-1">
                                                                    {activity.description}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </li>
                                                ))
                                            ) : (
                                                <li className="text-center text-base-content/70 py-2">
                                                    No upcoming deadlines
                                                </li>
                                            )}
                                        </ul>
                                    </div>
                                </div>

                                {/* Employees Card */}
                                <div className="card bg-base-100 shadow-md">
                                    <div className="card-body">
                                        <div className="flex justify-between items-center mb-4">
    <h3 className="text-xl font-semibold text-base-content">Assigned Employees</h3>
    <div className="flex gap-2"> {/* Buttons are grouped inside this div */}
        <button onClick={handleProjectPayrollButtonClick} className="btn btn-secondary btn-sm"><DollarSign size={16} className="mr-1" />Project Payroll</button>
        <button onClick={() => setIsAddingEmployee(true)} className="btn btn-primary btn-sm"><Plus size={16} className="mr-1" />Add Employee</button>
    </div>
</div>
                                        <div className="mb-4">
                                            <div className="join w-full">
                                                <input
                                                    type="text"
                                                    placeholder="Search employees..."
                                                    className="input input-bordered join-item w-full"
                                                    value={employeeSearch}
                                                    onChange={(e) => setEmployeeSearch(e.target.value)}
                                                />
                                                <button className="btn join-item">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                        {filteredEmployees.length > 0 ? (
                                            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                                                {filteredEmployees.map((employee) => (
                                                    <div key={employee._id} className="flex items-start justify-between p-3 bg-base-200 rounded-lg">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2">
                                                                <User size={16} className="text-primary" />
                                                                <span className="font-medium">{employee.name}</span>
                                                            </div>
                                                            <div className="mt-1 text-sm text-base-content/70">
                                                                <div className="flex items-center gap-2">
                                                                    <Briefcase size={14} />
                                                                    <span>{employee.role}</span>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <DollarSign size={14} />
                                                                    <span>₱{employee.wagePerDay}/day</span>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <Calendar size={14} />
                                                                    <span>
                                                                        {formatDate(employee.startDate)}
                                                                        {employee.dueDate ? ` - ${formatDate(employee.dueDate)}` : ''} {/* Use employee.dueDate here */}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => confirmDeleteEmployee(employee)}
                                                            className="btn btn-ghost btn-sm text-error hover:bg-error/10"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-base-content/70 text-center py-4">
                                                {employeeSearch ? 'No employees found matching your search.' : 'No employees assigned to this project.'}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Add Employee Modal */}
                                {isAddingEmployee && (
                                    <dialog open className="modal modal-open modal-bottom sm:modal-middle">
                                        <div className="modal-box">
                                            <div className="flex justify-between items-center mb-4">
                                                <h3 className="font-bold text-lg text-base-content">Add New Employee</h3>
                                                <button
                                                    onClick={() => setIsAddingEmployee(false)}
                                                    className="btn btn-sm btn-circle btn-ghost"
                                                >
                                                    <X size={20} />
                                                </button>
                                            </div>
                                            <form onSubmit={handleAddEmployee} className="space-y-4">
                                                <div className="form-control">
                                                    <label className="label">
                                                        <span className="label-text">Employee Name *</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={newEmployee.name}
                                                        onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                                                        placeholder="Enter employee name (e.g., John Doe)"
                                                        className="input input-bordered w-full"
                                                        required
                                                    />
                                                    {/* Removed the warning about matching existing user */}
                                                </div>

                                                <div className="form-control">
                                                    <label className="label">
                                                        <span className="label-text">Role *</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={newEmployee.role}
                                                        onChange={(e) => setNewEmployee({ ...newEmployee, role: e.target.value })}
                                                        placeholder="Enter employee role (e.g., Site Engineer)"
                                                        className="input input-bordered w-full"
                                                        required
                                                    />
                                                </div>

                                                <div className="form-control">
                                                    <label className="label">
                                                        <span className="label-text">Wage per Day (₱) *</span>
                                                    </label>
                                                    <input
                                                        type="number"
                                                        value={newEmployee.wagePerDay}
                                                        onChange={(e) => setNewEmployee({ ...newEmployee, wagePerDay: e.target.value })}
                                                        placeholder="Enter daily wage"
                                                        className="input input-bordered w-full"
                                                        min="0"
                                                        step="0.01"
                                                        required
                                                    />
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <div className="form-control">
                                                        <label className="label">
                                                            <span className="label-text">Start Date *</span>
                                                        </label>
                                                        <input
                                                            type="date"
                                                            value={newEmployee.startDate}
                                                            onChange={(e) => setNewEmployee({ ...newEmployee, startDate: e.target.value })}
                                                            className="input input-bordered w-full"
                                                            required
                                                        />
                                                    </div>

                                                    <div className="form-control">
                                                        <label className="label">
                                                            <span className="label-text">End Date (Optional)</span>
                                                        </label>
                                                        <input
                                                            type="date"
                                                            value={newEmployee.endDate}
                                                            onChange={(e) => setNewEmployee({ ...newEmployee, endDate: e.target.value })}
                                                            className="input input-bordered w-full"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="modal-action">
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsAddingEmployee(false)}
                                                        className="btn btn-ghost"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button type="submit" className="btn btn-primary" disabled={loading}>
                                                        {loading ? "Adding..." : "Add Employee"}
                                                    </button>
                                                </div>
                                            </form>
                                        </div>
                                        <form method="dialog" className="modal-backdrop">
                                            <button onClick={() => setIsAddingEmployee(false)}>close</button>
                                        </form>
                                    </dialog>
                                )}

                                {/* Delete Employee Confirmation Modal */}
                                {isDeleteEmployeeModalOpen && employeeToDelete && (
                                    <dialog open className="modal modal-open modal-bottom sm:modal-middle">
                                        <div className="modal-box">
                                            <h3 className="font-bold text-lg text-base-content mb-4">Confirm Delete Employee</h3>
                                            <p className="py-4">Are you sure you want to remove <strong>{employeeToDelete.name}</strong> from this project?</p>
                                            <div className="modal-action">
                                                <button className="btn btn-ghost" onClick={() => setIsDeleteEmployeeModalOpen(false)}>
                                                    Cancel
                                                </button>
                                                <button className="btn btn-error" onClick={handleRemoveEmployee}>
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                        <form method="dialog" className="modal-backdrop">
                                            <button onClick={() => setIsDeleteEmployeeModalOpen(false)}>close</button>
                                        </form>
                                    </dialog>
                                )}

                                {/* Activities Card */}
                                <div className="card bg-base-100 shadow-md md:col-span-2">
                                    <div className="card-body">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="text-xl font-semibold text-base-content">Project Activities</h3>
                                            <button
                                                onClick={() => setIsAddingActivity(true)}
                                                className="btn btn-primary btn-sm"
                                            >
                                                <Plus size={16} className="mr-2" />
                                                Add Activity
                                            </button>
                                        </div>

                                        {isAddingActivity && (
                                            <div className="card bg-base-200 mb-4">
                                                <div className="card-body">
                                                    <h4 className="font-medium mb-4">Add New Activity</h4>
                                                    <form onSubmit={handleAddActivity} className="space-y-4">
                                                        <div className="form-control">
                                                            <label className="label">
                                                                <span className="label-text">Activity Name *</span>
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={newActivity.name}
                                                                onChange={(e) => setNewActivity({ ...newActivity, name: e.target.value })}
                                                                placeholder="Enter activity name"
                                                                className="input input-bordered w-full"
                                                                required
                                                            />
                                                        </div>

                                                        <div className="form-control">
                                                            <label className="label">
                                                                <span className="label-text">Description</span>
                                                            </label>
                                                            <textarea
                                                                value={newActivity.description}
                                                                onChange={(e) => setNewActivity({ ...newActivity, description: e.target.value })}
                                                                placeholder="Optional: Describe the activity"
                                                                className="textarea textarea-bordered h-24 w-full"
                                                            ></textarea>
                                                        </div>

                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                            <div className="form-control">
                                                                <label className="label">
                                                                    <span className="label-text">Start Date *</span>
                                                                </label>
                                                                <input
                                                                    type="date"
                                                                    value={newActivity.startDate}
                                                                    onChange={(e) => setNewActivity({ ...newActivity, startDate: e.target.value })}
                                                                    className="input input-bordered w-full"
                                                                    required
                                                                />
                                                            </div>

                                                            <div className="form-control">
                                                                <label className="label">
                                                                    <span className="label-text">Target End Date *</span>
                                                                </label>
                                                                <input
                                                                    type="date"
                                                                    value={newActivity.endDate}
                                                                    onChange={(e) => setNewActivity({ ...newActivity, endDate: e.target.value })}
                                                                    className="input input-bordered w-full"
                                                                    required
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="flex justify-end gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => setIsAddingActivity(false)}
                                                                className="btn btn-ghost"
                                                            >
                                                                Cancel
                                                            </button>
                                                            <button type="submit" className="btn btn-primary" disabled={loading}>
                                                                {loading ? "Adding..." : "Add Activity"}
                                                            </button>
                                                        </div>
                                                    </form>
                                                </div>
                                            </div>
                                        )}

                                        {/* List of activities */}
                                        {(project?.activities?.length || 0) > 0 ? ( // <-- FIX: Use project.activities
    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
        {[...project.activities] // <-- FIX: Use project.activities
            .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
            .map((activity) => (
                <div key={activity._id} className="flex items-start gap-4 p-4 bg-base-200 rounded-lg shadow-sm">
                    <input type="checkbox" checked={activity.status === 'completed'} onChange={() => handleToggleActivity(activity._id)} className="checkbox checkbox-lg checkbox-primary mt-1" />
                    <div className="flex-1">
                        <h4 className={`font-semibold text-lg ${activity.status === 'completed' ? 'line-through text-base-content/50' : ''}`}>{activity.name}</h4>
                        {activity.description && (<p className="text-base-content/70 text-sm mt-1">{activity.description}</p>)}
                        <div className="flex items-center text-sm text-base-content/60 mt-2">
                            <Calendar size={14} className="mr-2" /><span>Start: {formatDate(activity.startDate)}</span>
                            <Clock size={14} className="ml-4 mr-2" /><span>End: {formatDate(activity.dueDate)}</span>
                        </div>
                        {activity.status === 'completed' && activity.completedAt && (<div className="flex items-center text-sm text-success mt-1"><CheckCircle2 size={14} className="mr-2" /><span>Completed on: {formatDate(activity.completedAt)}</span></div>)}
                    </div>
                </div>
            ))}
    </div>
) : (
    <p className="text-base-content/70 text-center py-4">No activities added yet.</p>
)}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column - Project Progress, Financials, Documents */}
                        <div className="lg:w-1/3 space-y-8">
                            {/* Project Progress */}
                            <div className="card bg-base-100 shadow-md">
                                <div className="card-body">
                                    <h3 className="text-xl font-semibold text-base-content mb-4">Project Progress</h3>
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-primary font-bold text-3xl">{projectProgress}%</span>
                                        <div className="radial-progress bg-primary text-primary-content border-4 border-primary" style={{ "--value": projectProgress }} role="progressbar">
                                            {projectProgress}%
                                        </div>
                                    </div>
                                    <progress className="progress progress-primary w-full" value={projectProgress} max="100"></progress>
                                    <p className="text-sm text-base-content/70 mt-2">
                                        {projectProgress === 100 ? "Project completed!" : "Keep up the great work!"}
                                    </p>
                                </div>
                            </div>

                            {/* Documents Card */}
                            <div className="card bg-base-100 shadow-md">
                                <div className="card-body">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-xl font-semibold text-base-content">Project Documents</h3>
                                        <button
                                            onClick={() => setIsUploadModalOpen(true)}
                                            className="btn btn-secondary btn-sm"
                                        >
                                            <Plus size={16} className="mr-2" />
                                            Upload
                                        </button>
                                    </div>
                                    {project.documents && project.documents.length > 0 ? (
                                        <ul className="space-y-3">
                                            {project.documents.map((doc) => (
                                                <li key={doc._id} className="flex items-center justify-between p-3 bg-base-200 rounded-lg">
                                                    <div className="flex items-center gap-3">
                                                        <FileText size={20} className="text-info" />
                                                        <span className="font-medium text-base-content">{doc.name}</span>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <a
                                                            href={`${getBackendUrl()}/projects/${projectId}/documents/${doc._id}/view`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="btn btn-ghost btn-xs tooltip tooltip-left"
                                                            data-tip="View"
                                                        >
                                                            <Eye size={16} />
                                                        </a>
                                                        <a
                                                            href={`${getBackendUrl()}/projects/${projectId}/documents/${doc._id}/download`}
                                                            className="btn btn-ghost btn-xs tooltip tooltip-left"
                                                            data-tip="Download"
                                                        >
                                                            <Download size={16} />
                                                        </a>
                                                        <button
                                                            onClick={() => handleDeleteDocument(doc._id)}
                                                            className="btn btn-ghost btn-xs text-error tooltip tooltip-left"
                                                            data-tip="Delete"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-base-content/70 text-center py-4">No documents uploaded yet.</p>
                                    )}
                                </div>
                            </div>

                            <div className="card bg-base-100 shadow-md">
    <div className="card-body">
        <h3 className="text-xl font-semibold text-base-content mb-4">Payroll History</h3>
        
        {/* --- ADD THIS SEARCH INPUT --- */}
        <div className="mb-4">
            <input 
                type="text"
                placeholder="Search by employee name..."
                className="input input-bordered input-sm w-full"
                value={payrollSearchTerm}
                onChange={(e) => setPayrollSearchTerm(e.target.value)}
            />
        </div>
        {historyLoading ? (
    <div className="flex justify-center items-center p-4"><span className="loading loading-spinner text-primary"></span></div>
) : filteredPayrollHistory.length > 0 ? ( // <-- Use filtered array
    <ul className="space-y-3 max-h-60 overflow-y-auto pr-2">
        {filteredPayrollHistory.map((record) => ( // <-- Use filtered array
            <li key={record._id} className="p-3 bg-base-200 rounded-lg text-sm hover:bg-base-300 cursor-pointer" onClick={() => setSelectedPayrollRecord(record)}>
                <div className="flex justify-between font-medium">
                    <span>{record.employeeName}</span>
                    <span className="font-bold text-green-600">₱{formatNumberDisplay(record.netPay)}</span>
                </div>
                <div className="text-xs text-base-content/70 mt-1">
                    <span>{formatDate(record.processedDate)}</span>
                    <span className="mx-1">|</span>
                    <span>{record.payPeriod}</span>
                </div>
            </li>
        ))}
    </ul>
) : (
    <p className="text-base-content/70 text-center py-4 italic">
        {payrollSearchTerm ? "No records match your search." : "No payroll records yet."}
    </p>
)}
    </div>
</div>

                            {/* Upload Document Modal */}
                            {isUploadModalOpen && (
                                <dialog open className="modal modal-open modal-bottom sm:modal-middle">
                                    <div className="modal-box">
                                        <h3 className="font-bold text-lg text-base-content mb-4">Upload Document</h3>
                                        <input
                                            type="file"
                                            id="fileUploadInputModal"
                                            className="file-input file-input-bordered w-full mb-4"
                                            onChange={(e) => setSelectedFile(e.target.files[0])}
                                        />
                                        <div className="modal-action">
                                            <button className="btn btn-ghost" onClick={() => setIsUploadModalOpen(false)}>
                                                Cancel
                                            </button>
                                            <button className="btn btn-primary" onClick={handleFileUpload} disabled={uploading}>
                                                {uploading ? "Uploading..." : "Upload"}
                                            </button>
                                        </div>
                                    </div>
                                    <form method="dialog" className="modal-backdrop">
                                        <button onClick={() => setIsUploadModalOpen(false)}>close</button>
                                    </form>
                                </dialog>
                            )}
                        </div>
                    </div>

                    {/* Activity Toggle Confirmation Modal */}
                    {isToggleActivityModalOpen && activityToToggle && (
                        <dialog open className="modal modal-open modal-bottom sm:modal-middle">
                            <div className="modal-box">
                                <h3 className="font-bold text-lg text-base-content mb-4">
                                    {activityToToggle.status === 'completed' 
                                        ? 'Mark Activity as Pending' 
                                        : 'Mark Activity as Completed'}
                                </h3>
                                <p className="py-4">
                                    Are you sure you want to mark <strong>{activityToToggle.name}</strong> as{' '}
                                    {activityToToggle.status === 'completed' ? 'pending' : 'completed'}?
                                </p>
                                <div className="modal-action">
                                    <button 
                                        className="btn btn-ghost" 
                                        onClick={() => {
                                            setIsToggleActivityModalOpen(false);
                                            setActivityToToggle(null);
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        className={`btn ${activityToToggle.status === 'completed' ? 'btn-warning' : 'btn-success'}`}
                                        onClick={confirmToggleActivity}
                                    >
                                        {activityToToggle.status === 'completed' ? 'Mark as Pending' : 'Mark as Completed'}
                                    </button>
                                </div>
                            </div>
                            <form method="dialog" className="modal-backdrop">
                                <button onClick={() => {
                                    setIsToggleActivityModalOpen(false);
                                    setActivityToToggle(null);
                                }}>close</button>
                            </form>
                        </dialog>
                    )}

                    {isAddingEmployee && (
                <dialog open className="modal modal-open modal-bottom sm:modal-middle">
                    <div className="modal-box">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg text-base-content">Add New Employee to Project</h3>
                            <button onClick={() => setIsAddingEmployee(false)} className="btn btn-sm btn-circle btn-ghost"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleAddEmployee} className="space-y-4">
                            <div className="form-control">
                                <label className="label"><span className="label-text">Employee Name *</span></label>
                                <input type="text" value={newEmployee.name} onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })} placeholder="Enter employee name" className="input input-bordered w-full" required />
                            </div>
                            <div className="form-control">
                                <label className="label"><span className="label-text">Role *</span></label>
                                <select name="role" value={newEmployee.role} onChange={(e) => setNewEmployee({ ...newEmployee, role: e.target.value })} className="select select-bordered w-full" required>
                                    <option value="">Select a role</option>
                                    {PREDEFINED_ROLES_PROJECT.map(roleName => (<option key={roleName} value={roleName}>{roleName}</option>))}
                                </select>
                            </div>
                            <div className="form-control">
                                <label className="label"><span className="label-text">Wage per Day (₱) *</span></label>
                                <input type="number" value={newEmployee.wagePerDay} onChange={(e) => setNewEmployee({ ...newEmployee, wagePerDay: e.target.value })} placeholder="Enter daily wage" className="input input-bordered w-full" min="0" step="0.01" required />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="form-control">
                                    <label className="label"><span className="label-text">Project Start Date *</span></label>
                                    <input type="date" value={newEmployee.startDate} onChange={(e) => setNewEmployee({ ...newEmployee, startDate: e.target.value })} className="input input-bordered w-full" required />
                                </div>
                                <div className="form-control">
                                    <label className="label"><span className="label-text">Project End Date (Optional)</span></label>
                                    <input type="date" value={newEmployee.endDate} onChange={(e) => setNewEmployee({ ...newEmployee, endDate: e.target.value })} className="input input-bordered w-full" />
                                </div>
                            </div>
                            <div className="modal-action">
                                <button type="button" onClick={() => setIsAddingEmployee(false)} className="btn btn-ghost">Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? "Adding..." : "Add Employee"}</button>
                            </div>
                        </form>
                    </div>
                    <form method="dialog" className="modal-backdrop"><button onClick={() => setIsAddingEmployee(false)}>close</button></form>
                </dialog>
            )}

                    {showProjectPayrollModal && (
                <dialog open className="modal modal-open modal-bottom sm:modal-middle">
                    <div className="modal-box w-11/12 max-w-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg">Run Payroll for Project Employee</h3>
                            <button onClick={() => { setShowProjectPayrollModal(false); resetPayrollModal(); }} className="btn btn-sm btn-circle btn-ghost"><X size={20} /></button>
                        </div>
                        {projectPayrollError && <div className="alert alert-error shadow-lg mb-4"><div><AlertCircle size={20} /><span>{projectPayrollError}</span></div></div>}
                        
                        {payrollResultForProject ? (
                            <div className="mt-6 p-6 bg-green-50 border border-green-200 rounded-xl shadow-lg">
                                <h3 className="text-xl font-semibold text-green-800 mb-3">Payroll Processed for: {payrollResultForProject.employeeName}</h3>
                                <div className="space-y-1 text-sm text-gray-700">
                                    <p><strong>Pay Period:</strong> {payrollResultForProject.payPeriod}</p>
                                    <p><strong>Daily Rate:</strong> {formatNumberDisplay(payrollResultForProject.dailyRate)}</p>
                                    <p><strong>Regular Days Worked:</strong> {formatNumberDisplay(payrollResultForProject.regularDaysWorked)}</p>
                                    <p><strong>Overtime Hours:</strong> {formatNumberDisplay(payrollResultForProject.overtimeHours)} (Factor: {payrollResultForProject.overtimeRateFactor}x)</p>
                                    <hr className="my-2" />
                                    <p><strong>Regular Pay:</strong> {formatNumberDisplay(payrollResultForProject.regularPay)}</p>
                                    <p><strong>Overtime Pay:</strong> {formatNumberDisplay(payrollResultForProject.overtimePay)}</p>
                                    <p className="font-medium"><strong>Gross Wage:</strong> {formatNumberDisplay(payrollResultForProject.grossWage)}</p>
                                    <hr className="my-2" />
                                    <h4 className="font-medium mt-2">Deductions:</h4>
                                    {payrollResultForProject.deductions && payrollResultForProject.deductions.length > 0 ? (
                                        payrollResultForProject.deductions.map((ded, index) => (<p key={index} className="flex justify-between text-red-600"><span>{ded.description}:</span><span>({formatNumberDisplay(ded.amount)})</span></p>))
                                    ) : <p className="text-xs italic">No deductions applied.</p>}
                                    <p className="font-medium flex justify-between"><strong>Total Deductions:</strong> <span>({formatNumberDisplay(payrollResultForProject.totalDeductions)})</span></p>
                                    <hr className="my-2 border-t-2 border-gray-300" />
                                    <p className="text-lg font-bold text-green-700 flex justify-between"><strong>NET PAY:</strong> <span>{formatNumberDisplay(payrollResultForProject.netPay)}</span></p>
                                    {payrollResultForProject.notes && <p className="mt-2 text-xs italic"><strong>Notes:</strong> {payrollResultForProject.notes}</p>}
                                </div>
                            </div>
                        ) : !selectedProjectEmployeeForPayroll ? (
                            <>
                                <h4 className="font-medium mb-2">Select an employee:</h4>
                                {filteredEmployees.length > 0 ? (
                                    <ul className="menu bg-base-100 rounded-box max-h-60 overflow-y-auto">
                                        {filteredEmployees.map(emp => (
                                            <li key={emp._id}><a onClick={() => setSelectedProjectEmployeeForPayroll({ ...emp, dailyRate: emp.wagePerDay })}>{emp.name} ({emp.role})</a></li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-center text-gray-500 italic p-4">No employees assigned to this project.</p>
                                )}
                            </>
                        ) : (
                            <PayrollRunForm selectedEmployee={selectedProjectEmployeeForPayroll} onRunPayrollTrigger={handleProjectPayrollSubmitTrigger} isLoading={isProcessingProjectPayroll} />
                        )}
                        
                        <div className="modal-action mt-4">
                            {payrollResultForProject && (<button type="button" onClick={resetPayrollModal} className="btn btn-secondary"><RotateCcw size={16} className="mr-2"/>Run for Another</button>)}
                            <button type="button" onClick={() => { setShowProjectPayrollModal(false); resetPayrollModal(); }} className="btn btn-ghost">Close</button>
                        </div>
                    </div>
                    <form method="dialog" className="modal-backdrop"><button onClick={() => { setShowProjectPayrollModal(false); resetPayrollModal(); }}>close</button></form>
                </dialog>
            )}
            
            {showConfirmModalProjectPayroll && modalActionProjectPayroll && (
                 <ConfirmationModal
                    isOpen={showConfirmModalProjectPayroll}
                    onClose={handleModalCloseProjectPayroll}
                    onConfirm={handleModalConfirmProjectPayroll}
                    title={modalActionProjectPayroll.content.title}
                    message={modalActionProjectPayroll.content.message}
                    confirmText={modalActionProjectPayroll.content.confirmText}
                />
            )}

            {selectedPayrollRecord && (
                <dialog open className="modal modal-open modal-bottom sm:modal-middle">
                    <div className="modal-box w-11/12 max-w-lg">
                        <div className="flex justify-between items-center mb-4 border-b pb-2">
                            <h3 className="font-bold text-lg">Payroll Receipt</h3>
                             <button onClick={() => setSelectedPayrollRecord(null)} className="btn btn-sm btn-circle btn-ghost"><X size={20} /></button>
                        </div>
                        <div className="space-y-2 text-sm p-2">
    <p><strong>Date Processed:</strong> {formatDate(selectedPayrollRecord.processedDate)}</p>
    <p><strong>Employee:</strong> {selectedPayrollRecord.employeeName}</p>
    <p><strong>Pay Period:</strong> {selectedPayrollRecord.payPeriod}</p>

    <hr className="my-3 border-t border-gray-200"/>

    <h4 className="font-semibold text-gray-800 text-md">Earnings</h4>
    <div className="grid grid-cols-2 gap-x-4 pl-2">
        <span>Regular Pay:</span>
        <span className="text-right font-medium">₱{formatNumberDisplay(selectedPayrollRecord.regularPay)}</span>
        <span className="text-xs text-gray-500 col-span-2 pl-2">
            ({selectedPayrollRecord.regularDaysWorked} days @ ₱{formatNumberDisplay(selectedPayrollRecord.dailyRate)}/day)
        </span>
        
        <span>Overtime Pay:</span>
        <span className="text-right font-medium">₱{formatNumberDisplay(selectedPayrollRecord.overtimePay)}</span>
        <span className="text-xs text-gray-500 col-span-2 pl-2">
            ({selectedPayrollRecord.overtimeHours || 0} hours)
        </span>
    </div>
    <hr className="my-2 border-t border-gray-200"/>
    <div className="grid grid-cols-2 gap-x-4 pl-2 font-bold">
        <span>Gross Wage:</span>
        <span className="text-right">₱{formatNumberDisplay(selectedPayrollRecord.grossWage)}</span>
    </div>

    <hr className="my-3 border-t border-gray-200"/>
    
    <h4 className="font-semibold text-gray-800 text-md">Deductions</h4>
    {selectedPayrollRecord.deductions?.length > 0 ? (
        <div className="grid grid-cols-2 gap-x-4 pl-2 text-red-600">
        {selectedPayrollRecord.deductions.map((ded, index) => (
            <React.Fragment key={index}>
                <span>{ded.description}:</span>
                <span className="text-right">(₱{formatNumberDisplay(ded.amount)})</span>
            </React.Fragment>
        ))}
        </div>
    ) : <p className="pl-2 text-xs italic text-gray-500">No deductions applied.</p>}
    <hr className="my-2 border-t border-gray-200"/>
    <div className="grid grid-cols-2 gap-x-4 pl-2 font-bold text-red-600">
        <span>Total Deductions:</span>
        <span className="text-right">(₱{formatNumberDisplay(selectedPayrollRecord.totalDeductions)})</span>
    </div>
    
    <hr className="my-3 border-t-2 border-gray-400"/>
    
    <div className="grid grid-cols-2 gap-x-4 text-lg font-bold text-green-700">
        <span>NET PAY:</span>
        <span className="text-right">₱{formatNumberDisplay(selectedPayrollRecord.netPay)}</span>
    </div>

    {selectedPayrollRecord.notes && (
        <>
            <hr className="my-3 border-t border-gray-200"/>
            <p className="text-xs text-gray-600"><strong>Notes:</strong> {selectedPayrollRecord.notes}</p>
        </>
    )}
</div>
                        <div className="modal-action mt-6">
                            <button onClick={() => setSelectedPayrollRecord(null)} className="btn">Close</button>
                        </div>
                    </div>
                    <form method="dialog" className="modal-backdrop"><button onClick={() => setSelectedPayrollRecord(null)}>close</button></form>
                </dialog>
            )}

            {isDeleteEmployeeModalOpen && employeeToDelete && (
                 <dialog open className="modal modal-open modal-bottom sm:modal-middle">
                    <div className="modal-box">
                        <h3 className="font-bold text-lg">Confirm Delete</h3>
                        <p className="py-4">Are you sure you want to remove <strong>{employeeToDelete.name}</strong> from this project?</p>
                        <div className="modal-action">
                            <button className="btn btn-ghost" onClick={() => setIsDeleteEmployeeModalOpen(false)}>Cancel</button>
                            <button className="btn btn-error" onClick={handleRemoveEmployee}>Delete</button>
                        </div>
                    </div>
                    <form method="dialog" className="modal-backdrop"><button onClick={() => setIsDeleteEmployeeModalOpen(false)}>close</button></form>
                </dialog>
            )}

            {isUploadModalOpen && (
                 <dialog open className="modal modal-open modal-bottom sm:modal-middle">
                    <div className="modal-box">
                        <h3 className="font-bold text-lg">Upload Document</h3>
                        <input type="file" id="fileUploadInputModal" className="file-input file-input-bordered w-full my-4" onChange={(e) => setSelectedFile(e.target.files[0])} />
                        <div className="modal-action">
                            <button className="btn btn-ghost" onClick={() => setIsUploadModalOpen(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleFileUpload} disabled={uploading}>{uploading ? "Uploading..." : "Upload"}</button>
                        </div>
                    </div>
                    <form method="dialog" className="modal-backdrop"><button onClick={() => setIsUploadModalOpen(false)}>close</button></form>
                </dialog>
            )}

            {isPreviewModalOpen && previewFile && (
                 <dialog open className="modal modal-open">
                    <div className="modal-box w-11/12 max-w-5xl">
                        <h3 className="font-bold text-lg mb-2">{previewFile.name}</h3>
                        <button onClick={() => setIsPreviewModalOpen(false)} className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
                        {previewFile.type.startsWith('image/') ? (
                            <img src={previewFile.url} alt="Preview" className="max-w-full max-h-[80vh] rounded"/>
                        ) : (
                            <iframe src={previewFile.url} title={previewFile.name} className="w-full h-[80vh]" />
                        )}
                    </div>
                     <form method="dialog" className="modal-backdrop"><button onClick={() => setIsPreviewModalOpen(false)}>close</button></form>
                </dialog>
            )}
                </>

                
            )}
        </div>
    );
};

export default ProjectDetailsPage;