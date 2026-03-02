// src/components/Landpage/MapRPG.jsx
import React, {
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  memo,
} from "react";
import { Howl } from "howler";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { UserContext } from "../../context/UserContext";
import { supabase } from "@lib/supabaseClient";
import clickSoundFile from "/assets/sounds/vibration.wav";
import teleportSoundFile from "/assets/sounds/teleport.wav";
import "../../styles/components/Landpage/_maprpg.scss";

const baseZones = [
  {
    id: "shop",
    labelCorto: "Tienda",
    title: "Tienda Oficial",
    shortDescription: "Rangos, llaves y mucho más.",
    route: "/tienda",
    image: "/assets/mercado.webp",
    runeImage: "/assets/runes/runa-tienda.webp",
  },
  {
    id: "news",
    labelCorto: "Taberna",
    title: "Taberna de Noticias",
    shortDescription: "Noticias, cambios y eventos del reino.",
    route: "/news",
    image: "/assets/taberna.webp",
    runeImage: "/assets/runes/runa-taberna.webp",
  },
  {
    id: "tribunal",
    labelCorto: "Tribunal",
    title: "Fortaleza de Sanciones",
    shortDescription: "Historial de sanciones y sentencias.",
    route: "/tribunal",
    image: "/assets/fortaleza.webp",
    runeImage: "/assets/runes/runa-tribunal.webp",
  },
  {
    id: "stats",
    labelCorto: "Estadísticas",
    title: "Estadísticas",
    shortDescription: "Rankings, tiempo de juego y récords.",
    route: "/leaderboards",
    image: "/assets/mina.webp",
    runeImage: "/assets/runes/runa-estadisticas.webp",
  },
  {
    id: "rewards",
    labelCorto: "Recompensas",
    title: "Templo de Recompensas",
    shortDescription: "Cofres, monedas y premios del pase.",
    route: "/dashboard",
    image: "/assets/recompensas.webp",
    runeImage: "/assets/runes/runa-recompensas.webp",
  },
  {
    id: "player",
    labelCorto: "Perfil",
    title: "Torre del Jugador",
    shortDescription: "Tu perfil público y progreso global.",
    route: "/perfil/tuNombre",
    image: "/assets/torre.webp",
    runeImage: "/assets/runes/runa-perfil.webp",
  },
];

const clickSound = new Howl({ src: [clickSoundFile], volume: 0.4, preload: false });
const teleportSound = new Howl({ src: [teleportSoundFile], volume: 0.1, preload: false });

const decodeImage = (src, signal) =>
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

