import { createContext, useCallback, useContext, useMemo, useState } from "react";
import LoginModal from "../components/Auth/LoginModal";

const AuthModalContext = createContext(null);

export function AuthModalProvider({ children }) {
  const [modalState, setModalState] = useState({ open: false });

  const openAuthModal = useCallback((options = {}) => {
    setModalState({ open: true, ...options });
  }, []);

  const closeAuthModal = useCallback(() => {
    setModalState({ open: false });
  }, []);

  const value = useMemo(
    () => ({ openAuthModal, closeAuthModal, isAuthModalOpen: Boolean(modalState.open) }),
    [openAuthModal, closeAuthModal, modalState.open]
  );

  return (
    <AuthModalContext.Provider value={value}>
      {children}
      {modalState.open ? (
        <LoginModal
          onClose={closeAuthModal}
          initialStep={modalState.initialStep}
          initialToken={modalState.initialToken}
          autoValidateToken={modalState.autoValidateToken}
        />
      ) : null}
    </AuthModalContext.Provider>
  );
}

export function useAuthModal() {
  const ctx = useContext(AuthModalContext);
  if (!ctx) {
    throw new Error("useAuthModal must be used inside AuthModalProvider");
  }
  return ctx;
}
