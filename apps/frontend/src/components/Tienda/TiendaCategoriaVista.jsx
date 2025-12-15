// apps/frontend/src/components/Tienda/TiendaCategoriaVista.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Outlet, useNavigate, useParams } from "react-router-dom";

import TiendaProductosVista from "./TiendaProductosVista";
import {
  API_URL,
  pickSubcatsFromApi,
  findCategoryBySlug,
  filterPackagesByCategoryId,
  SUBCATS_PER_TILE,
  PORTADA_TILES,
} from "./tiendaHelpers";

import { ANTES_DE_COMPRAR } from "./data/antesDeComprarData";
import "../../styles/components/Tienda/tienda-categoria.scss";

/* =========================================================
   Iconos
   ========================================================= */
const FALLBACK_ICONS = {
  protecciones: "/assets/tienda/categorias/protecciones.webp",
  "items-op": "/assets/tienda/categorias/items-op.webp",
  items_op: "/assets/tienda/categorias/items-op.webp",
  "llaves-survival": "/assets/tienda/categorias/llaves-survival.webp",
  llaves_survival: "/assets/tienda/categorias/llaves-survival.webp",
  // genera uno genérico si no cuadra ninguno
  default: "/assets/tienda/categorias/default.webp",
};

function normKey(v) {
  return String(v || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
}

function resolveIconForSubcat(sc) {
  if (!sc) return null;

  const slugRaw = sc.slug || "";
  const nameRaw = sc.name || "";

  const slug = normKey(slugRaw);
  const name = normKey(nameRaw);

  // 1) PORTADA_TILES (si lo tienes configurado)
  const fromPortada =
    (PORTADA_TILES && (PORTADA_TILES[slug] || PORTADA_TILES[name])) || null;

  if (typeof fromPortada === "string" && fromPortada) return fromPortada;
  if (fromPortada && typeof fromPortada === "object") {
    const maybe =
      fromPortada.imagen ||
      fromPortada.icon ||
      fromPortada.image ||
      fromPortada.src ||
      fromPortada.url;
    if (maybe) return maybe;
  }

  // 2) Fallbacks a partir de slug/name
  const candidates = [
    slug,
    name,
    slug.split("-")[0], // ej: "protecciones-survival-clasico" → "protecciones"
    name.split("-")[0],
  ];

  for (const key of candidates) {
    if (key && FALLBACK_ICONS[key]) return FALLBACK_ICONS[key];
  }

  // 3) Genérico
  return FALLBACK_ICONS.default || null;
}

export default function TiendaCategoriaVista({ carrito, toggleProducto }) {
  const { server, categoria, subcategoria } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [paquetes, setPaquetes] = useState([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(null);
  const [error, setError] = useState("");

  // animaciones
  const [routeFx, setRouteFx] = useState("idle"); // idle | out | in
  const [swapFx, setSwapFx] = useState(false); // animación al cambiar subcategoria

  const navLockRef = useRef(false);
  const didRouteMountRef = useRef(false);
  const didSwapMountRef = useRef(false);

  // ======= hooks / memos =======
  const mapKey = useMemo(
    () => `${(server || "").toLowerCase()}|${(categoria || "").toLowerCase()}`,
    [server, categoria]
  );

  const tileNamesAllowed = useMemo(
    () => SUBCATS_PER_TILE[mapKey] ?? null,
    [mapKey]
  );
  const isTile = tileNamesAllowed !== null;

  const subcats = useMemo(
    () => categoriaSeleccionada?.subcategorias || [],
    [categoriaSeleccionada]
  );
  const activeSubcat = useMemo(
    () => categoriaSeleccionada?.activeSubcat || null,
    [categoriaSeleccionada]
  );

  const hasChooser = useMemo(() => {
    return (
      categoriaSeleccionada?.mode === "tile" &&
      !activeSubcat &&
      (subcats || []).length > 1
    );
  }, [categoriaSeleccionada, activeSubcat, subcats]);

  const hasActive = useMemo(() => {
    return categoriaSeleccionada?.mode === "tile" && !!activeSubcat;
  }, [categoriaSeleccionada, activeSubcat]);

  const productosFiltrados = useMemo(() => {
    const active = categoriaSeleccionada?.activeSubcat;
    if (!active?.id) return [];
    return filterPackagesByCategoryId(paquetes, active.id);
  }, [paquetes, categoriaSeleccionada]);

  // ======= 1) Fetch SOLO cuando cambia server/categoria (NO subcategoria) =======
  useEffect(() => {
    let cancel = false;

    async function cargar() {
      setLoading(true);
      setError("");

      try {
        const r = await fetch(`${API_URL}/api/tebex/datos?sv=${server}`);
        if (!r.ok)
          throw new Error("No se pudo cargar la tienda para este servidor.");
        const data = await r.json();

        const apiCats = data.categorias || [];
        const packs = data.paquetes || [];

        if (isTile) {
          let subcatsLocal = pickSubcatsFromApi(apiCats, tileNamesAllowed);

          // dedupe
          const seen = new Set();
          subcatsLocal = subcatsLocal.filter((s) => {
            const key = String(s?.slug || s?.name || "").toLowerCase();
            if (!key) return false;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });

          // orden
          if (Array.isArray(tileNamesAllowed) && tileNamesAllowed.length) {
            const order = new Map(
              tileNamesAllowed.map((n, i) => [String(n).toLowerCase(), i])
            );
            subcatsLocal.sort((a, b) => {
              const ai = order.get(String(a.name).toLowerCase());
              const bi = order.get(String(b.name).toLowerCase());
              return (ai ?? 999) - (bi ?? 999);
            });
          }

          const subParam = String(subcategoria || "").toLowerCase();
          const active =
            (subParam &&
              subcatsLocal.find(
                (s) => String(s?.slug || "").toLowerCase() === subParam
              )) ||
            (subcatsLocal.length === 1 ? subcatsLocal[0] : null);

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
            subcategorias: subcatsLocal,
            activeSubcat: active || null,
          };

          if (!cancel) {
            setPaquetes(packs);
            setCategoriaSeleccionada(catObj);
          }
          return;
        }

        // modo real (por si lo usas)
        const catReal = findCategoryBySlug(apiCats, categoria);

        const catObj = {
          mode: "real",
          name:
            catReal?.name ?? (categoria ? categoria.toUpperCase() : "CATEGORÍA"),
          slug: categoria,
          activeSubcat: catReal || null,
          subcategorias: [],
        };

        if (!cancel) {
          setPaquetes(packs);
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
    // ⚠️ NO depende de subcategoria
  }, [server, categoria, isTile, tileNamesAllowed, subcategoria]);

  // ======= 2) Cuando cambia subcategoria: actualizar activeSubcat + animación swap =======
  useEffect(() => {
    if (!categoriaSeleccionada || categoriaSeleccionada?.mode !== "tile") return;

    const list = categoriaSeleccionada.subcategorias || [];
    const subParam = String(subcategoria || "").toLowerCase();

    const newActive =
      (subParam &&
        list.find(
          (s) => String(s.slug || "").toLowerCase() === subParam
        )) ||
      (list.length === 1 ? list[0] : null);

    const currentSlug = String(
      categoriaSeleccionada?.activeSubcat?.slug || ""
    ).toLowerCase();
    const nextSlug = String(newActive?.slug || "").toLowerCase();

    if (currentSlug === nextSlug) {
      if (!didSwapMountRef.current) didSwapMountRef.current = true;
      return;
    }

    setCategoriaSeleccionada((prev) =>
      prev ? { ...prev, activeSubcat: newActive || null } : prev
    );

    // swap solo después del primer set “real”
    if (didSwapMountRef.current) {
      setSwapFx(true);
      const t = setTimeout(() => setSwapFx(false), 420);
      return () => clearTimeout(t);
    }
    didSwapMountRef.current = true;
  }, [subcategoria, categoriaSeleccionada?.subcategorias]); // eslint-disable-line react-hooks/exhaustive-deps

  // ======= animación route IN SOLO al cambiar server/categoria (NO subcategoria) =======
  useEffect(() => {
    if (!didRouteMountRef.current) {
      didRouteMountRef.current = true;
      return;
    }
    setRouteFx("in");
    const t = setTimeout(() => setRouteFx("idle"), 420);
    return () => clearTimeout(t);
  }, [server, categoria]); // 👈 quitamos subcategoria

  // ======= helpers navegación (anim OUT solo para salir/cambiar categoría grande) =======
  const navAnimated = (to) => {
    if (!to) return;
    if (navLockRef.current) return;
    if (to === window.location.pathname) return;

    navLockRef.current = true;
    setRouteFx("out");

    setTimeout(() => {
      navigate(to);
      setTimeout(() => {
        navLockRef.current = false;
      }, 140);
    }, 220);
  };

  const goClose = () => navAnimated("/tienda");

  // 👇 subcategorías SIN animación de ruta, solo anim_SWAP productos
  const goSubcat = (scSlug) =>
    navigate(`/tienda/${server}/${categoria}/${scSlug}`);

  // =========================================================
  // RENDER
  // =========================================================

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

  if (categoria === "antes-de-comprar") {
    return (
      <div className="tienda-tebex">
        <div className="tienda-contenido">
          <div className="tienda-wc">
            <div className="tienda-wc-head">
              <h1 className="tienda-wc-title">{ANTES_DE_COMPRAR.titulo}</h1>
              <button className="tienda-wc-close" onClick={goClose}>
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

  // FUSIÓN (grid + sidebar + productos)
  return (
    <div
      className={[
        "tienda-tebex",
        "tienda-tebex--fusion",
        hasActive ? "is-active" : "is-chooser",
        routeFx === "out" ? "tc-route-out" : "",
        routeFx === "in" ? "tc-route-in" : "",
      ].join(" ")}
    >
      <div className="tienda-contenido">
        <div className="tienda-wc">
          {/* CABECERA FIJA */}
          <div className="tienda-wc-head">
            <div className="tienda-wc-hero">
              <div className="tienda-wc-hero-icon" aria-hidden="true" />
              <div className="tienda-wc-hero-text">
                <h1 className="tienda-wc-title">
                  {categoriaSeleccionada?.name}
                </h1>
                <p className="tienda-wc-subtitle">
                  {hasActive
                    ? "Cambia de categoría en el lateral y explora los productos."
                    : "Selecciona una categoría para los productos disponibles."}
                </p>
              </div>
            </div>

            <div className="tc-head-actions">
              <button
                className="tienda-wc-close"
                type="button"
                onClick={goClose}
              >
                Cerrar
              </button>
            </div>
          </div>

          {/* BODY: sidebar fijo + main fijo (scroll solo productos) */}
          <div className="tc-fusion-body">
            {/* SIDEBAR */}
            <aside className="tc-side" aria-hidden={!hasActive}>
              <div className="tc-side-title">Categorías</div>

              <div className="tc-side-scroll">
                <div className="tc-side-list">
                  {subcats.map((sc) => {
                    const icon = resolveIconForSubcat(sc);
                    const isActiveItem =
                      String(sc.slug || "").toLowerCase() ===
                      String(activeSubcat?.slug || "").toLowerCase();

                    return (
                      <button
                        key={sc.id}
                        type="button"
                        className={`tc-side-item ${
                          isActiveItem ? "is-active" : ""
                        }`}
                        onClick={() => goSubcat(sc.slug)}
                        title={sc.name}
                      >
                        {icon ? (
                          <img
                            className="tc-side-item-ico"
                            src={icon}
                            alt=""
                            draggable="false"
                            loading="lazy"
                          />
                        ) : (
                          <span
                            className="tc-side-item-ico-fallback"
                            aria-hidden="true"
                          />
                        )}

                        <span className="tc-side-item-label">{sc.name}</span>
                        <span
                          className="tc-side-item-shine"
                          aria-hidden="true"
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="tc-side-hint">
                Tip: cambia de categoría sin volver atrás.
              </div>
            </aside>

            {/* MAIN */}
            <main className="tc-main">
              {/* GRID GRANDE (vista selección) */}
              {hasChooser && (
                <div className="tc-chooser">
                  <div className="tc-grid">
                    {subcats.map((sc) => {
                      const icon = resolveIconForSubcat(sc);
                      return (
                        <article
                          key={sc.id}
                          className="tc-card"
                          onClick={() => goSubcat(sc.slug)}
                        >
                          <div className="tc-card-inner">
                            <div className="tc-card-media">
                              {icon ? (
                                <img
                                  src={icon}
                                  alt=""
                                  draggable="false"
                                  loading="lazy"
                                />
                              ) : (
                                <span
                                  className="tc-card-media-fallback"
                                  aria-hidden="true"
                                />
                              )}
                            </div>
                            <div className="tc-card-title">{sc.name}</div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* PRODUCTOS: scroll SOLO aquí */}
              {hasActive && (
                <div className={`tc-products ${swapFx ? "is-swap" : ""}`}>
                  <div className="tc-products-scroll">
                    <TiendaProductosVista
                      server={server}
                      productos={productosFiltrados}
                      categoria={categoriaSeleccionada}
                      carrito={carrito}
                      toggleProducto={toggleProducto}
                      subcategoriaSeleccionadaURL={subcategoria}
                      embedMode
                    />
                  </div>
                </div>
              )}

              {!hasChooser && !hasActive && (
                <div className="tc-empty">
                  No hay categorías disponibles para mostrar.
                </div>
              )}

              {/* ruta anidada “dummy” */}
              <Outlet />
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
