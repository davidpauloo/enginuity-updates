import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { FileText, Trash2, Download, Eye, X, User, CheckCircle2, Calendar, Clock, AlertCircle, Plus, DollarSign, Briefcase } from "lucide-react";
import { axiosInstance } from "../lib/axios"; // Ensure this path is correct

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
    endDate: ''
  });
  const [newActivity, setNewActivity] = useState({
    name: '', // This will map to 'title' on the backend for activities
    description: '',
    startDate: '',
    endDate: '' // This maps to dueDate on the backend
  });
  const [activities, setActivities] = useState([]);
  const [error, setError] = useState(null);
  const [isDeleteEmployeeModalOpen, setIsDeleteEmployeeModalOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);
  const [employeeSearch, setEmployeeSearch] = useState('');

  const fetchProjectDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axiosInstance.get(`/projects/${projectId}`);
      setProject(res.data);
      // Ensure activities are always an array, and use a consistent identifier (_id or id)
      setActivities(res.data.activities && Array.isArray(res.data.activities) ? res.data.activities : []);
    } catch (err) {
      console.error('Error fetching project details:', err);
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
      setProject(response.data.project);
      toast.success('Document uploaded successfully!');
      setSelectedFile(null);
      setIsUploadModalOpen(false);
      if (document.getElementById('fileUploadInputModal')) {
        document.getElementById('fileUploadInputModal').value = "";
      }
    } catch (err) {
      console.error('Error uploading document:', err);
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
      setProject(response.data.project);
      toast.success('Document deleted successfully!');
    } catch (err) {
      console.error('Error deleting document:', err);
      toast.error(err.response?.data?.message || 'Failed to delete document.');
    }
  };

  const handleAddActivity = async (e) => {
    e.preventDefault();
    if (!newActivity.name.trim() || !newActivity.startDate || !newActivity.endDate) {
      toast.error("Please fill in all required fields for activity.");
      return;
    }

    try {
      setLoading(true);
      const activityData = {
        title: newActivity.name.trim(), // Correctly map 'name' from form to 'title' for backend
        description: newActivity.description.trim(),
        startDate: newActivity.startDate,
        dueDate: newActivity.endDate, // Maps to dueDate on backend
        status: 'pending' // New activities should start as pending
      };

      // When adding an activity, your backend's POST /projects/:projectId/activities
      // should ideally return the *updated project* object, which includes the
      // new activity and the re-calculated project progress.
      const response = await axiosInstance.post(`/projects/${projectId}/activities`, activityData);

      // Assuming backend sends back the updated project with new activity and progress
      setProject(response.data.project);
      setActivities(response.data.project.activities); // Update activities from the project data

      // Reset the form
      setNewActivity({
        name: '',
        description: '',
        startDate: '',
        endDate: ''
      });
      setIsAddingActivity(false);
      toast.success("Activity added successfully");
    } catch (error) {
      console.error('Error adding activity:', error);
      toast.error(error.response?.data?.message || error.message || 'Failed to add activity');
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
          ? { ...activity, status: newStatus }
          : activity
      );
      setActivities(updatedActivitiesOptimistic);

      // Calculate new progress based on the optimistically updated activities
      const newProgress = calculateProgress(updatedActivitiesOptimistic);

      // Optimistically update project progress
      setProject(prevProject => ({
        ...prevProject,
        progress: newProgress
      }));

      // Make API call to update activity status
      await axiosInstance.patch(`/projects/${projectId}/activities/${activityId}`, updates);

      // Now, re-fetch the entire project details. This is the most reliable way
      // to ensure both the activities list and the project's progress
      // are perfectly in sync with what the backend has.
      // Your backend's activity update endpoint *should* ideally recalculate
      // and update the project's overall progress. If it does, no separate
      // PUT request for project progress is needed here.
      // If your backend does NOT automatically update project progress on activity status change,
      // you would need an additional call like:
      // await axiosInstance.put(`/projects/${projectId}`, { progress: newProgress });
      // But re-fetching is generally preferred for data consistency.
      await fetchProjectDetails();

      toast.success("Activity status and project progress updated successfully!");
    } catch (error) {
      console.error('Error updating activity:', error);
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

    return activities
      .filter(activity => {
        const dueDate = new Date(activity.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate >= today && activity.status !== 'completed';
      })
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
      .slice(0, 5);
  };

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    if (!newEmployee.name.trim() || !newEmployee.role.trim() || !newEmployee.wagePerDay || !newEmployee.startDate) {
      toast.error("Please fill in all required fields for employee.");
      return;
    }

    try {
      setLoading(true);
      const employeeData = {
        name: newEmployee.name.trim(),
        role: newEmployee.role.trim(),
        wagePerDay: parseFloat(newEmployee.wagePerDay),
        startDate: new Date(newEmployee.startDate).toISOString(),
        endDate: newEmployee.endDate ? new Date(newEmployee.endDate).toISOString() : null
      };

      console.log('Sending employee data:', employeeData);

      const response = await axiosInstance.post(`/projects/${projectId}/employees`, employeeData);

      if (response.data && response.data.project) {
        setProject(response.data.project); // Update project state with the new employee
        setNewEmployee({
          name: '',
          role: '',
          wagePerDay: '',
          startDate: '',
          endDate: ''
        });
        setIsAddingEmployee(false);
        toast.success("Employee added successfully");
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('Error adding employee:', error);
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
      setProject(response.data.project); // Update project state from backend response
      toast.success("Employee removed successfully");
      setIsDeleteEmployeeModalOpen(false);
      setEmployeeToDelete(null);
    } catch (error) {
      console.error('Error removing employee:', error);
      toast.error(error.response?.data?.message || error.message || 'Failed to remove employee');
    }
  };

  const confirmDeleteEmployee = (employee) => {
    setEmployeeToDelete(employee); // Store the full employee object
    setIsDeleteEmployeeModalOpen(true);
  };

  if (loading && !project && !error) { // Show loading state until project is fetched
    return (
      <div className="flex justify-center items-center h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <div role="alert" className="alert alert-error shadow-lg mb-8">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Error! {error}</span>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/projects')}>
          Go back to Projects
        </button>
      </div>
    );
  }

  if (!project) { // Should not be reached if error handling is correct, but as a fallback
    return (
      <div className="p-8 text-center">
        <div role="alert" className="alert alert-error shadow-lg mb-8">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Error! Project not found.</span>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/projects')}>
          Go back to Projects
        </button>
      </div>
    );
  }


  const projectImageUrl = project.imageUrl || 'https://placehold.co/1200x300/2563eb/ffffff?text=Project+Banner';
  const projectName = project.name || project.clientName || 'Project Name';
  const projectDescription = project.description || 'No description available.';

  const assignedEmployees = project.employees && Array.isArray(project.employees)
    ? project.employees
    : [];

  const filteredEmployees = assignedEmployees.filter(employee =>
    employee.name.toLowerCase().includes(employeeSearch.toLowerCase()) ||
    employee.role.toLowerCase().includes(employeeSearch.toLowerCase())
  );

  // Use actual project.progress from backend if available, otherwise default to 0
  const projectProgress = project.progress !== undefined ? project.progress : 0;

  return (
    <div className="p-0 sm:p-0 md:p-0 lg:p-0 xl:p-0 2xl:p-0">
      {/* Back button and Project Banner */}
      <div className="flex items-center mb-4">
        <button
          className="btn btn-ghost btn-circle mr-2"
          onClick={() => navigate(-1)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </button>
      </div>

      {/* Project Banner with Title and Client Name */}
      <div
        className="relative bg-cover bg-center h-64 rounded-lg shadow-md mb-8"
        style={{ backgroundImage: `url(${projectImageUrl})` }}
      >
        <div className="absolute inset-0 bg-black bg-opacity-40 rounded-lg flex items-end p-6">
          <div className="text-white">
            <h1 className="text-3xl font-bold mb-2">{projectName}</h1>
            <p className="text-xl opacity-90">Client: {project.clientName || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
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
                <ul className="space-y-3">
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
                            {/* Changed from activity.name to activity.title */}
                            <span className={`font-medium ${activity.status === 'completed' ? 'line-through text-base-content/50' : ''}`}>
                              {activity.title}
                            </span>
                            <span className="text-sm text-base-content/70">
                              {new Date(activity.dueDate).toLocaleDateString()}
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
                                {new Date(employee.startDate).toLocaleDateString()}
                                {employee.endDate ? ` - ${new Date(employee.endDate).toLocaleDateString()}` : ''}
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
                        onChange={(e) => setNewEmployee({...newEmployee, name: e.target.value})}
                        placeholder="Enter employee name (e.g., John Doe)"
                        className="input input-bordered w-full"
                        required
                      />
                      <label className="label">
                          <span className="label-text-alt text-warning">
                            *Name must exactly match an existing user's name to assign.
                          </span>
                      </label>
                    </div>

                    <div className="form-control">
                      <label className="label">
                        <span className="label-text">Role *</span>
                      </label>
                      <input
                        type="text"
                        value={newEmployee.role}
                        onChange={(e) => setNewEmployee({...newEmployee, role: e.target.value})}
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
                        onChange={(e) => setNewEmployee({...newEmployee, wagePerDay: e.target.value})}
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
                          onChange={(e) => setNewEmployee({...newEmployee, startDate: e.target.value})}
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
                          onChange={(e) => setNewEmployee({...newEmployee, endDate: e.target.value})}
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
                            onChange={(e) => setNewActivity({...newActivity, name: e.target.value})}
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
                            onChange={(e) => setNewActivity({...newActivity, description: e.target.value})}
                            placeholder="Enter activity description"
                            className="textarea textarea-bordered w-full"
                            rows="3"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="form-control">
                            <label className="label">
                              <span className="label-text">Start Date *</span>
                            </label>
                            <input
                              type="date"
                              value={newActivity.startDate}
                              onChange={(e) => setNewActivity({...newActivity, startDate: e.target.value})}
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
                              onChange={(e) => setNewActivity({...newActivity, endDate: e.target.value})}
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

                <div className="divider">Current Activities</div>
                <ul className="space-y-4">
                  {activities.length > 0 ? (
                    activities.map((activity) => (
                      <li key={activity.id || activity._id} className="card bg-base-200 p-4">
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={activity.status === 'completed'}
                            onChange={() => handleToggleActivity(activity.id || activity._id)}
                            className="checkbox checkbox-primary mt-1"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              {/* Changed from activity.name to activity.title */}
                              <span className={`font-medium ${activity.status === 'completed' ? 'line-through text-base-content/50' : 'text-base-content'}`}>
                                {activity.title}
                              </span>
                            </div>
                            {activity.description && (
                              <p className="text-sm text-base-content/70 mt-1">
                                {activity.description}
                              </p>
                            )}
                            <div className="mt-2 text-sm text-base-content/70">
                              <div className="flex items-center gap-2">
                                <Calendar size={14} />
                                <span>
                                  {new Date(activity.startDate).toLocaleDateString()} - {new Date(activity.dueDate).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                            {/* Assuming 'assignedTo' might be a populated user object or just an ID from backend */}
                            {activity.assignedTo && activity.assignedTo.name && (
                                <div className="mt-1 text-sm text-base-content/70 flex items-center gap-2">
                                    <User size={14} /> Assigned to: {activity.assignedTo.name}
                                </div>
                            )}
                          </div>
                        </div>
                      </li>
                    ))
                  ) : (
                    <li className="text-center text-base-content/70 py-4">
                      No activities for this project yet.
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Project Overview, Progress, Budget, Documents */}
        <div className="lg:w-1/3 space-y-8">
          {/* Project Overview Card */}
          <div className="card bg-base-100 shadow-md">
            <div className="card-body">
              <h2 className="text-2xl font-semibold text-base-content mb-4">Project Overview</h2>
              <div className="flex items-center mb-2 text-base-content/80">
                <CheckCircle2 size={20} className="mr-2 text-primary" />
                <strong>Status:</strong> <span className="capitalize ml-1">{project.status}</span>
              </div>
              <div className="flex items-center mb-2 text-base-content/80">
                <Calendar size={20} className="mr-2 text-primary" />
                <strong>Start Date:</strong> <span className="ml-1">{new Date(project.startDate).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center mb-2 text-base-content/80">
                <Clock size={20} className="mr-2 text-primary" />
                <strong>Target Deadline:</strong> <span className="ml-1">{new Date(project.targetDeadline).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center mb-2 text-base-content/80">
                <User size={20} className="mr-2 text-primary" />
                <strong>Created By:</strong> <span className="ml-1">{project.createdBy?.name || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Progress Card */}
          <div className="card bg-base-100 shadow-md">
            <div className="card-body">
              <h2 className="text-2xl font-semibold text-base-content mb-4">Project Progress</h2>
              <div className="flex items-center justify-between mb-2">
                <span className="text-lg font-medium">Completion:</span>
                <span className="text-lg font-bold text-primary">{projectProgress}%</span>
              </div>
              <progress
                className="progress progress-primary w-full"
                value={projectProgress}
                max="100"
              ></progress>
            </div>
          </div>

          {/* Budget Card */}
          <div className="card bg-base-100 shadow-md">
            <div className="card-body">
              <h2 className="text-2xl font-semibold text-base-content mb-4">Budget Overview</h2>
              <div className="flex items-center justify-between mb-2 text-base-content/80">
                <DollarSign size={20} className="mr-2 text-primary" />
                <span>Estimated:</span>
                <span className="font-bold">{project.budget?.currency || '₱'}{project.budget?.estimated?.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between mb-2 text-base-content/80">
                <DollarSign size={20} className="mr-2 text-primary" />
                <span>Spent:</span>
                <span className="font-bold">{project.budget?.currency || '₱'}{project.budget?.spent?.toLocaleString() || '0'}</span>
              </div>
              <div className="flex items-center justify-between mt-4 text-base-content/80">
                <AlertCircle size={20} className="mr-2 text-warning" />
                <span>Remaining:</span>
                <span className="font-bold text-warning">
                  {project.budget?.currency || '₱'}
                  {(project.budget?.estimated - (project.budget?.spent || 0))?.toLocaleString() || 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Documents Card */}
          <div className="card bg-base-100 shadow-md">
            <div className="card-body">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold text-base-content">Project Documents</h2>
                <button onClick={() => setIsUploadModalOpen(true)} className="btn btn-primary btn-sm">
                  <Plus size={16} className="mr-2" />
                  Upload Document
                </button>
              </div>
              {project.documents && project.documents.length > 0 ? (
                <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                  {project.documents.map((doc) => (
                    <div key={doc._id} className="flex items-center justify-between p-3 bg-base-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText size={20} className="text-info" />
                        <span className="font-medium text-base-content break-all">{doc.fileName}</span>
                      </div>
                      <div className="flex gap-2">
                        <a
                          href={`${axiosInstance.defaults.baseURL}/${doc.filePath}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-ghost btn-sm text-info hover:bg-info/10"
                          download
                        >
                          <Download size={16} />
                        </a>
                        <button
                          onClick={() => {
                            setPreviewFile(doc);
                            setIsPreviewModalOpen(true);
                          }}
                          className="btn btn-ghost btn-sm text-success hover:bg-success/10"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteDocument(doc._id)}
                          className="btn btn-ghost btn-sm text-error hover:bg-error/10"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-base-content/70 py-4">No documents uploaded yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* File Upload Modal */}
      {isUploadModalOpen && (
        <dialog open className="modal modal-open modal-bottom sm:modal-middle">
          <div className="modal-box">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-base-content">Upload New Document</h3>
              <button onClick={() => setIsUploadModalOpen(false)} className="btn btn-sm btn-circle btn-ghost">
                <X size={20} />
              </button>
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Select Document</span>
              </label>
              <input
                type="file"
                id="fileUploadInputModal"
                className="file-input file-input-bordered w-full"
                onChange={(e) => setSelectedFile(e.target.files[0])}
              />
            </div>
            <div className="modal-action">
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="btn btn-ghost"
              >
                Cancel
              </button>
              <button onClick={handleFileUpload} className="btn btn-primary" disabled={uploading}>
                {uploading ? "Uploading..." : "Upload"}
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => setIsUploadModalOpen(false)}>close</button>
          </form>
        </dialog>
      )}

      {/* File Preview Modal */}
      {isPreviewModalOpen && previewFile && (
        <dialog open className="modal modal-open modal-bottom sm:modal-middle">
          <div className="modal-box w-11/12 max-w-5xl h-[80vh]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-base-content">Preview: {previewFile.fileName}</h3>
              <button onClick={() => setIsPreviewModalOpen(false)} className="btn btn-sm btn-circle btn-ghost">
                <X size={20} />
              </button>
            </div>
            <div className="h-[calc(80vh-100px)] overflow-auto bg-base-200 p-4 rounded-lg">
              {previewFile.fileType.startsWith('image/') ? (
                <img src={`${axiosInstance.defaults.baseURL}/${previewFile.filePath}`} alt="Preview" className="max-w-full h-auto mx-auto" />
              ) : previewFile.fileType === 'application/pdf' ? (
                <iframe src={`${axiosInstance.defaults.baseURL}/${previewFile.filePath}`} className="w-full h-full border-0" title="PDF Preview"></iframe>
              ) : (
                <p className="text-center text-base-content/70">No preview available for this file type. <a href={`${axiosInstance.defaults.baseURL}/${previewFile.filePath}`} target="_blank" rel="noopener noreferrer" className="link link-primary">Download to view</a></p>
              )}
            </div>
            <div className="modal-action">
              <button onClick={() => setIsPreviewModalOpen(false)} className="btn btn-ghost">Close</button>
              <a
                href={`${axiosInstance.defaults.baseURL}/${previewFile.filePath}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
                download
              >
                <Download size={16} /> Download
              </a>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => setIsPreviewModalOpen(false)}>close</button>
          </form>
        </dialog>
      )}
    </div>
  );
};

export default ProjectDetailsPage;