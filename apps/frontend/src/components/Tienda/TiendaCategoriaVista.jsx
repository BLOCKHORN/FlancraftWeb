// src/components/Tienda/TiendaCategoriaVista.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Outlet, useNavigate, useParams } from "react-router-dom";

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

/* =========================================================
   Iconos de cabecera / sidebar
   (rutas y nombres ajustados a /public/tienda/categorias)
   ========================================================= */
const FALLBACK_ICONS = {
  // Survival / genérico
  protecciones: "/tienda/categorias/protes.webp",

  "items-op": "/tienda/categorias/itemop.webp",
  items_op: "/tienda/categorias/itemop.webp",

  "llaves-survival": "/tienda/categorias/keys.webp",
  llaves_survival: "/tienda/categorias/keys.webp",

  // Dinero
  dinero: "/tienda/categorias/dinero.webp",
  "dinero-survival": "/tienda/categorias/dinero.webp",
  "dinero-chunklock": "/tienda/categorias/dinero.webp",

  // Experiencia
  experiencia: "/tienda/categorias/xp.webp",
  "experiencia-survival": "/tienda/categorias/xp.webp",
  "experiencia-chunklock": "/tienda/categorias/xp.webp",
  xp: "/tienda/categorias/xp.webp",

  // Chunklock llaves
  "llaves-chunklock": "/tienda/categorias/keys.webp",
  llaves_chunklock: "/tienda/categorias/keys.webp",
  llaves: "/tienda/categorias/keys.webp",

  // Rangos genéricos
  rangos: "/tienda/categorias/rangos.webp",

  // Fallback
  default: "/tienda/categorias/rangos.webp",
};

/* =========================================================
   Icono grande de cabecera (reinos / categorías)
   ========================================================= */
const HERO_ICONS = {
  // Reinos / categorías principales
  "survival-clasico": "/assets/reinos/survival-clasico.webp",
  survival_clasico: "/assets/reinos/survival-clasico.webp",
  survival: "/assets/reinos/survival-clasico.webp",

  chunklock: "/assets/reinos/chunklock.webp",

  // Otras categorías (por si acaso)
  rangos: "/tienda/categorias/rangos.webp",
  "llaves-survival": "/tienda/categorias/keys.webp",
  protecciones: "/tienda/categorias/protes.webp",
  "items-op": "/tienda/categorias/itemop.webp",
};

const CATEGORY_DESCRIPTIONS = {
  rangos: "Explora los rangos disponibles en el servidor y mejora tu cuenta.",
  "llaves-survival":
    "Llaves para abrir cofres y conseguir recompensas especiales.",
  protecciones: "Protege tu base y tus cofres frente a otros jugadores.",
  default: "Explora los productos disponibles en esta categoría.",
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

  const candidates = [slug, name, slug.split("-")[0], name.split("-")[0]];

  for (const key of candidates) {
    if (key && FALLBACK_ICONS[key]) return FALLBACK_ICONS[key];
  }

  return FALLBACK_ICONS.default || null;
}

function resolveHeroIcon(categoriaSeleccionada, categoriaSlug) {
  const slug =
    normKey(
      categoriaSeleccionada?.slug ||
        categoriaSeleccionada?.name ||
        categoriaSlug ||
        ""
    ) || "";

  if (HERO_ICONS[slug]) return HERO_ICONS[slug];

  const firstToken = slug.split("-")[0];
  if (HERO_ICONS[firstToken]) return HERO_ICONS[firstToken];

  return null;
}

