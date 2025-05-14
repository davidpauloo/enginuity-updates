import { axiosInstance } from "./axios";


export const logoutUser = async () => {
  try {
    const res = await axiosInstance.post("/auth/logout");
    return res.data;
  } catch (err) {
    throw err.response?.data || { message: "Logout failed" };
  }
};