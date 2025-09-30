import React, { useState, useRef } from "react";
import toast from "react-hot-toast";

const UploadDocumentModal = ({ open, onClose, onUpload, maxSizeMB = 25 }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  const resetForm = () => {
    setFile(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (!file) {
      toast.error("Please select a file to upload.");
      return;
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`File is larger than ${maxSizeMB}MB.`);
      return;
    }

    setUploading(true);

    // progress toast
    const loadingId = toast.loading("Uploading document...");

    try {
      await onUpload(file);
      toast.dismiss(loadingId);
      toast.success("Document uploaded successfully");
      resetForm();
      onClose();
    } catch (e) {
      toast.dismiss(loadingId);
      const data = e?.response?.data;
      toast.error(data?.message || data?.error || "Failed to upload document");
    } finally {
      setUploading(false);
    }
  };

  const handleClose = async () => {
    if (uploading) return; // prevent closing mid-upload
    if (!file) return onClose();

    // confirm discard using toast
    const ok = await new Promise((resolve) => {
      const id = toast.custom(
        (t) => (
          <div className="bg-base-100 text-base-content shadow-lg rounded-md p-4 border w-[320px]">
            <p className="text-sm">Discard the selected file and close?</p>
            <div className="mt-3 flex justify-end gap-2">
              <button
                className="btn btn-ghost btn-xs"
                onClick={() => {
                  toast.dismiss(id);
                  resolve(false);
                }}
              >
                Cancel
              </button>
              <button
                className="btn btn-error btn-xs"
                onClick={() => {
                  toast.dismiss(id);
                  resolve(true);
                }}
              >
                Discard
              </button>
            </div>
          </div>
        ),
        { duration: 8000, id: Math.random().toString(36).slice(2) }
      );
    });

    if (ok) {
      resetForm();
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg">Upload document</h3>
        <div className="py-4">
          <input
            ref={inputRef}
            id="fileUploadInputModal"
            type="file"
            className="file-input file-input-bordered w-full"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          <p className="text-xs text-base-content/60 mt-2">
            Max size: {maxSizeMB}MB. Supported types depend on server configuration.
          </p>
        </div>
        <div className="modal-action">
          <button className="btn btn-ghost" onClick={handleClose} disabled={uploading}>
            Cancel
          </button>
          <button
            className={`btn btn-secondary ${uploading ? "btn-disabled" : ""}`}
            onClick={handleSubmit}
          >
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UploadDocumentModal;
