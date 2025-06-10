import React from "react";
import { useAuthStore } from "../store/useAuthStore";
import { Link } from "react-router-dom";
import { LogOut, MessageSquare, Settings, User } from "lucide-react";

const Navbar = () => {
  const { logout, authUser } = useAuthStore();

  return (
    <header
      className="bg-base-100 border-b border-base-300 fixed w-full top-0 z-40
      backdrop-blur-lg bg-base-100/80"
    >
      <div className="container mx-auto px-4 h-19">
        <div className="flex items-center justify-between h-full">
          {/* Left side - logo */}
          <Link
            to="/"
            className="flex items-center gap-2 hover:opacity-80 transition-all"
          >
            <img src="/logo.svg" alt="Your Brand Logo" className="w-20 h-20" />
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
