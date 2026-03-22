import React, { useContext, useEffect, useMemo, useRef, useState, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HiChevronLeft,
  HiStop,
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

const useScrambleText = (text, isVisible) => {
  const [displayText, setDisplayText] = useState("");
  const chars = "ABCDEFGHIJKLMNPQRSTUVWYZ0123456789#%&@+"; 
  
  useEffect(() => {
    if (!isVisible) return;

    let iteration = 0;
    const interval = setInterval(() => {
      setDisplayText(text.split("").map((char, index) => {
        if (index < iteration) return text[index];
        if (char === " ") return " ";
        return chars[Math.floor(Math.random() * chars.length)];
      }).join(""));

      if (iteration >= text.length) clearInterval(interval);
      iteration += 1 / 2;
    }, 25);

    return () => clearInterval(interval);
  }, [text, isVisible]);

  return displayText;
};

const ChroniclePanelMedia = memo(function ChroniclePanelMedia({ item, onPlaybackChange }) {
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
    return () => clearResetTimer();
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
      >
        <span className="panel-inline-action-icon">
          {playing ? <HiStop /> : <HiPlay />}
        </span>
        <span>{playing ? "PARAR" : "REPRODUCIR"}</span>
      </button>

      {!playing && !loading && (
        <div className="panel-tap-hint" aria-hidden="true">
          [ SCANNING DATA ]
        </div>
      )}

      {loading && (
        <div className="panel-loading-state" aria-hidden="true">
          <span className="panel-loading-spinner" />
          <span className="loading-text-glitch">DECRYPTING...</span>
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

  const navigate = useNavigate();
  const { user } = useContext(UserContext);

  const current = codexData[index] || {};
  const allViewed = useMemo(() => viewed.every(Boolean), [viewed]);
  const isLoggedIn = Boolean(user?.uuid || user?.id || user?.nombre_minecraft);
  const progressPercent = ((index + 1) / codexData.length) * 100;

  useEffect(() => {
    setViewed((prev) => codexData.map((_, i) => prev[i] ?? false));
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

  const imageVariants = {
    enter: (dir) => ({
      scale: 1.02,
      opacity: 0,
      x: dir > 0 ? 30 : -30,
    }),
    center: {
      scale: 1,
      opacity: 1,
      x: 0,
      transition: { duration: 0.4, ease: [0.25, 1, 0.5, 1] }
    },
    exit: (dir) => ({
      scale: 0.98,
      opacity: 0,
      x: dir < 0 ? 30 : -30,
      transition: { duration: 0.3, ease: [0.25, 1, 0.5, 1] }
    })
  };

  const textVariants = {
    enter: (dir) => ({
      opacity: 0,
      y: 15,
      x: dir > 0 ? 20 : -20,
    }),
    center: {
      opacity: 1,
      y: 0,
      x: 0,
      transition: { duration: 0.4, delay: 0.15, ease: [0.25, 1, 0.5, 1] }
    },
    exit: (dir) => ({
      opacity: 0,
      y: -15,
      x: dir < 0 ? 20 : -20,
      transition: { duration: 0.25, ease: [0.25, 1, 0.5, 1] }
    })
  };

  const scrambledTitle = useScrambleText(current?.title || "", true);

  return (
    <section
      className="flancraft-chronicles"
      style={{ "--panel-color": current?.badgeColor || "#5ee034" }}
    >
      <div className="chronicle-scene-bg-wrapper">
        <div className="chronicle-scene-bg-clipped">
          <div
            className="chronicle-scene-bg"
            style={{ backgroundImage: `url(${resolvePoster(current)})` }}
          />
          <div className="chronicle-bg-effects">
            <div className="scene-dim" />
            <div className="scene-grid" />
          </div>
        </div>
      </div>

      <div className="chronicle-container">
        <header className="chronicle-header">
          <motion.h2 className="main-title">
            ARCHIVOS CONFIDENCIALES
          </motion.h2>
          <p className="main-subtitle">
            Accediendo a la base de datos central. Analizando registros del backend del proyecto.
          </p>
        </header>

        <main className="chronicle-stage">
          <div className="stage-center">
            <article className="comic-panel-wrapper">
              <div className="comic-frame">
                
                <div className="comic-media-shell">
                  <AnimatePresence initial={false} custom={direction} mode="sync">
                    <motion.div
                      key={`media-${index}`}
                      custom={direction}
                      variants={imageVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      className="animated-media-layer"
                    >
                      <ChroniclePanelMedia
                        item={current}
                        onPlaybackChange={setPanelPlaying}
                      />
                    </motion.div>
                  </AnimatePresence>
                </div>

                <AnimatePresence initial={false} custom={direction} mode="sync">
                  <motion.div 
                    key={`text-${index}`}
                    custom={direction}
                    variants={textVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    className={`narrative-box ${panelPlaying ? "is-hidden" : ""}`}
                  >
                    <span
                      className="narrative-accent"
                      style={{ backgroundColor: current?.badgeColor || "#fbbf24" }}
                    />
                    <div className="title-row">
                      <span className="chapter-badge">
                        LOG #{String(index + 1).padStart(2, "0")}
                      </span>
                      <h3 className="panel-title">{scrambledTitle}</h3>
                    </div>

                    <div className="panel-text">
                      {String(current?.description || "")
                        .split("\n")
                        .map((line, i) => (
                          <p key={i}>{line}</p>
                        ))}
                    </div>
                  </motion.div>
                </AnimatePresence>

              </div>
            </article>
          </div>
        </main>

        <footer className="chronicle-footer">
          <div className="chronicle-controls">
            <button
              type="button"
              className="nav-btn"
              onClick={() => paginate(-1)}
              disabled={index === 0}
            >
              <HiChevronLeft />
            </button>

            <div className="data-download-progress">
              <div className="download-header">
                <span className="hide-on-mobile">EXTRAYENDO DATOS...</span>
                <span>{Math.round(progressPercent)}%</span>
              </div>
              <div className="download-track">
                <div className="download-fill" style={{ width: `${progressPercent}%`, backgroundColor: current?.badgeColor || "#5ee034" }} />
              </div>
            </div>

            <button
              type="button"
              className="nav-btn"
              onClick={() => paginate(1)}
              disabled={index === codexData.length - 1}
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
                alert("Vincula tu cuenta para entrar al mundo");
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
                DESENCRIPTAR TODOS LOS LOGS
              </>
            )}
          </motion.button>
        </footer>
      </div>
    </section>
  );
}