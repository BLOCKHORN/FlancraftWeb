import React, { memo, useEffect, useRef, useState } from "react";
import { HiPause, HiPlay } from "react-icons/hi2";
import "../../styles/components/Landpage/_gamemodes.scss";

const mode = {
  id: "survival",
  name: "Survival",
  description:
    "Survival es ahora el centro de FlanCraft. Un único mundo donde se junta todo: economía, clanes, progreso y un montón de gente dando vida al servidor cada día. Más movimiento, más historias y más razones para entrar y quedarte.",
  image: "/assets/modes/survival.webp",
  video: "/assets/modes/survival.mp4",
  icon: "/assets/reinos/survival-clasico.webp",
  accent: "#84d96b",
};

const GameModeMedia = memo(function GameModeMedia({ item }) {
  const videoRef = useRef(null);
  const unmountTimerRef = useRef(null);
  const [videoMounted, setVideoMounted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);

  const clearUnmountTimer = () => {
    if (unmountTimerRef.current) {
      clearTimeout(unmountTimerRef.current);
      unmountTimerRef.current = null;
    }
  };

  const stopVideo = () => {
    clearUnmountTimer();

    const node = videoRef.current;

    if (node) {
      node.pause();

      try {
        node.currentTime = 0;
      } catch {}
    }

    setPlaying(false);
    setLoading(false);

    unmountTimerRef.current = setTimeout(() => {
      setVideoMounted(false);
    }, 120);
  };

  const startVideo = () => {
    if (!item.video || loading || playing) return;
    clearUnmountTimer();
    setLoading(true);
    setVideoMounted(true);
  };

  const togglePlayback = () => {
    if (playing || loading) {
      stopVideo();
      return;
    }

    startVideo();
  };

  useEffect(() => {
    clearUnmountTimer();
    setVideoMounted(false);
    setPlaying(false);
    setLoading(false);
  }, [item.video]);

  useEffect(() => {
    if (!videoMounted || !item.video) return;

    let cancelled = false;

    const tryPlay = async () => {
      const node = videoRef.current;
      if (!node) return;

      try {
        node.muted = true;
        node.playsInline = true;
        node.loop = true;

        const playPromise = node.play();

        if (playPromise && typeof playPromise.then === "function") {
          await playPromise;
        }

        if (cancelled) return;

        setPlaying(true);
        setLoading(false);
      } catch {
        if (!cancelled) {
          stopVideo();
        }
      }
    };

    const id = window.setTimeout(tryPlay, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [videoMounted, item.video]);

  useEffect(() => {
    return () => {
      clearUnmountTimer();

      const node = videoRef.current;

      if (node) {
        node.pause();
        node.removeAttribute("src");
        node.load();
      }
    };
  }, []);

  const handleKeyDown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      togglePlayback();
    }
  };

  return (
    <div
      className={`gm-media-stack ${playing ? "is-playing" : ""} ${loading ? "is-loading" : ""} ${!playing && !loading ? "is-interactive" : ""}`}
      role="button"
      tabIndex={0}
      onClick={togglePlayback}
      onKeyDown={handleKeyDown}
      aria-label={playing ? `Detener vídeo de ${item.name}` : `Reproducir vídeo de ${item.name}`}
    >
      <img
        src={item.image}
        alt={item.name}
        className="gm-media gm-media-image"
        loading="eager"
        decoding="async"
      />

      {videoMounted && item.video ? (
        <video
          ref={videoRef}
          key={item.video}
          className={`gm-media gm-media-video ${videoMounted ? "visible" : ""}`}
          src={item.video}
          poster={item.image}
          muted
          playsInline
          loop
          preload="metadata"
          onLoadedData={() => setLoading(false)}
          onCanPlay={() => setLoading(false)}
          onWaiting={() => setLoading(true)}
          onPlaying={() => {
            setPlaying(true);
            setLoading(false);
          }}
          onPause={() => {
            if (videoMounted) {
              setPlaying(false);
            }
          }}
          onError={stopVideo}
        />
      ) : null}

      <div className="gm-media-shade" />

      <button
        type="button"
        className={`gm-inline-action ${playing ? "is-active" : ""}`}
        onClick={(event) => {
          event.stopPropagation();
          togglePlayback();
        }}
        aria-label={playing ? `Detener vídeo de ${item.name}` : `Reproducir vídeo de ${item.name}`}
        aria-pressed={playing}
      >
        <span className="gm-inline-action-icon">
          {playing ? <HiPause /> : <HiPlay />}
        </span>
        <span>{playing ? "DETENER" : "VER ESCENA"}</span>
      </button>

      {loading && (
        <div className="gm-loading-state" aria-hidden="true">
          <span className="gm-loading-spinner" />
        </div>
      )}
    </div>
  );
});

const GameModes = () => {
  return (
    <section className="gamemodes-wrapper" style={{ "--gm-accent": mode.accent }}>
      <div className="gm-bg" />
      <div className="gm-inner">
        <div className="gm-selector-block gm-selector-block--single">
          <div className="gm-subheader">
            <p className="gm-subtitle">Ahora jugamos todos juntos en</p>
            <h2 className="gm-mundos">MUNDO UNIFICADO</h2>
          </div>

          <div className="gm-single">
            <div className="gm-single-emblem">
              <div className="gm-single-icon">
                <img src={mode.icon} alt={mode.name} />
              </div>

              <div className="gm-single-meta">
                <span className="gm-single-label">Modo principal</span>
                <span className="gm-single-title">{mode.name}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="gm-content">
          <div className="gm-left">
            <div className="gm-video-frame">
              <div className="gm-video-inner">
                <GameModeMedia item={mode} />
              </div>

              <img
                className="gm-marco"
                src="/assets/marcomadera.webp"
                alt="Marco FlanCraft"
              />
            </div>
          </div>

          <div className="gm-details">
            <div className="gm-details-wrapper">
              <h3 className={mode.id}>{mode.name}</h3>
              <p className="gm-glitch-transition">{mode.description}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default GameModes;