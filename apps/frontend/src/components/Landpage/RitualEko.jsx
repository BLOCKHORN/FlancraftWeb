import React, { useContext, useEffect, useMemo, useRef, useState, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HiChevronLeft,
  HiChevronRight,
  HiLockClosed,
  HiRocketLaunch,
  HiPlay,
} from "react-icons/hi2";
import { useNavigate } from "react-router-dom";
import codexData from "../../data/codex-data";
import { UserContext } from "../../context/UserContext";
import "../../styles/components/Landpage/_ritual.scss";

function resolvePoster(item) {
  return item?.poster || item?.bg || "";
}

function resolveVideo(item) {
  if (item?.video) return item.video;
  if (typeof item?.bg === "string") {
    return item.bg.replace(/\.(webp|png|jpg|jpeg)$/i, ".mp4");
  }
  return "";
}

const ChroniclePanelMedia = memo(function ChroniclePanelMedia({ item, onPlaybackChange, compact }) {
  const poster = resolvePoster(item);
  const video = resolveVideo(item);
  const videoRef = useRef(null);
  const resetTimerRef = useRef(null);
  const [videoMounted, setVideoMounted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);

  const clearResetTimer = () => {
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
  };

  const desmontarVideo = () => {
    clearResetTimer();
    resetTimerRef.current = setTimeout(() => {
      setVideoMounted(false);
    }, 160);
  };

  const restaurarPoster = () => {
    const node = videoRef.current;
    if (node) {
      node.pause();
      try {
        node.currentTime = 0;
      } catch {}
    }
    setPlaying(false);
    setLoading(false);
    onPlaybackChange(false);
    desmontarVideo();
  };

  const reproducir = () => {
    if (!video || loading || playing) return;
    clearResetTimer();
    setLoading(true);
    setVideoMounted(true);
  };

  const togglePlayback = () => {
    if (loading) return;
    if (playing) {
      restaurarPoster();
      return;
    }
    reproducir();
  };

  useEffect(() => {
    setPlaying(false);
    setLoading(false);
    setVideoMounted(false);
    onPlaybackChange(false);

    return () => {
      clearResetTimer();
    };
  }, [item, onPlaybackChange]);

  useEffect(() => {
    return () => {
      clearResetTimer();
      onPlaybackChange(false);
      const node = videoRef.current;
      if (node) {
        node.pause();
        node.removeAttribute("src");
        node.load();
      }
    };
  }, [onPlaybackChange]);

  const handleKeyDown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      reproducir();
    }
  };

  return (
    <div
      className={`panel-media-stack ${playing ? "is-playing" : ""} ${loading ? "is-loading" : ""} ${!playing && !loading ? "is-interactive" : ""}`}
      role={!playing && !loading ? "button" : undefined}
      tabIndex={!playing && !loading ? 0 : -1}
      onClick={!playing && !loading ? reproducir : undefined}
      onKeyDown={!playing && !loading ? handleKeyDown : undefined}
      aria-label={!playing && !loading ? `Reproducir escena de ${item?.title || "FlanCraft"}` : undefined}
    >
      <img
        src={poster}
        alt={item?.title || "Panel de FlanCraft"}
        className="panel-media panel-media-image"
        loading="eager"
        decoding="async"
      />

      {videoMounted && video ? (
        <video
          ref={videoRef}
          key={video}
          className={`panel-media panel-media-video ${playing ? "visible" : ""}`}
          src={video}
          muted
          playsInline
          autoPlay
          preload="metadata"
          onLoadedData={() => setLoading(false)}
          onPlay={() => {
            setPlaying(true);
            setLoading(false);
            onPlaybackChange(true);
          }}
          onPause={() => {
            if (videoRef.current && !videoRef.current.ended) {
              setPlaying(false);
              onPlaybackChange(false);
            }
          }}
          onEnded={restaurarPoster}
          onError={restaurarPoster}
        />
      ) : null}

      <button
        type="button"
        className={`panel-inline-action ${playing ? "is-secondary" : ""}`}
        onClick={(event) => {
          event.stopPropagation();
          togglePlayback();
        }}
        aria-label={playing ? `Volver al panel de ${item?.title || "FlanCraft"}` : `Ver escena de ${item?.title || "FlanCraft"}`}
      >
        <span className="panel-inline-action-icon">
          {playing ? <HiChevronLeft /> : <HiPlay />}
        </span>
        <span>{playing ? "VOLVER" : "VER ESCENA"}</span>
      </button>

      {!compact && !playing && !loading && (
        <button
          type="button"
          className="panel-play-trigger"
          onClick={(event) => {
            event.stopPropagation();
            reproducir();
          }}
          aria-label={`Reproducir escena de ${item?.title || "FlanCraft"}`}
        >
          <span className="panel-play-trigger-ring" />
          <span className="panel-play-trigger-core">
            <HiPlay />
          </span>
        </button>
      )}

      {!playing && !loading && (
        <div className="panel-tap-hint" aria-hidden="true">
          Toca la imagen para ver la escena
        </div>
      )}

      {loading && (
        <div className="panel-loading-state" aria-hidden="true">
          <span className="panel-loading-spinner" />
        </div>
      )}
    </div>
  );
});

