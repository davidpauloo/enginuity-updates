import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { axiosInstance } from '../lib/axios';
import toast from 'react-hot-toast';
import { ArrowLeft, FileText, BrainCircuit, UsersRound, Percent, CalendarDays, ListChecks, UploadCloud, Download, Trash2, X } from 'lucide-react';

const ProjectDetailsPage = () => {
  const { id: projectId } = useParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- State for File Upload ---
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // --- MODIFICATION: State for Documents Modal ---
  const [isDocumentsModalOpen, setIsDocumentsModalOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // Placeholder data - In a real app, this might come from the 'project' object or separate fetches
  const deadlines = project?.deadlines || [
    { date: 'May 15, 2025', task: 'Submit initial blueprints' },
    { date: 'June 01, 2025', task: 'Phase 1 material procurement' },
  ];
  const activities = project?.activities || [
    { date: 'May 05, 2025', task: 'Client kickoff meeting' },
  ];
  const projectPercentage = project?.progress || 12;

  const fetchProjectDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axiosInstance.get(`/projects/${projectId}`);
      setProject(res.data);
    } catch (err) {
      console.error('Error fetching project details:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load project details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchProjectDetails();
    }
  }, [projectId]);

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  const handleFileUpload = async () => {
    if (!selectedFile) {
      toast.error("Please select a file to upload.");
      return;
    }
    if (!project) {
        toast.error("Project details not loaded yet.");
        return;
    }
    setIsUploading(true);
    const formData = new FormData();
    formData.append('document', selectedFile);
    try {
      const response = await axiosInstance.post(`/projects/${projectId}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setProject(response.data.project || response.data);
      toast.success('Document uploaded successfully!');
      setSelectedFile(null);
      if (document.getElementById('fileUploadInputModal')) { // Changed ID
        document.getElementById('fileUploadInputModal').value = "";
      }
    } catch (err) {
      console.error('Error uploading document:', err);
      toast.error(err.response?.data?.message || 'Failed to upload document.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDocument = async (documentId) => {
    if (!project || !window.confirm("Are you sure you want to delete this document?")) return;

    try {
      const response = await axiosInstance.delete(`/projects/${projectId}/documents/${documentId}`);
      toast.success('Document deleted successfully!');

      // Refresh the project details to reflect changes
      fetchProjectDetails();
    } catch (err) {
      console.error('Error deleting document:', err);
      toast.error(err.response?.data?.message || 'Failed to delete document.');
    }
  };


  if (loading) return <div className="flex justify-center items-center min-h-[calc(100vh-8rem)]"><span className="loading loading-lg loading-spinner text-primary"></span></div>;
  if (error) return <div className="p-6 text-center text-error">Error: {error} <Link to="/projects" className="btn btn-primary btn-sm mt-4">Back</Link></div>;
  if (!project) return <div className="p-6 text-center">Project not found. <Link to="/projects" className="btn btn-primary btn-sm mt-4">Back</Link></div>;

  return (
    <div className="w-full">
      {/* Banner Section */}
      <div className="h-60 bg-gradient-to-r from-primary to-secondary flex items-center justify-center relative mb-6 rounded-lg shadow-lg">
        <div className="absolute inset-0 bg-black opacity-40 rounded-lg"></div>
        <h1 className="text-4xl md:text-5xl font-bold text-white z-10 text-center px-4">
          {project.clientName || "Project Details"}
        </h1>
      </div>

      <div className="mb-6">
        <Link to="/projects" className="btn btn-ghost text-primary hover:bg-primary/10">
          <ArrowLeft size={18} className="mr-2" />
          Projects
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Description, Deadlines, Activities */}
        <div className="lg:col-span-2 space-y-6">
          {/* Project Description Card */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <p className="text-base-content/80 leading-relaxed">{project.description || "No description."}</p>
              <div className="mt-4 space-y-1 text-sm">
                <p><strong className="text-base-content/90">Location:</strong> <span className="text-base-content/70">{project.location}</span></p>
                <p><strong className="text-base-content/90">Start Date:</strong> <span className="text-base-content/70">{project.startDate ? new Date(project.startDate).toLocaleDateString() : 'N/A'}</span></p>
                <p><strong className="text-base-content/90">Deadline:</strong> <span className="text-base-content/70">{project.targetDeadline ? new Date(project.targetDeadline).toLocaleDateString() : 'N/A'}</span></p>
              </div>
            </div>
          </div>

          {/* --- MODIFICATION: Project Documents Card REMOVED from here --- */}

          {/* Deadlines Card */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title text-base-content">Deadlines</h2>
              {deadlines.length > 0 ? (
                <ul className="mt-2 space-y-2">
                  {deadlines.map((deadline, index) => (
                    <li key={index} className="text-sm text-base-content/80 flex items-center">
                      <CalendarDays size={16} className="mr-2 text-secondary flex-shrink-0" />
                      <span className="font-semibold text-secondary-focus mr-2">{deadline.date}:</span>
                      <span>{deadline.task}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-base-content/70 mt-2 italic">No deadlines specified.</p>}
            </div>
          </div>

          {/* Activities Card */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title text-base-content">Activities</h2>
              {activities.length > 0 ? (
                <ul className="mt-2 space-y-2">
                  {activities.map((activity, index) => (
                    <li key={index} className="text-sm text-base-content/80 flex items-center">
                       <ListChecks size={16} className="mr-2 text-accent flex-shrink-0" />
                      <span className="font-semibold text-accent-focus mr-2">{activity.date}:</span>
                      <span>{activity.task}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-base-content/70 mt-2 italic">No activities logged.</p>}
            </div>
          </div>
        </div>

        {/* Right Column: Actions, Progress */}
        <div className="space-y-6">
          {/* Action Buttons Card */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body space-y-3">
              {/* --- MODIFICATION: "Documents" button now opens the modal --- */}
              <button
                onClick={() => setIsDocumentsModalOpen(true)}
                className="btn btn-outline btn-primary w-full justify-start"
              >
                <FileText size={18} className="mr-2" /> Documents
              </button>
              <button className="btn btn-outline btn-secondary w-full justify-start">
                <BrainCircuit size={18} className="mr-2" /> Blueprint & AI Analysis
              </button>
              <button className="btn btn-outline btn-accent w-full justify-start">
                <UsersRound size={18} className="mr-2" /> Collaboration Portal
              </button>
            </div>
          </div>

          {/* Project Percentage Card */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body items-center text-center">
              <h2 className="card-title text-base-content mb-2">Project Percentage</h2>
              <div
                className="radial-progress text-primary"
                style={{ "--value": projectPercentage, "--size": "10rem", "--thickness": "1rem" }}
                role="progressbar"
              >
                <span className="text-2xl font-bold text-primary-content">{projectPercentage}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- MODIFICATION: Documents Modal --- */}
      {isDocumentsModalOpen && (
        <dialog open className="modal modal-open modal-bottom sm:modal-middle"> {/* Added 'open' and modal positioning */}
          <div className="modal-box w-11/12 max-w-3xl"> {/* Increased max-width */}
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-xl text-base-content">Project Documents</h3>
                <button onClick={() => setIsDocumentsModalOpen(false)} className="btn btn-sm btn-circle btn-ghost">
                    <X size={20}/>
                </button>
            </div>

            {/* Content of the original Project Documents Card goes here */}
            <div className="form-control w-full mb-4">
              <label className="label">
                <span className="label-text">Upload New Document</span>
              </label>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                <input
                  type="file"
                  id="fileUploadInputModal" // Changed ID to be unique
                  onChange={handleFileChange}
                  className="file-input file-input-bordered file-input-primary w-full max-w-xs mb-2 sm:mb-0"
                />
                <button
                  onClick={handleFileUpload}
                  className="btn btn-primary btn-md" // ensure consistent button size
                  disabled={!selectedFile || isUploading}
                >
                  {isUploading ? (
                    <span className="loading loading-spinner loading-sm"></span>
                  ) : (
                    <UploadCloud size={18} className="mr-1 sm:mr-2" />
                  )}
                  Upload
                </button>
              </div>
            </div>

            {/* List of Uploaded Documents */}
            {project.documents && project.documents.length > 0 ? (
              <div className="mt-6 space-y-2 max-h-96 overflow-y-auto"> {/* Added max-height and scroll */}
                <h3 className="font-semibold text-base-content/80 mb-2">Uploaded Files:</h3>
                <ul className="list-none space-y-1">
                  {project.documents.map((doc, index) => (
                    <li key={doc._id || index} className="flex items-center justify-between p-2.5 hover:bg-base-200 rounded-md border border-base-300">
                      <a
                        href={doc.filePath}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-2 truncate"
                        title={doc.fileName}
                      >
                        <FileText size={18} />
                        <span className="truncate">{doc.fileName}</span>
                      </a>
                      <div className="flex items-center gap-1 flex-shrink-0">
                          <a
                              href={doc.filePath}
                              target="_blank"
                              rel="noopener noreferrer"
                              download
                              className="btn btn-xs btn-ghost text-success hover:bg-success/10"
                              title="Download"
                          >
                              <Download size={16} />
                          </a>
                            <button
                            onClick={() => handleDeleteDocument(doc._id)}
                            className="btn btn-xs btn-ghost text-error hover:bg-error/10"
                            title="Delete"
                            >
                            <Trash2 size={16} />
                            </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-base-content/70 mt-4 italic">No documents uploaded yet for this project.</p>
            )}
             <div className="modal-action mt-6">
                <button className="btn btn-ghost" onClick={() => setIsDocumentsModalOpen(false)}>Close</button>
            </div>
          </div>
          {/* Optional: click backdrop to close, though button is clearer */}
           <form method="dialog" className="modal-backdrop">
             <button onClick={() => setIsDocumentsModalOpen(false)}>close</button>
           </form>
        </dialog>
      )}

      {/* Preview Modal */}
      {isPreviewModalOpen && previewFile && (
        <dialog open className="modal modal-open modal-bottom sm:modal-middle">
          <div className="modal-box w-11/12 max-w-3xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-xl text-base-content">Preview Document</h3>
              <button
                onClick={() => setIsPreviewModalOpen(false)}
                className="btn btn-sm btn-circle btn-ghost"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex justify-center items-center">
              <iframe
                src={previewFile}
                title="Document Preview"
                className="w-full h-96"
              ></iframe>
            </div>
            <div className="modal-action mt-6">
              <button className="btn btn-ghost" onClick={() => setIsPreviewModalOpen(false)}>
                Close
              </button>
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