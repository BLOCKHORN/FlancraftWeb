export const API_BASE = String(
  import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || "/api"
)
  .trim()
  .replace(/\/$/, "");

export const apiUrl = (path = "") => {
  const cleanPath = String(path || "").startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${cleanPath}`;
};