export default function RitualEko() {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [viewed, setViewed] = useState(() => Array(codexData.length).fill(false));
  const [panelPlaying, setPanelPlaying] = useState(false);
  const [isCompact, setIsCompact] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(max-width: 768px)").matches : false
  );

  const navigate = useNavigate();
  const { user } = useContext(UserContext);

  const current = codexData[index] || {};
  const allViewed = useMemo(() => viewed.every(Boolean), [viewed]);
  const isLoggedIn = Boolean(user?.uuid || user?.id || user?.nombre_minecraft);

  useEffect(() => {
    setViewed((prev) => codexData.map((_, i) => prev[i] ?? false));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const media = window.matchMedia("(max-width: 768px)");
    const handleChange = (event) => setIsCompact(event.matches);

    setIsCompact(media.matches);

    if (media.addEventListener) {
      media.addEventListener("change", handleChange);
      return () => media.removeEventListener("change", handleChange);
    }

    media.addListener(handleChange);
    return () => media.removeListener(handleChange);
  }, []);

  useEffect(() => {
    setPanelPlaying(false);
    setViewed((prev) => {
      if (prev[index]) return prev;
      const next = [...prev];
      next[index] = true;
      return next;
    });
  }, [index]);

  const goToIndex = (nextIndex) => {
    if (nextIndex < 0 || nextIndex >= codexData.length || nextIndex === index) return;
    setDirection(nextIndex > index ? 1 : -1);
    setIndex(nextIndex);
  };

  const paginate = (step) => {
    goToIndex(index + step);
  };

  const panelVariants = useMemo(
    () => ({
      enter: (dir) => ({
        x: isCompact ? (dir > 0 ? 22 : -22) : dir > 0 ? 72 : -72,
        opacity: 0,
        scale: isCompact ? 0.996 : 0.985,
      }),
      center: {
        x: 0,
        opacity: 1,
        scale: 1,
        transition: {
          duration: isCompact ? 0.24 : 0.34,
          ease: [0.22, 1, 0.36, 1],
        },
      },
      exit: (dir) => ({
        x: isCompact ? (dir < 0 ? 22 : -22) : dir < 0 ? 72 : -72,
        opacity: 0,
        scale: isCompact ? 0.996 : 0.985,
        transition: {
          duration: isCompact ? 0.18 : 0.24,
          ease: [0.55, 0, 0.1, 1],
        },
      }),
    }),
    [isCompact]
  );

  return (
    <section
      className="flancraft-chronicles"
      style={{ "--panel-color": current?.badgeColor || "#7fd9ff" }}
    >
      <div
        className="chronicle-scene-bg"
        style={{ backgroundImage: `url(${resolvePoster(current)})` }}
      />

      <div className="chronicle-bg-effects">
        <div className="scene-dim" />
        <div className="scene-vignette" />
        <div className="scene-top-glow" />
        <div
          className="floating-glow"
          style={{ backgroundColor: current?.badgeColor || "#7fd9ff" }}
        />
      </div>

      <div className="chronicle-container">
        <header className="chronicle-header">
          <motion.span
            key={`cap-${index}`}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22 }}
            className="chapter-count"
          >
            REGISTRO #{String(index + 1).padStart(2, "0")}
          </motion.span>

          <h2 className="main-title">Crónicas de FlanCraft</h2>

          <p className="main-subtitle">
            Una pequeña ruta por la visión detrás del proyecto, contada como si
            cada capítulo fuese una viñeta viva del mundo que estamos levantando.
          </p>
        </header>

        <main className="chronicle-stage">
          <div className="stage-center">
            <AnimatePresence initial={false} custom={direction} mode="wait">
              <motion.article
                key={index}
                custom={direction}
                variants={panelVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="comic-panel-wrapper"
              >
                <div className="comic-frame">
                  <div className="comic-media-shell">
                    <ChroniclePanelMedia
                      item={current}
                      onPlaybackChange={setPanelPlaying}
                      compact={isCompact}
                    />
                    <div className="frame-shade" />
                  </div>

                  <div className={`narrative-box ${panelPlaying ? "is-hidden" : ""}`}>
                    <span
                      className="narrative-accent"
                      style={{ backgroundColor: current?.badgeColor || "#7fd9ff" }}
                    />
                    <h3 className="panel-title">{current?.title}</h3>

                    <div className="panel-text">
                      {String(current?.description || "")
                        .split("\n")
                        .map((line, i) => (
                          <p key={i}>{line}</p>
                        ))}
                    </div>
                  </div>
                </div>
              </motion.article>
            </AnimatePresence>
          </div>
        </main>

        <footer className="chronicle-footer">
          <div className="chronicle-controls">
            <button
              type="button"
              className="nav-btn"
              onClick={() => paginate(-1)}
              disabled={index === 0}
              aria-label="Viñeta anterior"
            >
              <HiChevronLeft />
            </button>

            <div className="timeline-stepper">
              {codexData.map((item, i) => (
                <motion.button
                  type="button"
                  key={item.id || item.title || i}
                  className={`step-dot ${i === index ? "active" : ""} ${viewed[i] ? "viewed" : ""}`}
                  onClick={() => goToIndex(i)}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  aria-label={`Ir a ${item.title}`}
                />
              ))}
            </div>

            <button
              type="button"
              className="nav-btn"
              onClick={() => paginate(1)}
              disabled={index === codexData.length - 1}
              aria-label="Siguiente viñeta"
            >
              <HiChevronRight />
            </button>
          </div>

          <motion.button
            type="button"
            whileHover={allViewed ? { scale: 1.02 } : undefined}
            whileTap={allViewed ? { scale: 0.98 } : undefined}
            className={`finish-cta ${allViewed ? "ready" : "locked"}`}
            disabled={!allViewed}
            onClick={() => {
              if (!allViewed) return;
              if (isLoggedIn) {
                navigate("/dashboard");
              } else {
                alert("¡Vincula tu cuenta para entrar al mundo!");
              }
            }}
          >
            {allViewed ? (
              <>
                <HiRocketLaunch />
                ENTRAR AL MUNDO
              </>
            ) : (
              <>
                <HiLockClosed />
                SIGUE EXPLORANDO
              </>
            )}
          </motion.button>
        </footer>
      </div>
    </section>
  );
}