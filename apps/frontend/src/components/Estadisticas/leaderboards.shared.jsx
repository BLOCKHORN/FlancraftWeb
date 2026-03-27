import { useEffect, useMemo, useState } from "react";
import { apiUrl } from "../../lib/env";
import {
  getPlatform,
  isNombreValido,
  safeNum,
  formatearTiempo,
  formatInt,
} from "./leaderboards.utils";

export const SERVER_ID = "survival";
export const LIMIT = 10;
export const FETCH_LIMIT = 700;
export const EXIT_DELAY_MS = 520;
export const SKELETON_ITEMS = Array.from({ length: LIMIT });

export const ICON_POINTS = "/assets/points.png";
export const ICON_TIME = "/assets/statsperfil/playtime.webp";

export const PLATFORM_ICON = {
  java: "/assets/platform/java.png",
  bedrock: "/assets/platform/bedrock.png",
  other: "",
};

export const RANGO_LOCAL = {
  nova: "/assets/nova.png",
  alpha: "/assets/alpha.png",
  inmortal: "/assets/inmortal.png",
  builder: "",
  helper: "",
  srhelper: "",
  mod: "",
  srmod: "",
  admin: "",
  owner: "",
};

export const RANGO_REMOTE = {
  nova: "https://dunb17ur4ymx4.cloudfront.net/wysiwyg/1447273/2de18b63a83cb0b8df9197a4eab9ca575906152d.png",
  alpha: "https://dunb17ur4ymx4.cloudfront.net/wysiwyg/1447273/9c1a0dd33eb6327f1ceb179080f232bc842e8225.png",
  inmortal: "https://dunb17ur4ymx4.cloudfront.net/wysiwyg/1447273/1aaaa34593db3f2dea9d09a7bd4d985500d69de6.png",
};

export const POINTS_GUIDE = [
  { step: "01", title: "Pica, mata y progresa", text: "Minar, farmear mobs y avanzar de verdad te da la base más fuerte de puntos." },
  { step: "02", title: "El PvP sí cuenta", text: "Ganar peleas suma bastante. Si eres bueno peleando, lo vas a notar rápido." },
  { step: "03", title: "Morir te frena", text: "Las muertes restan. Subir al top no es solo grindear: también importa sobrevivir." },
  { step: "04", title: "El tiempo ayuda", text: "Jugar más suma, pero no vale con estar AFK toda la vida. El progreso real pesa más." },
  { step: "05", title: "La economía empuja", text: "Tener una economía fuerte también suma, pero no regala el top por sí sola." },
  { step: "06", title: "Para ser top hay que ser completo", text: "El ranking premia al jugador que hace de todo bien: progreso, constancia, PvP y cabeza." },
];

export const skinUrlCache = new Map();
export const skinPromiseCache = new Map();

export const hideImg = (e) => { e.currentTarget.style.display = "none"; };

export const fallbackRankImg = (key) => (e) => {
  const el = e.currentTarget;
  const remote = RANGO_REMOTE[key] || "";
  if (!remote || el?.dataset?.didFallback === "1") {
    el.style.display = "none";
    return;
  }
  el.dataset.didFallback = "1";
  el.src = remote;
};

export const cleanPlayerName = (value) => String(value || "").trim().replace(/^\.+/, "");
export const looksLikeBedrockName = (value) => String(value || "").trim().startsWith(".");

export const normalizePlatform = (platform) => {
  const value = String(platform || "").toLowerCase();
  if (value.includes("bedrock")) return "bedrock";
  if (value.includes("java")) return "java";
  return "other";
};

export const normalizeRango = (rango) => {
  const value = String(rango || "").toLowerCase().trim();
  if (!value) return null;
  if (value.includes("inmortal") || value.includes("immortal")) return "inmortal";
  if (value.includes("alpha")) return "alpha";
  if (value.includes("nova")) return "nova";
  if (value.includes("srhelper")) return "srhelper";
  if (value.includes("helper")) return "helper";
  if (value.includes("builder")) return "builder";
  if (value.includes("srmod")) return "srmod";
  if (value.includes("mod")) return "mod";
  if (value.includes("admin")) return "admin";
  if (value.includes("owner")) return "owner";
  return null;
};

