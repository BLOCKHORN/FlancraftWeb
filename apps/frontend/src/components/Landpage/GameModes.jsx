import React from "react";
import "../../styles/components/Landpage/_gamemodes.scss";

const mode = {
  id: "survival",
  name: "Survival",
  description:
    "Survival es ahora el centro de FlanCraft. Un único mundo donde se junta todo: economía, clanes, progreso y un montón de gente dando vida al servidor cada día. Más movimiento, más historias y más razones para entrar y quedarte.",
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