import React, { useState, useEffect } from 'react';
import { axiosInstance } from '../lib/axios';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';


const MiniCalendar = () => {
  const now = new Date();
  const monthNames = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December"
  ];
  const currentMonth = monthNames[now.getMonth()];
  const currentYear = now.getFullYear();

  const daysInMonth = new Date(currentYear, now.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, now.getMonth(), 1).getDay();

  const dayLabels = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const emptyCells = Array(firstDayOfMonth).fill(null);
  const dayCells = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const allCells = [...emptyCells, ...dayCells];

  return (
    <div className="p-5 bg-base-100 rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-xl text-base-content">
          {currentMonth} {currentYear}
        </h3>
      </div>
      <div className="grid grid-cols-7 gap-2 text-center">
        {dayLabels.map(day => (
          <div key={day} className="font-bold text-sm text-base-content/70">{day}</div>
        ))}
        {allCells.map((day, index) => (
          <div
            key={index}
            className={`p-1 rounded-full flex items-center justify-center h-9 w-9
              ${day ? 'hover:bg-primary hover:text-primary-content cursor-pointer transition-colors duration-200' : ''}
              ${day && day === now.getDate() ? 'bg-primary text-primary-content font-bold' : 'text-base-content'}
            `}
          >
            {day}
          </div>
        ))}
      </div>
    </div>
  );
};

