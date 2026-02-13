// src/components/Landpage/GameModes.jsx
import React, { useState } from "react";
import "../../styles/components/Landpage/_gamemodes.scss";

const modes = [
  {
    id: "survival",
    name: "Survival",
    description:
      "La experiencia survival de siempre, con economía, clanes y un mundo vivo en constante expansión.",
    image: "/assets/modes/survival.webp",
    icon: "/assets/reinos/survival-clasico.webp",
  },


  {
    id: "oneblock",
    name: "OneBlock",
    description:
      "Comienza en un solo bloque, mejora tu isla y enfréntate a desafíos únicos mientras avanzas de fase.",
    image: "/assets/modes/oneblock.webp",
    icon: "/assets/reinos/oneblock.webp",
  },

  {
    id: "gens",
    name: "Gens",
    description:
      "Construye, mejora y optimiza tus generadores para producir recursos automáticamente y escalar sin límites.",
    image: "/assets/modes/gensback.webp",
    icon: "/assets/reinos/gens.webp",
  },
    {
    id: "anarquico",
    name: "Survival Anárquico",
    description:
      "Sin reglas, sin límites. Survival puro donde todo vale y solo los más astutos sobreviven.",
    image: "/assets/modes/anarquico.webp",
    icon: "/assets/reinos/survival-anarquico.webp",
  },
  {
    id: "parkour",
    name: "Parkour",
    description:
      "Salta a través de circuitos diseñados al milímetro. Supera tiempos, mejora tus récords.",
    image: "/assets/modes/parkour.webp",
    icon: "/assets/reinos/parkour.webp",
  },
  
];

const GameModes = () => {
  const [active, setActive] = useState(modes[0]);

  return (
    <section className="gamemodes-wrapper">
      <div className="gm-bg" />
      <div className="gm-inner">
        {/* BLOQUE MUNDOS + SELECTOR */}
        <div className="gm-selector-block">
          <div className="gm-subheader">
            <p className="gm-subtitle">
              Descubre cada uno de nuestros maravillosos
            </p>
            <h2 className="gm-mundos">MUNDOS</h2>
          </div>

          <div className="gm-selector">
            {modes.map((mode) => {
              const isLongName = mode.name.length > 13;
              const isActive = active.id === mode.id;

              return (
                <button
                  key={mode.id}
                  className={`gm-mode-btn ${mode.id} ${isActive ? "active" : ""}`}
                  onClick={() => setActive(mode)}
                  type="button"
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
        </div>

        {/* BLOQUE IMAGEN + DESCRIPCIÓN */}
        <div className="gm-content">
          <div className="gm-left">
            <div className="gm-video-frame">
              {/* capa 1: imagen presentativa, dentro de la máscara */}
              <div className="gm-video-inner">
                <img
                  key={active.id}
                  className="gm-presentacion gm-image-transition"
                  src={active.image}
                  alt={active.name}
                />
              </div>

              {/* capa 2: marco madera (siempre cubre el ancho) */}
              <img
                className="gm-marco"
                src="/assets/marcomadera.webp"
                alt="Marco Flancraft"
              />

              {/* capa 3: florituras por encima de todo */}
              <img
                className="gm-florituras"
                src="/assets/florituras.webp"
                alt="Decoración Flancraft"
              />
            </div>
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
    </section>
  );
};

export default GameModes;
