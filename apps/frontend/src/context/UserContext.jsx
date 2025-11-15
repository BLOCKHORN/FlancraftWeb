import React, { createContext, useState, useEffect } from 'react';

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('flan_user');
    return stored ? JSON.parse(stored) : { loggedIn: false };
  });

  // Siempre guarda en localStorage cuando se actualiza el usuario
  useEffect(() => {
    if (user && user.loggedIn) {
      localStorage.setItem('flan_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('flan_user');
    }
  }, [user]);

  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  );
};
