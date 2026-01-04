import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import "../../styles/components/Tienda/tienda-rangos-flancraft.scss";
import { RANGOS_COMPARATIVA } from "./data/rangosComparativa";

function toMoney(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return n;
}

function pickPkgByRank(productos = [], rankKey) {
  const list = Array.isArray(productos) ? productos : [];
  const rx =
    rankKey === "nova"
      ? /\bnova\b/i
      : rankKey === "alpha"
      ? /\balpha\b/i
      : /\binmortal\b/i;

  const matches = list.filter((p) => rx.test(String(p?.name || p?.nombre || "")));
  if (!matches.length) return null;

  const prefer = matches.find((p) =>
    /30\s*(d|dias|días)|mensual|30-day/i.test(String(p?.name || p?.nombre || ""))
  );
  return prefer || matches[0];
}

function isInCart(carrito = [], pkg) {
  const id = pkg?.id ?? pkg?.package_id ?? null;
  if (id == null) return false;
  return (carrito || []).some((it) => String(it?.id ?? it?.package_id) === String(id));
}

const IconStar = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 2.6l2.9 6.2 6.7.7-5 4.4 1.5 6.6L12 17.7 5.9 20.5l1.5-6.6-5-4.4 6.7-.7L12 2.6z" />
  </svg>
);

const IconChevron = ({ open }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" data-open={open ? "1" : "0"}>
    <path d="M7.4 9.1 12 13.7l4.6-4.6 1.4 1.4L12 16.5 6 10.5l1.4-1.4z" />
  </svg>
);

const Check = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M9.2 16.6 4.9 12.3l1.7-1.7 2.6 2.6 7.2-7.2 1.7 1.7-8.9 8.9z" />
  </svg>
);

const Cross = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M18.3 7.1 16.9 5.7 12 10.6 7.1 5.7 5.7 7.1 10.6 12l-4.9 4.9 1.4 1.4 4.9-4.9 4.9 4.9 1.4-1.4L13.4 12l4.9-4.9z" />
  </svg>
);

function Mark({ ok }) {
  return ok ? (
    <span className="fcr-mark fcr-mark--ok" aria-label="Sí">
      <Check />
    </span>
  ) : (
    <span className="fcr-mark fcr-mark--no" aria-label="No">
      <Cross />
    </span>
  );
}

function CellValue({ v }) {
  if (typeof v === "boolean") return <Mark ok={v} />;
  return <span className="fcr-val">{v}</span>;
}

function findScrollParent(el) {
  let node = el?.parentElement;
  while (node) {
    const st = getComputedStyle(node);
    const oy = st.overflowY;
    const canScroll = (oy === "auto" || oy === "scroll") && node.scrollHeight > node.clientHeight + 2;
    if (canScroll) return node;
    node = node.parentElement;
  }
  return null;
}

const RANK_ICONS = {
  nova: "/assets/rangos/nova.webp",
  alpha: "/assets/rangos/alpha.webp",
  inmortal: "/assets/rangos/inmortal.webp",
};

const RANK_BADGES = {
  nova: "https://dunb17ur4ymx4.cloudfront.net/wysiwyg/1447273/4e8cee61a009cdc018aec05c200032ead64e0098.png",
  alpha: "https://dunb17ur4ymx4.cloudfront.net/wysiwyg/1447273/ff375cc6fdecaa80b083b2ccc8b79ac903b1d000.png",
  inmortal: "https://dunb17ur4ymx4.cloudfront.net/wysiwyg/1447273/42ca6ec9013c283d6265fb583b6d8c9bd88cc051.png",
};

