// components/ProjectForm.jsx
import React, { useState } from 'react';
import axios from 'axios';

const ProjectForm = ({ onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    clientName: '',
    location: '',
    description: '',
    startDate: '',
    targetDeadline: ''
  });

  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      let uploadedUrl = '';

      if (file) {
        setIsUploading(true);
        const formDataFile = new FormData();
        formDataFile.append('file', file);

        const res = await axios.post('http://localhost:5001/api/upload', formDataFile);
        uploadedUrl = res.data.url;
        setIsUploading(false);
      }

      const finalData = {
        ...formData,
        fileUrl: uploadedUrl, // Optional: you can name it whatever suits your backend
      };

      onSubmit(finalData); // Call parent handler with full data
    } catch (error) {
      console.error('Upload error:', error);
      setIsUploading(false);
      alert('Error uploading file. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">Client Name</label>
        <input
          type="text"
          name="clientName"
          value={formData.clientName}
          onChange={handleChange}
          className="input input-bordered w-full"
          required
        />
      </div>

      <div>
        <label className="label">Location</label>
        <input
          type="text"
          name="location"
          value={formData.location}
          onChange={handleChange}
          className="input input-bordered w-full"
          required
        />
      </div>

      <div>
        <label className="label">Description</label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          className="textarea textarea-bordered w-full"
          rows="3"
        ></textarea>
      </div>

      <div>
        <label className="label">Start Date</label>
        <input
          type="date"
          name="startDate"
          value={formData.startDate}
          onChange={handleChange}
          className="input input-bordered w-full"
          required
        />
      </div>

      <div>
        <label className="label">Target Deadline</label>
        <input
          type="date"
          name="targetDeadline"
          value={formData.targetDeadline}
          onChange={handleChange}
          className="input input-bordered w-full"
          required
        />
      </div>

      <div>
        <label className="label">Attach File (optional)</label>
        <input
          type="file"
          onChange={handleFileChange}
          className="file-input file-input-bordered w-full"
        />
      </div>

      {isUploading && <p className="text-sm text-blue-500">Uploading file to Cloudinary...</p>}

      <div className="flex justify-end space-x-2 pt-4">
        <button type="button" onClick={onCancel} className="btn btn-outline">
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={isUploading}>
          Submit
        </button>
      </div>
    </form>
  );
};

export default ProjectForm;
