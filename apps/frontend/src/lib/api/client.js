import { apiUrl } from "../env";
import { getAuthToken, clearSessionStorage } from "../auth/storage";

async function parseResponse(res) {
  const text = await res.text();
  const contentType = res.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    try {
      return text ? JSON.parse(text) : null;
    } catch {
      return null;
    }
  }

  return text || null;
}

export async function apiFetch(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const token = options.token ?? getAuthToken();

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(apiUrl(path), {
    credentials: options.credentials || "include",
    ...options,
    headers,
  });

  const data = await parseResponse(res);

  if (res.status === 401 && options.clearSessionOn401 !== false) {
    clearSessionStorage();
  }

  if (!res.ok) {
    const message =
      (data && typeof data === "object" && (data.error || data.message)) ||
      (typeof data === "string" && data) ||
      `Request failed with status ${res.status}`;

    const error = new Error(message);
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const apiGet = (path, options) => apiFetch(path, { ...options, method: "GET" });
export const apiPost = (path, body, options) =>
  apiFetch(path, {
    ...options,
    method: "POST",
    body: body instanceof FormData ? body : JSON.stringify(body ?? {}),
  });
export const apiPatch = (path, body, options) =>
  apiFetch(path, {
    ...options,
    method: "PATCH",
    body: body instanceof FormData ? body : JSON.stringify(body ?? {}),
  });
export const apiPut = (path, body, options) =>
  apiFetch(path, {
    ...options,
    method: "PUT",
    body: body instanceof FormData ? body : JSON.stringify(body ?? {}),
  });
export const apiDelete = (path, options) => apiFetch(path, { ...options, method: "DELETE" });