const DashboardPage = () => {
  const { authUser } = useAuthStore();

  const [totalProjectsCount, setTotalProjectsCount] = useState(0);
  const [activeProjectsCount, setActiveProjectsCount] = useState(0);
  const [upcomingProjectsCount, setUpcomingProjectsCount] = useState(0);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState(null);

  const [deadlines, setDeadlines] = useState([]);
  const [activities, setActivities] = useState([]);
  const [ongoingProjects, setOngoingProjects] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    const fetchAllData = async () => {
      setIsLoadingStats(true);
      setIsLoadingData(true);
      setStatsError(null);

      try {
        // Role-aware on the backend: PMs and Clients only get their projects
        const response = await axiosInstance.get('/projects');
        const allProjects = response.data;

        if (!Array.isArray(allProjects)) {
          setStatsError("Unexpected data format for projects.");
          setIsLoadingStats(false);
          setIsLoadingData(false);
          return;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let activeCount = 0;
        let upcomingCount = 0;
        const upcomingDeadlines = [];
        const recentActivities = [];
        const currentProjects = [];

        allProjects.forEach(project => {
          const startDate = project.startDate ? new Date(project.startDate) : null;
          const deadlineDate = project.targetDeadline ? new Date(project.targetDeadline) : null;
          if (startDate) startDate.setHours(0, 0, 0, 0);
          if (deadlineDate) deadlineDate.setHours(0, 0, 0, 0);

          const clientName =
            typeof project.client === 'object'
              ? (project.client.fullName || project.client.name || 'Client')
              : (project.clientName || 'Client');

          if (startDate && startDate <= today && project.status !== 'completed') {
            activeCount++;
            currentProjects.push({ ...project, _clientName: clientName });
          } else if (startDate && startDate > today) {
            upcomingCount++;
          }

          if (project.activities && Array.isArray(project.activities)) {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            project.activities.forEach(activity => {
              if (activity.status !== 'completed' && activity.dueDate) {
                const activityDeadline = new Date(activity.dueDate);
                if (activityDeadline >= today) {
                  upcomingDeadlines.push({
                    date: activityDeadline,
                    task: activity.name,
                    projectName: clientName,
                    projectId: project._id
                  });
                }
              }
              if (activity.status === 'completed' && activity.completedAt) {
                const completedDate = new Date(activity.completedAt);
                if (completedDate >= thirtyDaysAgo) {
                  recentActivities.push({
                    date: completedDate,
                    task: activity.name,
                    projectName: clientName,
                    projectId: project._id
                  });
                }
              }
            });
          }
        });

        upcomingDeadlines.sort((a, b) => a.date - b.date);
        recentActivities.sort((a, b) => b.date - a.date);

        setActiveProjectsCount(activeCount);
        setUpcomingProjectsCount(upcomingCount);
        setDeadlines(upcomingDeadlines.slice(0, 7));
        setActivities(recentActivities.slice(0, 7));
        setOngoingProjects(currentProjects);
        setTotalProjectsCount(allProjects.length);
      } catch (err) {
        const errorMessage = err.response?.data?.message || "Failed to load project data.";
        setStatsError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setIsLoadingStats(false);
        setIsLoadingData(false);
      }
    };

    fetchAllData();
  }, [authUser?._id, authUser?.role]);

  const formatDate = (date) =>
    date ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '-';

  const stats = [
    { title: 'Active Projects', value: activeProjectsCount, buttonText: 'See Projects', path: '/projects?status=active' },
    { title: 'Upcoming Projects', value: upcomingProjectsCount },
    { title: 'Total Projects', value: totalProjectsCount, buttonText: 'See All Projects', path: '/projects' },
  ];

  return (
    <div className="p-6 md:p-8">
      <h1 className="text-4xl font-bold text-base-content mb-2">Dashboard</h1>
      <p className="text-lg text-base-content/70 mb-8">
        An overview of project statuses, activities, and upcoming deadlines.
      </p>

      {/* Stats Cards */}
      {isLoadingStats ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {Array(3).fill(0).map((_, index) => (
            <div key={index} className="card bg-base-100 shadow-xl">
              <div className="card-body items-center text-center">
                <div className="skeleton h-6 w-3/4 mb-4"></div>
                <div className="skeleton h-16 w-1/2 my-2"></div>
                <div className="skeleton h-10 w-32 mt-4"></div>
              </div>
            </div>
          ))}
        </div>
      ) : statsError ? (
        <div role="alert" className="alert alert-error mb-8">
          <span>Error: {statsError}</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {stats.map((stat) => (
            <div key={stat.title} className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow duration-300">
              <div className="card-body items-center text-center p-6">
                <h2 className="card-title text-lg text-base-content/90">{stat.title}</h2>
                <p className="text-6xl font-bold text-primary my-3">{stat.value}</p>
                {stat.buttonText && (
                  <div className="card-actions justify-center mt-3">
                    <Link to={stat.path || '#'} className="btn btn-primary">{stat.buttonText}</Link>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Deadlines Card */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title text-xl">Upcoming Deadlines</h2>
              {isLoadingData ? (
                <div className="flex justify-center p-4">
                  <span className="loading loading-spinner loading-lg"></span>
                </div>
              ) : deadlines.length > 0 ? (
                <ul className="mt-3 space-y-1">
                  {deadlines.map((deadline, index) => (
                    <li key={index} className="flex items-center justify-between p-3 border-l-4 border-secondary hover:bg-base-200 rounded-r-lg">
                      <Link to={`/projects/${deadline.projectId}`} className="flex-grow">
                        <p className="text-base font-semibold text-base-content">{deadline.task}</p>
                        <p className="text-sm text-base-content/70">Project: {deadline.projectName}</p>
                      </Link>
                      <span className="font-bold text-secondary-focus ml-4">{formatDate(deadline.date)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-base-content/70 mt-2 italic">No upcoming deadlines.</p>
              )}
            </div>
          </div>

          {/* Activities Card */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title text-xl">Recent Activities</h2>
              {isLoadingData ? (
                <div className="flex justify-center p-4">
                  <span className="loading loading-spinner loading-lg"></span>
                </div>
              ) : activities.length > 0 ? (
                <ul className="mt-3 space-y-1">
                  {activities.map((activity, index) => (
                    <li key={index} className="flex items-center justify-between p-3 border-l-4 border-accent hover:bg-base-200 rounded-r-lg">
                      <Link to={`/projects/${activity.projectId}`} className="flex-grow">
                        <p className="text-base font-semibold text-base-content">{activity.task}</p>
                        <p className="text-sm text-base-content/70">Project: {activity.projectName}</p>
                      </Link>
                      <span className="font-semibold text-accent-focus ml-4">{formatDate(activity.date)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-base-content/70 mt-2 italic">No recent activities.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <div className="card bg-base-100 shadow-xl p-0">
            <MiniCalendar />
          </div>
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title text-xl">Ongoing Projects</h2>
              {isLoadingData ? (
                <div className="flex justify-center p-4">
                  <span className="loading loading-spinner loading-lg"></span>
                </div>
              ) : ongoingProjects.length > 0 ? (
                <ul className="mt-3 space-y-3">
                  {ongoingProjects.map((project) => (
                    <li key={project._id}>
                      <Link to={`/projects/${project._id}`} className="p-2 block hover:bg-base-200 rounded-lg">
                        <div className="font-bold text-base">
                          {project._clientName || 'Client'}
                        </div>
                        <div className="text-sm text-base-content/70">
                          {project.location || '-'}
                        </div>
                        <div className="text-sm text-base-content/80 mt-1">
                          Deadline: <span className="font-semibold">
                            {formatDate(project.targetDeadline)}
                          </span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-base-content/70 mt-2 italic">No ongoing projects.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
