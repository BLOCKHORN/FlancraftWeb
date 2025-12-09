import React, { useState, useContext, useRef, useEffect } from "react";
import "../../styles/components/Landpage/_home.scss";

import MapRPG from "./MapRPG";
import ServerStatus from "./ServerStatus";
import GameModes from "./GameModes";
import TeamCarousel from "./TeamCarousel";
import SectionDivider from "./SectionDivider";
import SectionDivider2 from "./SectionDivider2";
import SectionDividerGameModes from "./SectionDividerGameModes";
import SectionDividerNews from "./SectionDividerNews";
import SectionDividerNav from "./SectionDividerNav";
import NewsHighlight from "./NewsHighlight";
import RitualEko from "./RitualEko";
import Footer from "./Footer";
import LoginModal from "../Auth/LoginModal";

import { UserContext } from "../../context/UserContext";
import { useNavigate, useLocation } from "react-router-dom";

// SONIDOS DRAGÓN
import llamadaSoundFile from "/assets/sounds/llamada.mp3";
import alasSoundFile from "/assets/sounds/alas.mp3";
import roarSoundFile from "/assets/sounds/roar1.mp3";
import roar2SoundFile from "/assets/sounds/roar2.mp3";

// Debe cuadrar con la animación CSS (dragonFlight 14s)
const DRAGON_FLIGHT_DURATION_MS = 14000;

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
  const [showLoginTeaser, setShowLoginTeaser] = useState(false);

  // Dragón: "hidden" | "flight"
  const [dragonPhase, setDragonPhase] = useState("hidden");
  const [islandShaking, setIslandShaking] = useState(false);
  const [isDragonRoaring, setIsDragonRoaring] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const gameModesRef = useRef(null);

  // audio refs + cooldowns
  const llamadaAudioRef = useRef(null);
  const alasAudioRef = useRef(null);
  const roarAudioRef = useRef(null);
  const roar2AudioRef = useRef(null);
  const dragonCooldownRef = useRef(false);
  const roarCooldownRef = useRef(false);
  const lastRoarIndexRef = useRef(0); // 0 => roar1, 1 => roar2
  const timeoutsRef = useRef([]);

  const isDragonPresent = dragonPhase !== "hidden";

  const pushTimeout = (id) => {
    timeoutsRef.current.push(id);
  };

  // Inicializar sonidos y limpiar al desmontar
  useEffect(() => {
    llamadaAudioRef.current = new Audio(llamadaSoundFile);
    alasAudioRef.current = new Audio(alasSoundFile);
    roarAudioRef.current = new Audio(roarSoundFile);
    roar2AudioRef.current = new Audio(roar2SoundFile);

    if (alasAudioRef.current) {
      alasAudioRef.current.loop = true;
      alasAudioRef.current.volume = 0.9;
    }

    return () => {
      timeoutsRef.current.forEach((id) => clearTimeout(id));
      if (alasAudioRef.current) {
        alasAudioRef.current.pause();
      }
    };
  }, []);

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
    const handleReady = () => {
      const id = window.setTimeout(() => setIsLoaded(true), 400);
      pushTimeout(id);
    };

    if (
      document.readyState === "complete" ||
      document.readyState === "interactive"
    ) {
      handleReady();
    } else {
      const onLoad = () => handleReady();
      window.addEventListener("load", onLoad);
      return () => window.removeEventListener("load", onLoad);
    }
  }, []);

  // Popup flotante de login para invitados
  useEffect(() => {
    if (!isLoaded) return;

    if (user?.loggedIn) {
      setShowLoginTeaser(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setShowLoginTeaser(true);
    }, 1200);
    pushTimeout(timer);

    return () => clearTimeout(timer);
  }, [isLoaded, user]);

  // Cargar nombre real del jugador desde backend
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
        const id = window.setTimeout(
          () => target.scrollIntoView({ behavior: "smooth" }),
          400
        );
        pushTimeout(id);
        return () => clearTimeout(id);
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
      (playerName || user?.username || user?.uid || user?.name)) ||
    "aventurero";

  // ========================
  //   LÓGICA DRAGÓN / ISLA
  // ========================

  const handleIslandClick = () => {
    if (dragonPhase !== "hidden" || dragonCooldownRef.current) return;

    dragonCooldownRef.current = true;

    // cooldown global para evitar spam (2s antes + vuelo + 2s después)
    const cooldownMs = 2000 + DRAGON_FLIGHT_DURATION_MS + 2000;
    const cooldownId = window.setTimeout(() => {
      dragonCooldownRef.current = false;
    }, cooldownMs);
    pushTimeout(cooldownId);

    // reset de ciclo de rugidos para este vuelo
    lastRoarIndexRef.current = 0;

    // vibración isla inmediata
    setIslandShaking(true);
    const shakeId = window.setTimeout(() => {
      setIslandShaking(false);
    }, 550);
    pushTimeout(shakeId);

    // 1s -> llamada del dragón
    const llamadaId = window.setTimeout(() => {
      if (llamadaAudioRef.current) {
        try {
          llamadaAudioRef.current.currentTime = 0;
          llamadaAudioRef.current.play();
        } catch (e) {
          console.error("Error reproduciendo llamada del dragón:", e);
        }
      }
    }, 1000);
    pushTimeout(llamadaId);

    // 2s -> empieza el vuelo fluido + alas
    const startFlightId = window.setTimeout(() => {
      setDragonPhase("flight");

      if (alasAudioRef.current) {
        try {
          alasAudioRef.current.currentTime = 0;
          alasAudioRef.current.play();
        } catch (e) {
          console.error("Error reproduciendo sonido de alas:", e);
        }
      }
    }, 2000);
    pushTimeout(startFlightId);

    // al terminar el vuelo -> ocultar dragón + parar alas
    const endFlightId = window.setTimeout(() => {
      setDragonPhase("hidden");
      if (alasAudioRef.current) {
        alasAudioRef.current.pause();
        alasAudioRef.current.currentTime = 0;
      }
    }, 2000 + DRAGON_FLIGHT_DURATION_MS);
    pushTimeout(endFlightId);
  };

  const handleDragonClick = () => {
    if (!isDragonPresent) return;
    if (roarCooldownRef.current) return;

    roarCooldownRef.current = true;

    const roarCdId = window.setTimeout(() => {
      roarCooldownRef.current = false;
    }, 2500);
    pushTimeout(roarCdId);

    // vibración de enfado más larga (~1.4s)
    setIsDragonRoaring(true);
    const stopRoarAnimId = window.setTimeout(() => {
      setIsDragonRoaring(false);
    }, 1400);
    pushTimeout(stopRoarAnimId);

    // elegir rugido (primer click = roar1, segundo = roar2)
    let audioToPlay = null;
    if (lastRoarIndexRef.current === 0) {
      audioToPlay = roarAudioRef.current;
      lastRoarIndexRef.current = 1;
    } else {
      audioToPlay = roar2AudioRef.current;
      lastRoarIndexRef.current = 0;
    }

    if (audioToPlay) {
      try {
        audioToPlay.currentTime = 0;
        audioToPlay.play();
      } catch (e) {
        console.error("Error reproduciendo rugido del dragón:", e);
      }
    }
  };

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
          {/* Estrellas de fondo */}
          <div className="stars-layer" aria-hidden="true">
            <div className="star star--1" />
            <div className="star star--2" />
            <div className="star star--3" />
            <div className="star star--4" />
            <div className="star star--5" />
            <div className="star star--6" />
            <div className="shooting-star shooting-star--1" />
          </div>

          {/* Nubes animadas */}
          <div className="clouds-layer" aria-hidden="true">
            <div className="cloud cloud--1" />
            <div className="cloud cloud--2" />
            <div className="cloud cloud--3" />
            <div className="cloud cloud--4" />
            <div className="cloud cloud--5" />
          </div>

          {/* Isla flotante */}
          <div
            className={
              "hero-floating-island" +
              (islandShaking ? " hero-floating-island--shake" : "")
            }
            role="button"
            tabIndex={0}
            aria-label="Invocar al dragón guardián del tesoro"
            onClick={handleIslandClick}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleIslandClick();
              }
            }}
          />

          {/* Dragón (wrapper = trayectoria, inner = sprite/roar) */}
          <div
            className={
              "hero-ender-dragon-wrapper" +
              (dragonPhase === "flight"
                ? " hero-ender-dragon-wrapper--flight"
                : "")
            }
            onClick={handleDragonClick}
            aria-hidden={dragonPhase === "hidden"}
          >
            <div
              className={
                "hero-ender-dragon" +
                (isDragonRoaring ? " hero-ender-dragon--roaring" : "")
              }
            />
          </div>

          <div className="hero-overlay" />

          <div className="hero-content">
            <div
              className="hero-flan"
              role="img"
              aria-label="Logotipo de FlanCraft, network de servidores de Minecraft"
            />

            <h1
              className={
                "hero-title-seo" +
                (isDragonPresent ? " hero-title-seo--hidden" : "")
              }
            >
              FLANCRAFT
            </h1>

            <p className="hero-tagline">
              Tu aventura empieza aquí. Sube de nivel y deja tu legado en el
              mundo.
            </p>

            <ServerStatus />

            {user?.loggedIn && (
              <div
                className="hero-quests-cta"
                onClick={handleMainButtonClick}
                role="button"
                aria-label="Ir al panel de retos y logros"
              >
                <div className="hero-quests-cta__image">
                  <img
                    src="/assets/ui/cta-retos-panel.webp"
                    alt="Entrar al panel de retos"
                  />
                </div>

                <div className="hero-quests-cta__text">
                  <span className="cta-line1">
                    ¡Tienes retos disponibles, {displayName}!
                  </span>
                  <span className="cta-line2">
                    Continúa tu progreso y reclama recompensas.
                  </span>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* POPUP FLOTANTE DE LOGIN PARA INVITADOS */}
        {!user?.loggedIn && showLoginTeaser && (
          <div className="login-teaser-pop">
            <button
              type="button"
              className="login-teaser-pop__close"
              onClick={() => setShowLoginTeaser(false)}
              aria-label="Cerrar aviso de inicio de sesión"
            >
              ×
            </button>

            <div className="login-teaser-pop__icon" />

            <div className="login-teaser-pop__body">
              <p className="login-teaser-pop__title">Empieza tu aventura</p>
              <p className="login-teaser-pop__text">
                Inicia sesión para desbloquear misiones, logros y recompensas
                exclusivas.
              </p>

              <button
                type="button"
                className="login-teaser-pop__button"
                onClick={handleMainButtonClick}
              >
                Iniciar sesión
              </button>
            </div>
          </div>
        )}

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
        <MapRPG />

        <SectionDividerNews />
        <NewsHighlight />

        <SectionDivider />
        <RitualEko />

        <div
          ref={gameModesRef}
          id="game-modes-section"
          className="section-gamemodes-wrapper"
        >
          <SectionDividerGameModes />
          <GameModes />
        </div>

        {/* TEAM */}
        <div className="team-slot">
          <TeamCarousel />
        </div>

        {/* DIVISOR FINAL */}
        <SectionDivider2 />

        <Footer />
      </div>
    </>
  );
};

export default Home;
