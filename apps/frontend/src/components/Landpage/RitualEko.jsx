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
    }, 180);
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

  return (
    <div className={`panel-media-stack ${playing ? "is-playing" : ""} ${loading ? "is-loading" : ""}`}>
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

      {!playing && !loading && (
        <button
          type="button"
          className="panel-play-trigger"
          onClick={reproducir}
          aria-label={`Reproducir escena de ${item?.title || "FlanCraft"}`}
        >
          <span className="panel-play-trigger-ring" />
          <span className="panel-play-trigger-core">
            <HiPlay />
          </span>
        </button>
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
  const navigate = useNavigate();
  const { user } = useContext(UserContext);

  const current = codexData[index];
  const allViewed = useMemo(() => viewed.every(Boolean), [viewed]);
  const isLoggedIn = Boolean(user?.uuid || user?.id || user?.nombre_minecraft);

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

  const panelVariants = {
    enter: (dir) => ({
      x: dir > 0 ? 90 : -90,
      opacity: 0,
      scale: 0.97,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.42,
        ease: [0.22, 1, 0.36, 1],
      },
    },
    exit: (dir) => ({
      x: dir < 0 ? 90 : -90,
      opacity: 0,
      scale: 0.97,
      transition: {
        duration: 0.28,
        ease: [0.55, 0, 0.1, 1],
      },
    }),
  };

  const bgVariants = {
    initial: { opacity: 0, scale: 1.06 },
    animate: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.6,
        ease: [0.22, 1, 0.36, 1],
      },
    },
    exit: {
      opacity: 0,
      scale: 1.03,
      transition: {
        duration: 0.35,
        ease: [0.4, 0, 1, 1],
      },
    },
  };

  return (
    <section
      className="flancraft-chronicles"
      style={{ "--panel-color": current?.badgeColor || "#7fd9ff" }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={`bg-${index}`}
          className="chronicle-scene-bg"
          style={{ backgroundImage: `url(${resolvePoster(current)})` }}
          variants={bgVariants}
          initial="initial"
          animate="animate"
          exit="exit"
        />
      </AnimatePresence>

      <div className="chronicle-bg-effects">
        <div className="scene-dim" />
        <div className="scene-vignette" />
        <div className="scene-top-glow" />
        <motion.div
          className="floating-glow"
          style={{ backgroundColor: current?.badgeColor || "#7fd9ff" }}
          animate={{
            x: [0, 16, -12, 0],
            y: [0, -14, 12, 0],
            scale: [1, 1.06, 0.98, 1],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      <div className="chronicle-container">
        <header className="chronicle-header">
          <motion.span
            key={`cap-${index}`}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28 }}
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
          <button
            type="button"
            className="nav-btn prev"
            onClick={() => paginate(-1)}
            disabled={index === 0}
            aria-label="Viñeta anterior"
          >
            <HiChevronLeft />
          </button>

          <div className="stage-center">
            <AnimatePresence initial={false} custom={direction} mode="wait">
              <motion.div
                key={index}
                custom={direction}
                variants={panelVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="comic-panel-wrapper"
              >
                <div className="comic-frame">
                  <ChroniclePanelMedia item={current} onPlaybackChange={setPanelPlaying} />

                  <div className="frame-shade" />

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
              </motion.div>
            </AnimatePresence>
          </div>

          <button
            type="button"
            className="nav-btn next"
            onClick={() => paginate(1)}
            disabled={index === codexData.length - 1}
            aria-label="Siguiente viñeta"
          >
            <HiChevronRight />
          </button>
        </main>

        <footer className="chronicle-footer">
          <div className="timeline-stepper">
            {codexData.map((item, i) => (
              <motion.button
                type="button"
                key={item.id || item.title || i}
                className={`step-dot ${i === index ? "active" : ""} ${viewed[i] ? "viewed" : ""}`}
                onClick={() => goToIndex(i)}
                whileHover={{ scale: 1.12 }}
                whileTap={{ scale: 0.92 }}
                aria-label={`Ir a ${item.title}`}
              />
            ))}
          </div>

          <motion.button
            type="button"
            whileHover={allViewed ? { scale: 1.03 } : undefined}
            whileTap={allViewed ? { scale: 0.97 } : undefined}
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