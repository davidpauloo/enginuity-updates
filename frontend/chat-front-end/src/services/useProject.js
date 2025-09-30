import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { axiosInstance } from "../lib/axios";

export const useProject = (projectId) => {
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProject = useCallback(async () => {
    try {
      const { data } = await axiosInstance.get(`/projects/${projectId}`);
      setProject(data);
    } catch (err) {
      const data = err?.response?.data;
      console.error("Error fetching project:", data || err);
      toast.error(data?.message || "Failed to fetch project");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) fetchProject();
  }, [projectId, fetchProject]);

  return { project, setProject, loading, fetchProject };
};
