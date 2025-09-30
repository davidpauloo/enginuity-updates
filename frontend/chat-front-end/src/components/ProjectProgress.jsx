import React from "react";

const ProjectProgress = ({ progress = 0, completed = 0, total = 0 }) => {
  const pct = Number.isFinite(progress) ? Math.max(0, Math.min(100, Math.round(progress))) : 0;
  
  return (
    <div className="card bg-base-100 shadow-md">
      <div className="card-body">
        <h3 className="text-lg font-semibold text-base-content mb-4">Project Progress</h3>

        {/* Circular Progress - Main Focus */}
        <div className="flex flex-col items-center mb-6">
          <div 
            className="radial-progress text-primary text-4xl font-bold mb-2" 
            style={{ "--value": pct, "--size": "8rem", "--thickness": "6px" }} 
            role="progressbar" 
            aria-valuenow={pct} 
            aria-valuemin={0} 
            aria-valuemax={100}
          >
            {pct}%
          </div>
          <p className="text-sm text-base-content/70 text-center">
            {completed} of {total} activities completed
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-base-content/70 mb-1">
            <span>Progress</span>
            <span>{pct}%</span>
          </div>
          <progress 
            className="progress progress-primary w-full h-2" 
            value={pct} 
            max="100" 
          />
        </div>
      </div>
    </div>
  );
};

export default ProjectProgress;