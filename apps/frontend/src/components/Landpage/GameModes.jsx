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
        {/* BLOQUE MUNDOS + SELECTOR */}
        <div className="gm-selector-block">
          <div className="gm-subheader">
            <p className="gm-subtitle">
              Descubre cada uno de nuestros maravillosos
            </p>
            <h4 className="gm-mundos">MUNDOS</h4>
          </div>

          <div className="gm-selector">
            {modes.map((mode) => {
              const isLongName = mode.name.length > 13;
              const isActive = active.id === mode.id;

              return (
                <button
                  key={mode.id}
                  className={`gm-mode-btn ${mode.id} ${
                    isActive ? "active" : ""
                  }`}
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
    src="/assets/marcomadera.png"
    alt="Marco Flancraft"
  />

  {/* capa 3: florituras por encima de todo */}
  <img
    className="gm-florituras"
    src="/assets/florituras.png"
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
