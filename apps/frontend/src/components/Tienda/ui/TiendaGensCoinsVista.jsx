// src/components/Tienda/ui/TiendaGensCoinsVista.jsx
import React, { useMemo, useState } from "react";
import {
  getPackageId,
  getPackageName,
  getPackagePrice,
  getPackageImage,
  normalizeProductForCart,
  withCacheBust,
} from "../utils/tiendaHelpers";

import "../../../styles/components/Tienda/tienda-gens-coins.scss";

function formatEur(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(n);
}

function parseMultFromName(name) {
  const s = String(name || "");
  const m = s.match(/x\s*(\d+)/i);
  const n = m ? Number(m[1]) : NaN;
  return Number.isFinite(n) ? n : null;
}

function CoinSvg({ className }) {
  return (
    <svg className={className} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <radialGradient id="g0" cx="30%" cy="25%" r="70%">
          <stop offset="0" stopColor="#fff6d1" stopOpacity="0.95" />
          <stop offset="0.38" stopColor="#ffe08b" stopOpacity="0.55" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffd778" />
          <stop offset="0.55" stopColor="#f2b84a" />
          <stop offset="1" stopColor="#d28a16" />
        </linearGradient>
        <linearGradient id="g2" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5a3610" />
          <stop offset="1" stopColor="#2a1608" />
        </linearGradient>
      </defs>

      <circle cx="32" cy="32" r="28" fill="url(#g2)" />
      <circle cx="32" cy="32" r="24" fill="url(#g1)" />
      <circle cx="32" cy="32" r="18" fill="rgba(0,0,0,0.08)" />
      <circle cx="32" cy="32" r="18" fill="rgba(255,255,255,0.10)" />
      <path
        d="M20 23c6-7 18-7 24 0"
        stroke="rgba(255,255,255,0.28)"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="26" cy="22" r="14" fill="url(#g0)" />
      <path
        d="M38.7 24.6c-1.9-1.7-4.1-2.6-6.7-2.6-4.4 0-7.4 2.3-7.4 5.7 0 2.6 1.6 4.1 5.1 5l3.2.8c2.1.5 2.9 1.2 2.9 2.4 0 1.6-1.6 2.7-4.1 2.7-2.3 0-4.3-.9-6.2-2.6l-2.3 2.7c2.1 2.1 5.0 3.4 8.5 3.7V49h2.6v-3.6c4.5-.6 7.1-3.3 7.1-6.9 0-3.2-1.9-5-6.2-6l-3.3-.8c-1.9-.5-2.7-1-2.7-2.2 0-1.4 1.4-2.4 3.7-2.4 2 0 3.8.7 5.2 1.9l2.1-2.4Z"
        fill="rgba(90,54,16,0.88)"
      />
      <circle cx="32" cy="32" r="24" fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="2" />
    </svg>
  );
}

export default function TiendaGensCoinsVista({
  productos = [],
  carrito = [],
  toggleProducto,
  cacheBust = null,
}) {
  const items = useMemo(() => {
    const arr = Array.isArray(productos) ? [...productos] : [];
    arr.sort((a, b) => {
      const na = parseMultFromName(getPackageName(a)) ?? 9999;
      const nb = parseMultFromName(getPackageName(b)) ?? 9999;
      return na - nb;
    });
    return arr;
  }, [productos]);

  const maxMult = useMemo(() => {
    let m = null;
    for (const p of items) {
      const v = parseMultFromName(getPackageName(p));
      if (v == null) continue;
      if (m == null || v > m) m = v;
    }
    return m;
  }, [items]);

  const [infoOpen, setInfoOpen] = useState(false);

  const inCartQty = (pkg) => {
    const id = getPackageId(pkg);
    const hit = (carrito || []).find((x) => String(x?.id) === String(id));
    const q = Number(hit?.cantidad ?? hit?.quantity ?? 0);
    return Number.isFinite(q) ? q : 0;
  };

  const onBuy = (pkg) => {
    if (!toggleProducto) return;
    toggleProducto(normalizeProductForCart(pkg, 1));
  };

  return (
    <div className="gens-coins">
      <div className="gens-coins__head">
        <div className="gens-coins__headRow">
          <div className="gens-coins__headLeft">
            <div className="gens-coins__title">COINS PARA GENS</div>
            <div className="gens-coins__subtitle">
              Compra Coins para Gens y potencia tu progreso.
            </div>
          </div>

          <button
            type="button"
            className={`gens-coins__infoBtn ${infoOpen ? "is-open" : ""}`}
            onClick={() => setInfoOpen((v) => !v)}
            aria-expanded={infoOpen}
          >
            Información
            <span className="gens-coins__chev" aria-hidden="true" />
          </button>
        </div>

        {infoOpen && (
          <div className="gens-coins__infoGrid">
            <div className="gens-info">
              <div className="gens-info__k">¿Para qué sirven?</div>
              <div className="gens-info__v">
                Moneda premium para mejoras y contenido exclusivo del modo Gens.
              </div>
            </div>
            <div className="gens-info">
              <div className="gens-info__k">Entrega</div>
              <div className="gens-info__v">
                Se acreditan automáticamente al completar la compra.
              </div>
            </div>
            <div className="gens-info">
              <div className="gens-info__k">Nota</div>
              <div className="gens-info__v">
                Si no se actualiza al instante, reconecta al servidor.
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="gens-coins__grid">
        {items.map((p) => {
          const id = getPackageId(p);
          const name = getPackageName(p);
          const price = getPackagePrice(p);
          const img = withCacheBust(getPackageImage(p), cacheBust);

          const mult = parseMultFromName(name);
          const qty = inCartQty(p);

          const isBest = mult != null && maxMult != null && mult === maxMult;
          const isPopular = mult != null && mult === 3;

          return (
            <article className="gc-card" key={String(id ?? name)}>
              {(isBest || isPopular) && (
                <div className={`gc-tag ${isBest ? "gc-tag--best" : "gc-tag--pop"}`}>
                  <span className="gc-tag__txt">{isBest ? "MEJOR VALOR" : "POPULAR"}</span>
                </div>
              )}

              <div className="gc-inner">
                <div className="gc-multBadge" aria-hidden="true">
                  <CoinSvg className="gc-coinSvg" />
                  <span className="gc-mult">{mult != null ? `x${mult}` : ""}</span>
                </div>

                <img className="gc-img" src={img} alt="" draggable="false" loading="lazy" />

                <button
                  type="button"
                  className={`gc-buy ${qty > 0 ? "is-in" : ""}`}
                  onClick={() => onBuy(p)}
                >
                  {qty > 0 ? (
                    <>
                      EN CARRITO <strong>×{qty}</strong>
                    </>
                  ) : (
                    <>
                      COMPRAR por <strong>{formatEur(price)}</strong>
                    </>
                  )}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
