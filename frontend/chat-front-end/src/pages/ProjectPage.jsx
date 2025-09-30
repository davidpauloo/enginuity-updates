import React, { useState, useEffect } from 'react';
import { axiosInstance } from '../lib/axios';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { Trash2 } from 'lucide-react';

const ProjectPage = () => {
  const [currentProjects, setCurrentProjects] = useState([]);
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
        today.setHours(0, 0, 0, 0);

        const ongoing = [];
        const finished = [];

        allProjects.forEach(project => {
          const deadlineDate = project.targetDeadline ? new Date(project.targetDeadline) : null;
          if (deadlineDate) deadlineDate.setHours(0, 0, 0, 0);

          if (deadlineDate && deadlineDate < today) {
            finished.push(project);
          } else {
            ongoing.push(project);
          }
        });

        setCurrentProjects(ongoing);
        setFinishedProjects(finished);
      } else {
        setError("Unexpected data format for projects.");
        toast.error("Failed to load projects.");
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || "Failed to load projects.";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleDeleteProject = async (projectId, event) => {
    event.stopPropagation();
    event.preventDefault();

    if (window.confirm("Are you sure you want to permanently delete this project?")) {
      try {
        await axiosInstance.delete(`/projects/${projectId}`);
        toast.success("Project deleted successfully!");
        fetchProjects();
      } catch (error) {
        const errorMessage = error.response?.data?.message || "Failed to delete project.";
        toast.error(errorMessage);
      }
    }
  };

  const renderProjectList = (projectsToRender, title) => {
    if (projectsToRender.length === 0) {
      return (
        <div className="text-center p-6 bg-base-100 rounded-lg shadow">
          <p className="text-base-content/70">No {title.toLowerCase()} found.</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {projectsToRender.map((project) => {
          const coverUrl = project.imageUrl || 'https://placehold.co/600x300/222/fff?text=No+Image';
          const startDate = project.startDate ? new Date(project.startDate).toLocaleDateString() : 'N/A';
          const deadline = project.targetDeadline ? new Date(project.targetDeadline).toLocaleDateString() : 'N/A';
          const clientDisplay =
            typeof project.client === 'object'
              ? (project.client.fullName || project.client.name || 'Client')
              : (project.clientName || 'Client');

          return (
            <Link
              to={`/projects/${project._id}`}
              key={project._id}
              className="block rounded-3xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-200"
              style={{ minHeight: 180 }}
            >
              <div
                className="relative h-40 md:h-48 w-full flex items-end"
                style={{
                  backgroundImage: `url(${coverUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                <button
                  onClick={(e) => handleDeleteProject(project._id, e)}
                  className="absolute top-3 right-3 z-20 p-2 bg-black/30 rounded-full text-white/80 hover:bg-red-500 hover:text-white transition-colors"
                  aria-label="Delete Project"
                >
                  <Trash2 size={18} />
                </button>
                <div className="absolute inset-0 bg-black/40" />
                <div className="relative z-10 p-6">
                  <h3 className="text-white text-2xl font-semibold drop-shadow-lg mb-1">
                    {clientDisplay}
                  </h3>
                  <p className="text-white/90 text-base font-medium drop-shadow mb-1">
                    {project.location || '-'}
                  </p>
                  <div className="flex gap-4 text-xs text-white/80 drop-shadow">
                    <span>Start: {startDate}</span>
                    <span>Deadline: {deadline}</span>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    );
  };

  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-base-content mb-2">Projects</h1>
        <p className="text-sm text-base-content/80">
          Review and manage construction projects assigned to this account. Creation is handled by the Super Admin.
        </p>
      </div>

      {isLoading && (
        <div className="flex justify-center items-center p-10">
          <span className="loading loading-lg loading-spinner text-primary"></span>
          <p className="ml-4 text-base-content">Loading projects...</p>
        </div>
      )}

      {error && !isLoading && (
        <div role="alert" className="alert alert-error shadow-lg mb-8">
          <span>Error! {error}</span>
        </div>
      )}

      {!isLoading && !error && (
        <>
          <div className="mt-8">
            <h2 className="text-2xl font-semibold mb-6 text-base-content">Ongoing & Upcoming Projects</h2>
            {renderProjectList(currentProjects, "Ongoing & Upcoming Projects")}
          </div>

          <div className="mt-12">
            <h2 className="text-2xl font-semibold mb-6 text-base-content">Finished Projects</h2>
            {renderProjectList(finishedProjects, "Finished Projects")}
          </div>
        </>
      )}
    </>
  );
};

export default ProjectPage;
