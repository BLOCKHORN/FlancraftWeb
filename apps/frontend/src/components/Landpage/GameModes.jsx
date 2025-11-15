import React, { useState } from "react";
import "../../styles/components/Landpage/_gamemodes.scss";

const modes = [
  {
    id: "survival",
    name: "Survival Clásico",
    description:
      "La experiencia survival de siempre, con economía, clanes y un mundo vivo en constante expansión.",
    image: "/assets/modes/survival.png",
    icon: "/assets/reinos/survival-clasico.png",
  },
  {
    id: "anarquico",
    name: "Survival Anárquico",
    description:
      "Sin reglas, sin límites. Survival puro donde todo vale y solo los más astutos sobreviven.",
    image: "/assets/modes/anarquico.png",
    icon: "/assets/reinos/survival-anarquico.png",
  },
  {
    id: "hardcore",
    name: "Survival Hardcore",
    description:
      "Dificultad máxima y castigo definitivo: si mueres, lo pierdes todo. ¿Te atreves al reto definitivo?",
    image: "/assets/modes/hardcore.png",
    icon: "/assets/reinos/survival-hardcore.png",
  },
  {
    id: "oneblock",
    name: "OneBlock",
    description:
      "Comienza en un solo bloque, mejora tu isla y enfréntate a desafíos únicos mientras avanzas de fase.",
    image: "/assets/modes/oneblock.png",
    icon: "/assets/reinos/oneblock.png",
  },
  {
    id: "chunklock",
    name: "Chunklock",
    description:
      "Reclama tu propio chunk, mejóralo, automatiza y compite por el control del mundo bloque a bloque.",
    image: "/assets/modes/chunklock.png",
    icon: "/assets/reinos/chunklock.png",
  },
  {
    id: "parkour",
    name: "Parkour",
    description:
      "Salta a través de circuitos diseñados al milímetro. Supera tiempos, mejora tus récords.",
    image: "/assets/modes/parkour.png",
    icon: "/assets/reinos/parkour.png",
  },
];

const GameModes = () => {
  const [active, setActive] = useState(modes[0]);

  return (
    <section className="gamemodes-wrapper">
      <div className="gm-bg" />
      <div className="gm-inner">
        <div className="gm-header">
          <div className="gm-title-wrapper">
            <h2 className="gm-title">Modos de juego</h2>
            <p className="gm-desc">
              Desde aventuras clásicas hasta retos épicos. ¡Explora los mundos
              de Flancraft!
            </p>
            <div className="gm-title-line top" />
            <div className="gm-title-line bottom" />
          </div>
        </div>

        <div className="gm-main">
          {/* LADO IZQUIERDO: MARCO */}
          <div className="gm-left">
            <div className="gm-video-frame">
              <img className="marco" src="/assets/marcomadera.png" alt="marco" />
              <img className="contenido" src={active.image} alt={active.name} />
            </div>
          </div>

          {/* LADO DERECHO: MUNDOS */}
          <div className="gm-right">
            <div className="gm-subheader">
              <p className="gm-subtitle">
                Descubre cada uno de nuestros maravillosos
              </p>
              <h4 className="gm-mundos">MUNDOS</h4>
            </div>

            <div className="gm-selector">
              {modes.map((mode) => {
                const isLongName = mode.name.length > 13; // 2 palabras, etc.
                return (
                  <button
                    key={mode.id}
                    className={`gm-mode-btn ${mode.id} ${
                      active.id === mode.id ? "active" : ""
                    }`}
                    onClick={() => setActive(mode)}
                  >
                    <div className="gm-mode-icon-wrap">
                      <img src={mode.icon} alt={mode.name} />
                    </div>

                    <span
                      className={
                        "gm-mode-badge" +
                        (isLongName ? " gm-mode-badge--small" : "")
                      }
                    >
                      {mode.name}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="gm-details">
              <div className="gm-details-wrapper">
                <h3 className={active.id}>{active.name}</h3>
                <p key={active.id} className="gm-glitch-transition">
                  {active.description}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default GameModes;
