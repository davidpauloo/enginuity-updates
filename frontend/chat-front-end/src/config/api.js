// API Configuration
const API_BASE_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3001/api'
  : '/api'; // For production, use relative path

export const API_ENDPOINTS = {
  PROJECTS: `${API_BASE_URL}/projects`,
  DOCUMENTS: `${API_BASE_URL}/documents`,
  ACTIVITIES: `${API_BASE_URL}/activities`,
};

export const defaultHeaders = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
}; 