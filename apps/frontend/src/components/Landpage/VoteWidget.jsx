import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/components/Landpage/vote-widget-mini.scss";

import { apiUrl } from "../../lib/env";
import useVoteIdentity from "../Voto/useVoteIdentity";
import {
  safeJson,
  normalizarRango,
  getLocalLast,
  setLocalLast,
  msToHMS,
  headCandidates,
} from "../Voto/vote.shared";

const COOLDOWN_24H = 24 * 60 * 60 * 1000;

const SITES = [
  { id: "minecraft.buzz", label: "Minecraft.Buzz", url: "https://minecraft.buzz/vote/11159", cooldownMs: COOLDOWN_24H },
  { id: "topg.org", label: "TopG.org", url: "https://topg.org/minecraft-servers/server-680447#vote", cooldownMs: COOLDOWN_24H },
  { id: "minestatus.net", label: "Minestatus", url: "https://minestatus.net/server/vote/play.flancraft.com", cooldownMs: COOLDOWN_24H },
  { id: "minecraft-mp.com", label: "Minecraft-MP", url: "https://minecraft-mp.com/server/333849/vote/", cooldownMs: COOLDOWN_24H },
  { id: "minecraftservers.org", label: "MinecraftServers", url: "https://minecraftservers.org/vote/663927", cooldownMs: COOLDOWN_24H },
  { id: "TopMinecraftServers", label: "TopMinecraftServers", url: "https://topminecraftservers.org/server/42979", cooldownMs: COOLDOWN_24H },
  { id: "ServidoresDeMinecraft.ES", label: "ServidoresES", url: "https://servidoresdeminecraft.es/server/status/wvkYI63n/play.flancraft.com", cooldownMs: COOLDOWN_24H }
];

function getFavicon(urlString) {
  try {
    const url = new URL(urlString);
    return `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=32`;
  } catch (e) {
    return "/assets/default-favicon.webp";
  }
}

function cleanNick(value = "") {
  return String(value ?? "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "").replace(/[^A-Za-z0-9_]/g, "").slice(0, 16);
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
    <svg className={`vw-checkIcon ${filled ? "is-filled" : ""}`} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9.2 16.6 4.9 12.3l1.6-1.6 2.7 2.7 8-8 1.6 1.6-9.6 9.6Z" fill="currentColor" />
    </svg>
  );
}