function resolveDescription(categoriaSeleccionada, categoriaSlug) {
  const slug =
    normKey(
      categoriaSeleccionada?.slug ||
        categoriaSeleccionada?.name ||
        categoriaSlug ||
        ""
    ) || "";

  if (CATEGORY_DESCRIPTIONS[slug]) return CATEGORY_DESCRIPTIONS[slug];
  const firstToken = slug.split("-")[0];
  if (CATEGORY_DESCRIPTIONS[firstToken])
    return CATEGORY_DESCRIPTIONS[firstToken];

  return CATEGORY_DESCRIPTIONS.default;
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

  const hasActive = useMemo(() => {
    return categoriaSeleccionada?.mode === "tile" && !!activeSubcat;
  }, [categoriaSeleccionada, activeSubcat]);

  const isRealMode = categoriaSeleccionada?.mode === "real";

  const productosFiltrados = useMemo(() => {
    const active = categoriaSeleccionada?.activeSubcat;
    if (!active?.id) return [];
    return filterPackagesByCategoryId(paquetes, active.id);
  }, [paquetes, categoriaSeleccionada]);

  const heroIcon = useMemo(
    () => resolveHeroIcon(categoriaSeleccionada, categoria),
    [categoriaSeleccionada, categoria]
  );

  const heroDescription = useMemo(
    () => resolveDescription(categoriaSeleccionada, categoria),
    [categoriaSeleccionada, categoria]
  );

  // Sidebar solo si hay más de una subcategoría
  const showSidebar = !isRealMode && subcats.length > 1;

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

          const seen = new Set();
          subcatsLocal = subcatsLocal.filter((s) => {
            const key = String(s?.slug || s?.name || "").toLowerCase();
            if (!key) return false;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });

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
              )) || null; // al entrar no seleccionamos nada (lo auto-seleccionaremos abajo si solo hay 1)

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

        // modo real
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
    // 👇 OJO: aquí *no* ponemos subcategoria para no refetchear al cambiar de subcat
  }, [server, categoria, isTile, tileNamesAllowed]);

  // ======= 2) Cuando cambia subcategoria: actualizar activeSubcat + animación swap =======
  useEffect(() => {
    if (!categoriaSeleccionada || categoriaSeleccionada?.mode !== "tile")
      return;

    const list = categoriaSeleccionada.subcategorias || [];
    const subParam = String(subcategoria || "").toLowerCase();

    const newActive =
      (subParam &&
        list.find(
          (s) => String(s.slug || "").toLowerCase() === subParam
        )) || null;

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

    if (didSwapMountRef.current && newActive) {
      setSwapFx(true);
      const t = setTimeout(() => setSwapFx(false), 420);
      return () => clearTimeout(t);
    }
    didSwapMountRef.current = true;
  }, [subcategoria, categoriaSeleccionada?.subcategorias]); // eslint-disable-line react-hooks/exhaustive-deps

  // ======= 3) AUTO-SELECCIONAR cuando solo hay 1 subcategoría (RANGOS, etc.) =======
  useEffect(() => {
    if (!categoriaSeleccionada || categoriaSeleccionada.mode !== "tile") return;

    const list = categoriaSeleccionada.subcategorias || [];
    if (list.length !== 1) return; // solo nos importa cuando hay EXACTAMENTE 1

    if (subcategoria) return; // ya estamos en la URL de la subcat

    const only = list[0];
    if (!only?.slug) return;

    const targetPath = `/tienda/${server}/${categoria}/${only.slug}`;
    if (window.location.pathname !== targetPath) {
      navigate(targetPath, { replace: true });
    }
  }, [categoriaSeleccionada, subcategoria, server, categoria, navigate]);

  // ======= animación route IN SOLO al cambiar server/categoria =======
  useEffect(() => {
    if (!didRouteMountRef.current) {
      didRouteMountRef.current = true;
      return;
    }
    setRouteFx("in");
    const t = setTimeout(() => setRouteFx("idle"), 420);
    return () => clearTimeout(t);
  }, [server, categoria]);

  // ======= helpers navegación =======
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

  const goSubcat = (scSlug) =>
    navigate(`/tienda/${server}/${categoria}/${scSlug}`);

  // =========================================================
  // ERRORES / PÁGINA ESPECIAL
  // =========================================================

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

  const rootClasses = [
    "tienda-tebex",
    "tienda-tebex--fusion",
    isRealMode ? "is-real" : "",
    routeFx === "out" ? "tc-route-out" : "",
    routeFx === "in" ? "tc-route-in" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={rootClasses}>
      <div className="tienda-contenido">
        <div className="tienda-wc">
          {/* OVERLAY DE CARGA SUAVE: ya no rompe el layout */}
          {loading && (
            <div className="tienda-loading-overlay" aria-hidden="true">
              <div className="tienda-loading-inner">
                <div className="logo-f-loader">
                  <span>F</span>
                </div>
                <p className="tienda-loading-text">CARGANDO LA TIENDA...</p>
              </div>
            </div>
          )}

          {/* CABECERA FIJA */}
          <div className="tienda-wc-head">
            <div className="tienda-wc-hero">
              <div className="tienda-wc-hero-icon" aria-hidden="true">
                {heroIcon && (
                  <img src={heroIcon} alt="" draggable="false" loading="lazy" />
                )}
              </div>
              <div className="tienda-wc-hero-text">
                <h1 className="tienda-wc-title">
                  {categoriaSeleccionada?.name}
                </h1>
                <p className="tienda-wc-subtitle">{heroDescription}</p>
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

          {/* BODY: sidebar + main */}
          <div className="tc-fusion-body">
            {/* SIDEBAR (solo si hay >1 subcategoría) */}
            {showSidebar && (
              <aside className="tc-side">
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
            )}

            {/* MAIN */}
            <main className="tc-main">
              {/* PRODUCTOS: en modo tile con subcat activa */}
              {hasActive && !isRealMode && (
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

              {/* Modo real (sin subcategorías, tipo RANGOS si lo quisieras así) */}
              {isRealMode && (
                <div className="tc-products tc-products--real">
                  <div className="tc-products-scroll">
                    <TiendaProductosVista
                      server={server}
                      productos={paquetes}
                      categoria={categoriaSeleccionada}
                      carrito={carrito}
                      toggleProducto={toggleProducto}
                      embedMode
                    />
                  </div>
                </div>
              )}

              {/* Mensaje central solo cuando hay varias subcats y aún no se ha elegido ninguna */}
              {!hasActive && !isRealMode && subcats.length > 1 && (
                <div className="tc-empty tc-empty--hint">
                  <div className="tc-empty-inner">
                    <h2 className="tc-empty-title">Selecciona una categoría</h2>
                    <p className="tc-empty-text">
                      Elige una categoría del panel izquierdo para ver los
                      productos disponibles.
                    </p>
                  </div>
                </div>
              )}

              <Outlet />
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
