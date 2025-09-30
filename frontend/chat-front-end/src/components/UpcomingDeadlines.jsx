import React from "react";
import toast, { Toaster } from "react-hot-toast"; // use react-hot-toast here

const UpcomingDeadlines = ({ activities = [], onToggle }) => {
  const formatDate = (dateString) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    } catch {
      return dateString;
    }
  };

  // Promise-based confirmation using react-hot-toast
  const confirmToast = (message, confirmLabel = "Confirm", cancelLabel = "Cancel") =>
    new Promise((resolve) => {
      const id = toast.custom(
        (t) => (
          <div className="bg-base-100 text-base-content shadow-lg rounded-md p-4 border w-[320px]">
            <p className="text-sm">{message}</p>
            <div className="mt-3 flex justify-end gap-2">
              <button
                className="btn btn-ghost btn-xs"
                onClick={() => {
                  toast.dismiss(id);
                  resolve(false);
                }}
              >
                {cancelLabel}
              </button>
              <button
                className="btn btn-secondary btn-xs"
                onClick={() => {
                  toast.dismiss(id);
                  resolve(true);
                }}
              >
                {confirmLabel}
              </button>
            </div>
          </div>
        ),
        { duration: 8000, id: Math.random().toString(36).slice(2) } // allow time to read
      );
    });

  const handleToggleActivity = async (activity) => {
    const isCompleted = activity.status === "completed";
    const activityName = activity.name || "this activity";

    const ok = await confirmToast(
      isCompleted
        ? `Mark "${activityName}" as pending?`
        : `Mark "${activityName}" as accomplished?`,
      isCompleted ? "Mark Pending" : "Mark Done"
    );

    if (!ok) return;

    const updates = isCompleted
      ? { status: "pending", completedAt: null }
      : { status: "completed", completedAt: new Date().toISOString() };

    await onToggle(activity._id || activity.id, updates);

    toast.success(
      isCompleted
        ? `"${activityName}" marked as pending.`
        : `🎉 "${activityName}" marked as completed!`
    );
  };

  return (
    <div className="card bg-base-100 shadow-md">
      {/* Include <Toaster /> once at app root; including here only if not already present */}
      {/* <Toaster position="top-right" /> */}
      <div className="card-body">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-base-content">Upcoming Deadlines</h3>
        </div>

        <div className="space-y-3">
          {activities.length === 0 ? (
            <div className="text-center py-8 text-base-content/60">
              <p>No upcoming deadlines.</p>
            </div>
          ) : (
            activities.map((activity) => (
              <div
                key={activity._id || activity.id}
                className="flex items-start gap-3 p-3 border rounded-lg hover:bg-base-200/50"
              >
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm mt-1"
                  checked={activity.status === "completed"}
                  onChange={() => handleToggleActivity(activity)}
                />
                <div className="flex-1 min-w-0">
                  <h4
                    className={`font-medium text-sm ${
                      activity.status === "completed" ? "line-through text-base-content/60" : "text-base-content"
                    }`}
                  >
                    {activity.name || "Untitled"}
                  </h4>
                  {activity.description && (
                    <p className="text-xs text-base-content/70 mt-1">{activity.description}</p>
                  )}
                  <p className="text-xs text-base-content/60 mt-1">
                    {(activity.dueDate || activity.endDate) && formatDate(activity.dueDate || activity.endDate)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default UpcomingDeadlines;
