import React, { useEffect, useMemo, useState } from "react";
import "../../styles/components/Tienda/tienda-topdonatorgoal.scss";

const API_BASE =
  import.meta.env.VITE_BACKEND_URL || "https://flancraft-backend.onrender.com";

const TTL_MS = 5 * 60 * 1000;

function getSkinHeadUrl({ uuid, username, size = 72 }) {
  const safeUser = encodeURIComponent(String(username || "").trim());
  const safeUuid = String(uuid || "").trim();

  if (safeUuid) return `https://crafatar.com/avatars/${safeUuid}?size=${size}&overlay`;
  if (safeUser) return `https://mc-heads.net/avatar/${safeUser}/${size}`;
  return `https://mc-heads.net/avatar/Steve/${size}`;
}

function formatMoney(amount, currency = "EUR") {
  const n = Number(amount);
  if (!Number.isFinite(n)) return null;
  try {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${n.toFixed(2)} ${currency}`;
  }
}

async function fetchJsonOrThrow(url) {
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

export default function TiendaTopDonator({ server = "global" }) {
  const [loading, setLoading] = useState(true);
  const [top, setTop] = useState(null);
  const [error, setError] = useState("");

  const cacheKey = useMemo(
    () => `tienda_topdonator_v7_${String(server || "global").toLowerCase()}`,
    [server]
  );

  useEffect(() => {
    let alive = true;
    const isDev = import.meta.env.DEV;

    const readCache = () => {
      try {
        const raw = sessionStorage.getItem(cacheKey);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed?.ts || !parsed?.data) return null;
        if (Date.now() - parsed.ts > TTL_MS) return null;
        return parsed.data;
      } catch {
        return null;
      }
    };

    const writeCache = (data) => {
      try {
        sessionStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data }));
      } catch {}
    };

    const load = async () => {
      setLoading(true);
      setError("");

      const cached = isDev ? null : readCache();
      if (cached) {
        if (!alive) return;
        setTop(cached.top || null);
        setLoading(false);
        return;
      }

      try {
        const refresh = isDev ? "?refresh=1" : "";
        const topData = await fetchJsonOrThrow(
          `${API_BASE}/api/tebex/top-donator${refresh}`
        );

        if (!topData?.ok) throw new Error(topData?.error || "TopDonator inválido");
        if (!alive) return;

        const payload = { top: topData };
        if (!isDev) writeCache(payload);

        setTop(topData);
        setLoading(false);
      } catch {
        if (!alive) return;
        setTop({
          username: "Guest",
          uuid: "",
          amount: null,
          currency: "EUR",
          periodLabel: "TOP DONADOR MENSUAL",
          _isFallback: true,
        });
        setError("No se pudo cargar el Top Donador.");
        setLoading(false);
      }
    };

    load();
    return () => {
      alive = false;
    };
  }, [cacheKey, server]);

  const headUrl = useMemo(
    () => getSkinHeadUrl({ uuid: top?.uuid, username: top?.username, size: 64 }),
    [top?.uuid, top?.username]
  );

  const amountText = useMemo(() => {
    const v = top?.amountFormatted || formatMoney(top?.amount, top?.currency || "EUR");
    return v || null;
  }, [top?.amount, top?.amountFormatted, top?.currency]);

  const periodText = useMemo(() => {
    const p = String(top?.periodLabel || "TOP DONADOR MENSUAL").trim();
    return p || "TOP DONADOR MENSUAL";
  }, [top?.periodLabel]);

  return (
    <section className="tienda-topdonatorgoal tienda-topdonatorgoal--solo" aria-label="Top donador">
      <div className="tienda-topdonatorgoal__sheen" aria-hidden="true" />

      <div className="tienda-topdonator tienda-topdonator--centerline" aria-label="Top donador mensual">
        <div className="tienda-topdonator__row">
          {/* Avatar */}
          <div className="tienda-topdonator__avatarWrap">
            <div className="tienda-topdonator__ring" aria-hidden="true" />
            <img
              className="tienda-topdonator__avatar tienda-topdonator__avatar--float"
              src={headUrl}
              alt={top?.username ? `Skin de ${top.username}` : "Skin"}
              loading="lazy"
              draggable="false"
              onError={(e) => {
                e.currentTarget.src = "https://mc-heads.net/avatar/Steve/64";
              }}
            />
          </div>

          {/* Centro */}
          <div className="tienda-topdonator__center">
            <div className="tienda-topdonator__title">{periodText}</div>

            <div className="tienda-topdonator__name">
              {loading ? "Cargando…" : top?.username || "—"}
            </div>

            {/* ✅ Línea “como antes”: fina, rombo en centro */}
            <div className="tienda-topdonator__line" aria-hidden="true">
              <span className="tienda-topdonator__diamond" />
            </div>

            {amountText ? (
              <div className="tienda-topdonator__amount">{amountText}</div>
            ) : (
              <div className="tienda-topdonator__amount is-muted">—</div>
            )}

            {error ? <div className="tienda-topdonator__warn">{error}</div> : null}
          </div>
        </div>
      </div>
    </section>
  );
}
