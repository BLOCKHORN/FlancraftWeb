import React, { useEffect, useMemo, useState } from "react";
import "../../styles/components/Tienda/tienda-oferta-countdown.scss";

const API_BASE =
  import.meta.env.VITE_BACKEND_URL || "https://flancraft-backend.onrender.com";

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function pad2(n, len = 2) {
  return String(n).padStart(len, "0");
}

function partsFromMs(ms) {
  const total = Math.floor(Math.max(0, ms) / 1000);
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return { d, h, m, s };
}

async function fetchSale() {
  try {
    const isDev = import.meta.env.DEV;
    const refresh = isDev ? "?refresh=1" : "";
    const res = await fetch(`${API_BASE}/api/tebex/sale${refresh}`);
    if (!res.ok) return null;
    const json = await res.json();
    if (!json?.ok || !json?.active || !json?.sale?.expire) return null;
    return json.sale;
  } catch {
    return null;
  }
}

export default function TiendaOfertaCountdown() {
  const [sale, setSale] = useState(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let alive = true;
    (async () => {
      const s = await fetchSale();
      if (!alive) return;
      setSale(s);
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!sale?.expire) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [sale?.expire]);

  const msLeft = useMemo(() => {
    if (!sale?.expire) return 0;
    return sale.expire * 1000 - now;
  }, [sale?.expire, now]);

  const { d, h, m, s } = useMemo(() => partsFromMs(msLeft), [msLeft]);

  const progress = useMemo(() => {
    const start = Number(sale?.start || 0);
    const expire = Number(sale?.expire || 0);
    if (!start || !expire || expire <= start) return 0;
    const nowSec = Math.floor(now / 1000);
    return clamp((nowSec - start) / (expire - start), 0, 1);
  }, [sale?.start, sale?.expire, now]);

  if (!sale?.expire || msLeft <= 0) return null;

  const percent =
    typeof sale?.percentage === "number"
      ? sale.percentage
      : typeof sale?.discount === "number"
      ? sale.discount
      : 0;

  const titleText =
    d > 0
      ? `${d} días, ${pad2(h)}:${pad2(m)}:${pad2(s)}`
      : `${pad2(h)}:${pad2(m)}:${pad2(s)}`;

  return (
    <div className="tienda-oferta-banner" role="status" aria-live="polite">
      {/* Imagen arriba, más pequeña con levitación */}
      <div className="tienda-oferta-artWrap">
        <img
          src="/tienda/assets/ofertas-ultra.webp"
          alt="Ofertas especiales"
          className="tienda-oferta-image"
          draggable="false"
        />
      </div>

      {/* Panel compacto debajo */}
      <div className="tienda-oferta-panel" title={`Termina en ${titleText}`}>
        <div className="tienda-oferta-header">
          <div className="tienda-oferta-timer-inline">
            <div className="timer-block">
              <span className="timer-value">{d}</span>
              <span className="timer-unit">DÍAS</span>
            </div>
            <span className="timer-sep">:</span>
            <div className="timer-block">
              <span className="timer-value">{pad2(h)}</span>
              <span className="timer-unit">HORAS</span>
            </div>
            <span className="timer-sep">:</span>
            <div className="timer-block">
              <span className="timer-value">{pad2(m)}</span>
              <span className="timer-unit">MIN</span>
            </div>
            <span className="timer-sep">:</span>
            <div className="timer-block">
              <span className="timer-value">{pad2(s)}</span>
              <span className="timer-unit">SEG</span>
            </div>
          </div>

          <span className="tienda-oferta-percent">-{percent}%</span>
        </div>

        <div className="tienda-oferta-sub">
          Descuentos activos en la tienda. ¡Corre antes de que desaparezcan!
        </div>

        <div className="tienda-oferta-bar" aria-hidden="true">
          <span
            className="tienda-oferta-barFill"
            style={{ width: `${progress * 100}%` }}
          />
          <span className="tienda-oferta-barPattern" />
          <span className="tienda-oferta-barShine" />
        </div>
      </div>
    </div>
  );
}
