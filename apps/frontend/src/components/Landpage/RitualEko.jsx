// src/components/Landpage/RitualEko.jsx
import React, { useEffect, useState, useContext, useCallback } from "react";
import { HiChevronLeft, HiChevronRight } from "react-icons/hi2";
import { useNavigate } from "react-router-dom";

import codexData from "../../data/codex-data";
import { UserContext } from "../../context/UserContext";
import "../../styles/components/Landpage/_ritual.scss";

export default function RitualEko() {
  const [index, setIndex] = useState(0);
  const [viewed, setViewed] = useState(Array(codexData.length).fill(false));
  const [dominantColor, setDominantColor] = useState("#7fd9ff");
  const [progress, setProgress] = useState("0%");
  const [hasUnlocked, setHasUnlocked] = useState(false);
  const [justUnlocked, setJustUnlocked] = useState(false);
  const [showAccessMessage, setShowAccessMessage] = useState(false);

  const navigate = useNavigate();
  const { user } = useContext(UserContext);

  const current = codexData[index];
  const isVideo = current?.bg?.endsWith(".mp4");
  const allViewed = viewed.every(Boolean);

  const isLoggedIn = Boolean(user && (user.uuid || user.id || user.nombre_minecraft));

  useEffect(() => {
    setViewed((prev) => {
      if (prev[index]) return prev;
      const updated = [...prev];
      updated[index] = true;
      return updated;
    });
  }, [index]);

  useEffect(() => {
    setDominantColor(current?.badgeColor || "#7fd9ff");
  }, [current]);

  useEffect(() => {
    const pct = (viewed.filter(Boolean).length / codexData.length) * 100;
    setProgress(`${Math.min(Math.max(pct, 0), 100)}%`);
  }, [viewed]);

  useEffect(() => {
    if (allViewed && !hasUnlocked) {
      setHasUnlocked(true);
      setJustUnlocked(true);
      const t = setTimeout(() => setJustUnlocked(false), 2200);
      return () => clearTimeout(t);
    }
  }, [allViewed, hasUnlocked]);

  const prev = useCallback(() => {
    setIndex((prevIndex) => (prevIndex > 0 ? prevIndex - 1 : prevIndex));
  }, []);

  const next = useCallback(() => {
    setIndex((prevIndex) => (prevIndex < codexData.length - 1 ? prevIndex + 1 : prevIndex));
  }, []);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [next, prev]);

  const getClass = (i) => {
    if (i === index) return "center";
    if (i === index - 1) return "left";
    if (i === index + 1) return "right";
    return "hidden";
  };

  const handleCTA = () => {
    if (!allViewed) return;
    if (isLoggedIn) navigate("/dashboard");
    else setShowAccessMessage(true);
  };

  return (
    <section className="ritual-eko">
      <div className="ritual-bg-layer">
        {isVideo ? (
          <video
            key={current.bg}
            autoPlay
            loop
            muted
            playsInline
            className="ritual-video-bg fading-bg"
          >
            <source src={current.bg} type="video/mp4" />
          </video>
        ) : (
          <div
            key={current.bg}
            className="ritual-image-bg fading-bg"
            style={{ backgroundImage: `url(${current.bg})` }}
          />
        )}
        <div className="ritual-bg-vignette" />
      </div>

      <div
        className={`ritual-card ${hasUnlocked ? "ritual-card--unlocked" : ""}`}
        style={{ "--accent": dominantColor }}
      >
        <button
          type="button"
          className="ritual-arrow ritual-arrow--left"
          onClick={prev}
          disabled={index === 0}
          aria-label="Anterior"
        >
          <HiChevronLeft />
        </button>

        <button
          type="button"
          className="ritual-arrow ritual-arrow--right"
          onClick={next}
          disabled={index === codexData.length - 1}
          aria-label="Siguiente"
        >
          <HiChevronRight />
        </button>

        <header className="ritual-card-header">
          <div className="ritual-card-crest" />
          <h1 className="ritual-title">{current.title}</h1>
          <div className="ritual-subrow">
            <h2 className="ritual-subtitle">{current.subtitle}</h2>
          </div>
        </header>

        <div className="ritual-body">
          <div className="ritual-description">
            {current.description.split("\n").map((line, idx) => (
              <p key={idx}>{line}</p>
            ))}
          </div>

          <div className="ritual-thumbs-row">
            <div className="ritual-thumbs-track">
              {codexData.map((item, i) => (
                <button
                  key={i}
                  type="button"
                  className={`carousel-thumb-wrapper ${getClass(i)}`}
                  onClick={() => setIndex(i)}
                  aria-label={`Ir a viñeta ${i + 1}`}
                >
                  <img src={item.thumb} alt={item.title} className="carousel-item" />
                </button>
              ))}
            </div>
          </div>

          <div className="ritual-footer">
            <div className="ritual-progress" style={{ "--progress": progress }}>
              <span className="ritual-progress-label">
                Viñeta {index + 1} de {codexData.length}
              </span>
              <div className="ritual-progress-track">
                <div className="ritual-progress-fill" />
                <div className="ritual-progress-gem" />
              </div>
            </div>

            <div className="ritual-cta-wrapper">
              <button
                type="button"
                className={[
                  "ritual-cta",
                  allViewed ? "ritual-cta--active" : "ritual-cta--locked",
                  justUnlocked ? "ritual-cta--just-unlocked" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                disabled={!allViewed}
                onClick={handleCTA}
              >
                {allViewed ? "ACCEDER AL DASHBOARD" : "SIGUE LEYENDO"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {showAccessMessage && (
        <div className="ritual-access-overlay">
          <div className="ritual-access-card">
            <h3 className="ritual-access-title">Vincula tu cuenta</h3>

            <p className="ritual-access-text">
              Para entrar al Dashboard (perfil, progreso y funciones conectadas al juego),
              necesitas vincular tu cuenta dentro del servidor con <strong>/vincular</strong>.
            </p>

            <p className="ritual-access-text">
              Es el paso que nos permite identificarte y guardarte el progreso de forma segura.
            </p>

            <button
              type="button"
              className="ritual-access-close"
              onClick={() => setShowAccessMessage(false)}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
