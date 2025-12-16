import React, { useMemo, useState } from "react";
import "../../styles/components/Tienda/tienda-productos.scss";

/* ===========================
   Helpers: qty + grouping + HTML
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
    return String(s || "");
  }
}

/**
 * Extrae un número de cantidad desde el nombre:
 *  - "x2.500"  -> 2500
 *  - "2.500x"  -> 2500
 *  - "Pack de 5" -> 5
 */
function extractQtyNumber(name = "") {
  const n = String(name || "");

  // x2.500 / x 2.500
  let m = n.match(/\b[xX]\s*([\d.,]+)\b/);
  if (m?.[1]) return Number(m[1].replace(/[^\d]/g, ""));

  // 2.500x / 2.500 x
  m = n.match(/\b([\d.,]+)\s*[xX]\b/);
  if (m?.[1]) return Number(m[1].replace(/[^\d]/g, ""));

  // Pack de 5
  m = n.match(/\bpack(?:\s+de)?\s+(\d+)\b/i);
  if (m?.[1]) return Number(m[1]);

  return null;
}

function extractQtyLabel(name = "") {
  const n = String(name || "");

  // Conservamos el formato original si existe (x2.500 / 2.500x)
  let m = n.match(/\b[xX]\s*([\d.,]+)\b/);
  if (m?.[1]) return `x${m[1]}`;

  m = n.match(/\b([\d.,]+)\s*[xX]\b/);
  if (m?.[1]) return `x${m[1]}`;

  const q = extractQtyNumber(name);
  return q ? `x${q}` : null;
}

function normalizeBaseName(name = "") {
  let t = String(name || "");

  // Quitamos cantidades "x2.500", "2000x", "Pack de 5", etc.
  t = t.replace(/\b[xX]\s*[\d.,]+\b/g, " ");
  t = t.replace(/\b[\d.,]+\s*[xX]\b/g, " ");
  t = t.replace(/\bpack(?:\s+de)?\s+\d+\b/gi, " ");

  // Quitamos adornos de paréntesis / guiones
  t = t.replace(/[\(\)\[\]]/g, " ");
  t = t.replace(/[-–—|•]+/g, " ");
  t = t.replace(/\s{2,}/g, " ").trim();

  return t || String(name || "").trim() || "Producto";
}

function keyFromBaseName(baseName = "") {
  return stripDiacritics(baseName).toLowerCase().replace(/\s+/g, " ").trim();
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
  if (!original || !current) return null;
  const o = Number(original);
  const c = Number(current);
  if (!Number.isFinite(o) || !Number.isFinite(c) || o <= 0) return null;
  const pct = Math.round((1 - c / o) * 100);
  return pct > 0 ? pct : null;
}

