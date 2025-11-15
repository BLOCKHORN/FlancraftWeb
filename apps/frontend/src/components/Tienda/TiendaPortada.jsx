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
      <header className="tienda-portada-header">
        <p className="tienda-portada-subtitle">Taberna de la tienda</p>
        <h1 className="tienda-portada-title">Empieza a comprar</h1>
        <p className="tienda-portada-description">
          Elige una categoría para ver rangos, llaves y objetos especiales en
          los distintos mundos de FlanCraft.
        </p>
      </header>

      <ul className="tienda-portada-grid">
        {PORTADA_TILES.map((tile) => (
          <li key={tile.slug} className="tienda-portada-item">
            <button
              type="button"
              className="tienda-portada-btn"
              onClick={() => go(tile)}
            >
              <div className="tienda-portada-icon">
                <img
                  src={tile.image || "/tienda/imagenes/default-categoria.png"}
                  alt={tile.name}
                  onError={(e) => {
                    e.currentTarget.src =
                      "/tienda/imagenes/default-categoria.png";
                  }}
                />
              </div>

              <span className="tienda-portada-label">
                {tile.name}
              </span>
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
