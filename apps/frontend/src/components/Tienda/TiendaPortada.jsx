// src/components/Tienda/TiendaPortada.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { PORTADA_TILES, AVISO_PADRES_TILE } from "./tiendaHelpers";

import TiendaOfertaCountdown from "./TiendaOfertaCountdown";
import "../../styles/components/Tienda/tienda-portada.scss";

const TiendaPortada = () => {
  const navigate = useNavigate();

  const go = (tile) => {
    navigate(`/tienda/${tile.server}/${tile.slug}`);
  };

  const getTileImage = (tile) => {
    return tile.image || tile.fallbackImage || "/assets/tienda/producto-placeholder.png";
  };

  const handleFootnoteKey = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      go(AVISO_PADRES_TILE);
    }
  };

  return (
    <div className="tienda-portada-wrapper">
      <section className="tienda-portada-panel" aria-label="Portada de la tienda">
        {/* ✅ SLOT SIMÉTRICO (no overlay) */}
        <div className="tienda-portada-oferta-slot">
          <TiendaOfertaCountdown />
        </div>

        {/* GRID PRINCIPAL */}
        <ul className="tienda-portada-grid">
          {PORTADA_TILES.map((tile) => (
            <li className="tienda-portada-item" key={`${tile.server}-${tile.slug}`}>
              <button
                type="button"
                className="tienda-portada-btn"
                data-kind={tile.slug}
                onClick={() => go(tile)}
                aria-label={`Abrir ${tile.name}`}
              >
                <div className="tienda-portada-icon">
                  <img
                    src={getTileImage(tile)}
                    alt={tile.name}
                    loading="lazy"
                    draggable="false"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = "/assets/tienda/producto-placeholder.png";
                    }}
                  />
                </div>

                <div className="tienda-portada-label">{tile.name}</div>
              </button>
            </li>
          ))}
        </ul>

        <p className="tienda-portada-footnote">
          Los artículos se entregan automáticamente en el servidor correspondiente nada más
          completar el pago.{" "}
          <button
            type="button"
            className="tienda-portada-footnote-link"
            onClick={() => go(AVISO_PADRES_TILE)}
            onKeyDown={handleFootnoteKey}
          >
            Información para madres, padres y tutores
          </button>
        </p>
      </section>
    </div>
  );
};

export default TiendaPortada;
