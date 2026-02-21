import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion as Motion } from "framer-motion";
import "../../styles/components/Voto/voto-page.scss";

const API_BASE =
  (import.meta.env.VITE_BACKEND_URL || "https://flancraft-backend.onrender.com")
    .trim()
    .replace(/\/$/, "");

const HOUR = 60 * 60 * 1000;
const COOLDOWN_24H = 24 * HOUR;
const COOLDOWN_15H = 15 * HOUR;

const REWARD_COINS = 80;
const AD_SECONDS = 30;

const SITES = [
  {
    id: "web",
    label: "Voto en la web",
    subtitle: "Haz una mini-tarea y suma tu voto",
    cooldownMs: COOLDOWN_24H,
    kind: "web",
  },
  {
    id: "v1",
    label: "ServidoresDeMinecraft",
    url: "https://servidoresdeminecraft.es/server/vote/wvkYI63n/play.flancraft.com#google_vignette",
    cooldownMs: COOLDOWN_15H,
    kind: "external",
  },
  {
    id: "v2",
    label: "Minecraft-Server",
    url: "https://minecraft-server.net/vote/FlanCraft/",
    cooldownMs: COOLDOWN_24H,
    kind: "external",
  },
  {
    id: "v3",
    label: "MineStatus",
    url: "https://minestatus.net/server/vote/play.flancraft.com",
    cooldownMs: COOLDOWN_24H,
    kind: "external",
  },
  {
    id: "v4",
    label: "Minecraft-MP",
    url: "https://minecraft-mp.com/server/333849/vote/",
    cooldownMs: COOLDOWN_24H,
    kind: "external",
  },
  {
    id: "v5",
    label: "MinecraftServers",
    url: "https://minecraftservers.org/vote/663927",
    cooldownMs: COOLDOWN_24H,
    kind: "external",
  },
];

function safeJson(str, fallback) {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

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
  } catch {}
}

function normalizarRango(r) {
  const s = String(r || "").toLowerCase().trim();
  if (s.includes("nova")) return "nova";
  if (s.includes("alpha")) return "alpha";
  if (s.includes("inmortal")) return "inmortal";
  return "unrank";
}

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

