import React, { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { buildUserSession, hydrateSessionFromBackend } from "../lib/auth/session";
import { clearSessionStorage, getStoredUser, persistSession } from "../lib/auth/storage";

export const UserContext = createContext();

const getInitialUser = () => {
  const stored = getStoredUser();
  return stored?.loggedIn || stored?.uuid ? buildUserSession(stored) : { loggedIn: false };
};

export const UserProvider = ({ children }) => {
  const [user, setUserState] = useState(getInitialUser);
  const [loading, setLoading] = useState(true);

  const setUser = useCallback((nextUser, token) => {
    const normalized =
      nextUser?.loggedIn || nextUser?.uuid ? buildUserSession(nextUser) : { loggedIn: false };

    setUserState(normalized);

    if (normalized.loggedIn) {
      persistSession(normalized, token);
    } else {
      clearSessionStorage();
    }
  }, []);

  const refreshSession = useCallback(async () => {
    setLoading(true);
    try {
      const hydrated = await hydrateSessionFromBackend();
      const normalized =
        hydrated?.loggedIn || hydrated?.uuid ? buildUserSession(hydrated) : { loggedIn: false };

      setUserState(normalized);
      return normalized;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    clearSessionStorage();
    setUserState({ loggedIn: false });
  }, []);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const hydrated = await hydrateSessionFromBackend();
        if (!mounted) return;

        setUserState(
          hydrated?.loggedIn || hydrated?.uuid ? buildUserSession(hydrated) : { loggedIn: false }
        );
      } finally {
        if (mounted) setLoading(false);
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const onStorage = (event) => {
      if (event.key && event.key !== "flan_user" && event.key !== "token") return;

      const stored = getStoredUser();
      setUserState(
        stored?.loggedIn || stored?.uuid ? buildUserSession(stored) : { loggedIn: false }
      );
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const value = useMemo(
    () => ({
      user,
      setUser,
      loading,
      logout,
      refreshSession,
    }),
    [user, setUser, loading, logout, refreshSession]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};