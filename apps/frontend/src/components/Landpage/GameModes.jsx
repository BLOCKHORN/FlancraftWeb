import React from "react";
import "../../styles/components/Landpage/_gamemodes.scss";

const mode = {
  id: "survival",
  name: "Survival",
  description:
    "La experiencia survival de siempre, con economía, clanes y un mundo vivo en constante expansión. Todo FlanCraft, reunido en un único reino para que la aventura se sienta más grande que nunca.",
  image: "/assets/modes/survival.webp",
  icon: "/assets/reinos/survival-clasico.webp",
};

const GameModes = () => {
  return (
    <section className="gamemodes-wrapper">
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

            <div className="gm-single-divider" />

            <p className="gm-single-note">
              Más actividad, más comercio, más guerras, más historias. Un solo
              mundo para que cada sesión cuente.
            </p>
          </div>
        </div>

        <div className="gm-content">
          <div className="gm-left">
            <div className="gm-video-frame">
              <div className="gm-video-inner">
                <img
                  className="gm-presentacion gm-image-transition"
                  src={mode.image}
                  alt={mode.name}
                />
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