// src/components/Tienda/TiendaPortada.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  API_URL,
  PORTADA_TILES,
  AVISO_PADRES_TILE,
} from "./tiendaHelpers";
import "../../styles/components/Tienda/tienda-portada.scss";

const TiendaPortada = () => {
  const navigate = useNavigate();

  // Mapa: `${server}|nombreCategoriaLower` -> imageUrl
  const [categoryImages, setCategoryImages] = useState({});

  const serversToLoad = useMemo(
    () => Array.from(new Set(PORTADA_TILES.map((t) => t.server))),
    []
  );

  useEffect(() => {
    let cancelled = false;

    const fetchCategorias = async () => {
      const imgMap = {};

      for (const server of serversToLoad) {
        try {
          // 👇 Ajusta el endpoint si en tu backend se llama distinto
          const res = await fetch(`${API_URL}/tienda/${server}/categorias`);
          if (!res.ok) continue;

          const json = await res.json();
          const categorias = Array.isArray(json)
            ? json
            : json?.categorias || json?.categories || [];

          for (const cat of categorias) {
            const name = String(cat?.name || cat?.category_name || "").toLowerCase();
            if (!name) continue;

            const img =
              cat?.image_url ||
              cat?.image ||
              cat?.icon ||
              cat?.icon_url ||
              null;

            if (img) {
              imgMap[`${server}|${name}`] = img;
            }
          }
        } catch (err) {
          // Si peta una llamada, simplemente usamos los fallbacks
          console.error("[TiendaPortada] Error cargando categorías de", server, err);
        }
      }

      if (!cancelled) {
        setCategoryImages(imgMap);
      }
    };

    fetchCategorias();

    return () => {
      cancelled = true;
    };
  }, [serversToLoad]);

  const go = (tile) => {
    navigate(`/tienda/${tile.server}/${tile.slug}`);
  };

  const getTileImage = (tile) => {
    const tebexName = String(tile.tebexName || tile.name || "").toLowerCase();
    const key = `${tile.server}|${tebexName}`;

    return (
      categoryImages[key] ||
      tile.fallbackImage ||
      tile.image || // por compatibilidad
      "/assets/tienda/producto-placeholder.png"
    );
  };

  const handleFootnoteKey = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      go(AVISO_PADRES_TILE);
    }
  };

  return (
    <div className="tienda-portada-wrapper">
      {/* GRID PRINCIPAL - SOLO CATEGORÍAS GRANDES */}
      <ul className="tienda-portada-grid">
        {PORTADA_TILES.map((tile) => (
          <li
            className="tienda-portada-item"
            key={`${tile.server}-${tile.slug}`}
          >
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
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src =
                      "/assets/tienda/producto-placeholder.png";
                  }}
                />
              </div>

              <div className="tienda-portada-label">{tile.name}</div>
            </button>
          </li>
        ))}
      </ul>

      {/* NOTA LEGAL + LINK DISCRETO AL AVISO */}
      <p className="tienda-portada-footnote">
        Los artículos se entregan automáticamente en el servidor
        correspondiente nada más completar el pago.{" "}
        <button
          type="button"
          className="tienda-portada-footnote-link"
          onClick={() => go(AVISO_PADRES_TILE)}
          onKeyDown={handleFootnoteKey}
        >
          Información para madres, padres y tutores
        </button>
      </p>
    </div>
  );
};

export default TiendaPortada;
