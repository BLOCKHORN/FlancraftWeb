// apps/frontend/src/components/Tienda/ui/TiendaProductosVista.jsx
import React, { useMemo, useState, useCallback } from "react";
import { resolveProductDetails } from "../details/data/productDetails/index";
import ProductoDetallesModal from "../modals/ProductoDetallesModal";
import ItemOpTooltipTrigger from "../details/ItemOpTooltipTrigger.jsx";
import { withCacheBust } from "../utils/tiendaHelpers";
import "../../../styles/components/Tienda/tienda-productos.scss";

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

  let m = n.match(/\b[xX]\s*([\d.,]+)\b/);
  if (m?.[1]) return Number(m[1].replace(/[^\d]/g, ""));

  m = n.match(/\b([\d.,]+)\s*[xX]\b/);
  if (m?.[1]) return Number(m[1].replace(/[^\d]/g, ""));

  m = n.match(/\bpack(?:\s+de)?\s+(\d+)\b/i);
  if (m?.[1]) return Number(m[1]);

  return null;
}

function extractQtyLabel(name = "") {
  const n = String(name || "");

  let m = n.match(/\b[xX]\s*([\d.,]+)\b/);
  if (m?.[1]) return `x${m[1]}`;

  m = n.match(/\b([\d.,]+)\s*[xX]\b/);
  if (m?.[1]) return `x${m[1]}`;

  const q = extractQtyNumber(name);
  return q ? `x${q}` : null;
}

function normalizeBaseName(name = "") {
  let t = String(name || "");

  t = t.replace(/\b[xX]\s*[\d.,]+\b/g, " ");
  t = t.replace(/\b[\d.,]+\s*[xX]\b/g, " ");
  t = t.replace(/\bpack(?:\s+de)?\s+\d+\b/gi, " ");

  t = t.replace(/[\(\)\[\]]/g, " ");
  t = t.replace(/[-–—|•]+/g, " ");
  t = t.replace(/\s{2,}/g, " ").trim();

  return t || String(name || "").trim() || "Producto";
}

function keyFromBaseName(baseName = "") {
  return stripDiacritics(baseName).toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Sanitiza HTML:
 * - Permite class=""
 * - Elimina scripts/iframes/styles/on*.
 */
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
    "header",
    "section",
    "footer",
    "details",
    "summary",
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
          if (!["href", "target", "rel", "title", "class"].includes(name))
            el.removeAttribute(attr.name);
        } else if (tag === "img") {
          if (!["src", "alt", "title", "class", "loading"].includes(name))
            el.removeAttribute(attr.name);
        } else if (tag === "summary") {
          if (!["title", "class"].includes(name)) el.removeAttribute(attr.name);
        } else {
          if (!["title", "class"].includes(name)) el.removeAttribute(attr.name);
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
    img.setAttribute("loading", img.getAttribute("loading") || "lazy");
  }

  return doc.body.innerHTML;
}

function toMoneyNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function toOptionalNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function calcDiscountPct(original, current) {
  if (!original || !current) return null;
  const o = Number(original);
  const c = Number(current);
  if (!Number.isFinite(o) || !Number.isFinite(c) || o <= 0) return null;
  const pct = Math.round((1 - c / o) * 100);
  return pct > 0 ? pct : null;
}

function discountPctForPkg(pkg) {
  const precio = toMoneyNumber(pkg?.precio ?? pkg?.price ?? 0);
  const originalNum = toOptionalNumber(pkg?.precio_original ?? pkg?.original_price ?? null);
  if (!originalNum) return null;
  return calcDiscountPct(originalNum, precio);
}

/* ===========================
   DATA (details registry)
   =========================== */

function getProductData(pkg, categoria) {
  const id = pkg?.id || pkg?.package_id;
  const rawName = pkg?.name || pkg?.nombre || "";
  const baseName = normalizeBaseName(rawName);

  const slugName = stripDiacritics(baseName)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const catSlug = (categoria?.slug || "").toLowerCase();

  const candidates = [];
  if (id != null) candidates.push(String(id));
  if (slugName) candidates.push(slugName);
  if (catSlug && slugName) candidates.push(`${catSlug}/${slugName}`);
  if (baseName) candidates.push(baseName);
  if (rawName) candidates.push(rawName);
  if (baseName) candidates.push(keyFromBaseName(baseName));

  for (const key of candidates) {
    const d = resolveProductDetails(key);
    if (d) return d;
  }
  return null;
}

