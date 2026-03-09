import React, { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { buildUserSession, hydrateSessionFromBackend } from "../lib/auth/session";
import { clearSessionStorage, getStoredUser, persistSession } from "../lib/auth/storage";

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUserState] = useState(() => getStoredUser() || { loggedIn: false });
  const [loading, setLoading] = useState(true);

  const setUser = useCallback((nextUser, token) => {
    const normalized = nextUser?.loggedIn ? buildUserSession(nextUser) : { loggedIn: false };
    setUserState(normalized);

    if (normalized.loggedIn) {
      persistSession(normalized, token);
    } else {
      clearSessionStorage();
    }
  }, []);

  const refreshSession = useCallback(async () => {
    setLoading(true);
    const hydrated = await hydrateSessionFromBackend();
    setUserState(hydrated?.loggedIn ? buildUserSession(hydrated) : { loggedIn: false });
    setLoading(false);
    return hydrated;
  }, []);

  const logout = useCallback(() => {
    clearSessionStorage();
    setUserState({ loggedIn: false });
  }, []);

  useEffect(() => {
    let mounted = true;

    hydrateSessionFromBackend().then((hydrated) => {
      if (!mounted) return;
      setUserState(hydrated?.loggedIn ? buildUserSession(hydrated) : { loggedIn: false });
      setLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, []);


  useEffect(() => {
    const onStorage = (event) => {
      if (event.key && event.key !== "flan_user" && event.key !== "token") return;
      const stored = getStoredUser();
      setUserState(stored?.loggedIn ? buildUserSession(stored) : { loggedIn: false });
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const value = useMemo(
    () => ({ user, setUser, loading, logout, refreshSession }),
    [user, setUser, loading, logout, refreshSession]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};
