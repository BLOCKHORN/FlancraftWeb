// src/components/Landpage/RitualEko.jsx
import React, { useEffect, useState, useContext, useCallback } from "react";
import { HiBolt, HiChevronLeft, HiChevronRight } from "react-icons/hi2";
import { useNavigate } from "react-router-dom";

import codexData from "../../data/codex-data";
import { UserContext } from "../../context/UserContext";
import "../../styles/components/Landpage/_ritual.scss";

export default function RitualEko() {
  const [index, setIndex] = useState(0);
  const [viewed, setViewed] = useState(Array(codexData.length).fill(false));
  const [dominantColor, setDominantColor] = useState("#f5e3b8");
  const [progress, setProgress] = useState("0%");
  const [hasUnlocked, setHasUnlocked] = useState(false);
  const [showAccessMessage, setShowAccessMessage] = useState(false);

  const navigate = useNavigate();
  const { user } = useContext(UserContext);

  const current = codexData[index];
  const isVideo = current.bg?.endsWith(".mp4");
  const allViewed = viewed.every(Boolean);

  const isLoggedIn = Boolean(
    user && (user.uuid || user.id || user.nombre_minecraft)
  );

  // Marcar viñeta como vista
  useEffect(() => {
    setViewed((prev) => {
      if (prev[index]) return prev;
      const updated = [...prev];
      updated[index] = true;
      return updated;
    });
  }, [index]);

  // Color dominante basado en los datos del codex (sin ColorThief)
  useEffect(() => {
    if (!current) {
      setDominantColor("#f5e3b8");
      return;
    }

    // Usamos badgeColor como acento si existe, si no el color por defecto
    setDominantColor(current.badgeColor || "#f5e3b8");
  }, [current]);

  // Calcular progreso visual para el botón líquido
  useEffect(() => {
    const pct = (viewed.filter(Boolean).length / codexData.length) * 100;
    setProgress(`${Math.min(Math.max(pct, 0), 100)}%`);
  }, [viewed]);

  // Detectar desbloqueo una sola vez
  useEffect(() => {
    if (allViewed && !hasUnlocked) {
      setHasUnlocked(true);
    }
  }, [allViewed, hasUnlocked]);

  const prev = useCallback(() => {
    setIndex((prevIndex) => (prevIndex > 0 ? prevIndex - 1 : prevIndex));
  }, []);

  const next = useCallback(() => {
    setIndex((prevIndex) =>
      prevIndex < codexData.length - 1 ? prevIndex + 1 : prevIndex
    );
  }, []);

  // Navegación por teclado
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "ArrowRight") {
        next();
      } else if (e.key === "ArrowLeft") {
        prev();
      }
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

  const handleGetEco = () => {
    if (!allViewed) return;

    if (isLoggedIn) {
      navigate("/dashboard");
    } else {
      setShowAccessMessage(true);
    }
  };

  return (
    <section className="ritual-carousel">
      {/* Capa de fondo totalmente contenida en la sección */}
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
        <div className="overlay" />
      </div>

      {/* Contenido principal */}
      <div
        className={`codex-box ${
          !viewed[index + 1] && index < codexData.length - 1
            ? "right-glow-border"
            : ""
        }`}
        style={{
          borderColor: dominantColor,
          boxShadow: `inset 0 0 12px ${dominantColor}`,
        }}
      >
        {/* Flechas */}
        <button
          type="button"
          className="arrow-panel left-arrow"
          onClick={prev}
          disabled={index === 0}
          aria-label="Anterior"
        >
          {index > 0 && <HiChevronLeft />}
        </button>

        <button
          type="button"
          className={`arrow-panel right-arrow ${
            !viewed[index + 1] && index < codexData.length - 1 ? "glow" : ""
          }`}
          onClick={next}
          disabled={index === codexData.length - 1}
          aria-label="Siguiente"
        >
          {index < codexData.length - 1 && <HiChevronRight />}
        </button>

        {/* Título y contenido */}
        <header className="ritual-header">
          <h2 className="ritual-title" style={{ color: dominantColor }}>
            {current.title}
          </h2>

          <h3 className="ritual-subtitle">
            {current.subtitle}
            <span
              className="ritual-badge"
              style={{ backgroundColor: current.badgeColor }}
            >
              {current.badge}
            </span>
          </h3>
        </header>

        <div className="ritual-description">
          {current.description.split("\n").map((line, idx) => (
            <p key={idx}>{line}</p>
          ))}
        </div>

        {/* Miniaturas */}
        <div className="carousel-inner">
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

        {/* Progreso */}
        <div className="ritual-progress-block">
          <span className="ritual-progress-label">
            Viñeta {index + 1} de {codexData.length}
          </span>
          <div className="ritual-progress-bar">
            <div
              className="ritual-progress-fill"
              style={{ "--progress": progress }}
            />
          </div>
        </div>

        {/* Botón mágico */}
        <div
          className={`eko-liquid-wrapper ${
            allViewed ? "unlocked" : ""
          } ${hasUnlocked ? "unlocked-shake" : ""}`}
          style={{ "--progress": progress }}
        >
          <button
            type="button"
            className={`eko-liquid-btn ${hasUnlocked ? "btn-reveal" : ""}`}
            disabled={!allViewed}
            onClick={handleGetEco}
            style={{ "--dominant": dominantColor }}
          >
            <div className="liquid-bg" />

            {!allViewed && (
              <div className="liquid-fill">
                <div className="liquid-wave" />
              </div>
            )}

            <div className="eko-liquid-text">
              <HiBolt className="bolt-icon" />
              {allViewed ? "Consigue Eco" : "Descubre el poder..."}
            </div>
          </button>
        </div>
      </div>

      {/* Mensaje de acceso si no está logueado */}
      {showAccessMessage && (
        <div className="ritual-access-overlay">
          <div className="ritual-access-card">
            <h3 className="ritual-access-title">
              Vincula tu cuenta de Flancraft
            </h3>
            <p className="ritual-access-text">
              Para acceder al panel de logros y obtener ECOS necesitas
              registrarte en la web y vincular tu cuenta de Flancraft con el
              comando <strong>/vincular</strong> dentro del servidor.
            </p>
            <p className="ritual-access-text">
              Una vez registrado, podrás entrar en tu panel desde el botón
              <strong> Dashboard</strong> y reclamar tus recompensas.
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