function ShieldIcon() {
  return (
    <svg className="vp-ico" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 2 20 6v6c0 5.25-3.5 9.75-8 10-4.5-.25-8-4.75-8-10V6l8-4Z"
        fill="currentColor"
      />
      <path
        d="M8.2 12.2 10.6 14.6 16 9.2"
        fill="none"
        stroke="rgba(10,13,20,0.95)"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BoltIcon() {
  return (
    <svg className="vp-ico" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M13 2 4 14h7l-1 8 10-14h-7l0-6Z"
        fill="currentColor"
      />
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg className="vp-ico" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M7 4h10v3c0 3.1-2.2 5.7-5 6.3V16h4v2H8v-2h4v-2.7C9.2 12.7 7 10.1 7 7V4Z"
        fill="currentColor"
      />
      <path
        d="M5 6H3v2c0 2.2 1.8 4 4 4V10C5.9 9.6 5 8.4 5 7V6Zm16 0h-2v1c0 1.4-.9 2.6-2 3v2c2.2 0 4-1.8 4-4V6Z"
        fill="currentColor"
        opacity="0.9"
      />
    </svg>
  );
}

function WebVoteGlyph() {
  return (
    <svg className="vp-webGlyph" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 2a10 10 0 1 0 .001 20.001A10 10 0 0 0 12 2Zm7.7 9h-3.1a14.8 14.8 0 0 0-1.1-5A8.03 8.03 0 0 1 19.7 11ZM12 4.3c.8 1.1 1.8 3 2.3 6.7H9.7c.5-3.7 1.5-5.6 2.3-6.7ZM8.5 6a14.8 14.8 0 0 0-1.1 5H4.3A8.03 8.03 0 0 1 8.5 6ZM4.3 13h3.1c.2 1.8.7 3.6 1.1 5A8.03 8.03 0 0 1 4.3 13Zm5.4 0h4.6c-.5 3.7-1.5 5.6-2.3 6.7-.8-1.1-1.8-3-2.3-6.7Zm6.8 5c.5-1.4.9-3.2 1.1-5h3.1a8.03 8.03 0 0 1-4.2 5Z"
        fill="currentColor"
      />
    </svg>
  );
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export default function VotoPage() {
  const navigate = useNavigate();
  const listRef = useRef(null);

  const [serverStatus, setServerStatus] = useState(null);
  const [topState, setTopState] = useState({ list: [], total: 0, page: 0, limit: 10 });
  const [pending, setPending] = useState({});
  const [serverOffsetMs, setServerOffsetMs] = useState(0);
  const [nowTick, setNowTick] = useState(0);

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

  const [guestNick, setGuestNick] = useState(() =>
    cleanNick(window.localStorage.getItem("vw_guest_nick") || "")
  );
  const [guestSaved, setGuestSaved] = useState(false);

  const deviceId = useMemo(() => ensureDeviceId(), []);
  const effectiveNick = cleanNick(userName || guestNick);
  const identityKey = (userUuid || effectiveNick || deviceId || "device").trim();

  const showGuest = !userUuid && !userName;

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
    } catch {}
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
    } catch {}
  }, []);

  useEffect(() => {
    fetchStatus();
    fetchTop(0, 10);

    const id = setInterval(fetchStatus, 9000);
    return () => clearInterval(id);
  }, [fetchStatus, fetchTop]);

  useEffect(() => {
    setNowTick(Date.now());
    const id = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

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
          favicon: s.url ? faviconUrlFor(s.url) : "",
          cooldownMs,
          available,
          left: Math.max(0, left),
          nextAvail: !available ? nowMs + Math.max(0, left) : 0,
          rewardCoins: Number(row.reward_coins ?? row.rewardCoins ?? REWARD_COINS) || REWARD_COINS,
          real: true,
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
        favicon: s.url ? faviconUrlFor(s.url) : "",
        available,
        left,
        nextAvail,
        cooldownMs: s.cooldownMs || COOLDOWN_24H,
        rewardCoins: REWARD_COINS,
        real: false,
      };
    });

    const done = items.filter((i) => !i.available).length;
    const total = items.length;
    const remaining = total - done;
    const progress = total ? done / total : 0;

    return { items, done, total, remaining, progress, real: false };
  }, [serverStatus, serverOffsetMs, nowTick, identityKey]);

  const progressPercent = Math.max(0, Math.min(100, computed.progress * 100));
  const progressText =
    computed.remaining > 0 ? `HOY ${computed.done}/${computed.total}` : "COMPLETADO";

  const onOpenExternal = useCallback(
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

  const [webOpen, setWebOpen] = useState(false);
  const [webStep, setWebStep] = useState("task");
  const [webError, setWebError] = useState("");
  const [taskTarget, setTaskTarget] = useState(0);
  const [taskPick, setTaskPick] = useState(null);
  const [adLeft, setAdLeft] = useState(AD_SECONDS);

  const taskOptions = useMemo(
    () => [
      { id: 0, k: "emerald", label: "ESMERALDA" },
      { id: 1, k: "diamond", label: "DIAMANTE" },
      { id: 2, k: "gold", label: "ORO" },
      { id: 3, k: "amethyst", label: "AMATISTA" },
    ],
    []
  );

  const openWebVote = useCallback(() => {
    setWebError("");
    setTaskPick(null);
    setTaskTarget(randInt(0, taskOptions.length - 1));
    setAdLeft(AD_SECONDS);
    setWebStep("task");
    setWebOpen(true);
  }, [taskOptions.length]);

  const closeWebVote = useCallback(() => {
    setWebOpen(false);
    setWebError("");
    setTaskPick(null);
    setWebStep("task");
  }, []);

  useEffect(() => {
    if (!webOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [webOpen]);

  useEffect(() => {
    if (!webOpen || webStep !== "ad") return;

    setAdLeft(AD_SECONDS);
    const id = setInterval(() => {
      setAdLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [webOpen, webStep]);

  const finalizeWebVote = useCallback(async () => {
    const t = Date.now();
    setLocalLast(identityKey, "web", t);
    setPending((prev) => ({ ...prev, web: t }));

    try {
      const payload = {
        key: (userUuid || effectiveNick || deviceId || "device").trim(),
        uuid: String(userUuid || "").trim(),
        nick: String(effectiveNick || "").trim(),
        deviceId: String(deviceId || "").trim(),
      };

      const r = await fetch(`${API_BASE}/api/votos/web-vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!r.ok) {
        setWebError("No se pudo registrar el voto ahora mismo. Inténtalo en unos segundos.");
        setWebStep("done");
        setTimeout(fetchStatus, 1200);
        setTimeout(fetchTop, 1200);
        return;
      }

      setWebError("");
      setWebStep("done");
      setTimeout(fetchStatus, 1200);
      setTimeout(fetchTop, 1200);
    } catch {
      setWebError("No se pudo registrar el voto ahora mismo. Inténtalo en unos segundos.");
      setWebStep("done");
      setTimeout(fetchStatus, 1200);
      setTimeout(fetchTop, 1200);
    }
  }, [API_BASE, deviceId, effectiveNick, fetchStatus, fetchTop, identityKey, userUuid]);

  useEffect(() => {
    if (!webOpen) return;
    if (webStep !== "ad") return;
    if (adLeft !== 0) return;
    finalizeWebVote();
  }, [webOpen, webStep, adLeft, finalizeWebVote]);

  const onPickTask = useCallback(
    (id) => {
      setTaskPick(id);
      if (id === taskTarget) {
        setTimeout(() => setWebStep("ad"), 220);
      } else {
        setWebError("Casi. Prueba otra.");
        setTimeout(() => setWebError(""), 900);
      }
    },
    [taskTarget]
  );

  const topList = Array.isArray(topState.list) ? topState.list : [];
  const top3 = topList.slice(0, 3);
  const topRest = topList.slice(3, 12);

  const scrollToList = () => {
    listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section className="votoPage">
      <header className="votoPage__hero">
        <div className="votoPage__heroBg" aria-hidden="true" />
        <div className="votoPage__heroFade" aria-hidden="true" />

        <div className="votoPage__heroInner">
          <div className="votoPage__topRow">
            <Link to="/" className="votoPage__navBtn">
              Volver
            </Link>

            <div className="votoPage__topRowMid" />

            <Link to="/noticias" className="votoPage__navBtn is-alt">
              Noticias
            </Link>
          </div>

          <Motion.h1
            className="votoPage__title"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            VOTO
          </Motion.h1>

          <Motion.p
            className="votoPage__subtitle"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05 }}
          >
            Completa tus votos diarios y gana Coins para tu wallet.
          </Motion.p>

          <div className="votoPage__heroCard">
            <div className="votoHero__row">
              <div className="votoHero__left">
                <div className="votoHero__kicker">
                  <span className="votoHero__kickerDot" aria-hidden="true" />
                  VOTOS DIARIOS
                </div>
                <div className="votoHero__meta">
                  <span className="votoHero__metaItem">{progressText}</span>
                  <span className="votoHero__metaSep" aria-hidden="true" />
                  <span className="votoHero__metaItem">
                    Recompensa: <b>+{REWARD_COINS} Coins</b> por voto
                  </span>
                </div>
              </div>

              <div className="votoHero__right">
                <span className="votoHero__chip is-safe">
                  <span className="votoHero__chipIco" aria-hidden="true">
                    <ShieldIcon />
                  </span>
                  SEGURO
                </span>

                <span className="votoHero__chip is-fast">
                  <span className="votoHero__chipIco" aria-hidden="true">
                    <BoltIcon />
                  </span>
                  RÁPIDO
                </span>
              </div>
            </div>

            <div className="votoHero__barWrap" aria-hidden="true">
              <div className="votoHero__bar">
                <div className="votoHero__barFill" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>

            <div className="votoHero__how">
              <span className="votoHero__howTitle">CÓMO FUNCIONA:</span>
              <span className="votoHero__howTxt">
                eliges un sitio, confirmas, pasas una pausa corta para apoyar la web y se abre el voto.
                Tus Coins se suman a tu wallet cuando el voto se registra.
              </span>
            </div>

            <div className="votoHero__ctaRow">
              <button type="button" className="votoHero__cta" onClick={scrollToList}>
                Ver lista
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="votoPage__body" ref={listRef}>
        <div className="votoPage__bodyInner">
          <div className="votoPage__grid">
            <section className="vpPanel vpPanel--vote">
              <div className="vpPanel__head">
                <h2 className="vpPanel__title">Votar ahora</h2>

                <span className={`vpLive ${computed.real ? "is-real" : ""}`}>
                  {computed.real ? "Estado en vivo" : "Modo local"}
                </span>
              </div>

              {showGuest && (
                <div className="vpGuest">
                  <div className="vpGuest__row">
                    <div className="vpGuest__label">Tu nick</div>

                    <div className="vpGuest__controls">
                      <input
                        className="vpGuest__input"
                        value={guestNick}
                        onChange={(e) => setGuestNick(cleanNick(e.target.value))}
                        placeholder="Escribe tu nick"
                        maxLength={16}
                        aria-label="Nick invitado"
                      />

                      <button
                        type="button"
                        className={`vpGuest__save ${guestSaved ? "is-saved" : ""}`}
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
                        Guardar
                      </button>
                    </div>
                  </div>

                  <div className="vpGuest__hint">
                    Se guarda en este navegador (solo para gestionar cooldowns).
                  </div>
                </div>
              )}

              <div className="vpList">
                {computed.items.map((s, idx) => {
                  const isPending = !!pending[s.id];
                  const disabled = !s.available || isPending;

                  const btnText = !s.available ? msToHMS(s.left) : isPending ? "…" : "VOTAR";
                  const isWeb = s.kind === "web";

                  return (
                    <div
                      key={s.id}
                      className={`vpItem ${isWeb ? "is-web" : ""} ${!s.available ? "is-locked" : ""}`}
                      style={{ "--i": idx }}
                    >
                      <div className="vpItem__left">
                        <div className="vpItem__badge" aria-hidden="true">
                          {isWeb ? (
                            <span className="vpItem__badgeWeb">
                              <WebVoteGlyph />
                            </span>
                          ) : (
                            <img
                              src={s.favicon}
                              alt=""
                              loading="lazy"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                const el = e.currentTarget;
                                el.style.display = "none";
                              }}
                            />
                          )}
                        </div>

                        <div className="vpItem__text">
                          <div className="vpItem__titleRow">
                            <div className="vpItem__title">{String(s.label || "").toUpperCase()}</div>

                            <div className="vpItem__reward">
                              +{Number(s.rewardCoins || REWARD_COINS)} <span>COINS</span>
                            </div>
                          </div>

                          <div className="vpItem__sub">
                            {s.subtitle
                              ? s.subtitle
                              : "Recompensa al votar + Coins a tu wallet"}
                          </div>

                          <div className="vpItem__mini">
                            <span className={`vpPill ${s.available ? "is-ok" : "is-wait"}`}>
                              {s.available ? "Disponible" : "En espera"}
                            </span>

                            <span className="vpDot" aria-hidden="true" />

                            <span className="vpMiniTxt">
                              Cooldown: {Math.round((Number(s.cooldownMs || COOLDOWN_24H) || COOLDOWN_24H) / HOUR)}h
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="vpItem__right">
                        <button
                          type="button"
                          className={`vpBtn ${s.available ? "is-go" : "is-locked"} ${isPending ? "is-pending" : ""}`}
                          disabled={disabled}
                          onClick={() => {
                            if (!s.available || isPending) return;
                            if (isWeb) openWebVote();
                            else onOpenExternal(s);
                          }}
                          title={
                            !s.available
                              ? `Disponible en ${msToHMS(s.left)}`
                              : isWeb
                              ? "Votar dentro de la web"
                              : "Abrir voto"
                          }
                        >
                          <span className="vpBtn__label">{btnText}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="vpFootNote">
                Consejo: si acabas de votar, la wallet puede tardar unos segundos en reflejarlo.
              </div>
            </section>

            <section className="vpPanel vpPanel--top">
              <div className="vpPanel__head">
                <h2 className="vpPanel__title">
                  <span className="vpPanel__titleIco" aria-hidden="true">
                    <TrophyIcon />
                  </span>
                  TOP VOTANTES (30 DÍAS)
                </h2>

                <span className="vpPanel__meta">{Number(topState.total || 0)} jugadores</span>
              </div>

              <div className="vpTop">
                {top3.map((t, i) => {
                  const rank = i + 1;
                  const name = t.uid || t.nombre || t.nombre_minecraft || "Desconocido";
                  const rangoKey = normalizarRango(t.rango_usuario);
                  const uuid = t.uuid || t.uuid_jugador || "";
                  const cands = headCandidates({
                    uuid,
                    name,
                    size: rank === 1 ? 44 : rank === 2 ? 40 : 38,
                  });

                  return (
                    <button
                      key={`top3-${uuid || name}-${rank}`}
                      type="button"
                      className={`vpTopCard is-top${rank} is-${rangoKey}`}
                      onClick={() => navigate(`/perfil/${encodeURIComponent(name)}`)}
                      title="Abrir perfil"
                    >
                      <span className="vpTopCard__rank">#{rank}</span>

                      <span className="vpTopCard__headWrap" aria-hidden="true">
                        <img
                          className="vpTopCard__head"
                          alt=""
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          src={cands[0]}
                          ref={(el) => el && bindImgFallback(el, cands)}
                          onError={advanceImgFallback}
                        />
                      </span>

                      <span className="vpTopCard__name">{name}</span>

                      <span className="vpTopCard__votes">
                        <span className="vpTopCard__votesTxt">VOTOS</span>
                        <span className="vpTopCard__votesNum">{Number(t.votos || 0) || 0}</span>
                      </span>
                    </button>
                  );
                })}

                <div className="vpTopList">
                  {topRest.map((t, i) => {
                    const rank = 3 + i + 1;
                    const name = t.uid || t.nombre || t.nombre_minecraft || "Desconocido";
                    const rangoKey = normalizarRango(t.rango_usuario);
                    const uuid = t.uuid || t.uuid_jugador || "";
                    const cands = headCandidates({ uuid, name, size: 28 });

                    return (
                      <button
                        key={`rest-${uuid || name}-${rank}`}
                        type="button"
                        className={`vpTopRow is-${rangoKey}`}
                        onClick={() => navigate(`/perfil/${encodeURIComponent(name)}`)}
                        title="Abrir perfil"
                      >
                        <span className="vpTopRow__rank">#{rank}</span>

                        <span className="vpTopRow__headWrap" aria-hidden="true">
                          <img
                            className="vpTopRow__head"
                            alt=""
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            src={cands[0]}
                            ref={(el) => el && bindImgFallback(el, cands)}
                            onError={advanceImgFallback}
                          />
                        </span>

                        <span className="vpTopRow__name">{name}</span>

                        <span className="vpTopRow__votes">{Number(t.votos || 0) || 0}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="vpTopFoot">
                El top se actualiza en vivo. Si acabas de votar, dale unos segundos.
              </div>
            </section>
          </div>

          <section className="vpInfo">
            <div className="vpInfo__head">
              <h3 className="vpInfo__title">Guía rápida</h3>
              <span className="vpInfo__badge">Coins a la wallet</span>
            </div>

            <div className="vpInfo__steps">
              <div className="vpStep">
                <div className="vpStep__n">1</div>
                <div className="vpStep__t">Elige un sitio</div>
                <div className="vpStep__d">Haz clic en VOTAR cuando esté disponible.</div>
              </div>

              <div className="vpStep">
                <div className="vpStep__n">2</div>
                <div className="vpStep__t">Pausa corta</div>
                <div className="vpStep__d">Te pediremos una mini-tarea / pausa para apoyar la web.</div>
              </div>

              <div className="vpStep">
                <div className="vpStep__n">3</div>
                <div className="vpStep__t">Recompensa</div>
                <div className="vpStep__d">Al registrarse el voto, sumas Coins a tu wallet.</div>
              </div>
            </div>
          </section>
        </div>
      </main>

      <AnimatePresence>
        {webOpen && (
          <Motion.div
            className="vpModalBack"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) closeWebVote();
            }}
            role="dialog"
            aria-label="Voto en la web"
          >
            <Motion.div
              className="vpModal"
              initial={{ opacity: 0, y: 14, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 14, scale: 0.98 }}
              transition={{ duration: 0.18 }}
            >
              <div className="vpModal__head">
                <div className="vpModal__title">
                  <span className="vpModal__titleIco" aria-hidden="true">
                    <WebVoteGlyph />
                  </span>
                  Voto en la web
                </div>

                <button type="button" className="vpModal__close" onClick={closeWebVote} aria-label="Cerrar">
                  ✕
                </button>
              </div>

              <div className="vpModal__body">
                {webStep === "task" && (
                  <div className="vpModalStep">
                    <div className="vpModalStep__k">
                      MINI-TAREA
                      <span className="vpModalStep__kPill">rápida</span>
                    </div>

                    <div className="vpModalStep__h">
                      Selecciona:{" "}
                      <b>{taskOptions.find((x) => x.id === taskTarget)?.label || "?"}</b>
                    </div>

                    <div className="vpTaskGrid">
                      {taskOptions.map((o) => {
                        const isPick = taskPick === o.id;
                        const isOk = isPick && o.id === taskTarget;
                        const isBad = isPick && o.id !== taskTarget;

                        return (
                          <button
                            key={o.k}
                            type="button"
                            className={`vpTaskCard ${isOk ? "is-ok" : ""} ${isBad ? "is-bad" : ""}`}
                            onClick={() => onPickTask(o.id)}
                          >
                            <span className={`vpTaskGem is-${o.k}`} aria-hidden="true" />
                            <span className="vpTaskTxt">{o.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {webError ? <div className="vpModalErr">{webError}</div> : null}

                    <div className="vpModalFoot">
                      <div className="vpModalFoot__hint">
                        Tras acertar, verás una pausa corta y tu voto se registrará.
                      </div>

                      <div className="vpModalFoot__actions">
                        <button type="button" className="vpGhost" onClick={closeWebVote}>
                          Cancelar
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {webStep === "ad" && (
                  <div className="vpModalStep">
                    <div className="vpModalStep__k">
                      PAUSA PATROCINADA
                      <span className="vpModalStep__kPill is-gold">apoyo</span>
                    </div>

                    <div className="vpAdBox">
                      <div className="vpAdBox__title">Gracias por apoyar la web</div>
                      <div className="vpAdBox__sub">
                        Esto mantiene activa la sección de voto y los eventos.
                      </div>

                      <div className="vpAdTimer" aria-label="Tiempo restante">
                        <span className="vpAdTimer__num">{adLeft}</span>
                        <span className="vpAdTimer__txt">seg</span>
                      </div>

                      <div className="vpAdBar" aria-hidden="true">
                        <div
                          className="vpAdBar__fill"
                          style={{
                            width: `${Math.max(
                              0,
                              Math.min(100, ((AD_SECONDS - adLeft) / AD_SECONDS) * 100)
                            )}%`,
                          }}
                        />
                      </div>

                      <div className="vpAdBox__note">
                        Cuando termine, registramos tu voto y sumas Coins.
                      </div>
                    </div>

                    <div className="vpModalFoot">
                      <div className="vpModalFoot__hint">
                        No cierres esta ventana para que el voto se registre correctamente.
                      </div>

                      <div className="vpModalFoot__actions">
                        <button type="button" className="vpGhost" onClick={closeWebVote}>
                          Cerrar
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {webStep === "done" && (
                  <div className="vpModalStep">
                    <div className="vpModalStep__k">
                      LISTO
                      <span className="vpModalStep__kPill is-green">voto</span>
                    </div>

                    <div className="vpDone">
                      <div className="vpDone__title">
                        {webError ? "No se pudo registrar" : "Voto registrado"}
                      </div>

                      <div className="vpDone__sub">
                        {webError
                          ? webError
                          : `Si no ves la wallet al instante, dale unos segundos. (+${REWARD_COINS} Coins)`}
                      </div>

                      <div className="vpDone__actions">
                        <button type="button" className="vpBtnBig" onClick={() => closeWebVote()}>
                          Volver
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Motion.div>
          </Motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
