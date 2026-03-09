import React, { memo, useCallback, useEffect, useRef, useState } from "react";
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
  const [videoMounted, setVideoMounted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);

  const stopVideo = useCallback(() => {
    const node = videoRef.current;

    if (node) {
      node.pause();

      try {
        node.currentTime = 0;
      } catch {}

      node.removeAttribute("src");
      node.load();
    }

    setPlaying(false);
    setLoading(false);
    setVideoMounted(false);
  }, []);

  useEffect(() => {
    setPlaying(false);
    setLoading(false);
    setVideoMounted(false);
  }, [item.video]);

  useEffect(() => {
    return () => {
      const node = videoRef.current;

      if (node) {
        node.pause();
        node.removeAttribute("src");
        node.load();
      }
    };
  }, []);

  useEffect(() => {
    if (!videoMounted || !item.video) return;

    const node = videoRef.current;
    if (!node) return;

    let cancelled = false;
    let frameId = 0;

    const startPlayback = async () => {
      try {
        node.loop = true;
        node.muted = true;
        node.playsInline = true;

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

    frameId = window.requestAnimationFrame(startPlayback);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frameId);
    };
  }, [videoMounted, item.video, stopVideo]);

  const togglePlayback = () => {
    if (!item.video) return;

    if (playing || loading) {
      stopVideo();
      return;
    }

    setLoading(true);
    setVideoMounted(true);
  };

  return (
    <div className={`gm-media-stack ${playing ? "is-playing" : ""} ${loading ? "is-loading" : ""}`}>
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
          className={`gm-media gm-media-video ${playing ? "visible" : ""}`}
          src={item.video}
          muted
          playsInline
          loop
          preload="metadata"
          onLoadedData={() => setLoading(false)}
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
        className={`gm-play-trigger ${playing ? "is-active" : ""}`}
        onClick={togglePlayback}
        aria-label={playing ? `Detener vídeo de ${item.name}` : `Reproducir vídeo de ${item.name}`}
        aria-pressed={playing}
      >
        <span className="gm-play-trigger-ring" />
        <span className="gm-play-trigger-core">
          {playing ? <HiPause /> : <HiPlay />}
        </span>
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
    <section
      className="gamemodes-wrapper"
      style={{ "--gm-accent": mode.accent }}
    >
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
                alt="Marco Flancraft"
              />

              <img
                className="gm-florituras"
                src="/assets/florituras.webp"
                alt="Decoración Flancraft"
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