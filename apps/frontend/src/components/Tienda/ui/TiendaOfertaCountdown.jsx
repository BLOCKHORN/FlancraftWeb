import React, { useEffect, useMemo, useRef, useState } from "react";
import { apiUrl } from "../../../lib/env";
import "../../../styles/components/Tienda/tienda-oferta-countdown.scss";

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
    const res = await fetch(apiUrl(`/api/tebex/sale${refresh}`));
    if (!res.ok) return null;
    const json = await res.json();
    if (!json?.ok || !json?.active || !json?.sale?.expire) return null;
    return json.sale;
  } catch {
    return null;
  }
}

function announceTextFromMinutes(minLeft) {
  if (minLeft <= 0) return "La oferta ha terminado.";
  if (minLeft < 1) return "La oferta termina en menos de 1 minuto.";

  const d = Math.floor(minLeft / 1440);
  const h = Math.floor((minLeft % 1440) / 60);
  const m = minLeft % 60;

  if (d > 0) return `La oferta termina en ${d} días, ${h} horas y ${m} minutos.`;
  if (h > 0) return `La oferta termina en ${h} horas y ${m} minutos.`;
  return `La oferta termina en ${m} minutos.`;
}

export default function TiendaOfertaCountdown({ variant = "default" }) {
  const isTabs = variant === "tabs";

  const [sale, setSale] = useState(null);
  const [now, setNow] = useState(() => Date.now());

  const [announce, setAnnounce] = useState("");
  const lastMinuteRef = useRef(null);

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
    const expire = Number(sale?.expire || 0);
    if (!expire) return 0;
    return expire * 1000 - now;
  }, [sale?.expire, now]);

  const safeMsLeft = useMemo(() => Math.max(0, msLeft), [msLeft]);
  const { d, h, m, s } = useMemo(() => partsFromMs(safeMsLeft), [safeMsLeft]);

  const progress = useMemo(() => {
    const start = Number(sale?.start || 0);
    const expire = Number(sale?.expire || 0);
    if (!start || !expire || expire <= start) return 0;
    const nowSec = Math.floor(now / 1000);
    return clamp((nowSec - start) / (expire - start), 0, 1);
  }, [sale?.start, sale?.expire, now]);

  const minutesLeft = useMemo(() => Math.ceil(safeMsLeft / 60000), [safeMsLeft]);

  useEffect(() => {
    if (!sale?.expire) return;
    if (lastMinuteRef.current === minutesLeft) return;
    lastMinuteRef.current = minutesLeft;
    setAnnounce(announceTextFromMinutes(minutesLeft));
  }, [sale?.expire, minutesLeft]);

  const shouldRender = Boolean(sale?.expire) && safeMsLeft > 0;
  if (!shouldRender) return null;

  const percent =
    typeof sale?.percentage === "number"
      ? sale.percentage
      : typeof sale?.discount === "number"
      ? sale.discount
      : 0;

  const timeText =
    d > 0
      ? `${d}d ${pad2(h)}:${pad2(m)}:${pad2(s)}`
      : `${pad2(h)}:${pad2(m)}:${pad2(s)}`;

  return (
    <div
      className={`tienda-oferta-strip ${isTabs ? "tienda-oferta-strip--tabs" : ""}`}
      aria-label="Oferta activa"
    >
      <span className="sr-only" role="status" aria-live="polite">
        {announce}
      </span>

      <div className="tienda-oferta-panel" title={`Termina en ${timeText}`}>
        {/* CTA DENTRO (en el margen libre) */}
        <div className="tienda-oferta-cta" aria-hidden="true">
          <span className="cta-particles" />
          <img
            src="/tienda/assets/ofertas-ultra.png"
            alt=""
            className="tienda-oferta-image"
            draggable="false"
          />
        </div>

        <div className="tienda-oferta-row">
          <div className="tienda-oferta-line" aria-label={`Termina en ${timeText}`}>
            <span className="tienda-oferta-text">Descuentos activos</span>
            <span className="tienda-oferta-dot">•</span>
            <span className="tienda-oferta-time">
              <span className="time-label">Termina en</span>
              <span className="time-value">{timeText}</span>
            </span>
          </div>

          {percent > 0 && <span className="tienda-oferta-percent">-{percent}%</span>}
        </div>

        <div className="tienda-oferta-bar" aria-hidden="true">
          <span className="tienda-oferta-barFill" style={{ width: `${progress * 100}%` }} />
          <span className="tienda-oferta-barPattern" />
          <span className="tienda-oferta-barShine" />
        </div>
      </div>
    </div>
  );
}