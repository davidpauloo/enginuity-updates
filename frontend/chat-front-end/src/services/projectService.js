// src/services/projectService.js

import { API_ENDPOINTS, defaultHeaders } from '../config/api';

// Mock data for development
const mockProject = {
  id: "1",
  clientName: "Sample Construction Project",
  description: "A modern office building construction project in downtown area.",
  imageUrl: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=2070&q=80",
  activities: [
    {
      id: "1",
      name: "Site Preparation",
      description: "Clear the site and prepare for construction",
      startDate: "2024-03-01",
      endDate: "2024-03-15",
      completed: true
    },
    {
      id: "2",
      name: "Foundation Work",
      description: "Excavation and foundation laying",
      startDate: "2024-03-16",
      endDate: "2024-04-01",
      completed: false
    },
    {
      id: "3",
      name: "Structural Framework",
      description: "Erect the main structural framework",
      startDate: "2024-04-02",
      endDate: "2024-05-15",
      completed: false
    }
  ],
  documents: [
    {
      _id: "1",
      name: "Project Blueprint",
      url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"
    },
    {
      _id: "2",
      name: "Site Survey",
      url: "https://via.placeholder.com/300"
    }
  ]
};

const handleResponse = async (response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }
  return response.json();
};

// Development mode check
const isDevelopment = window.location.hostname === 'localhost';

export const getProjectDetails = async (id) => {
  try {
    if (isDevelopment) {
      // Return mock data in development
      console.log('Using mock data for development');
      return mockProject;
    }

    const response = await fetch(`${API_ENDPOINTS.PROJECTS}/${id}`, {
      method: 'GET',
      headers: defaultHeaders,
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('Error fetching project details:', error);
    throw error;
  }
};

export const uploadDocument = async (id, formData) => {
  try {
    if (isDevelopment) {
      // Mock successful upload
      console.log('Mock document upload:', formData.get('file'));
      return { success: true, id: Math.random().toString(36).substr(2, 9) };
    }

    const response = await fetch(`${API_ENDPOINTS.PROJECTS}/${id}/documents`, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json',
      },
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('Error uploading document:', error);
    throw error;
  }
};

export const deleteDocument = async (projectId, docId) => {
  try {
    if (isDevelopment) {
      // Mock successful deletion
      console.log('Mock document deletion:', docId);
      return { success: true };
    }

    const response = await fetch(`${API_ENDPOINTS.PROJECTS}/${projectId}/documents/${docId}`, {
      method: 'DELETE',
      headers: defaultHeaders,
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('Error deleting document:', error);
    throw error;
  }
};

// New functions for managing project activities
export const addProjectActivity = async (projectId, activity) => {
  try {
    if (isDevelopment) {
      // Mock successful activity addition
      const newActivity = {
        id: Math.random().toString(36).substr(2, 9),
        ...activity
      };
      mockProject.activities.push(newActivity);
      return newActivity;
    }

    const response = await fetch(`${API_ENDPOINTS.PROJECTS}/${projectId}/activities`, {
      method: 'POST',
      headers: defaultHeaders,
      body: JSON.stringify(activity),
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('Error adding activity:', error);
    throw error;
  }
};

export const updateProjectActivity = async (projectId, activityId, updates) => {
  try {
    if (isDevelopment) {
      // Mock successful activity update
      const activityIndex = mockProject.activities.findIndex(a => a.id === activityId);
      if (activityIndex !== -1) {
        mockProject.activities[activityIndex] = {
          ...mockProject.activities[activityIndex],
          ...updates
        };
      }
      return mockProject.activities[activityIndex];
    }

    const response = await fetch(`${API_ENDPOINTS.PROJECTS}/${projectId}/activities/${activityId}`, {
      method: 'PATCH',
      headers: defaultHeaders,
      body: JSON.stringify(updates),
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('Error updating activity:', error);
    throw error;
  }
};

export const deleteProjectActivity = async (projectId, activityId) => {
  try {
    if (isDevelopment) {
      // Mock successful activity deletion
      mockProject.activities = mockProject.activities.filter(a => a.id !== activityId);
      return { success: true };
    }

    const response = await fetch(`${API_ENDPOINTS.PROJECTS}/${projectId}/activities/${activityId}`, {
      method: 'DELETE',
      headers: defaultHeaders,
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('Error deleting activity:', error);
    throw error;
  }
};
  