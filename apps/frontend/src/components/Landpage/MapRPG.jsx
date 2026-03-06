import {
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

const clickSound = new Howl({
  src: [clickSoundFile],
  volume: 0.4,
  preload: false,
});

const teleportSound = new Howl({
  src: [teleportSoundFile],
  volume: 0.1,
  preload: false,
});

const INITIAL_BACKDROP = baseZones[0]?.image || "";

const decodeImage = (src, signal) =>
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

const pickPlayerSlug = (user) =>
  user?.uid ||
  user?.username ||
  user?.nombre_minecraft ||
  user?.nick ||
  null;

const MapRPG = () => {
  const navigate = useNavigate();
  const { user } = useContext(UserContext);

  const isLoggedIn = Boolean(user?.loggedIn);
  const immediatePlayerSlug = pickPlayerSlug(user);

  const [playerSlug, setPlayerSlug] = useState(immediatePlayerSlug);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [firefliesScared, setFirefliesScared] = useState(false);
  const scareTimeoutRef = useRef(null);
  const scareActiveRef = useRef(false);

  const [backA, setBackA] = useState(INITIAL_BACKDROP);
  const [backB, setBackB] = useState(INITIAL_BACKDROP);
  const [useB, setUseB] = useState(false);

  const visibleLayerRef = useRef("a");
  const visibleImageRef = useRef(INITIAL_BACKDROP);
  const pendingImageRef = useRef(null);
  const preloadTaskRef = useRef(null);
  const transitionRafRef = useRef(null);
  const preloadedRef = useRef(false);
  const soundsReadyRef = useRef(false);
  const slugCacheRef = useRef(new Map());

  const ensureSounds = useCallback(() => {
    if (soundsReadyRef.current) return;
    soundsReadyRef.current = true;

    try {
      clickSound.load();
      teleportSound.load();
    } catch (_) {}
  }, []);

  const playClickSound = useCallback(() => {
    ensureSounds();

    try {
      clickSound.play();
    } catch (_) {}
  }, [ensureSounds]);

  useEffect(() => {
    if (!isLoggedIn) {
      setPlayerSlug(null);
      return;
    }

    if (immediatePlayerSlug) {
      setPlayerSlug(immediatePlayerSlug);
      if (user?.uuid) {
        slugCacheRef.current.set(user.uuid, immediatePlayerSlug);
      }
    }
  }, [isLoggedIn, immediatePlayerSlug, user?.uuid]);

  useEffect(() => {
    if (!isLoggedIn || !user?.uuid) {
      setPlayerSlug(null);
      return;
    }

    if (immediatePlayerSlug) {
      return;
    }

    const cachedSlug = slugCacheRef.current.get(user.uuid);
    if (cachedSlug) {
      setPlayerSlug(cachedSlug);
      return;
    }

    let cancelled = false;

    const fetchPlayerSlug = async () => {
      try {
        const { data, error } = await supabase
          .from("usuarios")
          .select("uid")
          .eq("uuid", user.uuid)
          .single();

        if (cancelled) return;

        if (error) {
          setPlayerSlug(null);
          return;
        }

        const nextSlug = data?.uid || null;

        if (nextSlug) {
          slugCacheRef.current.set(user.uuid, nextSlug);
        }

        setPlayerSlug(nextSlug);
      } catch (_) {
        if (cancelled) return;
        setPlayerSlug(null);
      }
    };

    fetchPlayerSlug();

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, user?.uuid, immediatePlayerSlug]);

  useEffect(() => {
    if (preloadedRef.current) return;
    preloadedRef.current = true;

    const assets = [
      ...baseZones.flatMap((zone) => [zone.image, zone.runeImage]),
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
      preloadTaskRef.current = {
        type: "idle",
        id: window.requestIdleCallback(preload, { timeout: 1200 }),
      };
    } else {
      preloadTaskRef.current = {
        type: "timeout",
        id: window.setTimeout(preload, 0),
      };
    }

    return () => {
      if (!preloadTaskRef.current) return;

      if (
        preloadTaskRef.current.type === "idle" &&
        "cancelIdleCallback" in window
      ) {
        window.cancelIdleCallback(preloadTaskRef.current.id);
      }

      if (preloadTaskRef.current.type === "timeout") {
        window.clearTimeout(preloadTaskRef.current.id);
      }

      preloadTaskRef.current = null;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (scareTimeoutRef.current) {
        window.clearTimeout(scareTimeoutRef.current);
      }

      if (transitionRafRef.current != null) {
        window.cancelAnimationFrame(transitionRafRef.current);
      }

      scareActiveRef.current = false;
    };
  }, []);

  const triggerFirefliesScare = useCallback(() => {
    if (scareActiveRef.current) return;

    scareActiveRef.current = true;

    if (scareTimeoutRef.current) {
      window.clearTimeout(scareTimeoutRef.current);
    }

    setFirefliesScared(true);

    scareTimeoutRef.current = window.setTimeout(() => {
      setFirefliesScared(false);
      scareActiveRef.current = false;
    }, 300);
  }, []);

  const zones = useMemo(() => {
    return baseZones.map((zone) =>
      zone.id === "player" && isLoggedIn && playerSlug
        ? { ...zone, route: `/perfil/${playerSlug}` }
        : zone
    );
  }, [isLoggedIn, playerSlug]);

  const len = zones.length;

  useEffect(() => {
    if (currentIndex < len) return;
    setCurrentIndex(0);
  }, [currentIndex, len]);

  const selectedZone = zones[currentIndex] ?? zones[0];
  const selectedImage = selectedZone?.image || INITIAL_BACKDROP;

  const prevIndex = (currentIndex - 1 + len) % len;
  const nextIndex = (currentIndex + 1) % len;

  useEffect(() => {
    if (!selectedImage || visibleImageRef.current === selectedImage) return;

    const controller = new AbortController();
    pendingImageRef.current = selectedImage;

    const run = async () => {
      await decodeImage(selectedImage, controller.signal);

      if (controller.signal.aborted) return;
      if (pendingImageRef.current !== selectedImage) return;

      if (transitionRafRef.current != null) {
        window.cancelAnimationFrame(transitionRafRef.current);
      }

      if (visibleLayerRef.current === "a") {
        setBackB(selectedImage);

        transitionRafRef.current = window.requestAnimationFrame(() => {
          transitionRafRef.current = null;
          visibleLayerRef.current = "b";
          visibleImageRef.current = selectedImage;
          setUseB(true);
        });

        return;
      }

      setBackA(selectedImage);

      transitionRafRef.current = window.requestAnimationFrame(() => {
        transitionRafRef.current = null;
        visibleLayerRef.current = "a";
        visibleImageRef.current = selectedImage;
        setUseB(false);
      });
    };

    run();

    return () => {
      controller.abort();
    };
  }, [selectedImage]);

  const selectIndex = useCallback(
    (index) => {
      if (index === currentIndex) return;
      setCurrentIndex(index);
      playClickSound();
    },
    [currentIndex, playClickSound]
  );

  const moveCarousel = useCallback(
    (side) => {
      setCurrentIndex((prev) =>
        side === "left" ? (prev - 1 + len) % len : (prev + 1) % len
      );
      playClickSound();
    },
    [len, playClickSound]
  );

  const handlePortalClick = useCallback(() => {
    if (!selectedZone?.route) return;

    ensureSounds();

    try {
      teleportSound.play();
    } catch (_) {}

    navigate(selectedZone.route);
  }, [ensureSounds, navigate, selectedZone?.route]);

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
                    style={{ backgroundImage: `url(${backB})` }}
                  />
                </div>

                <button
                  type="button"
                  className="maprpg-portal-aura"
                  onClick={handlePortalClick}
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
                      onClick={() => selectIndex(index)}
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
                      onClick={() => selectIndex(index)}
                      aria-label={zone.title}
                      aria-current={index === currentIndex ? "true" : undefined}
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