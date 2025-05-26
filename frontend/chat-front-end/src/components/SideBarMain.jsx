import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  MessageSquareText,
  ListChecks,
  PhilippinePeso,
  Settings,
  Users,
  Video,
  Folders,
  CircleHelp,
  LogOut
} from 'lucide-react';
import { useAuthStore } from "../store/useAuthStore";


const SideBarMain = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout); 

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error("Logout failed:", err.message);
    }
  };

  const sidebarMenuItems = [
    { icon: <LayoutDashboard size={20} />, label: 'Dashboard', path: '/dashboard' },
    { icon: <MessageSquareText size={20} />, label: 'Chats', path: '/chats' },
    { icon: <ListChecks size={20} />, label: 'Projects', path: '/projects' },
    { icon: <PhilippinePeso size={20} />, label: 'Payroll', path: '/payroll' },
    { icon: <Video size={20} />, label: 'Video Meetings', path: '/video-meetings' },
    { icon: <Folders size={20} />, label: 'Files', path: '/file-handling' },
  ];

  const sidebarMenuItemsOthers = [
    { icon: <Settings size={20} />, label: 'Settings', path: '/settings' },
    { icon: <Users size={20} />, label: 'Profile', path: '/profile' },
    { icon: <CircleHelp size={20} />, label: 'Help', path: '/help' },
    { icon: <LogOut size={20} />, label: 'Logout', action: handleLogout },
  ];

  const activeClassName = "active";

  return (
    <aside
      className={`bg-base-100 shadow-lg flex-shrink-0 transition-all duration-300 ease-in-out 
        ${isOpen ? 'w-64' : 'w-20'} h-screen`}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <div className={`flex flex-col h-full py-6 ${isOpen ? 'px-4' : 'px-0 items-center'} mt-[20vh]`}>
        <div className="space-y-6 w-full">
          {/* Top Menu */}
          <div>
            <span className={`text-xs font-semibold uppercase text-base-content/60 mb-2 ${isOpen ? 'block px-4' : 'hidden'}`}>
              Menu
            </span>
            <ul className={`menu ${isOpen ? 'menu-sm' : 'menu-xs items-center'}`}>
              {sidebarMenuItems.map((item) => (
                <li key={item.label} className="w-full" data-tip={!isOpen ? item.label : null}>
                  <NavLink
                    to={item.path}
                    end={item.path === '/'}
                    className={({ isActive }) =>
                      `${isActive ? activeClassName : ''} flex items-center 
                      ${isOpen ? 'gap-2 justify-start py-2 px-4' : 'justify-center h-12 w-12 p-0'}`
                    }
                  >
                    {item.icon}
                    {isOpen && <span className="truncate">{item.label}</span>}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Others + Logout */}
          <div>
            <span className={`text-xs font-semibold uppercase text-base-content/60 mb-2 ${isOpen ? 'block px-4' : 'hidden'}`}>
              Others
            </span>
            <ul className={`menu ${isOpen ? 'menu-sm' : 'menu-xs items-center'}`}>
              {sidebarMenuItemsOthers.map((item) => (
                <li key={item.label} className="w-full" data-tip={!isOpen ? item.label : null}>
                  {item.path ? (
                    <NavLink
                      to={item.path}
                      className={({ isActive }) =>
                        `${isActive ? activeClassName : ''} flex items-center 
                        ${isOpen ? 'gap-2 justify-start py-2 px-4' : 'justify-center h-12 w-12 p-0'}`
                      }
                    >
                      {item.icon}
                      {isOpen && <span className="truncate">{item.label}</span>}
                    </NavLink>
                  ) : (
                    <button
                      onClick={item.action}
                      className={`flex items-center w-full text-left hover:bg-base-200 transition 
                        ${isOpen ? 'gap-2 justify-start py-2 px-4' : 'justify-center h-12 w-12 p-0'}`}
                    >
                      {item.icon}
                      {isOpen && <span className="truncate">{item.label}</span>}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default SideBarMain;
