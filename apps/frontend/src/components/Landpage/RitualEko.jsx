import React, { useEffect, useState, useRef, useContext } from "react";
import { HiBolt, HiChevronLeft, HiChevronRight } from "react-icons/hi2";
import { useNavigate } from "react-router-dom";
import ColorThief from "color-thief-browser";

import codexData from "../../data/codex-data";
import { UserContext } from "../../context/UserContext";
import "../../styles/components/Landpage/_ritual.scss";

export default function RitualEko() {
  const [index, setIndex] = useState(0);
  const [viewed, setViewed] = useState(Array(codexData.length).fill(false));
  const [dominantColor, setDominantColor] = useState("#ffffff");
  const [progress, setProgress] = useState("0%");
  const [hasUnlocked, setHasUnlocked] = useState(false);
  const [showAccessMessage, setShowAccessMessage] = useState(false);

  const imgRef = useRef(null);
  const navigate = useNavigate();
  const { user } = useContext(UserContext);

  const current = codexData[index];
  const isVideo = current.bg?.endsWith(".mp4");
  const allViewed = viewed.every(Boolean);

  // Ajusta el campo según tu UserContext
  const isLoggedIn = Boolean(user && (user.uuid || user.id || user.nombre_minecraft));

  // Marcar viñeta como vista
  useEffect(() => {
    setViewed((prevViewed) => {
      if (prevViewed[index]) return prevViewed;
      const updated = [...prevViewed];
      updated[index] = true;
      return updated;
    });
  }, [index]);

  // Extraer color dominante
  useEffect(() => {
    if (!current?.bg || isVideo) return;
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = current.bg;
    img.onload = () => {
      try {
        const color = ColorThief.getColor(img);
        setDominantColor(`rgb(${color.join(",")})`);
      } catch (err) {
        console.error("ColorThief error:", err);
      }
    };
  }, [current, isVideo]);

  // Calcular progreso visual
  useEffect(() => {
    const percentage = `${
      (viewed.filter(Boolean).length / codexData.length) * 100
    }%`;
    setProgress(percentage);
  }, [viewed]);

  // Detectar desbloqueo
  useEffect(() => {
    if (allViewed && !hasUnlocked) {
      setHasUnlocked(true);
    }
  }, [allViewed, hasUnlocked]);

  const prev = () => {
    if (index > 0) setIndex(index - 1);
  };

  const next = () => {
    if (index < codexData.length - 1) setIndex(index + 1);
  };

  const getClass = (i) => {
    if (i === index) return "center";
    if (i === index - 1) return "left";
    if (i === index + 1) return "right";
    return "hidden";
  };

  const handleGetEco = () => {
    if (!allViewed) return;

    if (isLoggedIn) {
      // Usuario logueado -> ir al Dashboard (logros / recompensas)
      navigate("/dashboard");
    } else {
      // Usuario NO logueado -> mostrar mensaje
      setShowAccessMessage(true);
    }
  };

  return (
    <section className="ritual-carousel">
      {isVideo ? (
        <video autoPlay loop muted playsInline className="ritual-video-bg">
          <source src={current.bg} type="video/mp4" />
        </video>
      ) : (
        <div
          className="ritual-image-bg"
          style={{ backgroundImage: `url(${current.bg})` }}
        />
      )}

      <div className="overlay" />

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
        <div className="arrow-panel left-arrow" onClick={prev}>
          {index > 0 && <HiChevronLeft />}
        </div>

        <div
          className={`arrow-panel right-arrow ${
            !viewed[index + 1] && index < codexData.length - 1 ? "glow" : ""
          }`}
          onClick={next}
        >
          {index < codexData.length - 1 && <HiChevronRight />}
        </div>

        {/* Título y contenido */}
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

        <div className="ritual-description fade-in">
          {current.description.split("\n").map((line, idx) => (
            <p key={idx}>{line}</p>
          ))}
        </div>

        {/* Miniaturas */}
        <div className="carousel-inner">
          {codexData.map((item, i) => (
            <img
              key={i}
              src={item.thumb}
              alt={item.title}
              className={`carousel-item ${getClass(i)}`}
            />
          ))}
        </div>

        <div className="ritual-progress">
          Viñeta {index + 1} de {codexData.length}
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

            {/* Solo mostrar líquido animado si no se ha desbloqueado */}
            {!allViewed && (
              <div className="liquid-fill">
                <div className="liquid-wave" />
              </div>
            )}

            <div className="eko-liquid-text">
              <HiBolt className="bolt-icon" />
              {allViewed ? "Obtener Eco" : "Descubre el poder..."}
            </div>
          </button>
        </div>
      </div>

      {/* Imagen oculta para extracción de color */}
      {!isVideo && (
        <img
          ref={imgRef}
          src={current.bg}
          alt="hidden-color-source"
          crossOrigin="anonymous"
          style={{ display: "none" }}
        />
      )}

      {/* Mensaje de acceso si no está logueado */}
      {showAccessMessage && (
        <div className="ritual-access-overlay">
          <div className="ritual-access-card">
            <h3 className="ritual-access-title">Vincula tu cuenta de Flancraft</h3>
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
