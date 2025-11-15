import React, { useState } from "react";
import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar/Navbar";
import LoginModal from "./components/Auth/LoginModal";
import { Toaster } from "react-hot-toast";

// Páginas públicas
import Home from "./components/Landpage/Home";
import AllNews from "./components/Noticias/AllNews";
import NewsDetail from "./components/Noticias/NewsDetail";
import DashboardPage from "./components/Dashboard/DashboardPage";
import RangoSelectorAnimado from "./components/Rangos/RangoSelectorAnimado";
import PerfilJugador from "./components/Estadisticas/PerfilJugador";
import LeaderboardsPage from "./components/Estadisticas/LeaderboardsPage";

// Tribunal System
import TribunalMain from "./components/Tribunal/TribunalMain";
import TribunalAdmin from "./components/Tribunal/TribunalAdmin";

// Admin
import GestionStaff from "./components/Admin/GestionStaff";
import NoticiasAdmin from "./components/Admin/NoticiasAdmin";
import EditarNoticia from "./components/Noticias/EditarNoticia";

// 🛍️ Tienda con rutas internas
import TiendaLayout from "@/components/Tienda/TiendaLayout";
import "@fortawesome/fontawesome-free/css/all.min.css";

const App = () => {
  const [showLogin, setShowLogin] = useState(false);

  return (
    <>
      <Navbar onLoginClick={() => setShowLogin(true)} />
      <Toaster position="top-center" reverseOrder={false} />
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}

      <Routes>
        {/* 🌐 Público */}
        <Route path="/" element={<Home onLoginClick={() => setShowLogin(true)} />} />
        <Route path="/news" element={<AllNews />} />
        <Route path="/news/:slug" element={<NewsDetail />} />
<Route path="/tienda/*" element={<TiendaLayout />} />        <Route path="/rangos" element={<RangoSelectorAnimado />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/leaderboards" element={<LeaderboardsPage />} />
        <Route path="/perfil/:nombre" element={<PerfilJugador />} />

        {/* 🛡️ Admin Paneles */}
        <Route path="/admin" element={<GestionStaff />} />
        <Route path="/admin/noticias" element={<NoticiasAdmin />} />
        <Route path="/admin/noticias/editar/:id" element={<EditarNoticia />} />

        {/* ⚖️ Tribunal System */}
        <Route path="/tribunal" element={<TribunalMain />} />
        <Route path="/tribunal/admin" element={<TribunalAdmin />} />
      </Routes>
    </>
  );
};

export default App;

