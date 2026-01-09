import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PORTADA_TILES, AVISO_PADRES_TILE } from "../utils/tiendaHelpers";

import TiendaOfertaCountdown from "./TiendaOfertaCountdown";
import "../../../styles/components/Tienda/tienda-portada.scss";

/* =========================================================
   Util: columnas simétricas (evita 4+1, 3+1, etc.)
   - Prueba cols posibles y minimiza “huecos” en la última fila
   - Penaliza fuerte que quede 1 solo item abajo si hay alternativa
   ========================================================= */
function pickBestCols(n, allowedCols) {
  if (!n) return allowedCols[0] || 2;

  const candidates = [...allowedCols].sort((a, b) => b - a);

  let best = candidates[0];
  let bestScore = Infinity;

  for (const cols of candidates) {
    if (cols <= 0) continue;

    const rem = n % cols;
    const empty = rem === 0 ? 0 : cols - rem;
    const lastRowItems = rem === 0 ? cols : rem;

    const hasMoreThanOneRow = n > cols;
    const singleItemPenalty = hasMoreThanOneRow && lastRowItems === 1 ? 1000 : 0;

    const preferMoreCols = (candidates[0] - cols) * 0.1;
    const score = empty * 10 + singleItemPenalty + preferMoreCols;

    if (score < bestScore) {
      bestScore = score;
      best = cols;
    }
  }

  return best;
}

const TiendaPortada = () => {
  const navigate = useNavigate();
  const wrapperRef = useRef(null);

  const [cols, setCols] = useState(4);
  const tilesCount = PORTADA_TILES.length;

  const go = (tile) => {
    navigate(`/tienda/${tile.server}/${tile.slug}`);
  };

  const getTileImage = (tile) =>
    tile.image || tile.fallbackImage || "/assets/tienda/producto-placeholder.png";

  /* =========================================================
     Columnas inteligentes según ancho real del panel + nº tiles
     - < 620px => 2
     - >= 620px => 2/3
     - >= 980px => 2/3/4
     ========================================================= */
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      const w = Math.round(entries[0]?.contentRect?.width || el.clientWidth || 0);

      let allowed = [2];
      if (w >= 620) allowed = [2, 3];
      if (w >= 980) allowed = [2, 3, 4];

      const best = pickBestCols(tilesCount, allowed);
      setCols(best);
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, [tilesCount]);

  const wrapperAttrs = useMemo(
    () => ({
      "data-count": String(tilesCount),
      style: { "--portada-cols": cols },
    }),
    [tilesCount, cols]
  );

  return (
    <div className="tienda-portada-wrapper" ref={wrapperRef} {...wrapperAttrs}>
      <section className="tienda-portada-panel" aria-label="Portada de la tienda">
        {/* HEAD */}
        <header className="tienda-portada-head">
          <h1 className="tienda-portada-title">Elige el servidor</h1>
          <p className="tienda-portada-subtitle">
            Compra rangos y extras para el modo de juego que uses.
          </p>
        </header>

        {/* OFERTA
            - Si no hay oferta, TiendaOfertaCountdown devuelve null
            - El slot se auto-oculta con CSS :has(.tienda-oferta-banner)
        */}
        <div className="tienda-portada-oferta-slot" aria-label="Ofertas activas">
          <TiendaOfertaCountdown />
        </div>

        {/* GRID */}
        <ul className="tienda-portada-grid" aria-label="Categorías principales">
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

                <div className="tienda-portada-label">
                  <span className="tienda-portada-labelText">{tile.name}</span>
                </div>
              </button>
            </li>
          ))}
        </ul>

        <p className="tienda-portada-footnote">
          Los artículos se entregan automáticamente en el servidor correspondiente nada más completar el pago.
          <button
            type="button"
            className="tienda-portada-footnote-link"
            onClick={() => go(AVISO_PADRES_TILE)}
          >
            Información para padres y tutores
          </button>
        </p>
      </section>
    </div>
  );
};

export default TiendaPortada;
