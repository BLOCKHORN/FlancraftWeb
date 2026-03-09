import {
  useState,
  useContext,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  lazy,
  Suspense,
} from "react";
import "../../styles/components/Landpage/_home.scss";

import MapRPG from "./MapRPG";
import ServerStatus from "./ServerStatus";
import VoteWidget from "./VoteWidget";
import Seo from "../SEO/Seo";

import { UserContext } from "../../context/UserContext";
import { useAuthModal } from "../../context/AuthModalContext";
import { apiGet } from "../../lib/api/client";
import { useNavigate, useLocation } from "react-router-dom";
import {
  buildBreadcrumbJsonLd,
  buildCanonical,
  buildFaqJsonLd,
  buildOrganizationJsonLd,
  buildWebSiteJsonLd,
} from "../../lib/seo/siteSeo";

import llamadaSoundFile from "/assets/sounds/llamada.mp3";
import alasSoundFile from "/assets/sounds/alas.mp3";
import roarSoundFile from "/assets/sounds/roar1.mp3";
import roar2SoundFile from "/assets/sounds/roar2.mp3";

const NewsHighlight = lazy(() => import("./NewsHighlight"));
const RitualEko = lazy(() => import("./RitualEko"));
const GameModes = lazy(() => import("./GameModes"));
const TeamCarousel = lazy(() => import("./TeamCarousel"));
const Footer = lazy(() => import("./Footer"));

const SectionDivider = lazy(() => import("./SectionDivider"));
const SectionDivider2 = lazy(() => import("./SectionDivider2"));
const SectionDividerGameModes = lazy(() => import("./SectionDividerGameModes"));
const SectionDividerNews = lazy(() => import("./SectionDividerNews"));

const DRAGON_FLIGHT_DURATION_MS = 14000;
const LOGIN_TEASER_DELAY_MS = 1100;
const CRITICAL_ASSETS = ["/assets/h1.png", "/assets/islalogo1.webp"];

const mensajesCarga = [
  "Cargando el mundo de Flancraft...",
  "Encendiendo antorchas...",
  "Generando chunks...",
  "Reuniendo aventureros...",
  "Forjando espadas legendarias...",
];

const preloadImage = (src, signal) =>
  new Promise((resolve) => {
    if (!src) {
      resolve(true);
      return;
    }

    const img = new Image();

    const cleanup = () => {
      img.onload = null;
      img.onerror = null;
      if (signal && abortHandler) {
        signal.removeEventListener("abort", abortHandler);
      }
    };

    const done = () => {
      cleanup();
      resolve(true);
    };

    const abortHandler = () => {
      done();
    };

    img.onload = async () => {
      try {
        if (img.decode) {
          await img.decode();
        }
      } catch (_) {}
      done();
    };

    img.onerror = () => {
      done();
    };

    if (signal) {
      if (signal.aborted) {
        done();
        return;
      }
      signal.addEventListener("abort", abortHandler, { once: true });
    }

    img.decoding = "async";
    img.loading = "eager";
    img.src = src;
  });

const createAudio = (src, options = {}) => {
  const audio = new Audio(src);
  audio.preload = "auto";

  if (typeof options.loop === "boolean") {
    audio.loop = options.loop;
  }

  if (typeof options.volume === "number") {
    audio.volume = options.volume;
  }

  return audio;
};

const stopAudio = (audio) => {
  if (!audio) return;
  try {
    audio.pause();
    audio.currentTime = 0;
  } catch (_) {}
};

const playAudio = (audio) => {
  if (!audio) return;
  try {
    audio.currentTime = 0;
    audio.play();
  } catch (_) {}
};

const pickDisplayName = (source) =>
  source?.uid ||
  source?.username ||
  source?.nombre_minecraft ||
  source?.nick ||
  source?.name ||
  null;

