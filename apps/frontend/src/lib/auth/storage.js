const USER_KEY = "flan_user";
const TOKEN_KEY = "token";

const safeJsonParse = (value) => {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
};

export function getStoredUser() {
  if (typeof window === "undefined") return null;
  return safeJsonParse(window.localStorage.getItem(USER_KEY));
}

export function getAuthToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function persistSession(user, token) {
  if (typeof window === "undefined") return;

  if (user && typeof user === "object") {
    window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  if (token) {
    window.localStorage.setItem(TOKEN_KEY, token);
  }
}

export function clearSessionStorage() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(USER_KEY);
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem("rol_admin");
}