export const getMetaRango = (meta, player = null) =>
  meta?.rango_real || meta?.rol_admin || meta?.rango_staff || meta?.rango_usuario || meta?.rango || meta?.rank ||
  player?.rango_real || player?.rol_admin || player?.rango_staff || player?.rango_usuario || player?.rango || player?.rank || null;

export const fetchPlayerSkinUrl = async (uuid, signal) => {
  if (!uuid) return null;
  if (skinUrlCache.has(uuid)) return skinUrlCache.get(uuid) || null;
  if (skinPromiseCache.has(uuid)) return skinPromiseCache.get(uuid);

  const promise = fetch(apiUrl(`/api/usuarios/${uuid}/skin`), { signal })
    .then(async (res) => {
      if (!res.ok) return null;
      const data = await res.json().catch(() => null);
      const skinUrl = String(data?.skin_url || "").trim() || null;
      skinUrlCache.set(uuid, skinUrl);
      return skinUrl;
    })
    .catch(() => null)
    .finally(() => { skinPromiseCache.delete(uuid); });

  skinPromiseCache.set(uuid, promise);
  return promise;
};

export const pickExitSkin = (nombre, platKey, uuid) => {
  const cleanName = cleanPlayerName(nombre);
  const cached = uuid ? skinUrlCache.get(uuid) : null;
  if (cached) return cached;
  return `https://mc-heads.net/avatar/${encodeURIComponent(cleanName)}/128`;
};

export const buildFxPayload = (player, meta) => {
  const nombre = player?.nombre_minecraft || "";
  const platKey = normalizePlatform(player?.platform || getPlatform(player));
  const rangoKey = normalizeRango(getMetaRango(meta, player));
  return { nombre, platKey, rangoKey, skin: pickExitSkin(nombre, platKey, player?.uuid) };
};

export const normalizeLeaderboardItem = (player) => {
  if (!isNombreValido(player?.nombre_minecraft)) return null;
  const uuid = player?.uuid || null;
  const nombre = player?.nombre_minecraft || "";
  const id = String(uuid || nombre.toLowerCase()).trim();
  if (!id) return null;
  return {
    id, uuid, nombre_minecraft: nombre, platform: getPlatform(player),
    tiempo_total: Math.max(0, safeNum(player?.tiempo_jugado)),
    total_points: safeNum(player?.svpoints ?? player?.points ?? 0),
    rango_real: player?.rango_real ?? null,
    rank_change_24h: player?.rank_change_24h ?? null,
    points_gain_24h: player?.points_gain_24h ?? null,
    is_new_24h: !!player?.is_new_24h,
    has_movement_24h: player?.rank_change_24h !== undefined
  };
};

export const decoratePlayer = (player, meta) => {
  const rangoRaw = getMetaRango(meta, player);
  const rangoKey = normalizeRango(rangoRaw);
  const platKey = normalizePlatform(player?.platform);
  return {
    ...player, meta, rangoRaw, rangoKey, platKey,
    tiempoTxt: formatearTiempo(safeNum(player?.tiempo_total)),
    platformIcon: PLATFORM_ICON[platKey] || "",
    rankDelta24h: player?.rank_change_24h ?? null,
    pointsDelta24h: player?.points_gain_24h ?? null,
    isNew24h: !!player?.is_new_24h,
    has_movement_24h: !!player?.has_movement_24h
  };
};

export const HeadLabel = ({ icon, children }) => (
  <span className="lb-th">
    {icon && <img className="lb-thIcon" src={icon} alt="" onError={hideImg} />}
    <span className="lb-thTxt">{children}</span>
  </span>
);

