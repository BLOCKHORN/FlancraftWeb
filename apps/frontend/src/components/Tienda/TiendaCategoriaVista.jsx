// apps/frontend/src/components/Tienda/TiendaCategoriaVista.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import TiendaProductosVista from "./TiendaProductosVista";
import {
  API_URL,
  pickSubcatsFromApi,
  findCategoryBySlug,
  filterPackagesByCategoryId,
  SUBCATS_PER_TILE,
} from "./tiendaHelpers";

import { ANTES_DE_COMPRAR } from "./data/antesDeComprarData";

import "../../styles/components/Tienda/tienda-categoria.scss";

const TiendaCategoriaVista = ({ carrito, toggleProducto }) => {
  const { server, categoria, subcategoria } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [paquetes, setPaquetes] = useState([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(null);
  const [error, setError] = useState("");

  const mapKey = `${(server || "").toLowerCase()}|${(categoria || "").toLowerCase()}`;
  const tileNamesAllowed = useMemo(() => SUBCATS_PER_TILE[mapKey] ?? null, [mapKey]);
  const isTile = tileNamesAllowed !== null;

  useEffect(() => {
    let cancel = false;

    async function cargar() {
      setLoading(true);
      setError("");

      try {
        const r = await fetch(`${API_URL}/api/tebex/datos?sv=${server}`);
        if (!r.ok) throw new Error("No se pudo cargar la tienda para este servidor.");
        const data = await r.json();

        const apiCats = data.categorias || [];

        if (isTile) {
          let subcats = pickSubcatsFromApi(apiCats, tileNamesAllowed);

          // Dedupe por slug
          const seen = new Set();
          subcats = subcats.filter((s) => {
            const key = String(s?.slug || s?.name || "").toLowerCase();
            if (!key) return false;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });

          // Orden según SUBCATS_PER_TILE
          if (Array.isArray(tileNamesAllowed) && tileNamesAllowed.length) {
            const order = new Map(tileNamesAllowed.map((n, i) => [String(n).toLowerCase(), i]));
            subcats.sort((a, b) => {
              const ai = order.get(String(a.name).toLowerCase());
              const bi = order.get(String(b.name).toLowerCase());
              return (ai ?? 999) - (bi ?? 999);
            });
          }

          const active =
            (subcategoria &&
              subcats.find((s) => s.slug === String(subcategoria).toLowerCase())) ||
            (subcats.length === 1 ? subcats[0] : null);

          const catObj = {
            mode: "tile",
            name:
              (categoria === "survival-clasico" && "SURVIVAL CLÁSICO") ||
              (categoria === "oneblock" && "ONEBLOCK") ||
              (categoria === "rangos" && "RANGOS") ||
              (categoria === "premium" && "PREMIUM") ||
              (categoria === "chunklock" && "CHUNKLOCK") ||
              (categoria === "antes-de-comprar" && "¡ANTES DE COMPRAR!") ||
              (categoria && categoria.toUpperCase()) ||
              "CATEGORÍA",
            slug: categoria,
            subcategorias: subcats,
            activeSubcat: active || null,
          };

          if (!cancel) {
            setPaquetes(data.paquetes || []);
            setCategoriaSeleccionada(catObj);
          }
          return;
        }

        // categoría real directa (por si alguna ruta llega con slug real)
        const catReal = findCategoryBySlug(apiCats, categoria);

        const catObj = {
          mode: "real",
          name: catReal?.name ?? (categoria ? categoria.toUpperCase() : "CATEGORÍA"),
          slug: categoria,
          activeSubcat: catReal || null,
          subcategorias: [],
        };

        if (!cancel) {
          setPaquetes(data.paquetes || []);
          setCategoriaSeleccionada(catObj);
        }
      } catch (e) {
        if (!cancel) setError(e.message || "Error al cargar");
      } finally {
        if (!cancel) setLoading(false);
      }
    }

    cargar();
    return () => {
      cancel = true;
    };
  }, [server, categoria, subcategoria, isTile, tileNamesAllowed]);

  const productosFiltrados = useMemo(() => {
    if (!categoriaSeleccionada) return [];
    const active = categoriaSeleccionada.activeSubcat;
    if (!active?.id) return [];
    return filterPackagesByCategoryId(paquetes, active.id);
  }, [paquetes, categoriaSeleccionada]);

  // Loading
  if (loading) {
    return (
      <div className="tienda-tebex tienda-tebex--loading">
        <div className="tienda-loading-inner">
          <div className="logo-f-loader">
            <span>F</span>
          </div>
          <p className="tienda-loading-text">CARGANDO LA TIENDA...</p>
        </div>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="tienda-tebex">
        <div className="tienda-contenido">
          <div className="error-box">
            <strong>Error:</strong> {error}
          </div>
        </div>
      </div>
    );
  }

  // Antes de comprar (con data)
  if (categoria === "antes-de-comprar") {
    return (
      <div className="tienda-tebex">
        <div className="tienda-contenido">
          <div className="tienda-wc">
            <div className="tienda-wc-head">
              <h1 className="tienda-wc-title">{ANTES_DE_COMPRAR.titulo}</h1>

              <button className="tienda-wc-close" onClick={() => navigate("/tienda")}>
                Volver
              </button>
            </div>

            <div className="tienda-doc">
              {ANTES_DE_COMPRAR.intro.map((p, i) => (
                <p key={`intro-${i}`}>{p}</p>
              ))}

              <div className="tienda-doc-divider" />

              <h2>Información importante</h2>
              <ul>
                {ANTES_DE_COMPRAR.avisos.map((t, i) => (
                  <li key={`aviso-${i}`}>{t}</li>
                ))}
              </ul>

              <div className="tienda-doc-divider" />

              <h2>{ANTES_DE_COMPRAR.soporte.titulo}</h2>
              <p>{ANTES_DE_COMPRAR.soporte.texto}</p>

              <div className="tienda-doc-links">
                {ANTES_DE_COMPRAR.soporte.links.map((l) => (
                  <a key={l.href} href={l.href} target="_blank" rel="noreferrer">
                    {l.label}
                  </a>
                ))}
              </div>

              <div className="tienda-doc-divider" />

              <h2>{ANTES_DE_COMPRAR.reembolso.titulo}</h2>
              {ANTES_DE_COMPRAR.reembolso.bloques.map((p, i) => (
                <p key={`reb-${i}`}>{p}</p>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Selector Wynncraft-style si estamos en tile y no hay subcat activa
  if (
    categoriaSeleccionada?.mode === "tile" &&
    !categoriaSeleccionada.activeSubcat &&
    (categoriaSeleccionada.subcategorias || []).length > 1
  ) {
    return (
      <div className="tienda-tebex">
        <div className="tienda-contenido">
          <div className="tienda-wc">
            <div className="tienda-wc-head">
              <div className="tienda-wc-hero">
                <div className="tienda-wc-hero-icon" aria-hidden="true" />
                <div className="tienda-wc-hero-text">
                  <h1 className="tienda-wc-title">{categoriaSeleccionada.name}</h1>
                  <p className="tienda-wc-subtitle">
                    Selecciona una categoría para ver los productos disponibles.
                  </p>
                </div>
              </div>

              <button className="tienda-wc-close" onClick={() => navigate("/tienda")}>
                Cerrar
              </button>
            </div>

            <div className="tienda-wc-grid">
              {categoriaSeleccionada.subcategorias.map((sc) => (
                <article key={sc.id} className="tienda-wc-card">
                  <div className="tienda-wc-card-top">
                    <div className="tienda-wc-card-icon" aria-hidden="true" />
                    <div className="tienda-wc-card-title">{sc.name}</div>
                  </div>

                  <button
                    className="tienda-wc-card-btn"
                    onClick={() => navigate(`/tienda/${server}/${categoria}/${sc.slug}`)}
                  >
                    Ver productos
                  </button>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Vista normal de productos (cuando ya hay subcat activa)
  return (
    <div className="tienda-tebex">
      <div className="tienda-contenido">
        <TiendaProductosVista
          server={server}
          productos={productosFiltrados}
          categoria={categoriaSeleccionada}
          carrito={carrito}
          toggleProducto={toggleProducto}
          subcategoriaSeleccionadaURL={subcategoria}
          permitidas={[]}
          onVolver={() => navigate("/tienda")}
        />
      </div>
    </div>
  );
};

export default TiendaCategoriaVista;
