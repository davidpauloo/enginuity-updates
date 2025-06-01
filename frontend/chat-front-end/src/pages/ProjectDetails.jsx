import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { FileText, Trash2, Download, Eye, X, User, CheckCircle2, Calendar, Clock, AlertCircle, Plus, DollarSign, Briefcase, ChevronLeft } from "lucide-react";
import { axiosInstance } from "../lib/axios"; 

const formatDate = (dateString) => {
    if (!dateString) return 'N/A'; // Handle null/empty date strings gracefully
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date'; // Handle invalid date objects
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
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
    const [activities, setActivities] = useState([]); // This will be directly populated from project.activities
    const [error, setError] = useState(null);
    const [isDeleteEmployeeModalOpen, setIsDeleteEmployeeModalOpen] = useState(false);
    const [employeeToDelete, setEmployeeToDelete] = useState(null);
    const [employeeSearch, setEmployeeSearch] = useState('');
    const [selectedCoverFile, setSelectedCoverFile] = useState(null);
    const [uploadingCover, setUploadingCover] = useState(false);
    const [uploadCoverError, setUploadCoverError] = useState(null);
    const [coverPhotoPreview, setCoverPhotoPreview] = useState(null);
    const [coverImageUrl, setCoverImageUrl] = useState(null);

    const fetchProjectDetails = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await axiosInstance.get(`/projects/${projectId}`);
            setProject(res.data);
            // Ensure activities are always an array, and use a consistent identifier (_id or id)
            setActivities(res.data.activities && Array.isArray(res.data.activities) ? res.data.activities : []);
        } catch (err) {
            console.error('Error fetching project details:', err.response?.data || err.message);
            setError(err.response?.data?.message || err.message || 'Failed to load project details.');
            toast.error(err.response?.data?.message || err.message || 'Failed to load project details.');
        } finally {
            setLoading(false);
        }
    };

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

    const handleToggleActivity = async (activityId) => {
        try {
            const activityToUpdate = activities.find(a => (a.id || a._id) === activityId);
            if (!activityToUpdate) return;

            const newStatus = activityToUpdate.status === 'completed' ? 'pending' : 'completed';
            const updates = { status: newStatus };

            // Optimistic update for immediate UI feedback
            const updatedActivitiesOptimistic = activities.map(activity =>
                (activity.id || activity._id) === activityId
                    ? { ...activity, status: newStatus, completedAt: newStatus === 'completed' ? new Date().toISOString() : undefined }
                    : activity
            );
            setActivities(updatedActivitiesOptimistic);

            // Make API call to update activity status
            const response = await axiosInstance.patch(`/projects/${projectId}/activities/${activityId}`, updates);

            // The backend's updateActivity route *should* return the entire updated project object.
            if (response.data && response.data.activities) { // Assuming response.data is the updated project
                setProject(response.data); // Update project state from backend response
                setActivities(response.data.activities); // Update activities from the project object
            } else {
                // Fallback: Re-fetch project details if the response structure is not as expected
                fetchProjectDetails();
            }

            toast.success("Activity status and project progress updated successfully!");
        } catch (error) {
            console.error('Error updating activity:', error.response?.data || error.message);
            toast.error(error.response?.data?.message || error.message || 'Failed to update activity status');
            // If API call fails, revert to actual backend state
            fetchProjectDetails();
        }
    };

    // Modified to accept activities array to calculate progress based on specific state
    const calculateProgress = (currentActivities) => {
        if (!currentActivities || currentActivities.length === 0) return 0;
        const completedCount = currentActivities.filter(activity => activity.status === 'completed').length;
        return Math.round((completedCount / currentActivities.length) * 100);
    };

    const getUpcomingDeadlines = () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        console.log('All activities:', activities); // Debug log

        return activities
            .filter(activity => {
                const dueDate = new Date(activity.dueDate);
                dueDate.setHours(0, 0, 0, 0);
                
                console.log('Activity:', {
                    name: activity.name,
                    dueDate: activity.dueDate,
                    parsedDueDate: dueDate,
                    isValid: !isNaN(dueDate.getTime()),
                    isFuture: dueDate >= today,
                    status: activity.status
                });

                return dueDate >= today && activity.status !== 'completed';
            })
            .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
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

    const handleUploadCoverPhoto = async (file) => {
        if (!file) {
            toast.error('Please select an image file to upload as cover photo.');
            return;
        }

        setUploadingCover(true);
        setUploadCoverError(null);

        const formData = new FormData();
        formData.append('coverPhoto', file);

        try {
            const res = await axiosInstance.patch(`/projects/${projectId}/imageUrl`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            console.log('Upload response:', res.data);

            // Update project with new image URL
            setProject(prev => ({
                ...prev,
                imageUrl: res.data.imageUrl || res.data,
                lastUpdated: new Date().toISOString()
            }));

            setCoverImageUrl(res.data.imageUrl || res.data);

            // Clean up preview
            if (coverPhotoPreview) {
                URL.revokeObjectURL(coverPhotoPreview);
                setCoverPhotoPreview(null);
            }

            // Clean up form
            setSelectedCoverFile(null);
            const fileInput = document.getElementById('coverPhotoInput');
            if (fileInput) fileInput.value = '';

            toast.success('Cover photo updated successfully!');

        } catch (err) {
            console.error('Error uploading cover photo:', err);
            
            // Clean up preview on error
            if (coverPhotoPreview) {
                URL.revokeObjectURL(coverPhotoPreview);
                setCoverPhotoPreview(null);
            }
            
            const errorMessage = err.response?.data?.message || 'Failed to upload cover photo.';
            setUploadCoverError(errorMessage);
            toast.error(errorMessage);
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

    // Banner Section Component
    const BannerSection = () => {
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
                                {project?.description || 'No description available'}
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

    // Use actual project.progress from backend if available, otherwise default to 0
    const projectProgress = project?.progress !== undefined ? project.progress : calculateProgress(activities); // Use calculated progress if backend doesn't provide it

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
                                            <button
                                                onClick={() => setIsAddingEmployee(true)}
                                                className="btn btn-primary btn-sm"
                                            >
                                                <Plus size={16} className="mr-2" />
                                                Add Employee
                                            </button>
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
                                        {activities.length > 0 ? (
                                            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                                                {activities
                                                    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
                                                    .map((activity) => (
                                                        <div key={activity._id || activity.id} className="flex items-start gap-4 p-4 bg-base-200 rounded-lg shadow-sm">
                                                            <input
                                                                type="checkbox"
                                                                checked={activity.status === 'completed'}
                                                                onChange={() => handleToggleActivity(activity._id || activity.id)}
                                                                className="checkbox checkbox-lg checkbox-primary mt-1"
                                                            />
                                                            <div className="flex-1">
                                                                <h4 className={`font-semibold text-lg ${activity.status === 'completed' ? 'line-through text-base-content/50' : ''}`}>
                                                                    {activity.name}
                                                                </h4>
                                                                {activity.description && (
                                                                    <p className="text-base-content/70 text-sm mt-1">
                                                                        {activity.description}
                                                                    </p>
                                                                )}
                                                                <div className="flex items-center text-sm text-base-content/60 mt-2">
                                                                    <Calendar size={14} className="mr-2" />
                                                                    <span>Start: {formatDate(activity.startDate)}</span>
                                                                    <Clock size={14} className="ml-4 mr-2" />
                                                                    <span>End: {formatDate(activity.dueDate)}</span> {/* Display dueDate */}
                                                                </div>
                                                                {activity.status === 'completed' && activity.completedAt && (
                                                                    <div className="flex items-center text-sm text-success mt-1">
                                                                        <CheckCircle2 size={14} className="mr-2" />
                                                                        <span>Completed on: {formatDate(activity.completedAt)}</span>
                                                                    </div>
                                                                )}
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
                                                            href={doc.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="btn btn-ghost btn-xs tooltip tooltip-left"
                                                            data-tip="View"
                                                        >
                                                            <Eye size={16} />
                                                        </a>
                                                        <a
                                                            href={doc.url}
                                                            download
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
                </>
            )}
        </div>
    );
};

export default ProjectDetailsPage;