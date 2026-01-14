import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PORTADA_TILES, AVISO_PADRES_TILE } from "../utils/tiendaHelpers";

import TiendaOfertaCountdown from "./TiendaOfertaCountdown";
import "../../../styles/components/Tienda/tienda-portada.scss";

/* =========================================================
   Util: columnas simétricas (evita 4+1, 3+1, etc.)
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

/* ✅ Determina si tile es “global” */
function isGlobalTile(tile) {
  const server = String(tile?.server || "").toLowerCase();
  const slug = String(tile?.slug || "").toLowerCase();
  const name = String(tile?.name || "").toLowerCase();

  if (server === "global") return true;
  if (slug.includes("rangos") || name.includes("rango")) return true;
  if (slug.includes("tags") || name.includes("tag")) return true;

  return false;
}

const TiendaPortada = () => {
  const navigate = useNavigate();
  const wrapperRef = useRef(null);

  const [cols, setCols] = useState(4);

  const tiles = PORTADA_TILES || [];
  const globalTiles = useMemo(() => tiles.filter(isGlobalTile), [tiles]);
  const serverTiles = useMemo(() => tiles.filter((t) => !isGlobalTile(t)), [tiles]);

  const go = (tile) => {
    navigate(`/tienda/${tile.server}/${tile.slug}`);
  };

  const getTileImage = (tile) =>
    tile.image || tile.fallbackImage || "/assets/tienda/producto-placeholder.png";

  /* =========================================================
     Columnas inteligentes según ancho real del panel + nº tiles
     ========================================================= */
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      const w = Math.round(entries[0]?.contentRect?.width || el.clientWidth || 0);

      let allowed = [2];
      if (w >= 620) allowed = [2, 3];
      if (w >= 980) allowed = [2, 3, 4];

      // ✅ Para simetría: calculamos cols por el grupo más grande
      const n = Math.max(globalTiles.length, serverTiles.length, tiles.length);
      const best = pickBestCols(n, allowed);
      setCols(best);
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, [tiles.length, globalTiles.length, serverTiles.length]);

  const wrapperAttrs = useMemo(
    () => ({
      style: { "--portada-cols": cols },
    }),
    [cols]
  );

  return (
    <div className="tienda-portada-wrapper" ref={wrapperRef} {...wrapperAttrs}>
      <section className="tienda-portada-panel" aria-label="Portada de la tienda">
        {/* H1 real (discreto) */}
        <header className="tienda-portada-head">
          <h1 className="tienda-portada-title">Tienda Flancraft</h1>
        </header>

        {/* OFERTA (si no hay oferta, devuelve null) */}
        <div className="tienda-portada-oferta-slot" aria-label="Ofertas activas">
          <TiendaOfertaCountdown />
        </div>

        {/* ✅ CONTENEDOR QUE CENTRA LOS TILES EN EL ESPACIO SOBRANTE */}
        <div className="tienda-portada-grids" aria-label="Categorías disponibles">
          {/* GLOBAL */}
          {globalTiles.length > 0 && (
            <ul
              className="tienda-portada-grid tienda-portada-grid--global"
              aria-label="Categorías globales"
              data-count={globalTiles.length}
            >
              {globalTiles.map((tile) => (
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
          )}

          {/* SERVIDORES */}
          {serverTiles.length > 0 && (
            <ul
              className="tienda-portada-grid tienda-portada-grid--servers"
              aria-label="Categorías por servidor"
              data-count={serverTiles.length}
            >
              {serverTiles.map((tile) => (
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
          )}
        </div>

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
