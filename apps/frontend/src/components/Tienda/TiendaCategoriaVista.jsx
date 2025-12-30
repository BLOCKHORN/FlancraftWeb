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
  PORTADA_TILES,
  AVISO_PADRES_TILE,
} from "./tiendaHelpers";

import { ANTES_DE_COMPRAR } from "./data/antesDeComprarData";
import "../../styles/components/Tienda/tienda-categoria.scss";

/* =========================================================
   Iconos de cabecera / sidebar
   ========================================================= */
const FALLBACK_ICONS = {
  protecciones: "/tienda/categorias/protes.webp",

  "items-op": "/tienda/categorias/itemop.webp",
  items_op: "/tienda/categorias/itemop.webp",
  // Items OP específicos de OneBlock
  "items-op-oneblock": "/tienda/categorias/itemop.webp",
  items: "/tienda/categorias/itemop.webp",

  // Kit de Navidad (OneBlock)
  "kit-navidad": "/tienda/categorias/navidad.webp",
  kit: "/tienda/categorias/navidad.webp",

  "llaves-survival": "/tienda/categorias/keys.webp",
  llaves_survival: "/tienda/categorias/keys.webp",

  dinero: "/tienda/categorias/dinero.webp",
  "dinero-survival": "/tienda/categorias/dinero.webp",
  "dinero-chunklock": "/tienda/categorias/dinero.webp",
  "dinero-oneblock": "/tienda/categorias/dinero.webp",

  experiencia: "/tienda/categorias/xp.webp",
  "experiencia-survival": "/tienda/categorias/xp.webp",
  "experiencia-chunklock": "/tienda/categorias/xp.webp",
  xp: "/tienda/categorias/xp.webp",

  "llaves-chunklock": "/tienda/categorias/keys.webp",
  llaves_chunklock: "/tienda/categorias/keys.webp",
  llaves: "/tienda/categorias/keys.webp",

  rangos: "/tienda/categorias/rangos.webp",

  default: "/tienda/categorias/rangos.webp",
};

/* =========================================================
   Icono grande / emblema (se usará junto al H1)
   ========================================================= */
const HERO_ICONS = {
  "survival-clasico": "/assets/reinos/survival-clasico.webp",
  survival_clasico: "/assets/reinos/survival-clasico.webp",
  survival: "/assets/reinos/survival-clasico.webp",

  chunklock: "/assets/reinos/chunklock.webp",

  // Logo principal OneBlock
  oneblock: "/assets/reinos/oneblock.webp",

  // Logo principal Tags
  tags: "/assets/reinos/tags.png",

  rangos: "/tienda/categorias/rangos.webp",
  "llaves-survival": "/tienda/categorias/keys.webp",
  protecciones: "/tienda/categorias/protes.webp",
  "items-op": "/tienda/categorias/itemop.webp",
};

