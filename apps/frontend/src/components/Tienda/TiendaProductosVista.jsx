// apps/frontend/src/components/Tienda/TiendaProductosVista.jsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PORTADA_TILES } from "./tiendaHelpers";
import "../../styles/components/Tienda/tienda-productos.scss";

/* ===========================
   Helpers: qty + grouping
   =========================== */

const safeText = (txt) =>
  String(txt ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

function stripDiacritics(s) {
  try {
    return String(s || "").normalize("NFD").replace(/\p{Diacritic}/gu, "");
  } catch {
    // fallback old browsers
    return String(s || "");
  }
}

function extractQtyNumber(name = "") {
  const n = String(name || "");

  // x3 / x 3 / X3
  let m = n.match(/\b[xX]\s*(\d+)\b/);
  if (m?.[1]) return Number(m[1]);

  // 3x / 3 x
  m = n.match(/\b(\d+)\s*[xX]\b/);
  if (m?.[1]) return Number(m[1]);

  // pack 3 / pack de 3
  m = n.match(/\bpack(?:\s+de)?\s+(\d+)\b/i);
  if (m?.[1]) return Number(m[1]);

  return null;
}

function extractQtyLabel(name = "") {
  const q = extractQtyNumber(name);
  return q ? `x${q}` : null;
}

function normalizeBaseName(name = "") {
  let t = String(name || "");

  // quitar qty tokens: x3, 3x, pack 3
  t = t.replace(/\b[xX]\s*\d+\b/g, " ");
  t = t.replace(/\b\d+\s*[xX]\b/g, " ");
  t = t.replace(/\bpack(?:\s+de)?\s+\d+\b/gi, " ");

  // limpiar separadores típicos
  t = t.replace(/[\(\)\[\]]/g, " ");
  t = t.replace(/[-–—|•]+/g, " ");
  t = t.replace(/\s{2,}/g, " ").trim();

  return t || String(name || "").trim() || "Producto";
}

function keyFromBaseName(baseName = "") {
  return stripDiacritics(baseName)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}


function sanitizeTebexHtml(input) {
  const html = String(input || "").trim();
  if (!html) return "";

  const looksLikeHtml = /<\/?[a-z][\s\S]*>/i.test(html);
  const normalized = looksLikeHtml
    ? html
    : `<p>${safeText(html)
        .replace(/\n{2,}/g, "</p><p>")
        .replace(/\n/g, "<br/>")}</p>`;

  let doc;
  try {
    doc = new DOMParser().parseFromString(normalized, "text/html");
  } catch {
    return `<p>${safeText(html)}</p>`;
  }

  const FORBIDDEN = new Set([
    "script",
    "style",
    "iframe",
    "object",
    "embed",
    "link",
    "meta",
    "base",
    "form",
    "input",
    "button",
    "textarea",
    "select",
    "option",
    "svg",
    "math",
  ]);

  const ALLOWED = new Set([
    "p",
    "br",
    "hr",
    "div",
    "span",
    "strong",
    "b",
    "em",
    "i",
    "u",
    "s",
    "small",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "ul",
    "ol",
    "li",
    "blockquote",
    "pre",
    "code",
    "a",
    "img",
  ]);

  const walk = (node) => {
    const children = Array.from(node.children || []);
    for (const el of children) {
      const tag = String(el.tagName || "").toLowerCase();

      if (FORBIDDEN.has(tag)) {
        el.remove();
        continue;
      }

      if (!ALLOWED.has(tag)) {
        const frag = doc.createDocumentFragment();
        while (el.firstChild) frag.appendChild(el.firstChild);
        el.replaceWith(frag);
        continue;
      }

      for (const attr of Array.from(el.attributes || [])) {
        const name = attr.name.toLowerCase();
        const value = attr.value;

        if (name.startsWith("on") || name === "style") {
          el.removeAttribute(attr.name);
          continue;
        }

        if (tag === "a") {
          if (!["href", "target", "rel", "title"].includes(name)) {
            el.removeAttribute(attr.name);
          }
        } else if (tag === "img") {
          if (!["src", "alt", "title"].includes(name)) {
            el.removeAttribute(attr.name);
          }
        } else {
          if (name !== "title") el.removeAttribute(attr.name);
        }

        if (tag === "a" && name === "href") {
          const href = String(value || "").trim();
          const ok = /^https?:\/\//i.test(href) || href.startsWith("/");
          if (!ok) el.removeAttribute("href");
        }
        if (tag === "img" && name === "src") {
          const src = String(value || "").trim();
          const ok = /^https?:\/\//i.test(src) || src.startsWith("/");
          if (!ok) el.removeAttribute("src");
        }
      }

      if (tag === "a") {
        el.setAttribute("target", "_blank");
        el.setAttribute("rel", "noreferrer noopener");
      }

      walk(el);
    }
  };

  walk(doc.body);

  for (const img of Array.from(doc.body.querySelectorAll("img"))) {
    img.setAttribute("alt", img.getAttribute("alt") || "Imagen");
  }

  return doc.body.innerHTML;
}

function calcDiscountPct(original, current) {
  const o = Number(original);
  const c = Number(current);
  if (!isFinite(o) || !isFinite(c) || o <= 0 || c <= 0) return null;
  if (c >= o) return null;
  const pct = Math.round((1 - c / o) * 100);
  if (!isFinite(pct) || pct <= 0) return null;
  return pct;
}

/* ===========================
   Component
   =========================== */

const TiendaProductosVista = ({
  server,
  productos = [],
  categoria,
  carrito = [],
  toggleProducto,
  subcategoriaSeleccionadaURL,
  onVolver,
}) => {
  const navigate = useNavigate();

  const slugCat = (categoria?.slug || "generic").toLowerCase();
  const isPremium = slugCat === "premium";
  const imgFallback = "/assets/tienda/producto-placeholder.png";

  const subcats = useMemo(() => categoria?.subcategorias || [], [categoria]);

  // slug activa por URL; si no, activeSubcat; si no, primera.
  const activeSlug = useMemo(() => {
    const fromUrl = (subcategoriaSeleccionadaURL || "").toLowerCase();
    if (fromUrl) return fromUrl;

    const fromActive = (categoria?.activeSubcat?.slug || "").toLowerCase();
    if (fromActive) return fromActive;

    const first = (subcats[0]?.slug || "").toLowerCase();
    return first || "";
  }, [subcategoriaSeleccionadaURL, categoria, subcats]);

  const tile = useMemo(() => {
    const sv = (server || "").toLowerCase();
    return PORTADA_TILES.find(
      (t) =>
        (t.slug || "").toLowerCase() === slugCat &&
        (t.server || "").toLowerCase() === sv
    );
  }, [server, slugCat]);

  const headerCopy = useMemo(() => {
    const baseIcon = tile?.image;

    const MAP = {
      premium: {
        icon: baseIcon || "/tienda/imagenes/icon-premium.png",
        desc: "Ventajas exclusivas, cosméticos y mejoras para elevar tu experiencia.",
        sub: "La forma más completa de apoyar FlanCraft.",
      },
      rangos: {
        icon: baseIcon || "/tienda/imagenes/icon-rangos.png",
        desc: "Desbloquea rangos con perks, kits y beneficios para destacar.",
        sub: "Haz tu progreso más épico y visible.",
      },
      oneblock: {
        icon: baseIcon || "/tienda/imagenes/icon-oneblock.png",
        desc: "Llaves, minions, ítems y recursos para acelerar tu isla.",
        sub: "Potencia tu aventura en OneBlock.",
      },
      "survival-clasico": {
        icon: baseIcon || "/tienda/imagenes/icon-survival.png",
        desc: "Mejoras y objetos: dinero, llaves e ítems especiales.",
        sub: "Optimiza tu progreso en Survival Clásico.",
      },
      chunklock: {
        icon: baseIcon || "/tienda/imagenes/icon-chunklock.png",
        desc: "Experiencia, dinero e ítems para avanzar de forma eficiente.",
        sub: "Supera cada etapa de ChunkLock.",
      },
      generic: {
        icon: baseIcon || "/tienda/imagenes/icon-default.png",
        desc: "Explora los paquetes disponibles y elige el que encaje con tu forma de jugar.",
        sub: "Cada paquete está pensado para mejorar tu experiencia.",
      },
    };

    return MAP[slugCat] || MAP.generic;
  }, [slugCat, tile]);

  const estaEnCarrito = (pkg) => {
    const id = pkg?.id || pkg?.package_id;
    return carrito.some((p) => String(p?.id) === String(id));
  };

  const goToSubcat = (scSlug) => {
    const s = (server || "").toLowerCase();
    const c = (categoria?.slug || slugCat || "").toLowerCase();
    const sub = (scSlug || "").toLowerCase();
    if (!s || !c || !sub) return;
    navigate(`/tienda/${s}/${c}/${sub}`);
  };

  // ✅ Mantener orden Tebex de llegada (no reordenamos el listado base)
  const productosOrdenTebex = useMemo(
    () => (Array.isArray(productos) ? productos : []),
    [productos]
  );

  // ✅ Agrupar por nombre base (SIN depender de la URL de imagen -> así se agrupa “en todas”)
  // Orden de secciones = primera aparición (Tebex)
  const secciones = useMemo(() => {
    const map = new Map();

    productosOrdenTebex.forEach((pkg, idx) => {
      const rawName = pkg?.name || pkg?.nombre || "Producto";
      const baseName = normalizeBaseName(rawName);
      const key = keyFromBaseName(baseName);

      if (!map.has(key)) {
        map.set(key, {
          key,
          title: baseName || rawName,
          firstIdx: idx,
          items: [],
        });
      }

      map.get(key).items.push({
        pkg,
        idx,
        rawName,
        qtyNum: extractQtyNumber(rawName),
        qtyLabel: extractQtyLabel(rawName),
      });
    });

    const arr = Array.from(map.values());
    arr.sort((a, b) => a.firstIdx - b.firstIdx);

    // Dentro de cada sección: ordenar variantes por cantidad asc (x1, x3, x7...) si existe qty
    arr.forEach((sec) => {
      const hasQty = sec.items.filter((it) => typeof it.qtyNum === "number").length >= 2;
      if (hasQty) {
        sec.items.sort((a, b) => {
          const aq = typeof a.qtyNum === "number" ? a.qtyNum : 999999;
          const bq = typeof b.qtyNum === "number" ? b.qtyNum : 999999;
          if (aq !== bq) return aq - bq;
          return a.idx - b.idx; // estable
        });
      }
    });

    return arr;
  }, [productosOrdenTebex]);

  const pickSectionImage = (sec) => {
    // imagen representativa: primera que exista
    for (const it of sec.items) {
      const pkg = it.pkg;
      const img = pkg?.image_url || pkg?.image;
      if (img) return img;
    }
    return imgFallback;
  };

  // Modal detalle
  const [productoDetalle, setProductoDetalle] = useState(null);
  const abrirDetalle = (pkg) => setProductoDetalle(pkg);
  const cerrarDetalle = () => setProductoDetalle(null);

  const descHtmlDetalle = useMemo(() => {
    if (!productoDetalle) return "";
    const raw =
      productoDetalle.description ||
      productoDetalle.descripcion ||
      productoDetalle.long_description ||
      productoDetalle.longDescription ||
      "";
    return sanitizeTebexHtml(raw);
  }, [productoDetalle]);

  const nombreDetalle =
    productoDetalle?.name || productoDetalle?.nombre || "Producto";
  const precioDetalle = Number(productoDetalle?.price ?? productoDetalle?.precio ?? 0);

  // Premium benefits modal
  const [modalBeneficiosPremium, setModalBeneficiosPremium] = useState(false);
  const beneficiosPremium = useMemo(
    () => [
      {
        titulo: "Chat, Discord y presencia",
        items: [
          "Prefijo exclusivo en el chat y en la TAB.",
          "Acceso al canal VIP en Discord.",
          "Notificación especial al entrar al servidor.",
          "Comando /nick con colores personalizados.",
        ],
      },
      {
        titulo: "Economía y progresión",
        items: [
          "Acceso a tener más trabajos simultáneos.",
          "+50% de drop de dinero.",
          "x2 recompensas en la piscina AFK.",
          "Bonificaciones exclusivas según modalidad.",
        ],
      },
      {
        titulo: "Comandos y utilidades",
        items: [
          "Comando /sellall para vender ítems.",
          "Comando /nombreitem para renombrar objetos con colores.",
          "Auto-recolección de ítems (/auto).",
        ],
      },
      {
        titulo: "Zonas y extras",
        items: [
          "Mina exclusiva para Premium.",
          "Zona privada (/warp premium).",
          "Extras y cosméticos exclusivos según servidor.",
        ],
      },
      {
        titulo: "Importante",
        items: [
          "Para recibir el paquete, entra al servidor y deja huecos libres en tu inventario.",
          "Los artículos se entregan automáticamente al completar el pago.",
        ],
      },
    ],
    []
  );

  return (
    <div className={`tienda-productos tienda-productos--${slugCat}`}>
      {/* STICKY TOP (Wynncraft feeling) */}
      <div className="tp-top">
        {/* HEADER */}
        <header className="tienda-productos__header">
          <div className="tienda-productos__header-left">
            <div className="tienda-productos__icon" aria-hidden="true">
              <img
                src={headerCopy.icon}
                alt=""
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = imgFallback;
                }}
              />
            </div>

            <div className="tienda-productos__header-text">
              <div className="tienda-productos__title-row">
                <h2 className="tienda-productos__title">
                  {categoria?.name || categoria?.nombre || "Categoría"}
                </h2>

                {isPremium && (
                  <button
                    type="button"
                    className="tienda-productos__pill"
                    onClick={() => setModalBeneficiosPremium(true)}
                    title="Ver beneficios Premium"
                  >
                    Beneficios Premium
                  </button>
                )}
              </div>

              <p className="tienda-productos__desc">{headerCopy.desc}</p>
              <p className="tienda-productos__sub">{headerCopy.sub}</p>
            </div>
          </div>

          <div className="tienda-productos__header-right">
            <button className="tienda-productos__close" onClick={onVolver} type="button">
              <span className="tienda-productos__close-x">×</span>
              <span className="tienda-productos__close-text">Volver</span>
            </button>
          </div>
        </header>

        {/* SUBCATS (más simétricas, dopamínicas) */}
        {subcats.length > 0 && (
          <div className="tp-subcats-wrap">
            <div className="tienda-productos__subcats" role="tablist" aria-label="Subcategorías">
              {subcats.map((sc, idx) => {
                const slug = String(sc.slug || "").toLowerCase();
                const isActive = slug && slug === activeSlug;
                return (
                  <button
                    key={`${slug || sc.id || "sc"}-${sc.id || idx}`}
                    className={`tienda-productos__subcat ${isActive ? "is-active" : ""}`}
                    onClick={() => goToSubcat(sc.slug)}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    title={sc.name || sc.nombre}
                  >
                    <span className="tienda-productos__subcat-label">{sc.name || sc.nombre}</span>
                    {isActive && <span className="tienda-productos__subcat-dot" />}
                    <span className="tienda-productos__subcat-shine" aria-hidden="true" />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* BODY */}
      <section className="tienda-productos__body">
        {secciones.length === 0 ? (
          <div className="tienda-productos__empty">
            <div className="tienda-productos__empty-title">No hay productos disponibles</div>
            <div className="tienda-productos__empty-sub">
              Vuelve más tarde o prueba otra subcategoría.
            </div>
          </div>
        ) : (
          <div className="tp-sections">
            {secciones.map((sec) => {
              const secImg = pickSectionImage(sec);

              return (
                <article className="tp-section" key={sec.key}>
                  <header className="tp-section__head">
                    <h3 className="tp-section__title">{sec.title}</h3>
                  </header>

                  <div className="tp-section__grid">
                    {/* Media tile */}
                    <button
                      type="button"
                      className="tp-media"
                      onClick={() => abrirDetalle(sec.items[0]?.pkg)}
                      title="Ver detalles"
                    >
                      <img
                        src={secImg}
                        alt={sec.title}
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = imgFallback;
                        }}
                      />
                      <span className="tp-media__glow" aria-hidden="true" />
                    </button>

                    {/* Variantes */}
                    {sec.items.map((it) => {
                      const pkg = it.pkg;
                      const id = pkg?.id || pkg?.package_id || `${sec.key}-${it.idx}`;
                      const rawName = pkg?.name || pkg?.nombre || it.rawName || "Producto";

                      const precio = Number(pkg?.precio ?? pkg?.price ?? 0);
                      const precioOriginal = pkg?.precio_original ?? pkg?.original_price ?? null;
                      const originalNum = typeof precioOriginal === "number" ? precioOriginal : null;

                      const pct = originalNum ? calcDiscountPct(originalNum, precio) : null;

                      const precioFmt = `${precio.toFixed(2)} €`;
                      const originalFmt = originalNum != null ? `${originalNum.toFixed(2)} €` : null;

                      const enCarrito = estaEnCarrito(pkg);
                      const qtyLabel = it.qtyLabel || null;

                      return (
                        <div
                          key={id}
                          className={`tp-variant ${enCarrito ? "is-in-cart" : ""}`}
                          onClick={() => abrirDetalle(pkg)}
                          role="button"
                          tabIndex={0}
                          title={rawName}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") abrirDetalle(pkg);
                          }}
                        >
                          {pct ? <div className="tp-variant__pct">-{pct}%</div> : null}

                          <div className="tp-variant__top">
                            <div className="tp-variant__qty">
                              {qtyLabel ? qtyLabel : <span className="tp-variant__qtySmall">Ver</span>}
                            </div>

                            <div className="tp-variant__prices">
                              {originalFmt && (
                                <div className="tp-variant__old">{originalFmt}</div>
                              )}
                              <div className="tp-variant__new">{precioFmt}</div>
                            </div>
                          </div>

                          <button
                            type="button"
                            className="tp-variant__buy"
                            data-state={enCarrito ? "in" : "out"}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleProducto(pkg);
                            }}
                          >
                            <span className="tp-variant__shine" aria-hidden="true" />
                            {enCarrito ? "Quitar" : "Comprar"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* MODAL DETALLE */}
      {productoDetalle && (
        <div className="tienda-modal" onClick={cerrarDetalle}>
          <div
            className="tienda-modal__panel tienda-modal__panel--detallado"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="tienda-modal__close"
              onClick={cerrarDetalle}
              type="button"
              aria-label="Cerrar"
              title="Cerrar"
            >
              ×
            </button>

            <div className="tienda-modal__left">
              <img
                src={productoDetalle.image_url || productoDetalle.image || imgFallback}
                alt={nombreDetalle}
                className="tienda-modal__img"
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = imgFallback;
                }}
              />

              <div className="tienda-modal__left-meta">
                <div className="tienda-modal__price">{precioDetalle.toFixed(2)} €</div>

                <button
                  className="tienda-modal__cta"
                  type="button"
                  onClick={() => {
                    toggleProducto(productoDetalle);
                    cerrarDetalle();
                  }}
                >
                  Añadir al carrito
                </button>

                {isPremium && (
                  <button
                    type="button"
                    className="tienda-modal__ghost"
                    onClick={() => setModalBeneficiosPremium(true)}
                  >
                    Ver beneficios Premium
                  </button>
                )}
              </div>
            </div>

            <div className="tienda-modal__right">
              <h3 className="tienda-modal__title">{nombreDetalle}</h3>

              {descHtmlDetalle ? (
                <div
                  className="tienda-modal__descHTML"
                  dangerouslySetInnerHTML={{ __html: descHtmlDetalle }}
                />
              ) : (
                <p className="tienda-modal__desc">
                  Este paquete se entregará automáticamente en el servidor correspondiente al completar el pago.
                </p>
              )}

              <div className="tienda-modal__hint">
                Consejo: entra al servidor tras la compra y deja huecos libres en el inventario.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL BENEFICIOS PREMIUM */}
      {modalBeneficiosPremium && (
        <div className="tienda-modal" onClick={() => setModalBeneficiosPremium(false)}>
          <div
            className="tienda-modal__panel tienda-modal__panel--beneficios"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="tienda-modal__close"
              onClick={() => setModalBeneficiosPremium(false)}
              type="button"
              aria-label="Cerrar"
              title="Cerrar"
            >
              ×
            </button>

            <div className="tienda-beneficios">
              <div className="tienda-beneficios__head">
                <div className="tienda-beneficios__badge">Premium</div>
                <h3 className="tienda-beneficios__title">Beneficios de Premium</h3>
                <p className="tienda-beneficios__subtitle">
                  Ventajas exclusivas para elevar tu experiencia en FlanCraft.
                </p>
              </div>

              <div className="tienda-beneficios__grid">
                {beneficiosPremium.map((sec) => (
                  <section className="tienda-beneficios__sec" key={sec.titulo}>
                    <h4 className="tienda-beneficios__sec-title">{sec.titulo}</h4>
                    <ul className="tienda-beneficios__list">
                      {sec.items.map((it) => (
                        <li className="tienda-beneficios__item" key={it}>
                          {it}
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>

              <div className="tienda-beneficios__footer">
                <button
                  type="button"
                  className="tienda-beneficios__ok"
                  onClick={() => setModalBeneficiosPremium(false)}
                >
                  Entendido
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TiendaProductosVista;
