import React, { useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

// Components & Pages
import Navbar from "./components/Navbar";
import SideBarMain from "./components/SideBarMain.jsx";
import SignUpPage from "./pages/SignUpPage";
import ChatPage from "./pages/ChatPage.jsx";
import LoginPage from "./pages/LoginPage";
import SettingsPage from "./pages/SettingsPage";
import ProfilePage from "./pages/ProfilePage";
import ProjectPage from "./pages/ProjectPage";
import DashboardPage from "./pages/Dashboard.jsx";
import PayrollPage from "./pages/PayrollPage.jsx";
import VideoConferencePage from "./pages/VideoConferencePage.jsx";
import FileHandlingPage from "./pages/FileHandlingPage.jsx";
import ProjectDetailsPage from "./pages/ProjectDetails.jsx"; 


import { useAuthStore } from "./store/useAuthStore";
import { Loader } from "lucide-react";
import { Toaster } from "react-hot-toast"; // Assuming you use react-hot-toast
import { useThemeStore } from "./store/useThemeStore";

const App = () => {
  const { authUser, checkAuth, isCheckingAuth, onlineUsers } = useAuthStore();
  const { theme } = useThemeStore();
  const location = useLocation();

  console.log({onlineUsers});

  useEffect(() => {
    // Check authentication status when the app loads or checkAuth changes
    // This is good practice for persistence of login
    checkAuth();
  }, [checkAuth]); // Dependency array ensures it runs when checkAuth function reference changes

  console.log("Current authUser state:", authUser); // Log authUser state for debugging

  // Show loader only during the initial authentication check to prevent flickering
  if (isCheckingAuth) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-base-200">
        <Loader className="size-10 animate-spin text-primary" />
      </div>
    );
  }

  // Define routes that should NOT have the main sidebar/navbar layout
  const noLayoutRoutes = ['/login', '/signup'];
  // Determine if the main layout (Navbar + Sidebar) should be shown
  const showLayout = authUser && !noLayoutRoutes.includes(location.pathname);

  return (
    // The root div defines the overall theme and ensures the app takes full viewport height
    <div data-theme={theme} className="flex flex-col h-screen overflow-hidden"> {/* Added overflow-hidden to root */}
      {/* Conditionally render the main layout based on authentication and route */}
      {showLayout ? (
        <> {/* Fragment to group Navbar, Sidebar, and main content */}
          <Navbar /> {/* Fixed-height Navbar, assumed to be h-16 (4rem) */}
          {/* This div takes remaining height and needs padding-top to clear the fixed Navbar.
              It also handles the layout for the sidebar and main content area. */}
          <div className="flex flex-1 overflow-hidden pt-16"> {/* Assumes Navbar is h-16 (4rem) */}
            <SideBarMain /> {/* Collapsible main application sidebar */}
            {/* Main content area where routed pages will render.
                It should be scrollable if content overflows. */}
            <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-base-200">
              <Routes>
                {/* Authenticated Routes - only accessible if authUser is true */}
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/chats" element={<ChatPage />} />
                <Route path="/projects" element={<ProjectPage />} />
                <Route path="/projects/:projectId" element={<ProjectDetailsPage />} />
                <Route path="/payroll" element={<PayrollPage />}/>
                <Route path="/video-meetings" element={<VideoConferencePage/>} />
                <Route path="/file-handling" element={<FileHandlingPage/>}/>
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                {/* Add other authenticated routes here */}

                {/* Fallback redirect for any unknown authenticated path:
                    If authenticated but on an undefined route, redirect to dashboard. */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </main>
          </div>
        </>
      ) : (
        // Render routes without the main layout (Login, Signup, or unauthenticated redirects)
        <Routes>
          <Route
            path="/signup"
            // If authenticated, redirect from signup to dashboard; otherwise, show signup page.
            element={!authUser ? <SignUpPage /> : <Navigate to="/dashboard" replace />}
          />
          <Route
            path="/login"
            // If authenticated, redirect from login to dashboard; otherwise, show login page.
            element={!authUser ? <LoginPage /> : <Navigate to="/dashboard" replace />}
          />
          {/* Default route for unauthenticated users:
              If not logged in and trying to access any path not /login or /signup, redirect to login. */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      )}
      {/* Toaster component for displaying toast notifications throughout the application */}
      <Toaster />
    </div>
  );
};

export default App;