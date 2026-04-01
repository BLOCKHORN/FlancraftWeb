import React, { Suspense, lazy, useEffect, useState } from "react";
import { Routes, Route, useLocation, Navigate } from "react-router-dom"; // Añadido Navigate
import { Toaster } from "react-hot-toast";
import Navbar from "./components/Navbar/Navbar";
import ProtectedRoute from "./components/Routing/ProtectedRoute";
import { useAuthModal } from "./context/AuthModalContext";
import LoginModal from "./components/Auth/LoginModal";
import FlanLoader from "./components/ui/FlanLoader";
import ScrollToTop from "./components/ScrollToTop";
import GlobalLoader from "./components/ui/GlobalLoader";

// Bandera de control para El Nexo
const ENABLE_NEXO = true; 

const Home = lazy(() => import("./components/Landpage/Home"));
const VincularPage = lazy(() => import("./components/Auth/VincularPage"));
const ResetPage = lazy(() => import("./components/Auth/ResetPage"));
const AllNews = lazy(() => import("./components/Noticias/AllNews"));
const NewsDetail = lazy(() => import("./components/Noticias/NewsDetail"));
const DashboardPage = lazy(() => import("./components/Dashboard/DashboardPage"));
const NexoLayout = lazy(() => import("./components/Nexo/NexoLayout"));
const PerfilJugador = lazy(() => import("./components/Estadisticas/PerfilJugador"));
const Leaderboards = lazy(() => import("./components/Estadisticas/Leaderboards"));
const TribunalMain = lazy(() => import("./components/Tribunal/TribunalMain"));
const TribunalAdmin = lazy(() => import("./components/Tribunal/TribunalAdmin"));
const GestionStaff = lazy(() => import("./components/Admin/GestionStaff"));
const NoticiasAdmin = lazy(() => import("./components/Admin/NoticiasAdmin"));
const EditarNoticia = lazy(() => import("./components/Noticias/EditarNoticia"));
const TiendaLayout = lazy(() => import("@/components/Tienda/ui/TiendaLayout"));
const VotoPage = lazy(() => import("./components/Voto/VotoPage"));
const ServerMinecraftLanding = lazy(() => import("./components/Landpage/ServerMinecraftLanding"));

function RouteEffects() {
  const location = useLocation();
  const { openAuthModal } = useAuthModal();

  useEffect(() => {
    if (location.state?.openLogin) {
      openAuthModal();
      window.history.replaceState({}, document.title);
    }
  }, [location.state, openAuthModal]);

  return null;
}

const App = () => {
  const { isAuthModalOpen, closeAuthModal, authModalStep, openAuthModal } = useAuthModal();
  const location = useLocation();
  
  const [showSplash, setShowSplash] = useState(true);
  const [isRevealed, setIsRevealed] = useState(false);
  const [heroIsLoaded, setHeroIsLoaded] = useState(false);

  useEffect(() => {
    if (location.pathname !== "/") {
      setHeroIsLoaded(true);
      setIsRevealed(true);
      return;
    }

    const handleHeroReady = () => {
      setHeroIsLoaded(true);
      setIsRevealed(true);
    };

    window.addEventListener("heroLoaded", handleHeroReady);
    return () => window.removeEventListener("heroLoaded", handleHeroReady);
  }, [location.pathname]);

  return (
    <>
      <ScrollToTop />
      <RouteEffects />
      
      {showSplash && (
        <FlanLoader 
          isReady={heroIsLoaded}
          onComplete={() => setShowSplash(false)} 
        />
      )}

      <div className={`app-reveal-wrapper ${isRevealed ? 'is-revealed' : ''}`}>
        <Navbar onLoginClick={openAuthModal} />
        <Toaster position="top-center" reverseOrder={false} />

        <Suspense fallback={<GlobalLoader />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/vincular" element={<VincularPage />} />
            <Route path="/reset" element={<ResetPage />} />
            <Route path="/news" element={<AllNews />} />
            <Route path="/noticias" element={<AllNews />} />
            <Route path="/news/:slug" element={<NewsDetail />} />
            <Route path="/noticias/:slug" element={<NewsDetail />} />
            <Route path="/tienda/*" element={<TiendaLayout />} />
            <Route path="/store/*" element={<TiendaLayout />} />
            <Route path="/voto" element={<VotoPage />} />
            <Route path="/vote" element={<VotoPage />} />
            <Route path="/servidor-minecraft-espanol" element={<ServerMinecraftLanding />} />
            
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/nexo"
              element={
                ENABLE_NEXO ? (
                  <ProtectedRoute>
                    <NexoLayout />
                  </ProtectedRoute>
                ) : (
                  <Navigate to="/dashboard" replace />
                )
              }
            />

            <Route path="/leaderboards" element={<Leaderboards />} />
            <Route path="/perfil/:nombre" element={<PerfilJugador />} />
            
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <GestionStaff />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/noticias"
              element={
                <ProtectedRoute requireAdmin minRole="admin">
                  <NoticiasAdmin />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/noticias/editar/:id"
              element={
                <ProtectedRoute requireAdmin minRole="admin">
                  <EditarNoticia />
                </ProtectedRoute>
              }
            />
            <Route path="/tribunal" element={<TribunalMain />} />
            <Route
              path="/tribunal/admin"
              element={
                <ProtectedRoute requireAdmin minRole="mod">
                  <TribunalAdmin />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Suspense>
      </div>

      {isAuthModalOpen && (
        <LoginModal 
          onClose={closeAuthModal} 
          initialStep={authModalStep} 
        />
      )}
    </>
  );
};

export default App;