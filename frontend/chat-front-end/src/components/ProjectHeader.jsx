import React from "react";
import { ChevronLeft } from "lucide-react";

const ProjectHeader = ({
  name,
  location,
  description,
  imageUrl,
  onBack,
  onOpenCoverUpload,
}) => {
  return (
    <div className="w-full">
      <div className="relative w-full h-64 overflow-hidden bg-gray-300">
        {imageUrl ? (
          <img src={imageUrl} alt="Project cover" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-400 to-gray-500" />
        )}

        {/* Darker gradient overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/60" />

        {/* Circular back button (top-left) */}
        {onBack && (
          <button
            type="button"
            aria-label="Go back"
            onClick={onBack}
            className="absolute top-4 left-4 w-10 h-10 bg-black/20 hover:bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        {/* Top-right actions */}
        <div className="absolute top-4 right-4 flex gap-2">
          {onOpenCoverUpload && (
            <button 
              className="btn btn-sm bg-pink-500 hover:bg-pink-600 text-white border-none" 
              onClick={onOpenCoverUpload}
            >
              + Change Cover
            </button>
          )}
        </div>

        {/* Project title and location */}
        <div className="absolute left-6 right-6 bottom-6">
          <h1 className="text-4xl font-bold text-white drop-shadow-lg mb-2">
            {name || "Project"}
          </h1>
          {location && (
            <p className="text-white/90 text-lg drop-shadow">
              {location}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectHeader;