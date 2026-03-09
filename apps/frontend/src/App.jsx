import React, { Suspense, lazy, useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Navbar from "./components/Navbar/Navbar";
import ProtectedRoute from "./components/Routing/ProtectedRoute";
import { useAuthModal } from "./context/AuthModalContext";

const Home = lazy(() => import("./components/Landpage/Home"));
const VincularPage = lazy(() => import("./components/Auth/VincularPage"));
const AllNews = lazy(() => import("./components/Noticias/AllNews"));
const NewsDetail = lazy(() => import("./components/Noticias/NewsDetail"));
const DashboardPage = lazy(() => import("./components/Dashboard/DashboardPage"));
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
  const { openAuthModal } = useAuthModal();

  return (
    <>
      <RouteEffects />
      <Navbar onLoginClick={openAuthModal} />
      <Toaster position="top-center" reverseOrder={false} />

      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/vincular" element={<VincularPage />} />
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
          <Route path="/leaderboards" element={<Leaderboards />} />
          <Route path="/perfil/:nombre" element={<PerfilJugador />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute requireAdmin minRole="owner">
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
    </>
  );
};

export default App;
