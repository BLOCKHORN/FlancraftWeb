// src/components/Landpage/Home.jsx
import React, { useState, useContext, useRef, useEffect } from "react";
import "../../styles/components/Landpage/_home.scss";

import MapRPG from "./MapRPG";
import ServerStatus from "./ServerStatus";
import GameModes from "./GameModes";
import TeamCarousel from "./TeamCarousel";
import SectionDivider from "./SectionDivider";
import SectionDivider2 from "./SectionDivider2";
import PlayerDashboard from "../PlayerDashboard";
import RitualEko from "./RitualEko";
import Footer from "./Footer";
import LoginModal from "../Auth/LoginModal";

import { UserContext } from "../../context/UserContext";
import { useNavigate, useLocation } from "react-router-dom";

const mensajesCarga = [
  "Cargando el mundo de Flancraft...",
  "Cargando aldeanos...",
  "Encendiendo antorchas...",
  "Reuniendo aventureros...",
  "Forjando espadas legendarias...",
  "Preparando cofres de recompensas...",
  "Abriendo portales interdimensionales...",
  "Generando chunks...",
  "Asignando misiones secundarias...",
  "Revisando magia antigua...",
];

const Home = () => {
  const { user, setUser } = useContext(UserContext);
  const [showLogin, setShowLogin] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [mensajeCarga, setMensajeCarga] = useState(mensajesCarga[0]);
  const [playerName, setPlayerName] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();
  const gameModesRef = useRef(null);

  // Rotar mensajes de carga
  useEffect(() => {
    const interval = setInterval(() => {
      setMensajeCarga((prev) => {
        const index = mensajesCarga.indexOf(prev);
        return mensajesCarga[(index + 1) % mensajesCarga.length];
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Cuando la página está lista -> mostrar contenido
  useEffect(() => {
    const handleReady = () => setTimeout(() => setIsLoaded(true), 400);
    if (
      document.readyState === "complete" ||
      document.readyState === "interactive"
    ) {
      handleReady();
    } else {
      window.addEventListener("load", handleReady);
      return () => window.removeEventListener("load", handleReady);
    }
  }, []);

  // Cargar nombre real del jugador desde backend (solo si está logueado)
  useEffect(() => {
    const fetchPlayerName = async () => {
      if (!user?.loggedIn || !user?.uuid) return;

      try {
        const res = await fetch(
          `https://flancraft-backend.onrender.com/api/usuarios/${user.uuid}`
        );
        if (!res.ok) throw new Error("Respuesta no OK");
        const data = await res.json();
        setPlayerName(
          data.uid ||
            data.username ||
            data.nombre_minecraft ||
            data.nick ||
            "aventurero"
        );
      } catch (err) {
        console.error("Error al obtener nombre de jugador en Home:", err);
        setPlayerName("aventurero");
      }
    };

    fetchPlayerName();
  }, [user?.loggedIn, user?.uuid]);

  // Scroll suave a game-modes si viene desde la navbar
  useEffect(() => {
    if (location.state?.scrollTo === "game-modes-section") {
      const target = document.getElementById("game-modes-section");
      if (target) {
        setTimeout(
          () => target.scrollIntoView({ behavior: "smooth" }),
          400
        );
      }
    }
  }, [location]);

  const handleMainButtonClick = () => {
    if (!user?.loggedIn) {
      setShowLogin(true);
    } else {
      navigate("/dashboard");
    }
  };

  const displayName =
    (user?.loggedIn &&
      (playerName ||
        user?.username ||
        user?.uid ||
        user?.name)) ||
    "aventurero";

  return (
    <>
      {!isLoaded && (
        <div className="pantalla-carga fade-in">
          <div className="loader-gema" />
          <p>{mensajeCarga}</p>
        </div>
      )}

      <div className={`home ${isLoaded ? "visible" : "invisible"}`}>
        {/* HERO */}
        <header className="hero-flancraft">
          {isLoaded && (
            <video
              className="hero-video"
              autoPlay
              muted
              loop
              playsInline
              preload="none"
            >
              <source src="/videos/background1.mp4" type="video/mp4" />
              Tu navegador no admite video HTML5.
            </video>
          )}

          <div className="hero-overlay" />

          <div className="hero-content">
            <div
              className="hero-flan"
              role="img"
              aria-label="Flancraft Flan"
            />

            <h1 className="titulo-epico-flancraft">
              {"FLANCRAFT".split("").map((letra, i) => (
                <span key={i}>{letra}</span>
              ))}
            </h1>

            <p className="hero-tagline">
              Tu aventura empieza aquí. Sube de nivel y deja tu legado en el
              mundo.
            </p>

            <ServerStatus />

            {/* CTA RETOS / LOGROS */}
            <div
              className="hero-quests-cta"
              onClick={handleMainButtonClick}
              role="button"
              aria-label={
                user?.loggedIn
                  ? "Ir al panel de retos y logros"
                  : "Iniciar sesión para empezar tu aventura"
              }
            >
              {user?.loggedIn ? (
                // ✅ Vista para usuarios logueados (con imagen de panel)
                <>
                  <div className="hero-quests-cta__image">
                    <img
                      src="/assets/ui/cta-retos-panel.png"
                      alt="Entrar al panel de retos"
                    />
                  </div>

                  <div className="hero-quests-cta__text">
                    <span className="cta-line1">
                      ¡Tienes retos disponibles, {displayName}!
                    </span>
                    <span className="cta-line2">
                      Continúa tu progreso y reclama recompensas
                    </span>
                  </div>
                </>
              ) : (
                // 🔥 Vista para invitados (sin imagen, invitando a loguear)
                <div className="hero-quests-cta__content hero-quests-cta__content--guest">
                  <div className="hero-quests-cta__text">
                    <span className="cta-line1">Empieza tu aventura</span>
                    <span className="cta-line2">
                      Inicia sesión para desbloquear misiones, logros y
                      recompensas.
                    </span>
                  </div>

                  <button
                    type="button"
                    className="hero-quests-cta__button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMainButtonClick();
                    }}
                  >
                    Iniciar sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* MODAL LOGIN */}
        {showLogin && (
          <LoginModal
            onClose={() => {
              setShowLogin(false);
              const stored = localStorage.getItem("flan_user");
              if (stored) {
                try {
                  const parsed = JSON.parse(stored);
                  if (parsed?.loggedIn) setUser(parsed);
                } catch (e) {
                  console.error("Error al parsear flan_user:", e);
                }
              }
            }}
          />
        )}

        {/* SECCIONES */}
        <SectionDivider />
        <MapRPG />
        <SectionDivider />
        <PlayerDashboard />
        <SectionDivider />
        <RitualEko />
        <SectionDivider />

        <div ref={gameModesRef} id="game-modes-section">
          <GameModes />
        </div>

        <SectionDivider />

        {/* TEAM */}
        <div className="team-slot">
          <TeamCarousel />
        </div>

        {/* DIVISOR FINAL */}
        <div className="divider-overlay">
          <SectionDivider2 />
        </div>

        <Footer />
      </div>
    </>
  );
};

export default Home;