function CrownIcon() {
  return (
    <svg className="vw-crown" viewBox="0 0 64 64" aria-hidden="true">
      <path d="M10 24 18 34 32 18 46 34 54 24 58 44H6l4-20Z" fill="#fbbf24" />
      <path d="M14 44h36l-2 10H16l-2-10Z" fill="#d97706" />
      <path d="M12 24 18 34 32 18 46 34 52 24" fill="none" stroke="#000" strokeWidth="4" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronMini({ up = false }) {
  return (
    <svg className={`vw-chev ${up ? "is-up" : ""}`} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 10l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square" strokeLinejoin="miter" />
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
  const [moreOpen, setMoreOpen] = useState(false);
  const [morePage, setMorePage] = useState(0);
  const [liftSiteId, setLiftSiteId] = useState("");
  const [hoverSiteId, setHoverSiteId] = useState("");

  const { userUuid, userName, guestNick, setGuestNick, guestSaved, setGuestSaved, effectiveNick, identityKey } =
    useVoteIdentity();

  useEffect(() => {
    if (!open) return;
    setNowTick(Date.now());
    const id = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
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
    const key = String(userUuid || effectiveNick || "").trim();
    if (!key) return;
    try {
      const r = await fetch(apiUrl(`/api/votos/status/${encodeURIComponent(key)}`), {
        method: "GET", credentials: "include", cache: "no-store",
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
    } catch {}
  }, [userUuid, effectiveNick]);

  const fetchTop = useCallback(async (page = 0, limit = 10) => {
    try {
      const r = await fetch(
        apiUrl(`/api/votos/top?range=total&limit=${limit}&page=${page}`),
        { method: "GET", credentials: "include", cache: "no-store" }
      );
      if (!r.ok) return;
      const j = await r.json();
      const list = Array.isArray(j.list) ? j.list : [];
      const total = Number.isFinite(Number(j.total)) ? Number(j.total) : list.length;
      const p = Number.isFinite(Number(j.page)) ? Number(j.page) : 0;
      const lim = Number.isFinite(Number(j.limit)) ? Number(j.limit) : limit;
      setTopState({ list, total, page: p, limit: lim });
    } catch {}
  }, []);

  useEffect(() => {
    if (!open) return;
    fetchStatus();
    fetchTop(0, topState.limit);
    const id = setInterval(fetchStatus, 60000);
    return () => clearInterval(id);
  }, [open, fetchStatus, fetchTop, topState.limit]);

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
        const cooldownMs = Number(row.cooldown_ms ?? row.cooldownMs ?? 0) || s.cooldownMs || COOLDOWN_24H;
        return {
          ...s, favicon: getFavicon(s.url), cooldownMs, available, left: Math.max(0, left), real: true, nextAvail: !available ? nowMs + Math.max(0, left) : 0,
        };
      });
      const done = items.filter((i) => !i.available).length;
      const total = items.length;
      return { items, done, total, remaining: total - done, progress: total ? done / total : 0, real: true };
    }

    const items = SITES.map((s) => {
      const lastLocal = getLocalLast(identityKey, s.id);
      const nextAvail = lastLocal ? lastLocal + (s.cooldownMs || COOLDOWN_24H) : 0;
      const left = nextAvail ? Math.max(0, nextAvail - Date.now()) : 0;
      const available = !nextAvail || Date.now() >= nextAvail;
      return {
        ...s, favicon: getFavicon(s.url), available, left, real: false, nextAvail, cooldownMs: s.cooldownMs || COOLDOWN_24H,
      };
    });
    const done = items.filter((i) => !i.available).length;
    const total = items.length;
    return { items, done, total, remaining: total - done, progress: total ? done / total : 0, real: false };
  }, [serverStatus, serverOffsetMs, nowTick, identityKey]);

  useEffect(() => {
    if (!open) {
      setPanelMaxHeight(0);
      return;
    }
    const el = panelInnerRef.current;
    if (!el) return;
    const update = () => setPanelMaxHeight(el.scrollHeight + 10);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => { window.removeEventListener("resize", update); ro.disconnect(); };
  }, [open, computed.items.length, topState.list.length, moreOpen, morePage]);

  useEffect(() => {
    if (!moreOpen) setMorePage(0);
  }, [moreOpen]);

  const handlePillClick = useCallback(() => setOpen((v) => !v), []);

  const handleVoteClick = useCallback(
    (site) => {
      const t = Date.now();
      setLocalLast(identityKey, site.id, t);
      setLiftSiteId(site.id);
      window.setTimeout(() => setLiftSiteId(""), 650);
      window.open(site.url, "_blank", "noopener,noreferrer");
      setPending((prev) => ({ ...prev, [site.id]: t }));
      setTimeout(fetchStatus, 3500);
      setTimeout(fetchStatus, 9000);
    },
    [fetchStatus, identityKey]
  );

  const statusImg = computed.remaining > 0 ? "/assets/logros/tab-diarias.webp" : "/assets/logros/estado-reclamado.webp";
  const titleMain = "VOTOS DIARIOS";
  const progressText = computed.remaining > 0 ? `HOY ${computed.done}/${computed.total}` : "COMPLETADO";
  const progressPercent = Math.max(0, Math.min(100, computed.progress * 100));
  const isMin = !open;

  const topList = Array.isArray(topState.list) ? topState.list : [];
  const top3 = topList.slice(0, 3);
  const topRest = topList.slice(3, 10);
  const showGuest = !userUuid && !userName;

  const PAGE_SIZE = 5;
  const primarySites = computed.items.slice(0, PAGE_SIZE);
  const remainingSites = computed.items.slice(PAGE_SIZE);

  const morePageCount = Math.max(1, Math.ceil(remainingSites.length / PAGE_SIZE));
  const morePageClamped = Math.min(Math.max(0, morePage), morePageCount - 1);
  const moreSliceStart = morePageClamped * PAGE_SIZE;
  const moreSliceEnd = moreSliceStart + PAGE_SIZE;
  const moreSitesPage = remainingSites.slice(moreSliceStart, moreSliceEnd);

  if (!visible) return null;

  return (
    <div ref={rootRef} className={`vote-widget-mini is-minecraft no-tap-highlight ${isMin ? "is-min" : ""} ${open ? "is-open" : ""}`}>
      <button
        type="button"
        className="vw-pill-mini no-tap-highlight"
        onClick={handlePillClick}
        aria-expanded={open}
        aria-label={open ? "Cerrar panel de votos" : "Abrir panel de votos"}
      >
        <span className="vw-head">
          <span className="vw-crest" aria-hidden="true">
            {/* Asegúrate de cambiar la ruta si usas uno de los nuevos íconos en lugar de "/assets/voto.png" */}
            <img src="/assets/voto.png" alt="" className="vw-crest__img" loading="lazy" />
          </span>

          <span className="vw-head__mid">
            <span className="vw-head__titleRow">
              <span className="vw-head__title">{titleMain}</span>
              <span className="vw-head__badge" aria-hidden="true">
                <img src={statusImg} alt="" className="vw-head__badgeImg" loading="lazy" />
              </span>
            </span>

            <span className="vw-head__progress">
              <span className="vw-head__bar" aria-hidden="true">
                <span className="vw-head__barFill" style={{ width: `${progressPercent}%` }} />
              </span>
              <span className="vw-head__progressText">{progressText}</span>
            </span>
          </span>

          <span className="vw-arrow" aria-hidden="true">
            <span className="vw-arrow__icon" />
          </span>
        </span>
      </button>

      <div className={`vw-panel-miniWrapper ${open ? "is-open" : ""}`} style={{ maxHeight: open ? panelMaxHeight : 0 }}>
        <div ref={panelInnerRef} className="vw-panel-mini" role="dialog" aria-label="Panel de votos">
          
          {showGuest && (
            <div className="vw-guest vw-guest--compact">
              <div className="vw-guest__row">
                <input
                  className="vw-guest__input no-tap-highlight"
                  value={guestNick}
                  onChange={(e) => {
                    setGuestNick(cleanNick(e.target.value));
                    if (guestSaved) setGuestSaved(false);
                  }}
                  placeholder="Tu nick"
                  maxLength={16}
                  aria-label="Nick invitado"
                />
                <button
                  type="button"
                  className={`vw-guest__save no-tap-highlight ${guestSaved ? "is-saved" : ""}`}
                  onClick={() => {
                    const n = cleanNick(guestNick);
                    window.localStorage.setItem("vw_guest_nick", n);
                    setGuestNick(n);
                    setGuestSaved(true);
                    setTimeout(() => setGuestSaved(false), 1100);
                    setTimeout(fetchStatus, 0);
                  }}
                  disabled={!cleanNick(guestNick)}
                  aria-label="Guardar nick"
                  title="Guardar"
                >
                  <CheckIcon filled={guestSaved} />
                </button>
              </div>
              <div className="vw-guest__hint">Se guarda en navegador.</div>
            </div>
          )}

          <div className="vw-list-mini">
            {primarySites.map((s, idx) => {
              const isPending = !!pending[s.id];
              const btnText = !s.available ? msToHMS(s.left) : isPending ? "…" : "VOTAR";
              const isLift = hoverSiteId === s.id || liftSiteId === s.id;

              return (
                <React.Fragment key={s.id}>
                  <div className="vw-row-mini" style={{ "--i": idx }}>
                    <div className="vw-order-mini">
                      <span className="vw-orderTxt">#{idx + 1}</span>
                    </div>

                    <div className={`vw-site-mini ${isLift ? "is-lift" : ""}`} aria-hidden="true">
                      <img
                        src={s.favicon} alt="" className="vw-site-mini__img" loading="lazy" referrerPolicy="no-referrer"
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
                        className={`vw-btn-mini no-tap-highlight ${s.available ? "is-store" : "is-locked"} ${isPending ? "is-pending" : ""}`}
                        onClick={() => handleVoteClick(s)}
                        onMouseEnter={() => setHoverSiteId(s.id)}
                        onMouseLeave={() => setHoverSiteId("")}
                        onFocus={() => setHoverSiteId(s.id)}
                        onBlur={() => setHoverSiteId("")}
                        disabled={!s.available || isPending}
                        title={!s.available ? `Disponible en ${msToHMS(s.left)}` : "Abrir voto"}
                      >
                        <span className="vw-btn-mini__label">{btnText}</span>
                      </button>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}

            {remainingSites.length > 0 && (
              <>
                <button type="button" className={`vw-moreToggle no-tap-highlight ${moreOpen ? "is-open" : ""}`} onClick={() => setMoreOpen((v) => !v)}>
                  <span className="vw-moreToggle__txt">{moreOpen ? "Ocultar" : "Mostrar más"}</span>
                  <span className="vw-moreToggle__chev" aria-hidden="true"><ChevronMini up={moreOpen} /></span>
                </button>

                {moreOpen && (
                  <div className="vw-moreWrap">
                    {moreSitesPage.map((s, i) => {
                      const idxReal = PAGE_SIZE + moreSliceStart + i;
                      const isPending = !!pending[s.id];
                      const btnText = !s.available ? msToHMS(s.left) : isPending ? "…" : "VOTAR";
                      const isLift = hoverSiteId === s.id || liftSiteId === s.id;

                      return (
                        <div className="vw-row-mini vw-row-mini--more" style={{ "--i": i }} key={s.id}>
                          <div className="vw-order-mini">
                            <span className="vw-orderTxt">#{idxReal + 1}</span>
                          </div>
                          <div className={`vw-site-mini ${isLift ? "is-lift" : ""}`} aria-hidden="true">
                            <img
                              src={s.favicon} alt="" className="vw-site-mini__img" loading="lazy" referrerPolicy="no-referrer"
                              onError={(e) => {
                                const parent = e.currentTarget.parentElement;
                                if (parent) parent.classList.add("is-fallback");
                              }}
                            />
                            <span className="vw-site-mini__fallback">{String(s.label || "?").slice(0, 2).toUpperCase()}</span>
                          </div>
                          <div className="vw-action-mini">
                            <button
                              type="button"
                              className={`vw-btn-mini no-tap-highlight ${s.available ? "is-store" : "is-locked"} ${isPending ? "is-pending" : ""}`}
                              onClick={() => handleVoteClick(s)}
                              onMouseEnter={() => setHoverSiteId(s.id)}
                              onMouseLeave={() => setHoverSiteId("")}
                              onFocus={() => setHoverSiteId(s.id)}
                              onBlur={() => setHoverSiteId("")}
                              disabled={!s.available || isPending}
                            >
                              <span className="vw-btn-mini__label">{btnText}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {morePageCount > 1 && (
                      <div className="vw-morePager">
                        <button
                          type="button" className="vw-morePager__btn no-tap-highlight"
                          onClick={() => setMorePage((p) => Math.max(0, p - 1))}
                          disabled={morePageClamped <= 0} aria-label="Página anterior"
                        >‹</button>
                        <span className="vw-morePager__info">{morePageClamped + 1}/{morePageCount}</span>
                        <button
                          type="button" className="vw-morePager__btn no-tap-highlight"
                          onClick={() => setMorePage((p) => Math.min(morePageCount - 1, p + 1))}
                          disabled={morePageClamped >= morePageCount - 1} aria-label="Página siguiente"
                        >›</button>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {topList.length > 0 && (
            <div className="vw-top-mini vw-top-mini--compact">
              <div className="vw-top-mini__title">
                <span className="vw-top-mini__titleText">TOP VOTANTES TOTALES</span>
              </div>

              <div className="vw-top-mini__rows vw-top-mini__rows--top3">
                {top3.map((t, i) => {
                  const rank = i + 1;
                  const name = t.uid || t.nombre || t.nombre_minecraft || "Desconocido";
                  const rangoKey = normalizarRango(t.rango_usuario);
                  const uuid = t.uuid || t.uuid_jugador || "";
                  const cands = headCandidates({ uuid, name, size: 24 });

                  return (
                    <button
                      key={`top3-${uuid || name}-${rank}`}
                      type="button"
                      className={`vw-toprow is-top${rank} is-${rangoKey} no-tap-highlight`}
                      onClick={() => navigate(`/perfil/${encodeURIComponent(name)}`)}
                      title="Abrir perfil"
                    >
                      <span className="vw-toprow__rank">#{rank}</span>
                      <span className="vw-toprow__headWrap" aria-hidden="true">
                        {rank === 1 && (
                          <span className="vw-toprow__crown" aria-hidden="true"><CrownIcon /></span>
                        )}
                        <img
                          className="vw-toprow__head" alt="" loading="lazy" referrerPolicy="no-referrer"
                          src={cands[0]} ref={(el) => el && bindImgFallback(el, cands)} onError={advanceImgFallback}
                        />
                      </span>
                      <span className={`vw-toprow__name is-${rangoKey}`}>{name}</span>
                      <span className="vw-toprow__votes" aria-label="Votos totales">
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
                  const cands = headCandidates({ uuid, name, size: 20 });

                  return (
                    <button
                      key={`rest-${uuid || name}-${rank}`}
                      type="button"
                      className={`vw-toprow is-rest is-${rangoKey} no-tap-highlight`}
                      onClick={() => navigate(`/perfil/${encodeURIComponent(name)}`)}
                      title="Abrir perfil"
                    >
                      <span className="vw-toprow__rank">#{rank}</span>
                      <span className="vw-toprow__headWrap" aria-hidden="true">
                        <img
                          className="vw-toprow__head" alt="" loading="lazy" referrerPolicy="no-referrer"
                          src={cands[0]} ref={(el) => el && bindImgFallback(el, cands)} onError={advanceImgFallback}
                        />
                      </span>
                      <span className={`vw-toprow__name is-${rangoKey}`}>{name}</span>
                      <span className="vw-toprow__votes" aria-label="Votos totales">
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