const TiendaProductosVista = ({
  server,
  productos = [],
  categoria,
  carrito = [],
  toggleProducto,
  subcategoriaSeleccionadaURL,
  embedMode = false,
}) => {
  const slugCat = (categoria?.slug || "generic").toLowerCase();
  const imgFallback = "/assets/tienda/producto-placeholder.png";

  const productosOrdenTebex = useMemo(
    () => (Array.isArray(productos) ? productos : []),
    [productos]
  );

  // Agrupar por nombre base (manteniendo orden)
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

    arr.forEach((sec) => {
      const hasQty =
        sec.items.filter((it) => typeof it.qtyNum === "number").length >= 2;
      if (hasQty) {
        sec.items.sort((a, b) => {
          const aq = typeof a.qtyNum === "number" ? a.qtyNum : 999999;
          const bq = typeof b.qtyNum === "number" ? b.qtyNum : 999999;
          if (aq !== bq) return aq - bq;
          return a.idx - b.idx;
        });
      }
    });

    return arr;
  }, [productosOrdenTebex]);

  const pickSectionImage = (sec) => {
    for (const it of sec.items) {
      const img = it.pkg?.image_url || it.pkg?.image;
      if (img) return img;
    }
    return imgFallback;
  };

  const estaEnCarrito = (pkg) => {
    const id = pkg?.id || pkg?.package_id;
    return carrito.some((p) => String(p?.id) === String(id));
  };

  // Acordeón por sección
  const [openSectionKey, setOpenSectionKey] = useState(null);

  const toggleSection = (key) => {
    setOpenSectionKey((prev) => (prev === key ? null : key));
  };

  return (
    <div
      className={`tienda-productos tienda-productos--${slugCat} ${
        embedMode ? "tp-embed" : ""
      }`}
    >
      <section className="tienda-productos__body">
        {secciones.length === 0 ? (
          <div className="tienda-productos__empty">
            <div className="tienda-productos__empty-title">
              No hay productos disponibles
            </div>
            <div className="tienda-productos__empty-sub">
              Vuelve más tarde o prueba otra subcategoría.
            </div>
          </div>
        ) : (
          <div className="tp-sections">
            {secciones.map((sec) => {
              const secImg = pickSectionImage(sec);
              const variantsCount = sec.items.length;

              let sectionClasses = "tp-section";
              let gridClasses = "tp-section__grid";

              if (variantsCount === 1) {
                sectionClasses += " tp-section--single";
                gridClasses += " tp-section__grid--one";
              } else if (variantsCount === 2) {
                gridClasses += " tp-section__grid--two";
              } else {
                gridClasses += " tp-section__grid--three";
              }

              const isOpen = openSectionKey === sec.key;

              // Descripción común de la sección (del primer paquete)
              const firstPkg = sec.items[0]?.pkg || {};
              const rawDesc =
                firstPkg.description ||
                firstPkg.descripcion ||
                firstPkg.long_description ||
                firstPkg.longDescription ||
                "";
              const descHtml = rawDesc
                ? sanitizeTebexHtml(rawDesc)
                : sanitizeTebexHtml(
                    "Este paquete se entregará automáticamente en el servidor correspondiente al completar el pago."
                  );

              // ¿Es una sección tipo "stacks" (Dinero, XP, etc.)?
              const numConCantidad = sec.items.filter(
                (it) => typeof it.qtyNum === "number"
              ).length;
              const isStackSection = numConCantidad >= 3 && variantsCount >= 4;

              /* ===========================
                 STACK SECTION (dinero / xp)
                 =========================== */
              if (isStackSection) {
                return (
                  <article
                    className={`${sectionClasses} tp-section--stack`}
                    key={sec.key}
                  >
                    <div className="tp-stack-layout">
                      {/* HERO IZQUIERDA */}
                      <div
                        className={`tp-stack-hero ${
                          isOpen ? "is-open" : ""
                        }`}
                      >
                        <div className="tp-stack-hero__imgwrap">
                          <img
                            src={secImg}
                            alt={sec.title}
                            loading="lazy"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = imgFallback;
                            }}
                          />
                          <span
                            className="tp-stack-hero__glow"
                            aria-hidden="true"
                          />
                        </div>

                        <div className="tp-stack-hero__title">
                          {sec.title}
                        </div>

                        <button
                          type="button"
                          className="tp-stack-hero__details"
                          onClick={() => toggleSection(sec.key)}
                        >
                          <span className="tp-stack-hero__details-label">
                            {isOpen ? "Ocultar detalles" : "Ver detalles"}
                          </span>
                          <span
                            className="tp-stack-hero__chevron"
                            aria-hidden="true"
                          />
                        </button>
                      </div>

                      {/* GRID DE STACKS A LA DERECHA */}
                      <div className="tp-stack-grid">
                        {sec.items.map((it) => {
                          const pkg = it.pkg;
                          const id =
                            pkg?.id ||
                            pkg?.package_id ||
                            `${sec.key}-${it.idx}`;
                          const rawName =
                            pkg?.name || pkg?.nombre || it.rawName || "Producto";

                          const precio = Number(
                            pkg?.precio ?? pkg?.price ?? 0
                          );
                          const precioOriginal =
                            pkg?.precio_original ??
                            pkg?.original_price ??
                            null;
                          const originalNum =
                            typeof precioOriginal === "number"
                              ? precioOriginal
                              : null;

                          const pct = originalNum
                            ? calcDiscountPct(originalNum, precio)
                            : null;
                          const precioFmt = `${precio.toFixed(2)} €`;
                          const originalFmt =
                            originalNum != null
                              ? `${originalNum.toFixed(2)} €`
                              : null;

                          const enCarrito = estaEnCarrito(pkg);

                          const qtyLabel =
                            it.qtyLabel ||
                            (typeof it.qtyNum === "number"
                              ? `x${it.qtyNum}`
                              : rawName);

                          return (
                            <article
                              key={id}
                              className={`tp-stack-card ${
                                enCarrito ? "is-in-cart" : ""
                              }`}
                              title={rawName}
                            >
                              {pct ? (
                                <div className="tp-stack-card__pct">
                                  -{pct}%
                                </div>
                              ) : null}

                              <div className="tp-stack-card__qty">
                                {qtyLabel}
                              </div>

                              {originalFmt && (
                                <div className="tp-stack-card__old">
                                  Antes {originalFmt}
                                </div>
                              )}

                              <div className="tp-stack-card__price">
                                {precioFmt}
                              </div>

                              <button
                                type="button"
                                className="tp-variant__buy tp-stack-card__btn"
                                data-state={enCarrito ? "in" : "out"}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleProducto(pkg);
                                }}
                              >
                                <span
                                  className="tp-variant__shine"
                                  aria-hidden="true"
                                />
                                {enCarrito
                                  ? "Quitar del carrito"
                                  : "Comprar"}
                              </button>
                            </article>
                          );
                        })}
                      </div>
                    </div>

                    {/* DESCRIPCIÓN / ACORDEÓN */}
                    <div
                      className={`tp-section__accordion ${
                        isOpen ? "tp-section__accordion--open" : ""
                      }`}
                      aria-hidden={!isOpen}
                    >
                      <div
                        className="tp-section__descHTML"
                        dangerouslySetInnerHTML={{ __html: descHtml }}
                      />
                    </div>
                  </article>
                );
              }

              /* ===========================
                 SECCIÓN NORMAL
                 =========================== */
              return (
                <article className={sectionClasses} key={sec.key}>
                  <div className={gridClasses}>
                    {/* COLUMNA MEDIA: imagen + título + botón detalles */}
                    <div className={`tp-media ${isOpen ? "is-open" : ""}`}>
                      <div className="tp-media__imgwrap">
                        <img
                          src={secImg}
                          alt={sec.title}
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = imgFallback;
                          }}
                        />
                        <span
                          className="tp-media__glow"
                          aria-hidden="true"
                        />
                      </div>

                      <div className="tp-media__title">{sec.title}</div>

                      <button
                        type="button"
                        className="tp-media__details"
                        onClick={() => toggleSection(sec.key)}
                      >
                        <span className="tp-media__details-label">
                          {isOpen ? "Ocultar detalles" : "Ver detalles"}
                        </span>
                        <span
                          className="tp-media__chevron"
                          aria-hidden="true"
                        />
                      </button>
                    </div>

                    {/* VARIANTES */}
                    {sec.items.map((it) => {
                      const pkg = it.pkg;
                      const id =
                        pkg?.id ||
                        pkg?.package_id ||
                        `${sec.key}-${it.idx}`;
                      const rawName =
                        pkg?.name || pkg?.nombre || it.rawName || "Producto";

                      const precio = Number(
                        pkg?.precio ?? pkg?.price ?? 0
                      );
                      const precioOriginal =
                        pkg?.precio_original ??
                        pkg?.original_price ??
                        null;
                      const originalNum =
                        typeof precioOriginal === "number"
                          ? precioOriginal
                          : null;

                      const pct = originalNum
                        ? calcDiscountPct(originalNum, precio)
                        : null;
                      const precioFmt = `${precio.toFixed(2)} €`;
                      const originalFmt =
                        originalNum != null
                          ? `${originalNum.toFixed(2)} €`
                          : null;

                      const enCarrito = estaEnCarrito(pkg);

                      return (
                        <div
                          key={id}
                          className={`tp-variant ${
                            enCarrito ? "is-in-cart" : ""
                          }`}
                          title={rawName}
                        >
                          {pct ? (
                            <div className="tp-variant__pct">
                              -{pct}%
                            </div>
                          ) : null}

                          <div className="tp-variant__center">
                            <div className="tp-variant__name">
                              {rawName}
                            </div>
                            {originalFmt && (
                              <div className="tp-variant__oldline">
                                Antes {originalFmt}
                              </div>
                            )}
                          </div>

                          <div className="tp-variant__actions">
                            <button
                              type="button"
                              className="tp-variant__buy"
                              data-state={enCarrito ? "in" : "out"}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleProducto(pkg);
                              }}
                            >
                              <span
                                className="tp-variant__shine"
                                aria-hidden="true"
                              />
                              {enCarrito
                                ? "Quitar del carrito"
                                : `Comprar por ${precioFmt}`}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* DESPLEGABLE DE LA SECCIÓN (debajo de todo el artículo) */}
                  <div
                    className={`tp-section__accordion ${
                      isOpen ? "tp-section__accordion--open" : ""
                    }`}
                    aria-hidden={!isOpen}
                  >
                    <div
                      className="tp-section__descHTML"
                      dangerouslySetInnerHTML={{ __html: descHtml }}
                    />
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default TiendaProductosVista;
