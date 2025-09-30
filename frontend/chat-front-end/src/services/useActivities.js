import { toast } from "react-toastify";
import { axiosInstance } from "../lib/axios";

export const useActivities = (projectId, refresh) => {
  const addActivity = async (payload) => {
    try {
      await axiosInstance.post(`/projects/${projectId}/activities`, payload);
      await refresh();
      toast.success("Activity added!");
    } catch (err) {
      const data = err?.response?.data;
      console.error("Error adding activity:", data || err);
      toast.error(data?.message || "Failed to add activity");
    }
  };

  const toggleActivity = async (activityId, updates) => {
    try {
      await axiosInstance.patch(`/projects/${projectId}/activities/${activityId}`, updates);
      await refresh();
      toast.success("Activity updated!");
    } catch (err) {
      const data = err?.response?.data;
      console.error("Error updating activity:", data || err);
      toast.error(data?.message || "Failed to update activity");
    }
  };

  const deleteActivity = async (activityId) => {
    if (!window.confirm("Delete this activity?")) return;
    try {
      await axiosInstance.delete(`/projects/${projectId}/activities/${activityId}`);
      await refresh();
      toast.success("Activity deleted!");
    } catch (err) {
      const data = err?.response?.data;
      console.error("Error deleting activity:", data || err);
      toast.error(data?.message || "Failed to delete activity");
    }
  };

  return { addActivity, toggleActivity, deleteActivity };
};