export default function TiendaRangosVista({ productos = [], carrito = [], toggleProducto }) {
  const [open, setOpen] = useState(true);
  const [hoverRank, setHoverRank] = useState(null);
  const [collapse, setCollapse] = useState(0);

  const rootRef = useRef(null);
  const mode = "30d";

  const ranks = useMemo(() => {
    const nova = pickPkgByRank(productos, "nova");
    const alpha = pickPkgByRank(productos, "alpha");
    const inmortal = pickPkgByRank(productos, "inmortal");

    const mk = (key, label, ribbon) => {
      const pkg = key === "nova" ? nova : key === "alpha" ? alpha : inmortal;
      const price = toMoney(pkg?.precio ?? pkg?.price);
      const priceLabel = price != null ? `${price.toFixed(2)} €` : "X.XX €";
      return { key, label, ribbon, pkg, priceLabel };
    };

    return [
      mk("nova", "NOVA", null),
      mk("alpha", "ALPHA", "POPULAR"),
      mk("inmortal", "INMORTAL", "BEST"),
    ];
  }, [productos]);

  const perks = useMemo(() => {
    const rows = RANGOS_COMPARATIVA?.[mode] ?? [];
    return rows.map((r) => ({
      perk: r.label,
      hint: r.hint,
      values: {
        nova: r.values?.nova,
        alpha: r.values?.alpha,
        inmortal: r.values?.inmortal,
      },
    }));
  }, [mode]);

  const onEnter = useCallback((k) => setHoverRank(k), []);
  const onLeave = useCallback(() => setHoverRank(null), []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const sp = findScrollParent(root) || window;

    const getRects = () => {
      const rootRect = root.getBoundingClientRect();
      const parentRect = sp === window ? { top: 0 } : sp.getBoundingClientRect();
      return { rootRect, parentRect };
    };

    const onScroll = () => {
      const { rootRect, parentRect } = getRects();
      const start = parentRect.top + 8;
      const dist = start - rootRect.top;
      const t = Math.max(0, Math.min(1, dist / 170));
      setCollapse(t);
    };

    onScroll();

    const target = sp === window ? window : sp;
    target.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      target.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className="fcr"
      data-hover={hoverRank || ""}
      style={{ "--fc-collapse": String(collapse) }}
      onMouseLeave={onLeave}
    >
      <section className="fcr-wrap">
        <div className="fcr-zone">
          {/* Sticky SOLO para tarjetas (nombre + precio) */}
          <div className="fcr-stickyShell">
            <div className="fcr-cards">
              <div className="fcr-spacer" aria-hidden="true" />

              {ranks.map((r) => {
                const inCart = r.pkg ? isInCart(carrito, r.pkg) : false;

                return (
                  <article
                    key={r.key}
                    className={`fcr-card is-${r.key}`}
                    onMouseEnter={() => onEnter(r.key)}
                  >
                    {r.ribbon && (
                      <div
                        className={`fcr-ribbon is-${r.ribbon.toLowerCase()} ${
                          r.ribbon === "BEST" ? "is-right" : ""
                        }`}
                        aria-hidden="true"
                      >
                        <span>{r.ribbon}</span>
                      </div>
                    )}

                    {/* Contenido grande (se apaga al colapsar) */}
                    <div className="fcr-cardInner">
                      <div className="fcr-cardTop">
                        <div className="fcr-emblem" aria-hidden="true">
                          <img
                            className="fcr-emblemImg"
                            src={RANK_ICONS[r.key]}
                            alt=""
                            loading="lazy"
                            draggable="false"
                          />
                        </div>
                        <div className="fcr-rankName">{r.label}</div>
                        <div className="fcr-rankDot" aria-hidden="true" />
                      </div>
                    </div>

                    {/* Contenido mini (aparece al colapsar) */}
                    <div className="fcr-mini" aria-hidden="true">
                      <div className="fcr-miniPlate">{r.label}</div>
                    </div>

                    <button
                      type="button"
                      className={`fcr-buy is-${r.key}`}
                      data-state={inCart ? "in" : "out"}
                      disabled={!r.pkg}
                      onClick={() => r.pkg && toggleProducto(r.pkg)}
                    >
                      {inCart ? "QUITAR DEL CARRITO" : `COMPRAR POR ${r.priceLabel}`}
                    </button>
                  </article>
                );
              })}
            </div>
          </div>

          {/* Global Perks: SOLO desde columnas de rangos (sin tapar PERK) */}
          <div className="fcr-perksRow">
            <div className="fcr-perksSpacer" aria-hidden="true" />
            <button
              type="button"
              className="fcr-perksBar"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
            >
              <span className="fcr-perksCenter">
                <span className="fcr-perksStar" aria-hidden="true">
                  <IconStar />
                </span>
                <span className="fcr-perksTitle">Beneficios Globales</span>
              </span>
              <span className="fcr-perksChevron" aria-hidden="true">
                <IconChevron open={open} />
              </span>
            </button>
          </div>

          {open && (
            <div className="fcr-table" role="table">
              <div className="fcr-row fcr-row--head" role="row">
                <div className="fcr-head fcr-head--perk" role="columnheader">
                  
                </div>

                {ranks.map((r) => (
                  <div
                    key={`head-${r.key}`}
                    className={`fcr-head fcr-head--rank is-${r.key}`}
                    role="columnheader"
                    onMouseEnter={() => onEnter(r.key)}
                  >
                    <img
                      className={`fcr-rankBadge is-${r.key}`}
                      src={RANK_BADGES[r.key]}
                      alt={`${r.label}`}
                      loading="lazy"
                      draggable="false"
                    />
                  </div>
                ))}
              </div>

              {perks.map((row, idx) => (
                <div
                  key={`${row.perk}-${idx}`}
                  className={`fcr-row ${idx % 2 ? "is-alt" : ""}`}
                  role="row"
                >
                  <div className="fcr-perkCell" role="cell">
                    <div className="fcr-perkPill">
                      <div className="fcr-perkTitle">{row.perk}</div>
                      {row.hint && <div className="fcr-perkHint">{row.hint}</div>}
                    </div>
                  </div>

                  <div className="fcr-cell is-nova" role="cell" onMouseEnter={() => onEnter("nova")}>
                    <CellValue v={row.values.nova} />
                  </div>

                  <div className="fcr-cell is-alpha" role="cell" onMouseEnter={() => onEnter("alpha")}>
                    <CellValue v={row.values.alpha} />
                  </div>

                  <div
                    className="fcr-cell is-inmortal"
                    role="cell"
                    onMouseEnter={() => onEnter("inmortal")}
                  >
                    <CellValue v={row.values.inmortal} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