function getProductDetailsKey(pkg, categoria) {
  const id = pkg?.id || pkg?.package_id;
  const rawName = pkg?.name || pkg?.nombre || "";
  const baseName = normalizeBaseName(rawName);

  const slugName = stripDiacritics(baseName)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const catSlug = (categoria?.slug || "").toLowerCase();

  const candidates = [];
  if (id != null) candidates.push(String(id));
  if (slugName) candidates.push(slugName);
  if (catSlug && slugName) candidates.push(`${catSlug}/${slugName}`);
  if (baseName) candidates.push(baseName);
  if (rawName) candidates.push(rawName);
  if (baseName) candidates.push(keyFromBaseName(baseName));

  for (const k of candidates) {
    if (resolveProductDetails(k)) return k;
  }
  return null;
}

/** ✅ Detecta detalles que vienen como componente React */
function getDetailsComponent(data) {
  if (!data) return null;
  const Comp = data?.component || data?.Component || data?.render || null;
  return typeof Comp === "function" ? Comp : null;
}

/**
 * Devuelve:
 * - data: objeto del registry si existe
 * - html: descripción html saneada (registry o tebex)
 * - hasDetails: true si hay algo que mostrar (mc_menu o html o componente)
 * - kind: "mc_menu" | "html" | "component"
 * - Comp: componente si aplica
 */
function buildDetails(pkg, categoria) {
  const data = getProductData(pkg, categoria);
  const Comp = getDetailsComponent(data);

  // ✅ Caso: componente (llaves, etc.)
  if (Comp) {
    return { data, html: "", hasDetails: true, kind: "component", Comp };
  }

  // ✅ Caso: menús MC
  if (data?.type === "mc_menu") {
    return { data, html: "", hasDetails: true, kind: "mc_menu", Comp: null };
  }

  // ✅ Caso: HTML (registry o tebex)
  const fallbackDesc = pkg?.description || pkg?.descripcion || pkg?.desc || "";
  const htmlRaw = data?.html ?? data?.descripcion ?? fallbackDesc ?? "";
  const html = sanitizeTebexHtml(htmlRaw);

  return { data, html, hasDetails: Boolean(html), kind: "html", Comp: null };
}

function isItemsOpTheme(data) {
  const t = String(data?.theme || "").trim().toLowerCase();
  return t === "itemsop" || t === "items-op" || t === "items_op";
}

/* ===========================
   COMPONENTE
   =========================== */

