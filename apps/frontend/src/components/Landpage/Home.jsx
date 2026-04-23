import { useState, useContext, useEffect, useCallback, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../../context/UserContext";
import { useAuthModal } from "../../context/AuthModalContext";
import { apiGet } from "../../lib/api/client";
import { buildCanonical } from "../../lib/seo/siteSeo";

import Seo from "../SEO/Seo";
import ServerStatus from "./ServerStatus";
import VoteWidget from "./VoteWidget";
import WelcomePackPromo from "./WelcomePackPromo";
import BlockStreetPromo from "./BlockStreetPromo";
import MarketTeaser from "./MarketTeaser";

import "../../styles/components/Landpage/_home.scss";

const NewsHighlight = lazy(() => import("./NewsHighlight"));
const RitualEko = lazy(() => import("./RitualEko"));
const GameModes = lazy(() => import("./GameModes"));
const TeamCarousel = lazy(() => import("./TeamCarousel"));
const Footer = lazy(() => import("./Footer"));

const pickDisplayName = (source) =>
  source?.uid || source?.username || source?.nombre_minecraft || source?.nick || source?.name || null;

// Lunes 27/04/2026 a las 18:00 (Hora Peninsular Española, UTC+2)
const TARGET_DATE = new Date("2026-04-27T18:00:00+02:00").getTime();
// 24 horas después para ocultar el teaser
const HIDE_TEASER_DATE = TARGET_DATE + (24 * 60 * 60 * 1000);

const Home = () => {
  const { user } = useContext(UserContext);
  const { openAuthModal } = useAuthModal();
  const navigate = useNavigate();

  const [isLoaded, setIsLoaded] = useState(false);
  const [playerName, setPlayerName] = useState(null);
  
  // Fases: "COUNTDOWN" (antes de abrir), "CTA" (primeras 24h abierto), "RELEASED" (>24h abierto)
  const [marketPhase, setMarketPhase] = useState("COUNTDOWN");

  const isLoggedIn = Boolean(user?.loggedIn);

  useEffect(() => {
    const isMobile = window.innerWidth <= 768;
    const imgSrc = isMobile ? "/assets/heromobile.webp" : "/assets/hero.webp";

    const img = new Image();
    img.src = imgSrc;
    
    const handleLoad = () => {
      setIsLoaded(true);
      window.dispatchEvent(new Event("heroLoaded"));
    };

    img.onload = handleLoad;
    img.onerror = () => {
      img.src = isMobile ? "/assets/hero.jpg" : "/assets/hero.jpg";
      handleLoad();
    };
  }, []);

  useEffect(() => {
    if (!isLoggedIn || !user?.uuid) {
      setPlayerName(null);
      return;
    }
    const name = pickDisplayName(user);
    if (name) {
      setPlayerName(name);
      return;
    }
    apiGet(`/api/usuarios/${user.uuid}`)
      .then((res) => setPlayerName(pickDisplayName(res) || "Aventurero"))
      .catch(() => setPlayerName("Aventurero"));
  }, [isLoggedIn, user]);

  // Controlador de tiempo global
  useEffect(() => {
    const checkPhase = () => {
      const now = new Date().getTime();
      if (now >= HIDE_TEASER_DATE) {
        setMarketPhase("RELEASED");
      } else if (now >= TARGET_DATE) {
        setMarketPhase("CTA");
      } else {
        setMarketPhase("COUNTDOWN");
      }
    };
    
    checkPhase(); // Check inicial
    const interval = setInterval(checkPhase, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleCTA = useCallback(() => {
    if (!isLoggedIn) {
      openAuthModal();
    } else {
      navigate("/dashboard");
    }
  }, [isLoggedIn, navigate, openAuthModal]);

  return (
    <>
      <Seo
        title="FlanCraft | Servidor de Minecraft Español Java y Bedrock"
        description="FlanCraft es un servidor de Minecraft español con Survival, economía, eventos, niveles, tienda y comunidad activa para Java y Bedrock."
        canonical={buildCanonical("/")}
      />

      <div className={`home-mojang ${isLoaded ? "is-visible" : "is-loading"}`}>
        <header className="hero-mojang" style={{ position: 'relative' }}>
          <picture>
            <source media="(max-width: 768px)" srcSet="/assets/heromobile.webp" />
            <img 
              src="/assets/hero.webp" 
              alt="Fondo FlanCraft" 
              className="hero-mojang__bg-img"
              onError={(e) => e.target.src = "/assets/hero.jpg"} 
            />
          </picture>
          
          <div className="hero-mojang__gradient"></div>
          
          <div className="hero-fireflies">
            <div className="firefly"></div>
            <div className="firefly"></div>
            <div className="firefly"></div>
            <div className="firefly"></div>
            <div className="firefly"></div>
            <div className="firefly"></div>
            <div className="firefly"></div>
            <div className="firefly"></div>
          </div>
          
          <img src="/assets/bee.gif" alt="" className="hero-mojang__bee" />
          
          <div className="hero-mojang__vote-wrapper">
             <VoteWidget visible={isLoaded} />
          </div>

          <div className="hero-mojang__center-content">
            <div className="hero-mojang__logo-wrapper">
              <img 
                src="/assets/h1.png" 
                alt="FlanCraft Minecraft Server" 
                className="hero-mojang__logo-img" 
              />
            </div>
            
            <div className="hero-mojang__status-center">
              <ServerStatus />
            </div>
          </div>

          <div className="hero-mojang__bottom-panel">
            <div className="mc-panel-container">
              <div className="mc-panel">
                <div className="mc-panel-cube mc-panel-cube--1"></div>
                <div className="mc-panel-cube mc-panel-cube--2"></div>
                <div className="mc-panel-cube mc-panel-cube--3"></div>

                <h2 className="mc-panel__title">
                  {isLoggedIn ? `¡HOLA DE NUEVO,\n${playerName?.toUpperCase() || "AVENTURERO"}!` : "¡ESTÁS A UN PASO!"}
                </h2>
                
                <button className="mojang-btn mojang-btn--green mc-panel__btn" onClick={handleCTA}>
                  {isLoggedIn ? "IR AL PANEL >" : "ÚNETE AHORA >"}
                </button>

                <div className="scroll-prompt">
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          </div>

          {/* El widget del teaser inyectado dentro del header para que flote en la esquina */}
          {marketPhase !== "RELEASED" && (
            <MarketTeaser phase={marketPhase} targetDate={TARGET_DATE} />
          )}
        </header>

        <div className="transition-overlay-bottom"></div>

        <WelcomePackPromo />

        {/* Solo se renderiza el mercado si ya ha pasado el tiempo de cuenta regresiva */}
        {marketPhase !== "COUNTDOWN" && <BlockStreetPromo />}

        <Suspense fallback={<div style={{ minHeight: "100vh" }}></div>}>
          <NewsHighlight />
          <RitualEko />
          <GameModes />
          <TeamCarousel />
          <Footer />
        </Suspense>
      </div>
    </>
  );
};

export default Home;