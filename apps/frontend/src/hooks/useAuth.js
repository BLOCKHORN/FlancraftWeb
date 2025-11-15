import { useEffect, useState } from "react";

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("flan_user");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.uuid && parsed.name && parsed.loggedIn) {
          setUser(parsed);
        }
      } catch {
        localStorage.removeItem("flan_user");
      }
    }
    setLoading(false);
  }, []);

  return {
    user,
    isLoggedIn: !!user,
    loading
  };
}