const TiendaProductosVista = ({
  server,
  productos = [],
  categoria,
  carrito = [],
  toggleProducto,
  subcategoriaSeleccionadaURL,
  embedMode = false,
  cacheBust = null,
}) => {
  const slugCat = (categoria?.slug || "generic").toLowerCase();
  const imgFallback = "/assets/tienda/producto-placeholder.png";

  const productosOrdenTebex = useMemo(
    () => (Array.isArray(productos) ? productos : []),
    [productos]
  );

  const bust = cacheBust ?? productosOrdenTebex?.[0]?.__cacheBust ?? null;
  const getImg = useCallback((url) => withCacheBust(url || "", bust), [bust]);

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
      const qtyCount = sec.items.filter((it) => typeof it.qtyNum === "number").length;
      const hasQty = qtyCount >= 2;

      if (hasQty) {
        sec.items.sort((a, b) => {
          const aq = typeof a.qtyNum === "number" ? a.qtyNum : Number.POSITIVE_INFINITY;
          const bq = typeof b.qtyNum === "number" ? b.qtyNum : Number.POSITIVE_INFINITY;
          if (aq !== bq) return aq - bq;
          return a.idx - b.idx;
        });
      }
    });

    return arr.map((sec) => {
      const variantsCount = sec.items.length;
      const numConCantidad = sec.items.filter((it) => typeof it.qtyNum === "number").length;
      const isStackSection = numConCantidad >= 3 && variantsCount >= 4;
      return { ...sec, isStackSection };
    });
  }, [productosOrdenTebex]);

  const pickSectionImage = (sec) => {
    for (const it of sec.items) {
      const img = it.pkg?.image_url || it.pkg?.image || it.pkg?.imageUrl || "";
      if (img) return getImg(img);
    }
    return getImg(imgFallback);
  };

  const estaEnCarrito = (pkg) => {
    const id = pkg?.id || pkg?.package_id;
    return carrito.some((p) => {
      const pid = p?.id || p?.package_id;
      return String(pid) === String(id);
    });
  };

  const emitFlyToBasket = (e, img) => {
    try {
      if (!img) return;

      const btn = e?.currentTarget;
      const host =
        btn?.closest(".tp-card") ||
        btn?.closest(".tp-stack-card") ||
        btn?.closest(".tp-variant") ||
        btn?.closest("article") ||
        btn?.closest("div");

      const imgEl = host?.querySelector?.("img") || btn?.querySelector?.("img") || null;
      const rect = (imgEl || btn)?.getBoundingClientRect?.();
      if (!rect) return;

      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;

      document.dispatchEvent(
        new CustomEvent("tienda:fly", {
          detail: { img, rect: { x, y } },
        })
      );
    } catch {
      // no-op
    }
  };

  /* ===========================
     MODAL DETALLES (solo NO-itemsop)
     ✅ Ahora soporta:
       - type mc_menu
       - html
       - react component (llaves)
     =========================== */
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsTitle, setDetailsTitle] = useState("Detalles");
  const [detailsHtml, setDetailsHtml] = useState("");
  const [detailsContent, setDetailsContent] = useState(null);

  const openDetalles = useCallback(
    (pkg, rawNameForTitle = "Detalles") => {
      const { data, html, hasDetails, kind, Comp } = buildDetails(pkg, categoria);

      if (!hasDetails && !data) return;
      if (isItemsOpTheme(data)) return;

      // ✅ Caso MC Menu
      if (kind === "mc_menu" && data?.type === "mc_menu") {
        setDetailsTitle((data?.name || rawNameForTitle || "Detalles").trim());
        setDetailsContent(data);
        setDetailsHtml("");
        setDetailsOpen(true);
        return;
      }

      // ✅ Caso componente React (llaves)
      if (kind === "component" && Comp) {
        const title = (data?.name || data?.titulo || data?.title || rawNameForTitle || "Detalles").trim();

        setDetailsTitle(title);
        setDetailsHtml("");

        // Pasamos un content “estándar” para que el modal lo pinte
        setDetailsContent({
          type: "react_component",
          Comp,
          props: { ...(data?.props || {}) },
          pkg,
        });

        setDetailsOpen(true);
        return;
      }

      // ✅ Caso HTML
      const title = (data?.titulo || data?.title || data?.name || rawNameForTitle || "Detalles").trim();
      setDetailsTitle(title);
      setDetailsHtml(html || "");
      setDetailsContent(null);
      setDetailsOpen(true);
    },
    [categoria]
  );

  const onOpenFromMedia = (e, pkg, rawName, canOpen, isItemsOp) => {
    if (!canOpen) return;
    e?.stopPropagation?.();
    if (isItemsOp) return;
    openDetalles(pkg, rawName);
  };

  return (
    <div className={`tienda-productos tienda-productos--${slugCat} ${embedMode ? "tp-embed" : ""}`}>
      <ProductoDetallesModal
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        title={detailsTitle}
        html={detailsHtml}
        content={detailsContent}
      />

      <section className="tienda-productos__body">
        {secciones.length === 0 ? (
          <div className="tienda-productos__empty">
            <div className="tienda-productos__empty-card">
              <div className="tienda-productos__empty-title">No hay productos disponibles</div>
              <div className="tienda-productos__empty-sub">Vuelve más tarde o prueba otra subcategoría.</div>
            </div>
          </div>
        ) : (
          <div className="tp-flow">
            {secciones.map((sec) => {
              const secImg = pickSectionImage(sec);
              const variantsCount = sec.items.length;
              const isStackSection = sec.isStackSection;

              const secDiscountPctRaw = sec.items.reduce((max, it) => {
                const d = discountPctForPkg(it.pkg);
                return d && d > max ? d : max;
              }, 0);
              const secDiscountPct = secDiscountPctRaw || null;

              // ============ STACK (dinero / xp) ============
              if (isStackSection) {
                return (
                  <article className="tp-section tp-section--stack tp-flow__full" key={sec.key}>
                    <div className="tp-stack-layout">
                      <div className="tp-stack-hero">
                        <div className="tp-stack-hero__imgwrap">
                          {secDiscountPct && (
                            <div className="tp-discount-badge tp-discount-badge--hero">-{secDiscountPct}%</div>
                          )}
                          <img
                            src={secImg}
                            alt={sec.title}
                            loading="lazy"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = getImg(imgFallback);
                            }}
                          />
                          <span className="tp-stack-hero__glow" aria-hidden="true" />
                        </div>

                        <div className="tp-nameplate tp-nameplate--hero">
                          <span className="tp-nameplate__text">{sec.title}</span>
                        </div>
                      </div>

                      <div className="tp-stack-grid">
                        {sec.items.map((it) => {
                          const pkg = it.pkg;
                          const id = pkg?.id || pkg?.package_id || `${sec.key}-${it.idx}`;
                          const rawName = pkg?.name || pkg?.nombre || it.rawName || "Producto";

                          const precio = toMoneyNumber(pkg?.precio ?? pkg?.price ?? 0);
                          const originalNum = toOptionalNumber(pkg?.precio_original ?? pkg?.original_price ?? null);

                          const precioFmt = `${precio.toFixed(2)} €`;
                          const originalFmt = originalNum != null ? `${originalNum.toFixed(2)} €` : null;

                          const enCarrito = estaEnCarrito(pkg);

                          const qtyLabel =
                            it.qtyLabel || (typeof it.qtyNum === "number" ? `x${it.qtyNum}` : rawName);

                          const { hasDetails, data } = buildDetails(pkg, categoria);
                          const isItemsOp = isItemsOpTheme(data);
                          const detailsKey = isItemsOp ? getProductDetailsKey(pkg, categoria) : null;

                          const flyBase = pkg?.image_url || pkg?.image || pkg?.imageUrl || secImg || imgFallback;
                          const flyImg = getImg(flyBase);

                          return (
                            <article key={id} className={`tp-stack-card ${enCarrito ? "is-in-cart" : ""}`} title={rawName}>
                              <div className="tp-nameplate tp-nameplate--qty">
                                <span className="tp-nameplate__text">{qtyLabel}</span>
                              </div>

                              <div className="tp-pricebox">
                                {originalFmt ? (
                                  <div className="tp-pricebox__old">
                                    <span className="tp-pricebox__label">Antes</span>
                                    <span className="tp-pricebox__value">{originalFmt}</span>
                                  </div>
                                ) : (
                                  <div className="tp-pricebox__spacer" />
                                )}
                              </div>

                              <button
                                type="button"
                                className="tp-variant__buy tp-stack-card__btn"
                                data-state={enCarrito ? "in" : "out"}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!enCarrito) emitFlyToBasket(e, flyImg);
                                  toggleProducto(pkg);
                                }}
                              >
                                <span className="tp-variant__shine" aria-hidden="true" />
                                {enCarrito ? "Quitar del carrito" : `Comprar por ${precioFmt}`}
                              </button>

                              {hasDetails && !isItemsOp && (
                                <button
                                  type="button"
                                  className="tp-card__details tp-stack-card__details"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openDetalles(pkg, rawName);
                                  }}
                                  title="Ver detalles"
                                >
                                  <span className="tp-card__details-label">Ver detalles</span>
                                  <span className="tp-card__chevron" aria-hidden="true" />
                                </button>
                              )}

                              {hasDetails && isItemsOp && detailsKey && (
                                <ItemOpTooltipTrigger detailsKey={detailsKey}>
                                  <button type="button" className="tp-card__details tp-stack-card__details" title="Ver detalles">
                                    <span className="tp-card__details-label">Ver detalles</span>
                                    <span className="tp-card__chevron" aria-hidden="true" />
                                  </button>
                                </ItemOpTooltipTrigger>
                              )}
                            </article>
                          );
                        })}
                      </div>
                    </div>
                  </article>
                );
              }

              // ============ MULTI VARIANT (sección normal) ============
              if (variantsCount > 1) {
                let gridClasses = "tp-section__grid";
                if (variantsCount === 2) gridClasses += " tp-section__grid--two";
                else gridClasses += " tp-section__grid--three";

                return (
                  <article className="tp-section tp-flow__full" key={sec.key}>
                    <div className={gridClasses}>
                      <div className="tp-media">
                        <div className="tp-media__imgwrap">
                          {secDiscountPct && (
                            <div className="tp-discount-badge tp-discount-badge--hero">-{secDiscountPct}%</div>
                          )}
                          <img
                            src={secImg}
                            alt={sec.title}
                            loading="lazy"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = getImg(imgFallback);
                            }}
                          />
                          <span className="tp-media__glow" aria-hidden="true" />
                        </div>

                        <div className="tp-nameplate tp-nameplate--hero">
                          <span className="tp-nameplate__text">{sec.title}</span>
                        </div>
                      </div>

                      {sec.items.map((it) => {
                        const pkg = it.pkg;
                        const id = pkg?.id || pkg?.package_id || `${sec.key}-${it.idx}`;
                        const rawName = pkg?.name || pkg?.nombre || it.rawName || "Producto";

                        const precio = toMoneyNumber(pkg?.precio ?? pkg?.price ?? 0);
                        const originalNum = toOptionalNumber(pkg?.precio_original ?? pkg?.original_price ?? null);

                        const precioFmt = `${precio.toFixed(2)} €`;
                        const originalFmt = originalNum != null ? `${originalNum.toFixed(2)} €` : null;

                        const enCarrito = estaEnCarrito(pkg);

                        const { hasDetails, data } = buildDetails(pkg, categoria);
                        const isItemsOp = isItemsOpTheme(data);
                        const detailsKey = isItemsOp ? getProductDetailsKey(pkg, categoria) : null;

                        const flyBase = pkg?.image_url || pkg?.image || pkg?.imageUrl || secImg || imgFallback;
                        const flyImg = getImg(flyBase);

                        return (
                          <div key={id} className={`tp-variant ${enCarrito ? "is-in-cart" : ""}`} title={rawName}>
                            <div className="tp-variant__center">
                              <div className="tp-nameplate tp-nameplate--name">
                                <span className="tp-nameplate__text">{rawName}</span>
                              </div>

                              <div className="tp-pricebox">
                                {originalFmt ? (
                                  <div className="tp-pricebox__old">
                                    <span className="tp-pricebox__label">Antes</span>
                                    <span className="tp-pricebox__value">{originalFmt}</span>
                                  </div>
                                ) : (
                                  <div className="tp-pricebox__spacer" />
                                )}
                              </div>
                            </div>

                            <div className="tp-variant__actions">
                              <button
                                type="button"
                                className="tp-variant__buy"
                                data-state={enCarrito ? "in" : "out"}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!enCarrito) emitFlyToBasket(e, flyImg);
                                  toggleProducto(pkg);
                                }}
                              >
                                <span className="tp-variant__shine" aria-hidden="true" />
                                {enCarrito ? "Quitar del carrito" : `Comprar por ${precioFmt}`}
                              </button>

                              {hasDetails && !isItemsOp && (
                                <button
                                  type="button"
                                  className="tp-card__details tp-variant__details-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openDetalles(pkg, rawName);
                                  }}
                                  title="Ver detalles"
                                >
                                  <span className="tp-card__details-label">Ver detalles</span>
                                  <span className="tp-card__chevron" aria-hidden="true" />
                                </button>
                              )}

                              {hasDetails && isItemsOp && detailsKey && (
                                <ItemOpTooltipTrigger detailsKey={detailsKey}>
                                  <button type="button" className="tp-card__details tp-variant__details-btn" title="Ver detalles">
                                    <span className="tp-card__details-label">Ver detalles</span>
                                    <span className="tp-card__chevron" aria-hidden="true" />
                                  </button>
                                </ItemOpTooltipTrigger>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </article>
                );
              }

              // ============ SINGLE (card simple) ============
              const first = sec.items[0];
              const pkg = first?.pkg;
              const id = pkg?.id || pkg?.package_id || `${sec.key}-${first?.idx ?? 0}`;
              const rawName = pkg?.name || pkg?.nombre || first?.rawName || sec.title || "Producto";

              const precio = toMoneyNumber(pkg?.precio ?? pkg?.price ?? 0);
              const originalNum = toOptionalNumber(pkg?.precio_original ?? pkg?.original_price ?? null);

              const cardDiscountPct = discountPctForPkg(pkg);

              const precioFmt = `${precio.toFixed(2)} €`;
              const originalFmt = originalNum != null ? `${originalNum.toFixed(2)} €` : null;

              const enCarrito = estaEnCarrito(pkg);

              const { hasDetails, data } = buildDetails(pkg, categoria);
              const isItemsOp = isItemsOpTheme(data);
              const detailsKey = isItemsOp ? getProductDetailsKey(pkg, categoria) : null;

              const flyBase = pkg?.image_url || pkg?.image || pkg?.imageUrl || secImg || imgFallback;
              const flyImg = getImg(flyBase);

              return (
                <article key={id} className={`tp-card ${enCarrito ? "is-in-cart" : ""} ${isItemsOp ? "is-itemsop" : ""}`}>
                  {!isItemsOp ? (
                    <div
                      className={`tp-card__imgwrap ${hasDetails ? "is-clickable" : ""}`}
                      onClick={(e) => onOpenFromMedia(e, pkg, rawName, hasDetails, false)}
                      title={hasDetails ? "Ver detalles" : rawName}
                      role={hasDetails ? "button" : undefined}
                      tabIndex={hasDetails ? 0 : undefined}
                      onKeyDown={(e) => {
                        if (!hasDetails) return;
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          openDetalles(pkg, rawName);
                        }
                      }}
                    >
                      {cardDiscountPct && (
                        <div className="tp-discount-badge tp-discount-badge--hero">-{cardDiscountPct}%</div>
                      )}
                      <img
                        src={secImg}
                        alt={rawName}
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = getImg(imgFallback);
                        }}
                      />
                    </div>
                  ) : (
                    <ItemOpTooltipTrigger detailsKey={detailsKey || rawName}>
                      <div
                        className="tp-card__imgwrap"
                        title="Ver stats del item"
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            e.currentTarget.click();
                          }
                        }}
                      >
                        {cardDiscountPct && (
                          <div className="tp-discount-badge tp-discount-badge--hero">-{cardDiscountPct}%</div>
                        )}
                        <span className="tp-itemsopMark" aria-hidden="true" />
                        <img
                          src={secImg}
                          alt={rawName}
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = getImg(imgFallback);
                          }}
                        />
                      </div>
                    </ItemOpTooltipTrigger>
                  )}

                  <div className="tp-card__body">
                    <div className="tp-nameplate tp-nameplate--name">
                      <span className="tp-nameplate__text">{rawName}</span>
                    </div>

                    <div className="tp-pricebox">
                      {originalFmt ? (
                        <div className="tp-pricebox__old">
                          <span className="tp-pricebox__label">Antes</span>
                          <span className="tp-pricebox__value">{originalFmt}</span>
                        </div>
                      ) : (
                        <div className="tp-pricebox__spacer" />
                      )}
                    </div>
                  </div>

                  <div className="tp-card__actions">
                    <button
                      type="button"
                      className="tp-variant__buy tp-card__buy"
                      data-state={enCarrito ? "in" : "out"}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!enCarrito) emitFlyToBasket(e, flyImg);
                        toggleProducto(pkg);
                      }}
                    >
                      <span className="tp-variant__shine" aria-hidden="true" />
                      {enCarrito ? "Quitar del carrito" : `Comprar por ${precioFmt}`}
                    </button>

                    {hasDetails && !isItemsOp && (
                      <button
                        type="button"
                        className="tp-card__details"
                        onClick={(e) => {
                          e.stopPropagation();
                          openDetalles(pkg, rawName);
                        }}
                        title="Ver detalles"
                      >
                        <span className="tp-card__details-label">Ver detalles</span>
                        <span className="tp-card__chevron" aria-hidden="true" />
                      </button>
                    )}

                    {hasDetails && isItemsOp && detailsKey && (
                      <ItemOpTooltipTrigger detailsKey={detailsKey}>
                        <button type="button" className="tp-card__details" title="Ver detalles">
                          <span className="tp-card__details-label">Ver detalles</span>
                          <span className="tp-card__chevron" aria-hidden="true" />
                        </button>
                      </ItemOpTooltipTrigger>
                    )}
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
