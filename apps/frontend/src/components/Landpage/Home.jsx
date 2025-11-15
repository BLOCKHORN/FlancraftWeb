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

const Home = () => {
  const { user, setUser } = useContext(UserContext);
  const [showLogin, setShowLogin] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [mensajeCarga, setMensajeCarga] = useState("Cargando el mundo de Flancraft...");
  const navigate = useNavigate();
  const location = useLocation();
  const gameModesRef = useRef(null);

  const mensajes = [
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

  useEffect(() => {
    const interval = setInterval(() => {
      setMensajeCarga((prev) => {
        const index = mensajes.indexOf(prev);
        return mensajes[(index + 1) % mensajes.length];
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleReady = () => setTimeout(() => setIsLoaded(true), 400);
    if (document.readyState === "complete" || document.readyState === "interactive") {
      handleReady();
    } else {
      window.addEventListener("load", handleReady);
      return () => window.removeEventListener("load", handleReady);
    }
  }, []);

  useEffect(() => {
    if (location.state?.scrollTo === "game-modes-section") {
      const target = document.getElementById("game-modes-section");
      if (target) setTimeout(() => target.scrollIntoView({ behavior: "smooth" }), 400);
    }
  }, [location]);

  const handleMainButtonClick = () =>
    !user ? setShowLogin(true) : navigate("/dashboard");

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
              poster="/images/background-placeholder.jpg"
            >
              <source src="/videos/background1.mp4" type="video/mp4" />
              Tu navegador no admite video HTML5.
            </video>
          )}

          <div className="hero-overlay" />

          <div className="hero-content">
            <div className="hero-flan" role="img" aria-label="Flancraft Flan" />

            <h1 className="titulo-epico-flancraft">
              {"FLANCRAFT".split("").map((letra, i) => (
                <span key={i}>{letra}</span>
              ))}
            </h1>

            <p>Tu aventura empieza aquí. Sube de nivel y deja tu legado en el mundo.</p>

            <ServerStatus />

            <button className="hero-btn" onClick={handleMainButtonClick}>
              {!user ? (
                "Conectarse a Flancraft"
              ) : (
                <span className="hero-user-wrapper">
                  <span className="greeting-text">Disfruta de tu hogar,</span>
                  <span className="nombre-colored">
                    {user?.name || user?.username || "aventurero"}
                  </span>
                </span>
              )}
            </button>
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
