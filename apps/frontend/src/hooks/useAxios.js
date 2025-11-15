// src/hooks/useAxios.js
import axios from "axios";

const API_URL =
  import.meta.env.VITE_BACKEND_URL || "http://localhost:10000";

const api = axios.create({
  baseURL: API_URL,
  // por si el backend usa cookie + header
  withCredentials: true,
});

// inyectamos token en TODAS las requests
api.interceptors.request.use((config) => {
  try {
    const raw = localStorage.getItem("flan_user");
    if (raw) {
      const parsed = JSON.parse(raw);

      // intentamos varias rutas posibles
      const token =
        parsed?.token ||
        parsed?.usuario?.token ||
        parsed?.user?.token ||
        parsed?.access_token ||
        parsed?.jwt;

      if (token) {
        // lo que espera la mayoría de middlewares
        config.headers.Authorization = `Bearer ${token}`;
        // por si tu middleware mira este
        config.headers["x-access-token"] = token;
      }
    }
  } catch (err) {
    // si falla el JSON no rompemos la petición
    console.warn("No se pudo leer flan_user de localStorage:", err);
  }
  return config;
});

// opcional: si el backend devuelve 401, lo vemos claro en consola
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error?.response?.status === 401) {
      console.warn(
        "[useAxios] 401 recibido. ¿token inválido o usuario sin rol_owner?"
      );
    }
    return Promise.reject(error);
  }
);

export default api;
