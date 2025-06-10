import axios from "axios";


const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5001";

// 2. Create the axios instance.
//    The baseURL will now correctly point to either your live Render server or your local server.
export const axiosInstance = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  withCredentials: true, // Important for sending cookies and authentication headers
});