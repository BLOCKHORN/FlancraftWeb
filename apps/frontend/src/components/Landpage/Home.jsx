// src/components/Landpage/Home.jsx
import React, { useState, useContext, useRef, useEffect, useCallback } from "react";
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
import VoteWidget from "./VoteWidget";

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

// Precarga segura (img + decode si existe)
const preloadImage = (src, signal) =>
  new Promise((resolve) => {
    if (!src) return resolve(true);
    const img = new Image();
    const done = () => resolve(true);

    const cleanup = () => {
      img.onload = null;
      img.onerror = null;
    };

    img.onload = async () => {
      try {
        // decode reduce flashes (si el navegador lo soporta)
        if (img.decode) await img.decode();
      } catch (_) {}
      cleanup();
      done();
    };

    img.onerror = () => {
      cleanup();
      done();
    };

    if (signal) {
      if (signal.aborted) return done();
      signal.addEventListener(
        "abort",
        () => {
          cleanup();
          done();
        },
        { once: true }
      );
    }

    img.decoding = "async";
    img.loading = "eager";
    img.src = src;
  });

const Home = () => {
  const { user, setUser } = useContext(UserContext);
  const [showLogin, setShowLogin] = useState(false);

  // ✅ loader más estable: depende de precarga crítica en vez de window.load
  const [isLoaded, setIsLoaded] = useState(false);
  const [mensajeCarga, setMensajeCarga] = useState(mensajesCarga[0]);

  const [playerName, setPlayerName] = useState(null);
  const [showLoginTeaser, setShowLoginTeaser] = useState(false);

  // limitar popup a HERO + MAPRPG
  const heroMapSectionRef = useRef(null);
  const [isInHeroMapZone, setIsInHeroMapZone] = useState(true);

  // Dragón: "hidden" | "flight"
  const [dragonPhase, setDragonPhase] = useState("hidden");
  const [islandShaking, setIslandShaking] = useState(false);
  const [isDragonRoaring, setIsDragonRoaring] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  // audio refs + cooldowns
  const llamadaAudioRef = useRef(null);
  const alasAudioRef = useRef(null);
  const roarAudioRef = useRef(null);
  const roar2AudioRef = useRef(null);
  const dragonCooldownRef = useRef(false);
  const roarCooldownRef = useRef(false);
  const lastRoarIndexRef = useRef(0); // 0 => roar1, 1 => roar2
  const timeoutsRef = useRef([]);
  const mensajeIndexRef = useRef(0);

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

  // Rotar mensajes SOLO mientras está la pantalla de carga
  useEffect(() => {
    if (isLoaded) return;

    mensajeIndexRef.current = 0;
    setMensajeCarga(mensajesCarga[0]);

    const interval = setInterval(() => {
      mensajeIndexRef.current =
        (mensajeIndexRef.current + 1) % mensajesCarga.length;
      setMensajeCarga(mensajesCarga[mensajeIndexRef.current]);
    }, 2000);

    return () => clearInterval(interval);
  }, [isLoaded]);

  // ✅ Carga “real”: precarga assets críticos y luego muestra home
  useEffect(() => {
    const controller = new AbortController();

    const run = async () => {
      // Añade aquí lo que sea “crítico” para tu primer paint
      const critical = [
        "/assets/h1.webp",
        "/assets/ui/cta-retos-panel.webp",
      ];

      // no bloquees infinito: máximo 1.4s
      const hardCap = new Promise((resolve) => {
        const id = window.setTimeout(() => resolve(true), 1400);
        pushTimeout(id);
      });

      await Promise.race([
        Promise.all(critical.map((src) => preloadImage(src, controller.signal))),
        hardCap,
      ]);

      if (!controller.signal.aborted) {
        // mini delay para que el CSS termine de aplicar antes del fade-in
        const id = window.setTimeout(() => setIsLoaded(true), 80);
        pushTimeout(id);
      }
    };

    run();

    return () => controller.abort();
  }, []);

  // Detectar si estamos dentro de la zona HERO + MAPRPG
  useEffect(() => {
    const el = heroMapSectionRef.current;
    if (!el) return;

    if ("IntersectionObserver" in window) {
      const obs = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          setIsInHeroMapZone(Boolean(entry?.isIntersecting));
        },
        { root: null, threshold: 0 }
      );

      obs.observe(el);
      return () => obs.disconnect();
    }

    // Fallback
    let ticking = false;
    const handleScrollZone = () => {
      if (ticking) return;
      ticking = true;

      window.requestAnimationFrame(() => {
        ticking = false;
        if (!heroMapSectionRef.current) return;

        const rect = heroMapSectionRef.current.getBoundingClientRect();
        const viewportHeight =
          window.innerHeight || document.documentElement.clientHeight;

        const inside = rect.bottom > 0 && rect.top < viewportHeight;
        setIsInHeroMapZone(inside);
      });
    };

    handleScrollZone();
    window.addEventListener("scroll", handleScrollZone, { passive: true });
    return () => window.removeEventListener("scroll", handleScrollZone);
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
    const controller = new AbortController();

    const fetchPlayerName = async () => {
      if (!user?.loggedIn || !user?.uuid) return;

      try {
        const res = await fetch(
          `https://flancraft-backend.onrender.com/api/usuarios/${user.uuid}`,
          { signal: controller.signal }
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
        if (err?.name === "AbortError") return;
        console.error("Error al obtener nombre de jugador en Home:", err);
        setPlayerName("aventurero");
      }
    };

    fetchPlayerName();

    return () => controller.abort();
  }, [user?.loggedIn, user?.uuid]);

  // ✅ Scroll suave a game-modes si viene desde la navbar (y limpia state para que no se repita)
  useEffect(() => {
    if (location.state?.scrollTo === "game-modes-section") {
      const target = document.getElementById("game-modes-section");
      if (target) {
        const id = window.setTimeout(() => {
          target.scrollIntoView({ behavior: "smooth" });
          // limpia el state para evitar re-triggers al volver atrás o re-render
          navigate(location.pathname, { replace: true, state: {} });
        }, 250);
        pushTimeout(id);
        return () => clearTimeout(id);
      }
    }
  }, [location.state, location.pathname, navigate]);

  const handleMainButtonClick = useCallback(() => {
    if (!user?.loggedIn) setShowLogin(true);
    else navigate("/dashboard");
  }, [user?.loggedIn, navigate]);

  const displayName =
    (user?.loggedIn &&
      (playerName || user?.username || user?.uid || user?.name)) ||
    "aventurero";

  // ========================
  //   LÓGICA DRAGÓN / LOGO
  // ========================

  const handleLogoClick = () => {
    if (dragonPhase !== "hidden" || dragonCooldownRef.current) return;

    dragonCooldownRef.current = true;

    const cooldownMs = 2000 + DRAGON_FLIGHT_DURATION_MS + 2000;
    const cooldownId = window.setTimeout(() => {
      dragonCooldownRef.current = false;
    }, cooldownMs);
    pushTimeout(cooldownId);

    lastRoarIndexRef.current = 0;

    setIslandShaking(true);
    const shakeId = window.setTimeout(() => {
      setIslandShaking(false);
    }, 550);
    pushTimeout(shakeId);

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
    if (dragonPhase === "hidden") return;
    if (roarCooldownRef.current) return;

    roarCooldownRef.current = true;

    const roarCdId = window.setTimeout(() => {
      roarCooldownRef.current = false;
    }, 2500);
    pushTimeout(roarCdId);

    setIsDragonRoaring(true);
    const stopRoarAnimId = window.setTimeout(() => {
      setIsDragonRoaring(false);
    }, 1400);
    pushTimeout(stopRoarAnimId);

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
        {/* ZONA HERO + MAPRPG */}
        <div ref={heroMapSectionRef} className="hero-map-section">
          <VoteWidget visible={isLoaded && isInHeroMapZone} />

          <header className="hero-flancraft">
            <div className="stars-layer" aria-hidden="true">
              <div className="star star--1" />
              <div className="star star--2" />
              <div className="star star--3" />
              <div className="star star--4" />
              <div className="star star--5" />
              <div className="star star--6" />
              <div className="shooting-star shooting-star--1" />
            </div>

            <div className="clouds-layer" aria-hidden="true">
              <div className="cloud cloud--1" />
              <div className="cloud cloud--2" />
              <div className="cloud cloud--3" />
              <div className="cloud cloud--4" />
              <div className="cloud cloud--5" />
            </div>

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
                className={
                  "hero-logo" + (isDragonPresent ? " hero-logo--hidden" : "")
                }
                aria-hidden="true"
              >
                {/* ✅ decoding + fetchpriority para el primer paint */}
                <img
                  src="/assets/h1.webp"
                  alt="FlanCraft Minecraft Network"
                  decoding="async"
                  fetchpriority="high"
                />
              </div>

              <div
                className={
                  "hero-flan" + (islandShaking ? " hero-flan--shake" : "")
                }
                role="button"
                tabIndex={0}
                aria-label="Invocar al dragón guardián del tesoro"
                onClick={handleLogoClick}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleLogoClick();
                  }
                }}
              />

              <ServerStatus />

              <p className="hero-tagline">
                Tu aventura empieza aquí. Sube de nivel y deja tu legado en la
                mejor network de Minecraft.
              </p>

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
                      decoding="async"
                      loading="eager"
                      fetchpriority="high"
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

          {!user?.loggedIn && showLoginTeaser && isInHeroMapZone && (
            <div className="login-teaser-pop">
              <button
                type="button"
                className="login-teaser-pop__close"
                onClick={() => setShowLoginTeaser(false)}
                aria-label="Cerrar aviso de inicio de sesión"
              >
                ×
              </button>

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

          <MapRPG />
        </div>

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

        <SectionDividerNews />
        <NewsHighlight />

        <SectionDivider />
        <RitualEko />

        <div id="game-modes-section" className="section-gamemodes-wrapper">
          <SectionDividerGameModes />
          <GameModes />
        </div>

        <div className="team-slot">
          <TeamCarousel />
        </div>

        <SectionDivider2 />
        <Footer />
      </div>
    </>
  );
};

export default Home;