const MapRPG = () => {
  const navigate = useNavigate();
  const { user } = useContext(UserContext);

  const isLoggedIn = Boolean(user && user.loggedIn);
  const [playerSlug, setPlayerSlug] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [firefliesScared, setFirefliesScared] = useState(false);
  const scareTimeoutRef = useRef(null);
  const scareActiveRef = useRef(false);

  const [backA, setBackA] = useState(baseZones[0]?.image || "");
  const [backB, setBackB] = useState("");
  const [useB, setUseB] = useState(false);
  const pendingRef = useRef(null);

  const preloadedRef = useRef(false);
  const soundsReadyRef = useRef(false);

  const ensureSounds = useCallback(() => {
    if (soundsReadyRef.current) return;
    soundsReadyRef.current = true;
    try {
      clickSound.load();
      teleportSound.load();
    } catch (_) {}
  }, []);

  useEffect(() => {
    let alive = true;

    const fetchPlayerSlug = async () => {
      if (!user?.uuid) {
        if (alive) setPlayerSlug(null);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("usuarios")
          .select("uid")
          .eq("uuid", user.uuid)
          .single();

        if (!alive) return;

        if (error) {
          setPlayerSlug(null);
          return;
        }

        setPlayerSlug(data?.uid || null);
      } catch (_) {
        if (!alive) return;
        setPlayerSlug(null);
      }
    };

    fetchPlayerSlug();

    return () => {
      alive = false;
    };
  }, [user?.uuid]);

  useEffect(() => {
    if (preloadedRef.current) return;
    preloadedRef.current = true;

    const assets = [
      ...baseZones.flatMap((z) => [z.image, z.runeImage]),
      "/assets/maprpg/nether-portal-frame.webp",
      "/assets/maprpg/ground-rock.webp",
    ].filter(Boolean);

    const preload = () => {
      assets.forEach((src) => {
        const img = new Image();
        img.decoding = "async";
        img.loading = "lazy";
        img.src = src;
      });
    };

    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(preload, { timeout: 1200 });
    } else {
      const id = window.setTimeout(preload, 0);
      return () => window.clearTimeout(id);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (scareTimeoutRef.current) clearTimeout(scareTimeoutRef.current);
      scareActiveRef.current = false;
    };
  }, []);

  const triggerFirefliesScare = useCallback(() => {
    if (scareActiveRef.current) return;
    scareActiveRef.current = true;

    if (scareTimeoutRef.current) clearTimeout(scareTimeoutRef.current);

    setFirefliesScared(true);

    scareTimeoutRef.current = setTimeout(() => {
      setFirefliesScared(false);
      scareActiveRef.current = false;
    }, 300);
  }, []);

  const zones = useMemo(
    () =>
      baseZones.map((zone) =>
        zone.id === "player" && isLoggedIn && playerSlug
          ? { ...zone, route: `/perfil/${playerSlug}` }
          : zone
      ),
    [isLoggedIn, playerSlug]
  );

  const len = zones.length;
  const selectedZone = zones[currentIndex] ?? zones[0];

  const prevIndex = (currentIndex - 1 + len) % len;
  const nextIndex = (currentIndex + 1) % len;

  useEffect(() => {
    const controller = new AbortController();
    const next = selectedZone?.image;
    if (!next) return;

    pendingRef.current = next;

    const run = async () => {
      await decodeImage(next, controller.signal);
      if (controller.signal.aborted) return;
      if (pendingRef.current !== next) return;

      if (!useB) {
        setBackB(next);
        requestAnimationFrame(() => setUseB(true));
      } else {
        setBackA(next);
        requestAnimationFrame(() => setUseB(false));
      }
    };

    run();

    return () => controller.abort();
  }, [selectedZone?.id, selectedZone?.image, useB]);

  const moveCarousel = useCallback(
    (side) => {
      ensureSounds();
      const dir = side === "left" ? -1 : 1;
      setCurrentIndex((prev) => (prev + dir + len) % len);
      try {
        clickSound.play();
      } catch (_) {}
    },
    [len, ensureSounds]
  );

  const handlePortalClick = useCallback(() => {
    ensureSounds();
    if (!selectedZone?.route) return;
    try {
      teleportSound.play();
    } catch (_) {}
    navigate(selectedZone.route);
  }, [navigate, selectedZone?.route, ensureSounds]);

  const handlePortalKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handlePortalClick();
      }
    },
    [handlePortalClick]
  );

  const handleRuneClick = useCallback(
    (index) => {
      if (index === currentIndex) return;
      ensureSounds();
      setCurrentIndex(index);
      try {
        clickSound.play();
      } catch (_) {}
    },
    [currentIndex, ensureSounds]
  );

  const handleRuneKeyDown = useCallback(
    (e, index) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleRuneClick(index);
      }
    },
    [handleRuneClick]
  );

  const handleDotClick = useCallback(
    (index) => {
      if (index === currentIndex) return;
      ensureSounds();
      setCurrentIndex(index);
      try {
        clickSound.play();
      } catch (_) {}
    },
    [currentIndex, ensureSounds]
  );

  const handleDotKeyDown = useCallback(
    (e, index) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleDotClick(index);
      }
    },
    [handleDotClick]
  );

  const carouselZones = useMemo(
    () => [
      { zone: zones[prevIndex], index: prevIndex, position: "left" },
      { zone: selectedZone, index: currentIndex, position: "center" },
      { zone: zones[nextIndex], index: nextIndex, position: "right" },
    ],
    [zones, prevIndex, selectedZone, currentIndex, nextIndex]
  );

  return (
    <section className="maprpg-wrapper">
      <div className="maprpg-inner">
        <header className="maprpg-header" />

        <div className="maprpg-stage">
          <div className="maprpg-portal-block">
            <div
              className={`maprpg-portal-frame ${
                firefliesScared ? "maprpg-portal-frame--scared" : ""
              }`}
              onPointerEnter={triggerFirefliesScare}
              onPointerDown={() => {
                ensureSounds();
                triggerFirefliesScare();
              }}
              onTouchStart={() => {
                ensureSounds();
                triggerFirefliesScare();
              }}
            >
              <div className="maprpg-portal-frame-image" />

              <div className="maprpg-portal-inner">
                <div className="maprpg-portal-backdrop-stack">
                  <div
                    className={`maprpg-portal-backdrop ${
                      useB ? "maprpg-portal-backdrop--hidden" : ""
                    }`}
                    style={{ backgroundImage: `url(${backA})` }}
                  />
                  <div
                    className={`maprpg-portal-backdrop maprpg-portal-backdrop--front ${
                      useB ? "" : "maprpg-portal-backdrop--hidden"
                    }`}
                    style={{ backgroundImage: `url(${backB || backA})` }}
                  />
                </div>

                <button
                  type="button"
                  className="maprpg-portal-aura"
                  onClick={handlePortalClick}
                  onKeyDown={handlePortalKeyDown}
                  aria-label={`Entrar en ${selectedZone.title}`}
                >
                  <div className="maprpg-portal-content">
                    <h3 className="maprpg-portal-title">{selectedZone.title}</h3>
                    <p className="maprpg-portal-desc">
                      {selectedZone.shortDescription}
                    </p>
                  </div>
                </button>
              </div>
            </div>

            <div className="maprpg-carousel">
              <button
                type="button"
                className="maprpg-carousel-arrow maprpg-carousel-arrow--left"
                onClick={() => moveCarousel("left")}
                aria-label="Anterior destino"
              >
                <ChevronLeft size={22} />
              </button>

              <div className="maprpg-carousel-center">
                <div className="maprpg-carousel-runes">
                  {carouselZones.map(({ zone, index, position }) => (
                    <button
                      key={zone.id}
                      type="button"
                      className={`maprpg-rune maprpg-rune--${position}`}
                      onClick={() => handleRuneClick(index)}
                      onKeyDown={(e) => handleRuneKeyDown(e, index)}
                      aria-label={zone.title}
                    >
                      <span
                        className="maprpg-rune-image"
                        style={{ backgroundImage: `url(${zone.runeImage})` }}
                      />
                    </button>
                  ))}
                </div>

                <p className="maprpg-carousel-hint">
                  Haz clic en el portal para viajar al destino seleccionado.
                </p>

                <div className="maprpg-carousel-dots">
                  {zones.map((zone, index) => (
                    <button
                      key={zone.id}
                      type="button"
                      className={`maprpg-dot ${
                        index === currentIndex ? "maprpg-dot--active" : ""
                      }`}
                      onClick={() => handleDotClick(index)}
                      onKeyDown={(e) => handleDotKeyDown(e, index)}
                      aria-label={zone.title}
                    />
                  ))}
                </div>
              </div>

              <button
                type="button"
                className="maprpg-carousel-arrow maprpg-carousel-arrow--right"
                onClick={() => moveCarousel("right")}
                aria-label="Siguiente destino"
              >
                <ChevronRight size={22} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default memo(MapRPG);