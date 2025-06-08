import React, { useState, useEffect } from 'react'; // Added useState and useEffect
import { axiosInstance } from '../lib/axios'; // For API calls
import toast from 'react-hot-toast'; // For error notifications
// Using lucide-react for icons. Make sure to install it: npm install lucide-react
import {
  CalendarDays, // Keep if MiniCalendar uses it
  // UserCircle,   // Likely handled by global Navbar
  // Bell          // Likely handled by global Navbar
  // Import any other icons you might use directly in this component
} from 'lucide-react';
import { Link } from 'react-router-dom';

// Placeholder for a simple calendar component (you'd replace this with a real one)
const MiniCalendar = () => {
  // Get current month and year
  const now = new Date();
  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const currentMonth = monthNames[now.getMonth()];
  const currentYear = now.getFullYear();
  const daysInMonth = new Date(currentYear, now.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, now.getMonth(), 1).getDay(); // 0 for Sunday, 1 for Monday etc.

  const dayLabels = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  // Create empty cells for the first days of the month
  const emptyCells = Array(firstDayOfMonth).fill(null);
  // Create cells for each day of the month
  const dayCells = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const allCells = [...emptyCells, ...dayCells];

  return (
    <div className="p-4 bg-base-100 rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-lg text-base-content">{currentMonth} {currentYear}</h3>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-sm">
        {dayLabels.map(day => <div key={day} className="font-medium text-base-content/70">{day}</div>)}
        {allCells.map((day, index) => (
          <div
            key={index}
            className={`p-1 rounded-full flex items-center justify-center h-7 w-7
              ${day ? 'hover:bg-primary hover:text-primary-content cursor-pointer' : ''}
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
  console.log("--- RENDERING DashboardPage COMPONENT ---");

  // State for project counts and loading/error
  const [totalProjectsCount, setTotalProjectsCount] = useState(0);
  const [activeProjectsCount, setActiveProjectsCount] = useState(0);
  const [upcomingProjectsCount, setUpcomingProjectsCount] = useState(0);
  const [isLoadingStats, setIsLoadingStats] = useState(true); // For loading stats
  const [statsError, setStatsError] = useState(null); // For errors fetching stats

  // New state for deadlines, activities, and ongoing projects
  const [deadlines, setDeadlines] = useState([]);
  const [activities, setActivities] = useState([]);
  const [ongoingProjects, setOngoingProjects] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Fetch all project data
  useEffect(() => {
    const fetchAllData = async () => {
      setIsLoadingStats(true);
      setIsLoadingData(true);
      setStatsError(null);
      
      try {
        const response = await axiosInstance.get('/projects');
        const allProjects = response.data;

        if (Array.isArray(allProjects)) {
          // Set project counts
          setTotalProjectsCount(allProjects.length);

          const today = new Date();
          today.setHours(0, 0, 0, 0);

          let activeCount = 0;
          let upcomingCount = 0;
          const upcomingDeadlines = [];
          const recentActivities = [];
          const currentProjects = [];

          allProjects.forEach(project => {
            const startDate = new Date(project.startDate);
            const deadlineDate = new Date(project.targetDeadline);
            startDate.setHours(0,0,0,0);
            deadlineDate.setHours(0,0,0,0);

            // Count active and upcoming projects
            if (startDate <= today && deadlineDate >= today) {
              activeCount++;
              currentProjects.push(project);
            } else if (startDate > today) {
              upcomingCount++;
            }

            // Collect upcoming deadlines from activities
            if (project.activities && Array.isArray(project.activities)) {
              project.activities.forEach(activity => {
                if (activity.status !== 'completed') {
                  const activityDeadline = new Date(activity.dueDate);
                  if (activityDeadline >= today) {
                    upcomingDeadlines.push({
                      date: activityDeadline,
                      task: activity.name,
                      projectName: project.clientName,
                      projectId: project._id
                    });
                  }
                }
              });
            }

            // Collect recent activities (completed activities in the last 30 days)
            if (project.activities && Array.isArray(project.activities)) {
              const thirtyDaysAgo = new Date();
              thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
              
              project.activities.forEach(activity => {
                if (activity.status === 'completed' && activity.completedAt) {
                  const completedDate = new Date(activity.completedAt);
                  if (completedDate >= thirtyDaysAgo) {
                    recentActivities.push({
                      date: completedDate,
                      task: activity.name,
                      projectName: project.clientName,
                      projectId: project._id
                    });
                  }
                }
              });
            }
          });

          // Sort deadlines by date
          upcomingDeadlines.sort((a, b) => a.date - b.date);
          // Sort activities by date (most recent first)
          recentActivities.sort((a, b) => b.date - a.date);

          setActiveProjectsCount(activeCount);
          setUpcomingProjectsCount(upcomingCount);
          setDeadlines(upcomingDeadlines.slice(0, 5)); // Show only 5 upcoming deadlines
          setActivities(recentActivities.slice(0, 5)); // Show only 5 recent activities
          setOngoingProjects(currentProjects);

        } else {
          console.error("Fetched projects is not an array:", allProjects);
          setStatsError("Unexpected data format for projects.");
        }

      } catch (err) {
        console.error("Error fetching project data:", err);
        const errorMessage = err.response?.data?.message || err.message || "Failed to load project data.";
        setStatsError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setIsLoadingStats(false);
        setIsLoadingData(false);
      }
    };

    fetchAllData();
  }, []);

  // Format date helper function
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  // Dynamic stats array based on fetched data
  const stats = [
    { title: 'Active Projects', value: activeProjectsCount, buttonText: 'See Projects', path: '/projects?status=active' },
    { title: 'Upcoming Projects', value: upcomingProjectsCount },
    { title: 'Total Projects', value: totalProjectsCount, buttonText: 'See Completed Projects', path: '/projects?status=completed' },
  ];

  return (
    <>
      <h1 className="text-3xl font-bold text-base-content mb-2">Dashboard</h1>
      <h3 className="text-sm font-light text-base-content mb-6 leading-relaxed">
        The Dashboard shows the ongoing and planned projects, <br />
        along with the month's activity and reminders for deadlines.
      </h3>

      {/* Stats Cards */}
      {isLoadingStats ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {/* Skeleton loaders for stats cards */}
            {Array(3).fill(0).map((_, index) => (
                <div key={index} className="card bg-base-100 shadow-xl">
                    <div className="card-body items-center text-center">
                        <div className="skeleton h-6 w-3/4 mb-2"></div> {/* Title placeholder */}
                        <div className="skeleton h-12 w-1/2 my-2"></div> {/* Value placeholder */}
                        <div className="skeleton h-8 w-32 mt-3"></div> {/* Button placeholder */}
                    </div>
                </div>
            ))}
        </div>
      ) : statsError ? (
        <div role="alert" className="alert alert-error mb-8">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span>Error loading project stats: {statsError}</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {stats.map((stat) => (
            <div key={stat.title} className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow duration-300">
              <div className="card-body items-center text-center">
                <h2 className="card-title text-base-content/90">{stat.title}</h2>
                <p className="text-5xl font-bold text-primary my-2">{stat.value}</p>
                {stat.buttonText && (
                  <div className="card-actions justify-center mt-3">
                    <a href={stat.path || '#'} className="btn btn-sm btn-primary">{stat.buttonText}</a>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Calendar and other sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Deadlines, Activities) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Deadlines Card */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title text-base-content">Upcoming Deadlines</h2>
              {isLoadingData ? (
                <div className="flex justify-center items-center p-4">
                  <span className="loading loading-spinner loading-md"></span>
                </div>
              ) : deadlines.length > 0 ? (
                <ul className="mt-2 space-y-2">
                  {deadlines.map((deadline, index) => (
                    <li key={index} className="text-sm text-base-content/80 border-l-4 border-secondary pl-3 py-1">
                      <Link to={`/projects/${deadline.projectId}`} className="hover:text-primary">
                        <span className="font-semibold text-secondary-focus">{formatDate(deadline.date)}</span> - {deadline.task}
                        <span className="text-xs text-base-content/60 block">Project: {deadline.projectName}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-base-content/70 mt-2 italic">No upcoming deadlines.</p>
              )}
              <div className="card-actions justify-start mt-4">
                <Link to="/projects" className="btn btn-sm btn-ghost text-primary hover:bg-primary/10">
                  View All Projects
                </Link>
              </div>
            </div>
          </div>

          {/* Activities Card */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title text-base-content">Recent Activities</h2>
              {isLoadingData ? (
                <div className="flex justify-center items-center p-4">
                  <span className="loading loading-spinner loading-md"></span>
                </div>
              ) : activities.length > 0 ? (
                <ul className="mt-2 space-y-2">
                  {activities.map((activity, index) => (
                    <li key={index} className="text-sm text-base-content/80 border-l-4 border-accent pl-3 py-1">
                      <Link to={`/projects/${activity.projectId}`} className="hover:text-primary">
                        <span className="font-semibold text-accent-focus">{formatDate(activity.date)}</span> - {activity.task}
                        <span className="text-xs text-base-content/60 block">Project: {activity.projectName}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-base-content/70 mt-2 italic">No recent activities.</p>
              )}
              <div className="card-actions justify-start mt-4">
                <Link to="/projects" className="btn btn-sm btn-ghost text-primary hover:bg-primary/10">
                  View All Projects
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (Calendar, Ongoing Projects) */}
        <div className="space-y-6">
          <div className="card bg-base-100 shadow-xl p-0">
            <MiniCalendar />
          </div>
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title text-base-content">Ongoing Projects</h2>
              {isLoadingData ? (
                <div className="flex justify-center items-center p-4">
                  <span className="loading loading-spinner loading-md"></span>
                </div>
              ) : ongoingProjects.length > 0 ? (
                <ul className="mt-2 space-y-2">
                  {ongoingProjects.map((project) => (
                    <li key={project._id} className="text-sm">
                      <Link to={`/projects/${project._id}`} className="hover:text-primary">
                        <div className="font-medium">{project.clientName}</div>
                        <div className="text-xs text-base-content/60">
                          {project.location}
                        </div>
                        <div className="text-xs text-base-content/60 mt-1">
                          Deadline: {formatDate(project.targetDeadline)}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-base-content/70 mt-2 italic">No ongoing projects.</p>
              )}
              <div className="card-actions justify-start mt-4">
                <Link to="/projects" className="btn btn-sm btn-ghost text-primary hover:bg-primary/10">
                  View All Projects
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default DashboardPage;
