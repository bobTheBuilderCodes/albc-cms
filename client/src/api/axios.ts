import axios from "axios";
import { buildCacheKey, cacheGet, cacheSet, processQueue, queueRequest } from "../utils/offline";
import { emitToast } from "../contexts/ToastContext";

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

  const method = (config.method || "get").toLowerCase();
  const url = config.url || "";

  if (!navigator.onLine) {
    if (method === "get") {
      const key = config.offlineCacheKey || buildCacheKey(url, config.params as Record<string, unknown> | undefined);
      config.adapter = async () => {
        const cached = await cacheGet(key);
        if (!cached) {
          return Promise.reject({ message: "Offline and no cached data", config, isOfflineCacheMiss: true });
        }
        return {
          data: cached,
          status: 200,
          statusText: "OK",
          headers: {},
          config,
        };
      };
    } else {
      const payload = {
        method,
        url,
        data: typeof config.data === "string" ? JSON.parse(config.data) : config.data,
        params: config.params as Record<string, unknown> | undefined,
        createdAt: Date.now(),
      };
      config.adapter = async () => {
        await queueRequest(payload);
        emitToast("info", "You're offline. Changes will sync when you're back online.");
        return {
          data: { success: true, offlineQueued: true, data: config.offlineData ?? null },
          status: 202,
          statusText: "Accepted",
          headers: {},
          config,
        };
      };
    }
  }

  return config;
});

API.interceptors.response.use(
  async (response) => {
    const method = (response.config?.method || "get").toLowerCase();
    if (method === "get") {
      const url = response.config?.url || "";
      const key =
        response.config?.offlineCacheKey ||
        buildCacheKey(url, response.config?.params as Record<string, unknown> | undefined);
      await cacheSet(key, response.data);
    }
    return response;
  },
  (error) => {
    const status = error?.response?.status;
    if (status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("auth_user");
      if (window.location.pathname !== "/login") {
        window.location.assign("/login");
      }
    }
    return Promise.reject(error);
  }
);

window.addEventListener("online", () => {
  processQueue(baseURL).then((count) => {
    if (count > 0) {
      emitToast("success", "Offline changes synced.");
    }
  });
});

export default API;
