import { toast } from "react-toastify";
import { axiosInstance } from "../lib/axios";

export const useDocuments = (projectId, refresh) => {
  const uploadDocument = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    await axiosInstance.post(`/projects/${projectId}/documents`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    await refresh();
    toast.success("Document uploaded successfully!");
  };

  const deleteDocument = async (docId) => {
    if (!window.confirm("Delete this document?")) return;
    await axiosInstance.delete(`/projects/${projectId}/documents/${docId}`);
    await refresh();
    toast.success("Document deleted successfully!");
  };

  return { uploadDocument, deleteDocument };
};
