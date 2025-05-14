import React, { useState, useEffect } from 'react';
import ProjectForm from '../components/ProjectForm';
import { axiosInstance } from '../lib/axios';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

const ProjectPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  // State for ongoing/upcoming projects
  const [currentProjects, setCurrentProjects] = useState([]);
  // State for finished projects
  const [finishedProjects, setFinishedProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchProjects = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await axiosInstance.get('/projects');
      const allProjects = response.data;

      if (Array.isArray(allProjects)) {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalize today to the start of the day

        const ongoing = [];
        const finished = [];

        allProjects.forEach(project => {
          const deadlineDate = new Date(project.targetDeadline);
          deadlineDate.setHours(0,0,0,0); // Normalize deadline date

          // Consider a project finished if its targetDeadline is in the past
          // Alternatively, if you have a 'status' field (e.g., project.status === 'completed'), use that.
          if (deadlineDate < today) {
            finished.push(project);
          } else {
            ongoing.push(project);
          }
        });
        setCurrentProjects(ongoing);
        setFinishedProjects(finished);
      } else {
        console.error("Fetched projects is not an array:", allProjects);
        setError("Unexpected data format for projects.");
        toast.error("Failed to load projects: Unexpected data format.");
        setCurrentProjects([]);
        setFinishedProjects([]);
      }

    } catch (err) {
      console.error("Error fetching projects:", err);
      const errorMessage = err.response?.data?.message || err.message || "Failed to load projects.";
      setError(errorMessage);
      toast.error(errorMessage);
      setCurrentProjects([]);
      setFinishedProjects([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleAddProjectClick = () => setIsModalOpen(true);
  const handleCloseModal = () => setIsModalOpen(false);

  const handleFormSubmit = async (formData) => {
    try {
      // const response = await axiosInstance.post('/projects', formData); // Path relative to baseURL
      // console.log("New project created:", response.data);
      await axiosInstance.post('/projects', formData);
      handleCloseModal();
      toast.success("Project added successfully!");
      fetchProjects(); // Refresh both lists
    } catch (error) {
      console.error("Error creating project:", error.response?.data || error.message);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to add project. Please try again.";
      toast.error(errorMessage);
    }
  };

  // Helper function to render a list of project cards
  const renderProjectList = (projectsToRender, title) => {
    if (projectsToRender.length === 0) {
      return (
        <div className="text-center p-6 bg-base-100 rounded-lg shadow">
          <p className="text-base-content/70">No {title.toLowerCase()} found.</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projectsToRender.map((project) => (
          <Link
            to={`/projects/${project._id}`}
            key={project._id}
            className="card bg-base-100 shadow-md hover:shadow-lg transition-shadow duration-200 ease-in-out cursor-pointer block"
          >
            <div className="card-body">
              <h3 className="card-title text-lg truncate">{project.clientName}</h3>
              <p className="text-sm"><span className="font-semibold">Location:</span> <span className="text-base-content/80 truncate block">{project.location}</span></p>
              <p className="text-xs text-base-content/70 mt-1 break-words h-10 overflow-hidden"> {/* Fixed height for description */}
                {project.description || 'No description provided.'}
              </p>
              <div className="divider my-2"></div>
              <div className="mt-1 text-xs grid grid-cols-2 gap-x-2">
                <p><span className="font-semibold block">Start:</span> {project.startDate ? new Date(project.startDate).toLocaleDateString() : 'N/A'}</p>
                <p><span className="font-semibold block">Deadline:</span> {project.targetDeadline ? new Date(project.targetDeadline).toLocaleDateString() : 'N/A'}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    );
  };


  return (
    // Assuming App.jsx handles overall page padding (e.g., pt-0 or specific padding for <main>)
    // This component will just return its content.
    <>
      {/* Page Heading */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-base-content mb-2">Projects</h1>
        <p className="text-sm text-base-content/80 leading-relaxed">
          Manage ongoing, upcoming, and finished construction projects. Add new ones, review their details, and monitor deadlines.
        </p>
      </div>

      {/* Add Button */}
      <div className="mb-8">
        <button className="btn btn-primary" onClick={handleAddProjectClick}>
          + Add New Project
        </button>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <dialog id="project_modal" className="modal modal-open modal-bottom sm:modal-middle">
          <div className="modal-box w-11/12 max-w-2xl">
            <h3 className="font-bold text-lg mb-4">Add New Construction Project</h3>
            <ProjectForm onSubmit={handleFormSubmit} onCancel={handleCloseModal} />
            <button onClick={handleCloseModal} className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={handleCloseModal}>close</button>
          </form>
        </dialog>
      )}

      {/* Loading and Error States */}
      {isLoading && (
        <div className="flex justify-center items-center p-10">
          <span className="loading loading-lg loading-spinner text-primary"></span>
          <p className="ml-4 text-base-content">Loading projects...</p>
        </div>
      )}

      {error && !isLoading && ( // Only show error if not loading
        <div role="alert" className="alert alert-error shadow-lg mb-8">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Error! {error}</span>
        </div>
      )}

      {/* Ongoing/Upcoming Projects List */}
      {!isLoading && !error && ( // Only show lists if not loading and no error
        <div className="mt-8">
          <h2 className="text-2xl font-semibold mb-6 text-base-content">Ongoing & Upcoming Projects</h2>
          {renderProjectList(currentProjects, "Ongoing & Upcoming Projects")}
        </div>
      )}

      {/* Finished Projects List */}
      {!isLoading && !error && ( // Only show lists if not loading and no error
        <div className="mt-12"> {/* Added more margin-top for separation */}
          <h2 className="text-2xl font-semibold mb-6 text-base-content">Finished Projects</h2>
          {renderProjectList(finishedProjects, "Finished Projects")}
        </div>
      )}
    </>
  );
};

export default ProjectPage;
