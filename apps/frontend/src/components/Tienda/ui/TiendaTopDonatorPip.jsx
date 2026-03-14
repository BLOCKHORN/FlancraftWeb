import React, { useEffect, useMemo, useState } from "react";
import { apiUrl } from "../../../lib/env";
import "../../../styles/components/Tienda/tienda-topdonator-pip.scss";

const AUTO_REFRESH_MS = 60000;

function getSkinHeadUrl({ uuid, username, size = 48 }) {
  const safeUser = encodeURIComponent(String(username || "").trim());
  const safeUuid = String(uuid || "").trim();
  if (safeUuid) return `https://crafatar.com/avatars/${safeUuid}?size=${size}&overlay`;
  if (safeUser) return `https://mc-heads.net/avatar/${safeUser}/${size}`;
  return `https://mc-heads.net/avatar/Steve/${size}`;
}

function formatMoney(amount, currency = "EUR") {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "—";
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

async function fetchJson(url) {
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

export default function TiendaTopDonators({ server = "global" }) {
  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState({
    items: [],
    periodLabel: "Mes actual",
    empty: true,
  });

  useEffect(() => {
    let alive = true;

    const load = async (force = false) => {
      try {
        if (alive) setLoading(true);
        const url = apiUrl(
          `/api/tebex/top-donators?server=${encodeURIComponent(
            String(server || "global").toLowerCase()
          )}&limit=3${force ? "&refresh=true" : ""}`
        );
        const data = await fetchJson(url);
        if (!alive || !data?.ok) return;
        setPayload({
          items: Array.isArray(data.items) ? data.items : [],
          periodLabel: data.periodLabel || "Mes actual",
          empty: !Array.isArray(data.items) || data.items.length === 0,
        });
      } catch {
        if (!alive) return;
        setPayload({
          items: [],
          periodLabel: "Mes actual",
          empty: true,
        });
      } finally {
        if (alive) setLoading(false);
      }
    };

    load(true);
    const timer = setInterval(() => load(false), AUTO_REFRESH_MS);

    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [server]);

  const orderedItems = useMemo(() => {
    if (!payload.items || payload.items.length === 0) return [];
    const byRank = new Map(payload.items.map((item) => [Number(item.rank), item]));
    
    // Cambiamos a orden 1, 2, 3 para que el scroll horizontal tenga sentido visualmente
    return [1, 2, 3].map((rank) => byRank.get(rank)).filter(Boolean);
  }, [payload.items]);

  return (
    <section className="store-topdonators">
      <div className="store-topdonators__titleWrap">
        <div className="store-topdonators__title">Top Donators</div>
        <div className="store-topdonators__period">
          {loading ? "Cargando..." : payload.periodLabel}
        </div>
      </div>

      <div className="store-topdonators__grid">
        {orderedItems.map((item) => {
          const headUrl = getSkinHeadUrl({
            uuid: item.uuid,
            username: item.username,
            size: item.rank === 1 ? 48 : 40, // Cabezas más pequeñas
          });

          return (
            <article
              key={item.rank}
              className={`store-topdonators__card is-rank-${item.rank}`}
            >
              <div className="store-topdonators__rank">#{item.rank}</div>

              <div className="store-topdonators__avatarWrap">
                <img
                  className="store-topdonators__avatar"
                  src={headUrl}
                  alt=""
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.src = "https://mc-heads.net/avatar/Steve/48";
                  }}
                />
              </div>

              <div className="store-topdonators__name" title={item.username}>
                {item.username}
              </div>

              <div className="store-topdonators__amount">
                {formatMoney(item.amount, item.currency)}
              </div>
            </article>
          );
        })}
      </div>

      {!loading && payload.empty && (
        <div className="store-topdonators__empty">
          Aún no hay donadores registrados.
        </div>
      )}
    </section>
  );
}