const Home = () => {
  const { user } = useContext(UserContext);
  const { openAuthModal } = useAuthModal();

  const [isLoaded, setIsLoaded] = useState(false);
  const [mensajeCarga, setMensajeCarga] = useState(mensajesCarga[0]);

  const [playerName, setPlayerName] = useState(null);
  const [showLoginTeaser, setShowLoginTeaser] = useState(false);

  const heroMapSectionRef = useRef(null);
  const [isInHeroMapZone, setIsInHeroMapZone] = useState(true);

  const [dragonPhase, setDragonPhase] = useState("hidden");
  const [islandShaking, setIslandShaking] = useState(false);
  const [isDragonRoaring, setIsDragonRoaring] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const llamadaAudioRef = useRef(null);
  const alasAudioRef = useRef(null);
  const roarAudioRef = useRef(null);
  const roar2AudioRef = useRef(null);
  const audioReadyRef = useRef(false);

  const dragonCooldownRef = useRef(false);
  const roarCooldownRef = useRef(false);
  const lastRoarIndexRef = useRef(0);
  const mensajeIndexRef = useRef(0);
  const playerNameCacheRef = useRef(new Map());
  const timeoutsRef = useRef(new Set());

  const isLoggedIn = Boolean(user?.loggedIn);
  const isDragonPresent = dragonPhase !== "hidden";
  const scrollTarget = location.state?.scrollTo;

  const scheduleTimeout = useCallback((callback, delay) => {
    let id = 0;

    id = window.setTimeout(() => {
      timeoutsRef.current.delete(id);
      callback();
    }, delay);

    timeoutsRef.current.add(id);
    return id;
  }, []);

  const clearScheduledTimeout = useCallback((id) => {
    if (id == null) return;
    window.clearTimeout(id);
    timeoutsRef.current.delete(id);
  }, []);

  const clearAllScheduledTimeouts = useCallback(() => {
    timeoutsRef.current.forEach((id) => {
      window.clearTimeout(id);
    });
    timeoutsRef.current.clear();
  }, []);

  const ensureDragonAudio = useCallback(() => {
    if (audioReadyRef.current) return;

    try {
      llamadaAudioRef.current = createAudio(llamadaSoundFile);
      alasAudioRef.current = createAudio(alasSoundFile, {
        loop: true,
        volume: 0.9,
      });
      roarAudioRef.current = createAudio(roarSoundFile);
      roar2AudioRef.current = createAudio(roar2SoundFile);
      audioReadyRef.current = true;
    } catch (_) {
      audioReadyRef.current = false;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearAllScheduledTimeouts();
      stopAudio(llamadaAudioRef.current);
      stopAudio(alasAudioRef.current);
      stopAudio(roarAudioRef.current);
      stopAudio(roar2AudioRef.current);
      audioReadyRef.current = false;
    };
  }, [clearAllScheduledTimeouts]);

  useEffect(() => {
    if (isLoaded) return;

    mensajeIndexRef.current = 0;
    setMensajeCarga(mensajesCarga[0]);

    const interval = window.setInterval(() => {
      mensajeIndexRef.current =
        (mensajeIndexRef.current + 1) % mensajesCarga.length;
      setMensajeCarga(mensajesCarga[mensajeIndexRef.current]);
    }, 1200);

    return () => window.clearInterval(interval);
  }, [isLoaded]);

  useEffect(() => {
    const controller = new AbortController();
    let hardCapId = null;
    let revealId = null;

    const run = async () => {
      const hardCap = new Promise((resolve) => {
        hardCapId = scheduleTimeout(() => resolve(true), 900);
      });

      await Promise.race([
        Promise.all(
          CRITICAL_ASSETS.map((src) => preloadImage(src, controller.signal))
        ),
        hardCap,
      ]);

      clearScheduledTimeout(hardCapId);

      if (!controller.signal.aborted) {
        revealId = scheduleTimeout(() => setIsLoaded(true), 60);
      }
    };

    run();

    return () => {
      controller.abort();
      clearScheduledTimeout(hardCapId);
      clearScheduledTimeout(revealId);
    };
  }, [clearScheduledTimeout, scheduleTimeout]);

  useEffect(() => {
    const el = heroMapSectionRef.current;
    if (!el) return;

    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(
        ([entry]) => {
          const nextValue = Boolean(entry?.isIntersecting);
          setIsInHeroMapZone((prev) =>
            prev === nextValue ? prev : nextValue
          );
        },
        { root: null, threshold: 0 }
      );

      observer.observe(el);
      return () => observer.disconnect();
    }

    let ticking = false;
    let rafId = null;

    const updateZone = () => {
      ticking = false;

      if (!heroMapSectionRef.current) return;

      const rect = heroMapSectionRef.current.getBoundingClientRect();
      const viewportHeight =
        window.innerHeight || document.documentElement.clientHeight;

      const inside = rect.bottom > 0 && rect.top < viewportHeight;

      setIsInHeroMapZone((prev) => (prev === inside ? prev : inside));
    };

    const handleScrollZone = () => {
      if (ticking) return;
      ticking = true;

      rafId = window.requestAnimationFrame(updateZone);
    };

    handleScrollZone();
    window.addEventListener("scroll", handleScrollZone, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScrollZone);
      if (rafId != null) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, []);

  useEffect(() => {
    if (!isLoaded || isLoggedIn) {
      setShowLoginTeaser(false);
      return;
    }

    const id = scheduleTimeout(() => {
      setShowLoginTeaser(true);
    }, LOGIN_TEASER_DELAY_MS);

    return () => clearScheduledTimeout(id);
  }, [isLoaded, isLoggedIn, scheduleTimeout, clearScheduledTimeout]);

  useEffect(() => {
    if (!isLoggedIn || !user?.uuid) {
      setPlayerName(null);
      return;
    }

    const immediateName = pickDisplayName(user);

    if (immediateName) {
      playerNameCacheRef.current.set(user.uuid, immediateName);
      setPlayerName(immediateName);
      return;
    }

    const cachedName = playerNameCacheRef.current.get(user.uuid);
    if (cachedName) {
      setPlayerName(cachedName);
      return;
    }

    const controller = new AbortController();
    let idleId = null;
    let fallbackTimeoutId = null;

    const fetchPlayerName = async () => {
      try {
        const data = await apiGet(`/api/usuarios/${user.uuid}`, {
          clearSessionOn401: false,
          signal: controller.signal,
        });
        const nextName = pickDisplayName(data) || "aventurero";

        playerNameCacheRef.current.set(user.uuid, nextName);
        setPlayerName(nextName);
      } catch (err) {
        if (err?.name === "AbortError") return;
        setPlayerName("aventurero");
      }
    };

    if ("requestIdleCallback" in window) {
      idleId = window.requestIdleCallback(fetchPlayerName, { timeout: 1200 });
    } else {
      fallbackTimeoutId = scheduleTimeout(fetchPlayerName, 350);
    }

    return () => {
      controller.abort();

      if (idleId != null && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleId);
      }

      clearScheduledTimeout(fallbackTimeoutId);
    };
  }, [
    isLoggedIn,
    user?.uuid,
    user?.uid,
    user?.username,
    user?.nombre_minecraft,
    user?.nick,
    user?.name,
    scheduleTimeout,
    clearScheduledTimeout,
    user,
  ]);

  useEffect(() => {
    if (scrollTarget !== "game-modes-section") return;

    const target = document.getElementById("game-modes-section");
    if (!target) return;

    const id = scheduleTimeout(() => {
      target.scrollIntoView({ behavior: "smooth" });
      navigate(location.pathname, { replace: true, state: {} });
    }, 220);

    return () => clearScheduledTimeout(id);
  }, [
    scrollTarget,
    location.pathname,
    navigate,
    scheduleTimeout,
    clearScheduledTimeout,
  ]);

  const handleMainButtonClick = useCallback(() => {
    if (!isLoggedIn) {
      openAuthModal();
      return;
    }

    navigate("/dashboard");
  }, [isLoggedIn, navigate, openAuthModal]);

  const handleCloseTeaser = useCallback(() => {
    setShowLoginTeaser(false);
  }, []);

  const handleHeroFlanKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (dragonPhase !== "hidden" || dragonCooldownRef.current) return;
        ensureDragonAudio();

        dragonCooldownRef.current = true;

        scheduleTimeout(() => {
          dragonCooldownRef.current = false;
        }, 2000 + DRAGON_FLIGHT_DURATION_MS + 2000);

        lastRoarIndexRef.current = 0;

        setIslandShaking(true);
        scheduleTimeout(() => {
          setIslandShaking(false);
        }, 550);

        scheduleTimeout(() => {
          playAudio(llamadaAudioRef.current);
        }, 1000);

        scheduleTimeout(() => {
          setDragonPhase("flight");
          playAudio(alasAudioRef.current);
        }, 2000);

        scheduleTimeout(() => {
          setDragonPhase("hidden");
          stopAudio(alasAudioRef.current);
        }, 2000 + DRAGON_FLIGHT_DURATION_MS);
      }
    },
    [dragonPhase, ensureDragonAudio, scheduleTimeout]
  );

  const handleLogoClick = useCallback(() => {
    if (dragonPhase !== "hidden" || dragonCooldownRef.current) return;

    ensureDragonAudio();

    dragonCooldownRef.current = true;

    scheduleTimeout(() => {
      dragonCooldownRef.current = false;
    }, 2000 + DRAGON_FLIGHT_DURATION_MS + 2000);

    lastRoarIndexRef.current = 0;

    setIslandShaking(true);
    scheduleTimeout(() => {
      setIslandShaking(false);
    }, 550);

    scheduleTimeout(() => {
      playAudio(llamadaAudioRef.current);
    }, 1000);

    scheduleTimeout(() => {
      setDragonPhase("flight");
      playAudio(alasAudioRef.current);
    }, 2000);

    scheduleTimeout(() => {
      setDragonPhase("hidden");
      stopAudio(alasAudioRef.current);
    }, 2000 + DRAGON_FLIGHT_DURATION_MS);
  }, [dragonPhase, ensureDragonAudio, scheduleTimeout]);

  const handleDragonClick = useCallback(() => {
    if (dragonPhase === "hidden" || roarCooldownRef.current) return;

    ensureDragonAudio();

    roarCooldownRef.current = true;

    scheduleTimeout(() => {
      roarCooldownRef.current = false;
    }, 2500);

    setIsDragonRoaring(true);
    scheduleTimeout(() => {
      setIsDragonRoaring(false);
    }, 1400);

    const audioToPlay =
      lastRoarIndexRef.current === 0
        ? roarAudioRef.current
        : roar2AudioRef.current;

    lastRoarIndexRef.current = lastRoarIndexRef.current === 0 ? 1 : 0;
    playAudio(audioToPlay);
  }, [dragonPhase, ensureDragonAudio, scheduleTimeout]);

  const displayName = useMemo(() => {
    if (!isLoggedIn) return "aventurero";
    return (
      playerName ||
      user?.username ||
      user?.uid ||
      user?.name ||
      user?.nombre_minecraft ||
      "aventurero"
    );
  }, [
    isLoggedIn,
    playerName,
    user?.username,
    user?.uid,
    user?.name,
    user?.nombre_minecraft,
  ]);

  return (
    <>
      <Seo
        title="FlanCraft | Servidor de Minecraft Español Java y Bedrock"
        description="FlanCraft es un servidor de Minecraft español con Survival, economía, eventos, niveles, tienda y comunidad activa para Java y Bedrock."
        canonical={buildCanonical("/")}
        jsonLd={[
          buildOrganizationJsonLd(),
          buildWebSiteJsonLd(),
          buildBreadcrumbJsonLd([{ name: "Inicio", item: buildCanonical("/") }]),
          buildFaqJsonLd([
            {
              question: "¿FlanCraft funciona en Java y Bedrock?",
              answer:
                "Sí. FlanCraft está pensado para soportar jugadores de Java y Bedrock dentro de una misma comunidad.",
            },
            {
              question: "¿Qué ofrece FlanCraft además de Survival?",
              answer:
                "El proyecto combina Survival, economía, logros, niveles, voto, tienda, noticias y progreso conectado con la web.",
            },
          ]),
        ]}
      />

      {!isLoaded && (
        <div className="pantalla-carga fade-in">
          <div className="loader-gema" />
          <p>{mensajeCarga}</p>
        </div>
      )}

      <div className={`home ${isLoaded ? "visible" : "invisible"}`}>
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
              <h1
                style={{
                  position: "absolute",
                  width: 1,
                  height: 1,
                  padding: 0,
                  margin: -1,
                  overflow: "hidden",
                  clip: "rect(0, 0, 0, 0)",
                  whiteSpace: "nowrap",
                  border: 0,
                }}
              >
                Servidor de Minecraft Español Java y Bedrock
              </h1>

              <div
                className={
                  "hero-logo" + (isDragonPresent ? " hero-logo--hidden" : "")
                }
                aria-hidden="true"
              >
                <img
                  src="/assets/h1.png"
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
                onKeyDown={handleHeroFlanKeyDown}
              />

              <ServerStatus />

              <p className="hero-tagline">
                Tu aventura empieza aquí. Sube de nivel y deja tu legado en el
                mejor servidor Español de Minecraft Java y Bedrock.
              </p>

              {isLoggedIn && (
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
                      loading="lazy"
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

          {!isLoggedIn && showLoginTeaser && isInHeroMapZone && (
            <div className="login-teaser-pop">
              <button
                type="button"
                className="login-teaser-pop__close"
                onClick={handleCloseTeaser}
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

        <Suspense fallback={null}>
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
        </Suspense>
      </div>
    </>
  );
};

export default Home;