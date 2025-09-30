const handleDeleteDocument = async (documentId) => {
    const ok = window.confirm("Delete this document?");
    if (!ok) return;
    await axiosInstance.delete(`/projects/${projectId}/documents/${documentId}`);
    await fetchProjectDetails();
    toast.success("Document deleted successfully!");
  };