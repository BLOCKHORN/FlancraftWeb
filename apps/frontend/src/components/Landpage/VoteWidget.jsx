// src/components/Landpage/VoteWidget.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/components/Landpage/vote-widget-mini.scss";

const API_BASE =
  import.meta.env.VITE_BACKEND_URL || "https://flancraft-backend.onrender.com";

// defaults
const HOUR = 60 * 60 * 1000;
const COOLDOWN_24H = 24 * HOUR;
const COOLDOWN_15H = 15 * HOUR;

const SITES = [
  {
    id: "v1",
    label: "ServidoresDeMinecraft",
    url: "https://servidoresdeminecraft.es/server/vote/wvkYI63n/play.flancraft.com#google_vignette",
    cooldownMs: COOLDOWN_15H,
  },
  {
    id: "v2",
    label: "Minecraft-Server",
    url: "https://minecraft-server.net/vote/FlanCraft/",
    cooldownMs: COOLDOWN_24H,
  },
  {
    id: "v3",
    label: "MineStatus",
    url: "https://minestatus.net/server/vote/play.flancraft.com",
    cooldownMs: COOLDOWN_24H,
  },
  {
    id: "v4",
    label: "Minecraft-MP",
    url: "https://minecraft-mp.com/server/333849/vote/",
    cooldownMs: COOLDOWN_24H,
  },
  {
    id: "v5",
    label: "MinecraftServers",
    url: "https://minecraftservers.org/vote/663927",
    cooldownMs: COOLDOWN_24H,
  },
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
function normalizarRango(r) {
  const s = String(r || "").toLowerCase().trim();
  if (s.includes("nova")) return "nova";
  if (s.includes("alpha")) return "alpha";
  if (s.includes("inmortal")) return "inmortal";
  return "unrank";
}
function cleanNick(v) {
  return String(v || "")
    .trim()
    .replace(/\s+/g, "")
    .slice(0, 16);
}
function ensureDeviceId() {
  const k = "vw_device_id";
  let id = window.localStorage.getItem(k);
  if (id) return id;
  id = `d_${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`;
  window.localStorage.setItem(k, id);
  return id;
}
function localKey(identityKey, siteId) {
  return `vw_last_click::${identityKey}::${siteId}`;
}
function getLocalLast(identityKey, siteId) {
  const v = Number(window.localStorage.getItem(localKey(identityKey, siteId)) || 0);
  return Number.isFinite(v) ? v : 0;
}
function setLocalLast(identityKey, siteId, ms) {
  try {
    window.localStorage.setItem(localKey(identityKey, siteId), String(ms));
  } catch {
    // ignore
  }
}

// Heads con fallback real
function headCandidates({ uuid, name, size = 32 }) {
  const n = encodeURIComponent(String(name || "").trim());
  const u = encodeURIComponent(String(uuid || "").trim());
  const s = Number(size) || 32;

  const arr = [];
  if (u) arr.push(`https://mc-heads.net/head/${u}/${s}`);
  if (n) arr.push(`https://mc-heads.net/head/${n}/${s}`);
  if (n) arr.push(`https://minotar.net/helm/${n}/${s}.png`);
  if (u) arr.push(`https://minotar.net/helm/${u}/${s}.png`);
  if (n) arr.push(`https://visage.surgeplay.com/face/${s}/${n}.png`);
  if (u) arr.push(`https://visage.surgeplay.com/face/${s}/${u}.png`);
  return arr;
}

function bindImgFallback(imgEl, candidates) {
  if (!imgEl) return;
  imgEl.dataset.srcList = JSON.stringify(candidates || []);
  imgEl.dataset.srcIdx = "0";
}
function advanceImgFallback(e) {
  const img = e.currentTarget;
  const list = safeJson(img.dataset.srcList || "[]", []);
  const idx = Number(img.dataset.srcIdx || "0") || 0;
  const next = idx + 1;
  if (!Array.isArray(list) || next >= list.length) return;
  img.dataset.srcIdx = String(next);
  img.src = list[next];
}

function CheckIcon({ filled = false }) {
  return (
    <svg
      className={`vw-checkIcon ${filled ? "is-filled" : ""}`}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        d="M9.2 16.6 4.9 12.3l1.6-1.6 2.7 2.7 8-8 1.6 1.6-9.6 9.6Z"
        fill="currentColor"
      />
    </svg>
  );
}

export default function VoteWidget({ visible = true }) {
  const navigate = useNavigate();

  const rootRef = useRef(null);
  const panelInnerRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [serverStatus, setServerStatus] = useState(null);

  const [pending, setPending] = useState({});
  const [panelMaxHeight, setPanelMaxHeight] = useState(0);

  const [topState, setTopState] = useState({ list: [], total: 0, page: 0, limit: 10 });

  const [serverOffsetMs, setServerOffsetMs] = useState(0);
  const [nowTick, setNowTick] = useState(0);

  const [guestNick, setGuestNick] = useState(() =>
    cleanNick(window.localStorage.getItem("vw_guest_nick") || "")
  );
  const [guestSaved, setGuestSaved] = useState(false);

  const storedA = window.localStorage.getItem("flan_user");
  const storedB = window.localStorage.getItem("fc_user");
  const fcUser = safeJson(storedA || storedB || "null", null);

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

  const deviceId = useMemo(() => ensureDeviceId(), []);
  const effectiveNick = cleanNick(userName || guestNick);
  const identityKey = (userUuid || effectiveNick || deviceId || "device").trim();

  // tick 1s solo cuando está abierto
  useEffect(() => {
    if (!open) return;
    setNowTick(Date.now());
    const id = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, [open]);

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
    const key = (userUuid || effectiveNick || "anon").trim();
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

      const serverNow = Number(j?.server_now_ms);
      if (Number.isFinite(serverNow) && serverNow > 0) {
        setServerOffsetMs(serverNow - Date.now());
      } else {
        setServerOffsetMs(0);
      }
    } catch {
      // ignore
    }
  }, [userUuid, effectiveNick]);

  const fetchTop = useCallback(async (page = 0, limit = 10) => {
    try {
      const r = await fetch(
        `${API_BASE}/api/votos/top?range=30d&limit=${limit}&page=${page}`,
        { method: "GET", credentials: "include", cache: "no-store" }
      );
      if (!r.ok) return;

      const j = await r.json();
      const list = Array.isArray(j.list) ? j.list : [];
      const total = Number.isFinite(Number(j.total)) ? Number(j.total) : list.length;
      const p = Number.isFinite(Number(j.page)) ? Number(j.page) : 0;
      const lim = Number.isFinite(Number(j.limit)) ? Number(j.limit) : limit;

      setTopState({ list, total, page: p, limit: lim });
    } catch {
      // ignore
    }
  }, []);

  // Polling cuando abierto
  useEffect(() => {
    if (!open) return;

    fetchStatus();
    fetchTop(0, topState.limit);

    const id = setInterval(fetchStatus, 8000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, fetchStatus, fetchTop]);

  // Limpia pending cuando el server confirma
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

  const computed = useMemo(() => {
    const nowMs = Date.now() + (serverOffsetMs || 0);

    const itemsFromServer = serverStatus?.items;
    if (Array.isArray(itemsFromServer) && itemsFromServer.length) {
      const items = SITES.map((s) => {
        const row = itemsFromServer.find((x) => x?.id === s.id) || {};
        const left = Number(row.left ?? row.left_ms ?? row.leftMs ?? 0) || 0;
        const available = typeof row.available === "boolean" ? row.available : left <= 0;
        const cooldownMs =
          Number(row.cooldown_ms ?? row.cooldownMs ?? 0) || s.cooldownMs || COOLDOWN_24H;

        return {
          ...s,
          favicon: faviconUrlFor(s.url),
          cooldownMs,
          available,
          left: Math.max(0, left),
          real: true,
          nextAvail: !available ? nowMs + Math.max(0, left) : 0,
        };
      });

      const done = items.filter((i) => !i.available).length;
      const total = items.length;
      const remaining = total - done;
      const progress = total ? done / total : 0;

      return { items, done, total, remaining, progress, real: true };
    }

    const items = SITES.map((s) => {
      const lastLocal = getLocalLast(identityKey, s.id);
      const nextAvail = lastLocal ? lastLocal + (s.cooldownMs || COOLDOWN_24H) : 0;
      const left = nextAvail ? Math.max(0, nextAvail - Date.now()) : 0;
      const available = !nextAvail || Date.now() >= nextAvail;

      return {
        ...s,
        favicon: faviconUrlFor(s.url),
        available,
        left,
        real: false,
        nextAvail,
        cooldownMs: s.cooldownMs || COOLDOWN_24H,
      };
    });

    const done = items.filter((i) => !i.available).length;
    const total = items.length;
    const remaining = total - done;
    const progress = total ? done / total : 0;

    return { items, done, total, remaining, progress, real: false };
  }, [serverStatus, serverOffsetMs, nowTick, identityKey]);

  // panel height
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
  }, [open, computed.items.length, topState.list.length]);

  const handlePillClick = useCallback(() => setOpen((v) => !v), []);

  const handleVoteClick = useCallback(
    (site) => {
      const t = Date.now();
      setLocalLast(identityKey, site.id, t);

      window.open(site.url, "_blank", "noopener,noreferrer");
      setPending((prev) => ({ ...prev, [site.id]: t }));

      setTimeout(fetchStatus, 3500);
      setTimeout(fetchStatus, 9000);
    },
    [fetchStatus, identityKey]
  );

  const statusImg =
    computed.remaining > 0
      ? "/assets/logros/tab-diarias.webp"
      : "/assets/logros/estado-reclamado.webp";

  const progressLabel =
    computed.remaining > 0 ? `Faltan ${computed.remaining}/${computed.total}` : "Completado";

  const progressPercent = Math.max(0, Math.min(100, computed.progress * 100));
  const isMin = !open;

  const topList = Array.isArray(topState.list) ? topState.list : [];
  const top3 = topList.slice(0, 3);
  const topRest = topList.slice(3, 10);

  const showGuest = !userUuid && !userName;

  if (!visible) return null;

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

          {/* Flecha a la derecha */}
          <span className="vw-arrow" aria-hidden="true">
            <span className="vw-arrow__icon" />
          </span>
        </span>
      </button>

      <div
        className={`vw-panel-miniWrapper ${open ? "is-open" : ""}`}
        style={{ maxHeight: open ? panelMaxHeight : 0 }}
      >
        <div ref={panelInnerRef} className="vw-panel-mini" role="dialog" aria-label="Panel de votos">
          {/* INVITADO */}
          {showGuest && (
            <div className="vw-guest vw-guest--compact">
              <div className="vw-guest__row">
                <input
                  className="vw-guest__input"
                  value={guestNick}
                  onChange={(e) => setGuestNick(cleanNick(e.target.value))}
                  placeholder="Invitado"
                  maxLength={16}
                  aria-label="Nick invitado"
                />

                <button
                  type="button"
                  className={`vw-guest__save ${guestSaved ? "is-saved" : ""}`}
                  onClick={() => {
                    const n = cleanNick(guestNick);
                    window.localStorage.setItem("vw_guest_nick", n);
                    setGuestNick(n);
                    setGuestSaved(true);
                    setTimeout(() => setGuestSaved(false), 1200);
                    setTimeout(fetchStatus, 0);
                  }}
                  disabled={!cleanNick(guestNick)}
                  aria-label="Guardar nick"
                  title="Guardar"
                >
                  <CheckIcon filled={guestSaved} />
                </button>
              </div>

              <div className="vw-guest__hint">Guarda tu nick para contar en este navegador.</div>
            </div>
          )}

          {/* LISTA SITES */}
          <div className="vw-list-mini">
            {computed.items.map((s, idx) => {
              const isPending = !!pending[s.id];
              const btnText = !s.available ? msToHMS(s.left) : isPending ? "…" : "VOTAR";

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
                        className={`vw-btn-mini ${s.available ? "is-store" : "is-locked"} ${
                          isPending ? "is-pending" : ""
                        }`}
                        onClick={() => handleVoteClick(s)}
                        disabled={!s.available || isPending}
                        title={!s.available ? `Disponible en ${msToHMS(s.left)}` : "Abrir voto"}
                      >
                        <span className="vw-btn-mini__label">{btnText}</span>
                        <span className="vw-btn-mini__shine" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  {idx !== computed.items.length - 1 && <div className="vw-sep" aria-hidden="true" />}
                </React.Fragment>
              );
            })}
          </div>

          {/* TOP VOTANTES */}
          {topList.length > 0 && (
            <div className="vw-top-mini vw-top-mini--compact">
              <div className="vw-top-mini__title">
                <span>TOP VOTANTES</span>
                {topState.total > 0 && (
                  <span className="vw-top-mini__meta">
                    {Math.min(topList.length, topState.total)}/{topState.total}
                  </span>
                )}
              </div>

              <div className="vw-top-mini__rows vw-top-mini__rows--top3">
                {top3.map((t, i) => {
                  const rank = i + 1;
                  const name = t.uid || t.nombre || t.nombre_minecraft || "Desconocido";
                  const rangoKey = normalizarRango(t.rango_usuario);
                  const uuid = t.uuid || t.uuid_jugador || "";
                  const cands = headCandidates({
                    uuid,
                    name,
                    size: rank === 1 ? 36 : rank === 2 ? 32 : 30,
                  });

                  return (
                    <button
                      key={`top3-${uuid || name}-${rank}`}
                      type="button"
                      className={`vw-toprow is-top${rank} is-${rangoKey}`}
                      onClick={() => navigate(`/perfil/${encodeURIComponent(name)}`)}
                      title="Abrir perfil"
                    >
                      <span className="vw-toprow__rank">#{rank}</span>

                      <span className="vw-toprow__headWrap" aria-hidden="true">
                        <img
                          className="vw-toprow__head"
                          alt=""
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          src={cands[0]}
                          ref={(el) => el && bindImgFallback(el, cands)}
                          onError={advanceImgFallback}
                        />
                      </span>

                      <span className={`vw-toprow__name is-${rangoKey}`}>{name}</span>

                      <span className="vw-toprow__votes" aria-label="Votos (30 días)">
                        <span className="vw-toprow__votesTxt">VOTOS</span>
                        <span className="vw-toprow__votesNum">{Number(t.votos || 0) || 0}</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="vw-top-mini__rows vw-top-mini__rows--rest">
                {topRest.map((t, i) => {
                  const rank = 3 + i + 1;
                  const name = t.uid || t.nombre || t.nombre_minecraft || "Desconocido";
                  const rangoKey = normalizarRango(t.rango_usuario);
                  const uuid = t.uuid || t.uuid_jugador || "";
                  const cands = headCandidates({ uuid, name, size: 26 });

                  return (
                    <button
                      key={`rest-${uuid || name}-${rank}`}
                      type="button"
                      className={`vw-toprow is-rest is-${rangoKey}`}
                      onClick={() => navigate(`/perfil/${encodeURIComponent(name)}`)}
                      title="Abrir perfil"
                    >
                      <span className="vw-toprow__rank">#{rank}</span>

                      <span className="vw-toprow__headWrap" aria-hidden="true">
                        <img
                          className="vw-toprow__head"
                          alt=""
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          src={cands[0]}
                          ref={(el) => el && bindImgFallback(el, cands)}
                          onError={advanceImgFallback}
                        />
                      </span>

                      <span className={`vw-toprow__name is-${rangoKey}`}>{name}</span>

                      <span className="vw-toprow__votes" aria-label="Votos (30 días)">
                        <span className="vw-toprow__votesTxt">VOTOS</span>
                        <span className="vw-toprow__votesNum">{Number(t.votos || 0) || 0}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
