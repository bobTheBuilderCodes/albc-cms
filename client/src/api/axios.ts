import axios from "axios";

const baseURL = import.meta.env.PROD
  ? import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    "https://albc-cms-server.onrender.com/api"
  : import.meta.env.VITE_API_URL_LOCAL || "http://localhost:5001/api";

const API = axios.create({
  baseURL,
});

// Attach token automatically
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default API;
