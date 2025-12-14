import React from "react";
import { useNavigate } from "react-router-dom";
import { PORTADA_TILES } from "./tiendaHelpers";
import "../../styles/components/Tienda/tienda-portada.scss";

const TiendaPortada = () => {
  const navigate = useNavigate();

  const go = (tile) => {
    navigate(`/tienda/${tile.server}/${tile.slug}`);
  };

  return (
    <div className="tienda-portada-wrapper">
      {/* SIN CABECERA (sin textos) */}

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
                  src={tile.image}
                  alt={tile.name}
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src =
                      "/assets/tienda/producto-placeholder.png";
                  }}
                />
              </div>

              {/* Mantengo label porque es el selector real de categorías */}
              <div className="tienda-portada-label">{tile.name}</div>
            </button>
          </li>
        ))}
      </ul>

      <p className="tienda-portada-footnote">
        Los artículos se entregan automáticamente en el servidor correspondiente
        nada más completar el pago.
      </p>
    </div>
  );
};

export default TiendaPortada;