export function LeaderboardSkin({ uuid, nombre }) {
  const [remoteSkinUrl, setRemoteSkinUrl] = useState("");
  const [errorIndex, setErrorIndex] = useState(0);

  const cleanName = cleanPlayerName(nombre);

  const sources = useMemo(() => {
    const list = [];
    if (remoteSkinUrl) list.push(remoteSkinUrl);
    if (cleanName) {
      list.push(`https://mc-heads.net/avatar/${encodeURIComponent(cleanName)}/64`);
    }
    list.push("/assets/skins/default-steve.webp");
    return [...new Set(list.filter(Boolean))];
  }, [remoteSkinUrl, cleanName]);

  useEffect(() => {
    setErrorIndex(0);
    setRemoteSkinUrl("");
  }, [uuid]);

  useEffect(() => {
    if (!uuid) return;
    let active = true;
    const controller = new AbortController();
    fetchPlayerSkinUrl(uuid, controller.signal).then((url) => {
      if (active && url) setRemoteSkinUrl(url);
    });
    return () => { active = false; controller.abort(); };
  }, [uuid]);

  return (
    <img
      src={sources[errorIndex] || "/assets/skins/default-steve.webp"}
      alt=""
      onError={() => { if (errorIndex < sources.length - 1) setErrorIndex(prev => prev + 1); }}
      style={{
        width: "100%", height: "100%", objectFit: "cover",
        objectPosition: "center top", imageRendering: "pixelated", display: "block"
      }}
    />
  );
}

const PlayerTrend = ({ rankDelta24h, pointsDelta24h, isNew24h, hasMovementData }) => {
  if (!hasMovementData) return null;
  if (isNew24h) return <span className="lb-playerTrend lb-playerTrend--new"><span className="lb-playerTrendArrow">✦</span><span className="lb-playerTrendText">NEW</span></span>;
  const rankDelta = Number(rankDelta24h) || 0;
  const pointsDelta = Number(pointsDelta24h) || 0;
  let variant = rankDelta > 0 ? "up" : rankDelta < 0 ? "down" : pointsDelta > 0 ? "gain" : pointsDelta < 0 ? "loss" : "flat";
  return (
    <span className={`lb-playerTrend lb-playerTrend--${variant}`}>
      <span className="lb-playerTrendMove">{rankDelta > 0 ? `▲ ${rankDelta}` : rankDelta < 0 ? `▼ ${Math.abs(rankDelta)}` : "• 0"}</span>
      <span className="lb-playerTrendDivider" />
      <span className="lb-playerTrendPoints">{pointsDelta > 0 ? "+" : ""}{formatInt(pointsDelta)}</span>
    </span>
  );
};

export const PlayerIdentity = ({ player, mobile = false }) => {
  const { nombre_minecraft, rangoKey, rangoRaw, platKey, platformIcon, rankDelta24h, pointsDelta24h, isNew24h, has_movement_24h } = player;
  const rankImg = rangoKey ? RANGO_LOCAL[rangoKey] || RANGO_REMOTE[rangoKey] || "" : "";
  return (
    <div className="lb-player">
      <div className="lb-skin"><LeaderboardSkin uuid={player?.uuid} nombre={nombre_minecraft} /></div>
      <div className="lb-nameWrap">
        <div className="lb-nameLine">
          <div className={`lb-name ${rangoKey ? `is-${rangoKey}` : ""}`}>{nombre_minecraft}</div>
          <PlayerTrend rankDelta24h={rankDelta24h} pointsDelta24h={pointsDelta24h} isNew24h={isNew24h} hasMovementData={has_movement_24h} />
        </div>
        <div className="lb-meta">
          {platKey && (mobile ? 
            <span className={`lb-platform lb-platform--${platKey}`}>{platformIcon && <img className="lb-platformIcon" src={platformIcon} alt="" onError={hideImg} />}<span className="lb-platformDot" /></span> :
            <span className={`lb-platformPill lb-platformPill--${platKey}`}>{platKey.toUpperCase()}</span>
          )}
          {rangoKey && (
            <span className={`lb-rango lb-rango--${rangoKey}`} title={String(rangoRaw || "")}>
              {rankImg ? <img className="lb-rangoIcon" src={rankImg} alt="" onError={fallbackRankImg(rangoKey)} /> : <span className="lb-rangoText">{String(rangoRaw || rangoKey).toUpperCase()}</span>}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};