const CATEGORY_DESCRIPTIONS = {
  rangos: "Explora los rangos disponibles en el servidor y mejora tu cuenta.",
  "llaves-survival": "Llaves para abrir cofres y conseguir recompensas especiales.",
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
  if (CATEGORY_DESCRIPTIONS[firstToken]) return CATEGORY_DESCRIPTIONS[firstToken];

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

  // ref del scroll del sidebar para auto-scroll en móvil
  const sideScrollRef = useRef(null);

  // ======= breadcrumb / quick switch =======
  const [crumbOpen, setCrumbOpen] = useState(false);
  const crumbRef = useRef(null);

  const quickTiles = useMemo(() => {
    const base = Array.isArray(PORTADA_TILES) ? PORTADA_TILES : [];
    const extra = AVISO_PADRES_TILE ? [AVISO_PADRES_TILE] : [];
    const seen = new Set();

    return [...base, ...extra].filter((t) => {
      const key = `${String(t?.server || "")}|${String(t?.slug || "")}`.toLowerCase();
      if (!t?.server || !t?.slug) return false;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, []);

  useEffect(() => {
    if (!crumbOpen) return;

    const onDown = (e) => {
      const el = crumbRef.current;
      if (!el) return;
      if (!el.contains(e.target)) setCrumbOpen(false);
    };

    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [crumbOpen]);

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

  // Auto-fit sidebar cuando hay pocas categorías (rellena alto y reparte)
  const fitSidebar = showSidebar && subcats.length > 0 && subcats.length <= 6;

  const isEmptyHint = !hasActive && !isRealMode && subcats.length > 1;

  // ======= 1) Fetch SOLO cuando cambia server/categoria =======
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
              )) || null;

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
          name: catReal?.name ?? (categoria ? categoria.toUpperCase() : "CATEGORÍA"),
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
  }, [server, categoria, isTile, tileNamesAllowed]); // eslint-disable-line react-hooks/exhaustive-deps

  // ======= 2) Cuando cambia subcategoria: actualizar activeSubcat + animación swap =======
  useEffect(() => {
    if (!categoriaSeleccionada || categoriaSeleccionada?.mode !== "tile") return;

    const list = categoriaSeleccionada.subcategorias || [];
    const subParam = String(subcategoria || "").toLowerCase();

    const newActive =
      (subParam &&
        list.find((s) => String(s.slug || "").toLowerCase() === subParam)) ||
      null;

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

  // ======= 2b) Auto-scroll al botón activo en móvil / tablet =======
  useEffect(() => {
    if (!activeSubcat) return;
    if (typeof window === "undefined") return;

    const isNarrow =
      window.matchMedia?.("(max-width: 920px)").matches || window.innerWidth <= 920;

    if (!isNarrow) return;

    const container = sideScrollRef.current;
    if (!container) return;

    const activeButton = container.querySelector(".tc-side-item.is-active");
    if (!activeButton) return;

    activeButton.scrollIntoView({
      block: "nearest",
      inline: "nearest",
      behavior: "smooth",
    });
  }, [activeSubcat]);

  // ======= 3) AUTO-SELECCIONAR cuando solo hay 1 subcategoría =======
  useEffect(() => {
    if (!categoriaSeleccionada || categoriaSeleccionada.mode !== "tile") return;

    const list = categoriaSeleccionada.subcategorias || [];
    if (list.length !== 1) return;
    if (subcategoria) return;

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

  const goTile = (t) => {
    if (!t?.server || !t?.slug) return;
    setCrumbOpen(false);
    navAnimated(`/tienda/${t.server}/${t.slug}`);
  };

  // =========================================================
  // ERRORES / PÁGINA ESPECIAL
  // =========================================================
  if (error) {
    return (
      <div className="tienda-tebex is-anim">
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
      <div className="tienda-tebex is-anim">
        <div className="tienda-contenido">
          <div className="tienda-wc">
            <div className="tienda-wc-frame" aria-hidden="true" />
            <div className="tienda-wc-inner">
              <div className="tc-head tc-head--doc">
                <div className="tc-head-spacer" aria-hidden="true" />
                <div className="tc-head-center">
                  <div className="tc-head-row">
                    <h1 className="tienda-wc-title">{ANTES_DE_COMPRAR.titulo}</h1>
                  </div>

                  {/* Breadcrumb + salto rápido también aquí */}
                  <div className="tc-breadcrumb" ref={crumbRef}>
                    <button
                      type="button"
                      className="tc-crumb"
                      onClick={() => navAnimated("/tienda")}
                      title="Volver a la portada"
                    >
                      TIENDA
                    </button>

                    <span className="tc-crumb-sep" aria-hidden="true">
                      ›
                    </span>

                    <span className="tc-crumb-current" title="Sección actual">
                      ¡ANTES DE COMPRAR!
                    </span>

                    <div className={`tc-crumb-switch ${crumbOpen ? "is-open" : ""}`}>
                      <button
                        type="button"
                        className="tc-switch-btn"
                        onClick={() => setCrumbOpen((v) => !v)}
                        aria-expanded={crumbOpen}
                        aria-label="Cambiar de sección"
                        title="Cambiar de sección"
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M12 2a10 10 0 1 0 .001 20.001A10 10 0 0 0 12 2Zm0 2a8 8 0 1 1 0 16a8 8 0 0 1 0-16Zm3.9 4.2-3 7a1 1 0 0 1-.5.5l-7 3a.6.6 0 0 1-.8-.8l3-7a1 1 0 0 1 .5-.5l7-3a.6.6 0 0 1 .8.8ZM9 11l-1.6 3.8L11 13l1.6-3.8L9 11Z" />
                        </svg>
                      </button>

                      {crumbOpen && (
                        <div
                          className="tc-switch-pop"
                          role="menu"
                          aria-label="Secciones"
                        >
                          {quickTiles.map((t) => {
                            const active =
                              String(t.server).toLowerCase() ===
                                String(server).toLowerCase() &&
                              String(t.slug).toLowerCase() ===
                                String(categoria).toLowerCase();

                            return (
                              <button
                                key={`${t.server}-${t.slug}`}
                                type="button"
                                role="menuitem"
                                className={`tc-switch-item ${active ? "is-active" : ""}`}
                                onClick={() => goTile(t)}
                                title={t.name}
                              >
                                <span className="tc-switch-ico" aria-hidden="true">
                                  <img
                                    src={t.image}
                                    alt=""
                                    draggable="false"
                                    loading="lazy"
                                  />
                                </span>
                                <span className="tc-switch-label">{t.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="tc-head-divider" aria-hidden="true" />
                  <p className="tienda-wc-subtitle">
                    Información importante antes de comprar.
                  </p>
                </div>
                <div className="tc-head-actions">
                  <button
                    className="tienda-wc-close"
                    onClick={goClose}
                    type="button"
                  >
                    Volver
                  </button>
                </div>
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
      </div>
    );
  }

  const rootClasses = [
    "tienda-tebex",
    "tienda-tebex--fusion",
    "is-anim",
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
          {/* Marco (borde.jpeg) */}
          <div className="tienda-wc-frame" aria-hidden="true" />

          <div className="tienda-wc-inner">
            {/* OVERLAY DE CARGA SUAVE */}
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

            {/* CABECERA */}
            <div className="tc-head">
              <div className="tc-head-spacer" aria-hidden="true" />

              <div className="tc-head-center">
                <div className="tc-head-row">
                  {heroIcon && (
                    <span className="tc-head-icoWrap" aria-hidden="true">
                      <img src={heroIcon} alt="" draggable="false" loading="lazy" />
                    </span>
                  )}
                  <h1 className="tienda-wc-title">{categoriaSeleccionada?.name}</h1>
                </div>

                {/* Breadcrumb + salto rápido */}
                <div className="tc-breadcrumb" ref={crumbRef}>
                  <button
                    type="button"
                    className="tc-crumb"
                    onClick={() => navAnimated("/tienda")}
                    title="Volver a la portada"
                  >
                    TIENDA
                  </button>

                  <span className="tc-crumb-sep" aria-hidden="true">
                    ›
                  </span>

                  <button
                    type="button"
                    className="tc-crumb"
                    onClick={() => navAnimated(`/tienda/${server}/${categoria}`)}
                    title="Volver a esta categoría"
                  >
                    {categoriaSeleccionada?.name || "CATEGORÍA"}
                  </button>

                  {hasActive && activeSubcat?.name && (
                    <>
                      <span className="tc-crumb-sep" aria-hidden="true">
                        ›
                      </span>
                      <span className="tc-crumb-current" title="Subcategoría actual">
                        {activeSubcat.name}
                      </span>
                    </>
                  )}

                  <div className={`tc-crumb-switch ${crumbOpen ? "is-open" : ""}`}>
                    <button
                      type="button"
                      className="tc-switch-btn"
                      onClick={() => setCrumbOpen((v) => !v)}
                      aria-expanded={crumbOpen}
                      aria-label="Cambiar de sección"
                      title="Cambiar de sección"
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M12 2a10 10 0 1 0 .001 20.001A10 10 0 0 0 12 2Zm0 2a8 8 0 1 1 0 16a8 8 0 0 1 0-16Zm3.9 4.2-3 7a1 1 0 0 1-.5.5l-7 3a.6.6 0 0 1-.8-.8l3-7a1 1 0 0 1 .5-.5l7-3a.6.6 0 0 1 .8.8ZM9 11l-1.6 3.8L11 13l1.6-3.8L9 11Z" />
                      </svg>
                    </button>

                    {crumbOpen && (
                      <div className="tc-switch-pop" role="menu" aria-label="Secciones">
                        {quickTiles.map((t) => {
                          const active =
                            String(t.server).toLowerCase() ===
                              String(server).toLowerCase() &&
                            String(t.slug).toLowerCase() ===
                              String(categoria).toLowerCase();

                          return (
                            <button
                              key={`${t.server}-${t.slug}`}
                              type="button"
                              role="menuitem"
                              className={`tc-switch-item ${active ? "is-active" : ""}`}
                              onClick={() => goTile(t)}
                              title={t.name}
                            >
                              <span className="tc-switch-ico" aria-hidden="true">
                                <img
                                  src={t.image}
                                  alt=""
                                  draggable="false"
                                  loading="lazy"
                                />
                              </span>
                              <span className="tc-switch-label">{t.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="tc-head-divider" aria-hidden="true" />
                <p className="tienda-wc-subtitle">{heroDescription}</p>
              </div>

              <div className="tc-head-actions">
                <button className="tienda-wc-close" type="button" onClick={goClose}>
                  Cerrar
                </button>
              </div>
            </div>

            {/* BODY: sidebar + main */}
            <div className="tc-fusion-body">
              {/* SIDEBAR */}
              {showSidebar && (
                <aside className="tc-side">
                  <div className="tc-side-title">Categorías</div>

                  <div
                    className={`tc-side-scroll ${fitSidebar ? "tc-side-scroll--fit" : ""}`}
                    ref={sideScrollRef}
                  >
                    <div
                      className={`tc-side-list ${fitSidebar ? "tc-side-list--fit" : ""}`}
                    >
                      {subcats.map((sc) => {
                        const icon = resolveIconForSubcat(sc);
                        const isActiveItem =
                          String(sc.slug || "").toLowerCase() ===
                          String(activeSubcat?.slug || "").toLowerCase();

                        return (
                          <button
                            key={sc.id}
                            type="button"
                            className={`tc-side-item ${isActiveItem ? "is-active" : ""}`}
                            onClick={() => goSubcat(sc.slug)}
                            title={sc.name}
                          >
                            <span className="tc-side-item-icoWrap" aria-hidden="true">
                              {icon ? (
                                <img
                                  className="tc-side-item-ico"
                                  src={icon}
                                  alt=""
                                  draggable="false"
                                  loading="lazy"
                                />
                              ) : (
                                <span className="tc-side-item-ico-fallback" aria-hidden="true" />
                              )}
                            </span>

                            <span className="tc-side-item-label">{sc.name}</span>
                            <span className="tc-side-item-shine" aria-hidden="true" />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="tc-side-hint">Tip: cambia de categoría sin volver atrás.</div>
                </aside>
              )}

              {/* MAIN */}
              <main className={`tc-main ${isEmptyHint ? "is-empty" : ""}`}>
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

                {!hasActive && !isRealMode && subcats.length > 1 && (
                  <div className="tc-empty tc-empty--hint">
                    <div className="tc-empty-inner">
                      <h2 className="tc-empty-title">Selecciona una categoría</h2>
                      <p className="tc-empty-text">
                        Elige una categoría del panel izquierdo para ver los productos
                        disponibles.
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
    </div>
  );
}
