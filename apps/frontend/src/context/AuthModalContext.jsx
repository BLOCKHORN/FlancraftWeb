import { createContext, useCallback, useContext, useMemo, useState } from "react";
import LoginModal from "../components/Auth/LoginModal";

const AuthModalContext = createContext(null);

const DEFAULT_MODAL_STATE = {
  open: false,
  initialStep: undefined,
  initialToken: undefined,
  autoValidateToken: undefined,
};

export function AuthModalProvider({ children }) {
  const [modalState, setModalState] = useState(DEFAULT_MODAL_STATE);

  const openAuthModal = useCallback((options = {}) => {
    setModalState({
      open: true,
      initialStep: options.initialStep,
      initialToken: options.initialToken,
      autoValidateToken: options.autoValidateToken,
    });
  }, []);

  const closeAuthModal = useCallback(() => {
    setModalState(DEFAULT_MODAL_STATE);
  }, []);

  const value = useMemo(
    () => ({
      openAuthModal,
      closeAuthModal,
      isAuthModalOpen: Boolean(modalState.open),
    }),
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