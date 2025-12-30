// src/components/Landpage/VoteWidget.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import "../../styles/components/Landpage/vote-widget-mini.scss";

const API_BASE =
  import.meta.env.VITE_BACKEND_URL || "https://flancraft-backend.onrender.com";

const SITES = [
  {
    id: "v1",
    label: "ServidoresDeMinecraft",
    url: "https://servidoresdeminecraft.es/server/vote/wvkYI63n/play.flancraft.com#google_vignette",
  },
  { id: "v2", label: "Minecraft-Server", url: "https://minecraft-server.net/vote/FlanCraft/" },
  { id: "v3", label: "MineStatus", url: "https://minestatus.net/server/vote/play.flancraft.com" },
  { id: "v4", label: "Minecraft-MP", url: "https://minecraft-mp.com/server/333849/vote/" },
  { id: "v5", label: "MinecraftServers", url: "https://minecraftservers.org/vote/663927" },
];

function pad2(n) {
  return String(n).padStart(2, "0");
}
function msToHMS(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
}
function getHostname(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}
function faviconUrlFor(siteUrl) {
  const host = getHostname(siteUrl);
  if (!host) return "";
  return `https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(host)}`;
}
function safeJson(str, fallback) {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

export default function VoteWidget({ visible = true }) {
  const rootRef = useRef(null);
  const panelInnerRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [serverStatus, setServerStatus] = useState(null);

  // pending visual (solo UI, NO cuenta como voto)
  const [pending, setPending] = useState({}); // { v1: timestampClick }

  const [panelMaxHeight, setPanelMaxHeight] = useState(0);
  const [top, setTop] = useState([]);

  // identidad
  const fcUser = safeJson(window.localStorage.getItem("fc_user") || "null", null);
  const userUuid =
    (fcUser && (fcUser.uuid || fcUser.uuid_jugador)) ||
    window.localStorage.getItem("uuid") ||
    window.localStorage.getItem("uuid_jugador") ||
    "";

  const userName =
    (fcUser && (fcUser.uid || fcUser.username || fcUser.nombre_minecraft)) ||
    window.localStorage.getItem("uid") ||
    window.localStorage.getItem("username") ||
    "";

  // Cerrar con ESC / click fuera
  useEffect(() => {
    if (!open) return;

    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onPointer = (e) => {
      const root = rootRef.current;
      if (!root) return;
      if (!root.contains(e.target)) setOpen(false);
    };

    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer, true);
    document.addEventListener("touchstart", onPointer, { passive: true, capture: true });

    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer, true);
      document.removeEventListener("touchstart", onPointer, true);
    };
  }, [open]);

  const fetchStatus = useCallback(async () => {
    const key = (userUuid || userName || "").trim();
    if (!key) return;

    try {
      const r = await fetch(`${API_BASE}/api/votos/status/${encodeURIComponent(key)}`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });
      if (!r.ok) return;
      const j = await r.json();
      setServerStatus(j);
    } catch {
      // ignore
    }
  }, [userUuid, userName]);

  const fetchTop = useCallback(async () => {
    try {
      const r = await fetch(`${API_BASE}/api/votos/top?range=30d&limit=6`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });
      if (!r.ok) return;
      const j = await r.json();
      setTop(Array.isArray(j.list) ? j.list : []);
    } catch {
      // ignore
    }
  }, []);

  // Polling cuando abierto
  useEffect(() => {
    if (!open) return;
    fetchStatus();
    fetchTop();
    const id = setInterval(fetchStatus, 8000);
    return () => clearInterval(id);
  }, [open, fetchStatus, fetchTop]);

  // Limpia pending cuando el server confirma (available = false)
  useEffect(() => {
    const items = serverStatus?.items;
    if (!Array.isArray(items) || !items.length) return;

    setPending((prev) => {
      const next = { ...prev };
      for (const it of items) {
        if (!it?.id) continue;
        if (it.available === false && next[it.id]) delete next[it.id];
      }
      return next;
    });
  }, [serverStatus]);

  // computed (autoridad = server)
  const computed = useMemo(() => {
    const itemsFromServer = serverStatus?.items;

    if (Array.isArray(itemsFromServer) && itemsFromServer.length) {
      const items = SITES.map((s) => {
        const row = itemsFromServer.find((x) => x?.id === s.id);
        const last = Number(row?.last || 0) || 0;
        const available = !!row?.available;
        const left = Number(row?.left || 0) || 0;
        return { ...s, favicon: faviconUrlFor(s.url), last, available, left };
      });

      const done = Number.isFinite(serverStatus?.done)
        ? serverStatus.done
        : items.filter((i) => !i.available).length;
      const total = Number.isFinite(serverStatus?.total) ? serverStatus.total : items.length;
      const remaining = Number.isFinite(serverStatus?.remaining) ? serverStatus.remaining : total - done;
      const progress = Number.isFinite(serverStatus?.progress) ? serverStatus.progress : (total ? done / total : 0);

      return { items, done, total, remaining, progress, real: true };
    }

    // sin status real -> NO inventamos cooldown (evitamos “contar” falso)
    const items = SITES.map((s) => ({
      ...s,
      favicon: faviconUrlFor(s.url),
      last: 0,
      available: true,
      left: 0,
    }));

    return { items, done: 0, total: items.length, remaining: items.length, progress: 0, real: false };
  }, [serverStatus]);

  useEffect(() => {
    if (!open) {
      setPanelMaxHeight(0);
      return;
    }
    const el = panelInnerRef.current;
    if (!el) return;

    const update = () => setPanelMaxHeight(el.scrollHeight);
    update();

    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);

    return () => {
      window.removeEventListener("resize", update);
      ro.disconnect();
    };
  }, [open, computed.items.length, top.length]);

  const handlePillClick = useCallback(() => setOpen((v) => !v), []);

  const handleVoteClick = useCallback(
    (site) => {
      window.open(site.url, "_blank", "noopener,noreferrer");

      // ponemos pending solo para UX (no cuenta)
      setPending((prev) => ({ ...prev, [site.id]: Date.now() }));

      // opcional: refrescar status a los pocos segundos por si el proxy ya ingestó
      setTimeout(fetchStatus, 3500);
      setTimeout(fetchStatus, 9000);
    },
    [fetchStatus]
  );

  if (!visible) return null;

  const statusImg =
    computed.remaining > 0
      ? "/assets/logros/tab-diarias.webp"
      : "/assets/logros/estado-reclamado.webp";

  const progressLabel =
    computed.remaining > 0 ? `Faltan ${computed.remaining}/${computed.total}` : "Completado";

  const progressPercent = Math.max(0, Math.min(100, computed.progress * 100));
  const isMin = !open;

  return (
    <div
      ref={rootRef}
      className={`vote-widget-mini is-minecraft ${isMin ? "is-min" : ""} ${open ? "is-open" : ""}`}
    >
      <button
        type="button"
        className="vw-pill-mini"
        onClick={handlePillClick}
        aria-expanded={open}
        aria-label={open ? "Cerrar panel de votos" : "Abrir panel de votos"}
      >
        <span className="vw-head">
          <span className="vw-arrow" aria-hidden="true">
            <span className="vw-arrow__icon" />
          </span>

          <span className="vw-crest" aria-hidden="true">
            <img src="/assets/voto.webp" alt="" className="vw-crest__img" loading="lazy" />
          </span>

          <span className="vw-head__mid">
            <span className="vw-head__titleRow">
              <span className="vw-head__title">RITUAL DIARIO</span>

              <span className="vw-head__badge" aria-hidden="true">
                <img src={statusImg} alt="" className="vw-head__badgeImg" loading="lazy" />
              </span>
            </span>

            <span className="vw-head__progress">
              <span className="vw-head__bar" aria-hidden="true">
                <span className="vw-head__barFill" style={{ width: `${progressPercent}%` }} />
              </span>
              <span className="vw-head__progressText">{progressLabel}</span>
            </span>
          </span>
        </span>
      </button>

      <div className={`vw-panel-miniWrapper ${open ? "is-open" : ""}`} style={{ maxHeight: open ? panelMaxHeight : 0 }}>
        <div ref={panelInnerRef} className="vw-panel-mini" role="dialog" aria-label="Panel de votos">
          <div className="vw-list-mini">
            {computed.items.map((s, idx) => {
              const isPending = !!pending[s.id];

              const btnText = !s.available ? msToHMS(s.left) : isPending ? "PENDIENTE" : "VOTAR";

              return (
                <React.Fragment key={s.id}>
                  <div className="vw-row-mini" style={{ "--i": idx }}>
                    <div className="vw-order-mini">#{idx + 1}</div>

                    <div className="vw-site-mini" aria-hidden="true">
                      <img
                        src={s.favicon}
                        alt=""
                        className="vw-site-mini__img"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          const parent = e.currentTarget.parentElement;
                          if (parent) parent.classList.add("is-fallback");
                        }}
                      />
                      <span className="vw-site-mini__fallback">
                        {String(s.label || "?").slice(0, 2).toUpperCase()}
                      </span>
                    </div>

                    <div className="vw-action-mini">
                      <button
                        type="button"
                        className={`vw-btn-mini ${s.available ? "is-store" : "is-locked"} ${isPending ? "is-pending" : ""}`}
                        onClick={() => handleVoteClick(s)}
                        disabled={!s.available || isPending}
                        title={
                          !s.available
                            ? `Disponible en ${msToHMS(s.left)}`
                            : isPending
                            ? "Pendiente de confirmación"
                            : "Abrir página de voto"
                        }
                      >
                        <span className="vw-btn-mini__label">{btnText}</span>
                        <span className="vw-btn-mini__spark" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  {idx !== computed.items.length - 1 && <div className="vw-sep" aria-hidden="true" />}
                </React.Fragment>
              );
            })}
          </div>

          <div className="vw-panel-mini__hint">
            Cada página cuenta <strong>1 vez</strong> cada <strong>24h</strong>.
            {computed.real ? <> Se confirma automáticamente al detectar el voto real.</> : <> (Esperando verificación del servidor)</>}
          </div>

          {top?.length > 0 && (
            <div className="vw-top-mini">
              <div className="vw-top-mini__title">TOP VOTERS</div>

              <div className="vw-top-mini__list">
                {top.map((t, i) => (
                  <div key={`${t.uuid || t.nombre || "x"}-${i}`} className="vw-top-mini__row">
                    <div className="vw-top-mini__rank">#{i + 1}</div>

                    <img
                      className="vw-top-mini__head"
                      alt=""
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      src={
                        t.uuid
                          ? `https://mc-heads.net/avatar/${t.uuid}/32`
                          : `https://mc-heads.net/avatar/${encodeURIComponent(t.nombre || "Steve")}/32`
                      }
                    />

                    <div className="vw-top-mini__name">{t.nombre || "Desconocido"}</div>
                    <div className="vw-top-mini__votes">{t.votos}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
