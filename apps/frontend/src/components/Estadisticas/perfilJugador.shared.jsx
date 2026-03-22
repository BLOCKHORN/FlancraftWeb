import { useEffect, useMemo, useState } from "react";
import { CheckCircle, HourglassMedium, WarningCircle, XCircle } from "phosphor-react";
import { supabase } from "../../lib/supabaseClient";
import { apiUrl } from "../../lib/env";

export const EMPTY = "-";
export const SERVER_ID = "survival";
export const SANCTIONS_LIMIT = 8;
export const nf = new Intl.NumberFormat("es-ES");

export const skinCache = new Map();
export const skinPromiseCache = new Map();

export const RANK_ASSETS = {
  nova: "https://dunb17ur4ymx4.cloudfront.net/wysiwyg/1447273/2de18b63a83cb0b8df9197a4eab9ca575906152d.png",
  alpha: "https://dunb17ur4ymx4.cloudfront.net/wysiwyg/1447273/9c1a0dd33eb6327f1ceb179080f232bc842e8225.png",
  inmortal: "https://dunb17ur4ymx4.cloudfront.net/wysiwyg/1447273/1aaaa34593db3f2dea9d09a7bd4d985500d69de6.png",
  builder: null,
  helper: null,
  srhelper: null,
  mod: null,
  srmod: null,
  admin: null,
  owner: null,
};

export const RANK_STYLES = {
  nova: { className: "is-rank-nova" },
  alpha: { className: "is-rank-alpha" },
  inmortal: { className: "is-rank-inmortal" },
  builder: { className: "is-rank-builder" },
  helper: { className: "is-rank-helper" },
  srhelper: { className: "is-rank-srhelper" },
  mod: { className: "is-rank-mod" },
  srmod: { className: "is-rank-srmod" },
  admin: { className: "is-rank-admin" },
  owner: { className: "is-rank-owner" },
};

export const AVATAR_BACKS = {
  unrank: "/assets/profileunrank.webp",
  nova: "/assets/profilenova.webp",
  alpha: "/assets/profilealpha.webp",
  inmortal: "/assets/profileinmortal.webp",
  builder: "/assets/profileunrank.webp",
  helper: "/assets/profileunrank.webp",
  srhelper: "/assets/profileunrank.webp",
  mod: "/assets/profileunrank.webp",
  srmod: "/assets/profileunrank.webp",
  admin: "/assets/profileunrank.webp",
  owner: "/assets/profileunrank.webp",
};

export const ICONS = {
  tiempo: "/assets/statsperfil/playtime.webp",
  coins: "/assets/statsperfil/coin.png",
  dinero: "/assets/statsperfil/dinero.png",
  muertes: "/assets/statsperfil/deaths.webp",
  kills: "/assets/statsperfil/pvp.webp",
  dmg: "/assets/statsperfil/dmg.png",
  puntos: "/assets/statsperfil/puntos.png",
  trabajos: "/assets/statsperfil/puntos.png",
  bloques_minados: "/assets/statsperfil/mining.webp",
  bloques_colocados: "/assets/statsperfil/build.webp",
  mobs: "/assets/statsperfil/mobs.webp",
  saltos: "/assets/statsperfil/saltos.png",
  caminar: "/assets/statsperfil/caminar.png",
  vuelo: "/assets/statsperfil/vuelo.png",
  diamante: "/assets/statsperfil/diamante.png",
  hierro: "/assets/statsperfil/hierro.png",
  oro: "/assets/statsperfil/oro.png",
  esmeralda: "/assets/statsperfil/esmeralda.png",
  cosecha: "/assets/statsperfil/cosecha.png",
  pesca: "/assets/statsperfil/pesca.png",
};

export const SANCTION_RULES = {
  hacks: ["Jail 12h", "Jail 5d", "Ban perm."],
  fly: ["Jail 6h", "Jail 3d", "Ban perm."],
  insultos: ["Jail 30m", "Jail 5h", "Ban perm."],
  tpakill: ["Jail 6h", "Jail 5d", "Ban perm."],
  grief: ["Jail 2h", "Jail 8h", "Jail 5d"],
  spam: ["Jail 1d", "Jail 10d", "Ban perm."],
  flood: ["Aviso", "Jail 15m", "Jail 2h"],
};

export const fetchJSON = async (url, signal) => {
  const r = await fetch(url, { signal, credentials: "include" });
  const txt = await r.text();
  let data = null;

  try {
    data = txt ? JSON.parse(txt) : null;
  } catch {
    data = null;
  }

  if (!r.ok) {
    const msg = (data && (data.error || data.message)) || `HTTP ${r.status}`;
    throw new Error(msg);
  }

  return data;
};

export const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
export const safe = (v) => (v === null || v === undefined || v === "" ? null : v);

export const cleanPlayerName = (value) => String(value || "").trim().replace(/^\.+/, "");
export const looksLikeBedrockName = (value) => String(value || "").trim().startsWith(".");

export const normalizePlatform = (value) => {
  const s = String(value || "").trim().toLowerCase();
  if (s.includes("bedrock")) return "bedrock";
  if (s.includes("java")) return "java";
  return "other";
};

export const guessPlatform = (platformValue, playerName) => {
  const normalized = normalizePlatform(platformValue);
  if (normalized !== "other") return normalized;
  if (looksLikeBedrockName(playerName)) return "bedrock";
  return "other";
};

export const normalizeRankKey = (value) => {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";

  if (raw.includes("inmortal") || raw.includes("immortal")) return "inmortal";
  if (raw.includes("alpha")) return "alpha";
  if (raw.includes("nova")) return "nova";
  if (raw.includes("srhelper")) return "srhelper";
  if (raw.includes("helper")) return "helper";
  if (raw.includes("builder")) return "builder";
  if (raw.includes("srmod")) return "srmod";
  if (raw.includes("mod")) return "mod";
  if (raw.includes("admin")) return "admin";
  if (raw.includes("owner")) return "owner";

  return "";
};

export const getProfileRank = (jugador) => {
  const value =
    jugador?.rango_real ||
    jugador?.rol_admin ||
    jugador?.rango_staff ||
    jugador?.rango_usuario ||
    jugador?.rank ||
    "";

  return String(value || "").toLowerCase().trim();
};

export const toNumClean = (v) => {
  if (v === null || v === undefined || v === "") return NaN;
  if (typeof v === "number") return v;

  const raw = String(v).trim();
  if (!raw) return NaN;

  const s = raw.replace(/[^\d.,-]/g, "");
  if (!s) return NaN;

  const hasComma = s.includes(",");
  const hasDot = s.includes(".");

  if (hasComma && !hasDot) return Number(s.replace(",", "."));
  if (hasDot && !hasComma) return Number(s);

  if (hasDot && hasComma) {
    const lastComma = s.lastIndexOf(",");
    const lastDot = s.lastIndexOf(".");
    if (lastComma > lastDot) return Number(s.replace(/\./g, "").replace(",", "."));
    return Number(s.replace(/,/g, ""));
  }

  return Number(s);
};

export const toInt = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
};

export const deriveXpStateFromTotal = (xpTotal, niveles) => {
  const total = toInt(xpTotal);
  const rows = Array.isArray(niveles) ? [...niveles].sort((a, b) => Number(a?.nivel) - Number(b?.nivel)) : [];

  if (!rows.length) {
    return {
      nivel: 1,
      xpActualNivel: 0,
      xpRequeridaNivel: 1,
      xpTotalActual: total,
      porcentaje: 0,
    };
  }

  let current = rows[0];

  for (const row of rows) {
    const threshold = toInt(row?.xp_total_acumulada);
    if (total >= threshold) current = row;
    else break;
  }

  const currentThreshold = toInt(current?.xp_total_acumulada);
  const xpRequired = Math.max(1, toInt(current?.xp_requerida || 1));
  const xpInLevel = Math.min(Math.max(0, total - currentThreshold), xpRequired);
  const porcentaje = Math.min(100, (xpInLevel / xpRequired) * 100);

  return {
    nivel: Math.max(1, toInt(current?.nivel || 1)),
    xpActualNivel: xpInLevel,
    xpRequeridaNivel: xpRequired,
    xpTotalActual: total,
    porcentaje,
  };
};

export const fmtMoney = (v, suffix = " $") => {
  const n = toNumClean(v);
  if (!Number.isFinite(n)) return EMPTY;
  return `${nf.format(n)}${suffix}`;
};

export const fmtNum = (v) => {
  const n = toNumClean(v);
  if (!Number.isFinite(n)) return EMPTY;
  return nf.format(n);
};

export const fmtTimeHM = (seconds) => {
  const s = toNumClean(seconds);
  if (!Number.isFinite(s) || s < 0) return EMPTY;
  const totalMin = Math.floor(s / 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}h ${m}m`;
};

export const fmtUpdated = (v) => {
  if (!v) return "";
  const d = new Date(v);
  if (!Number.isFinite(d.getTime())) return String(v);

  try {
    return new Intl.DateTimeFormat("es-ES", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(d);
  } catch {
    return d.toLocaleString("es-ES");
  }
};

export const normalizeServerData = (raw) => {
  if (!raw) return null;
  if (raw.data) return raw.data;
  return raw;
};

export const normalizeXp = (raw) => {
  if (!raw) return null;
  if (raw.data) return raw.data;
  return raw;
};

export const makeMetric = ({ id, label, iconKey, value, lines, hint }) => ({
  id,
  label,
  value: value ?? EMPTY,
  lines: Array.isArray(lines) ? lines.filter(Boolean) : null,
  icon: ICONS[iconKey] || null,
  hint,
});

export const pickServerPoints = (payload) => {
  const p = payload || {};
  const resumen = p?.resumen || p?.summary || null;
  const economia = p?.economia || null;
  const direct = safe(resumen?.points ?? economia?.points);
  if (direct !== null) return direct;
  return safe(resumen?.svpoints ?? economia?.svpoints ?? p?.svpoints);
};

export const sectionIconKey = (k) => {
  if (k === "general") return "bloques_minados";
  if (k === "combate") return "kills";
  if (k === "recursos") return "diamante";
  if (k === "economia") return "dinero";
  if (k === "jobs") return "trabajos";
  return "coins";
};

export const renderMetricValue = (m) => {
  if (Array.isArray(m.lines) && m.lines.length) {
    return (
      <div className="pf-multiValue">
        {m.lines.map((row, i) => (
          <div key={i} className="pf-multiRow">
            <div className="pf-multiLabel">{row.label}</div>
            <div className="pf-multiNum">{row.value}</div>
          </div>
        ))}
      </div>
    );
  }

  return m.value;
};

export const fetchPlayerSkinUrl = async (uuid, signal) => {
  if (!uuid) return null;

  if (skinCache.has(uuid)) {
    return skinCache.get(uuid) || null;
  }

  if (skinPromiseCache.has(uuid)) {
    return skinPromiseCache.get(uuid);
  }

  const promise = fetch(apiUrl(`/api/usuarios/${encodeURIComponent(uuid)}/skin`), {
    signal,
    credentials: "include",
  })
    .then(async (res) => {
      if (!res.ok) return null;
      const data = await res.json().catch(() => null);
      const url = String(data?.skin_url || "").trim() || null;
      skinCache.set(uuid, url);
      return url;
    })
    .catch(() => null)
    .finally(() => {
      skinPromiseCache.delete(uuid);
    });

  skinPromiseCache.set(uuid, promise);
  return promise;
};

export const buildSkinSources = ({ variant, displayName, remoteSkinUrl, platformKey }) => {
  const cleanName = cleanPlayerName(displayName);
  const sources = [];

  if (variant === "body") {
    if (cleanName) sources.push(`https://mc-heads.net/body/${encodeURIComponent(cleanName)}/260`);
    if (remoteSkinUrl) sources.push(remoteSkinUrl);
    sources.push("/assets/skins/default-steve.webp");
    sources.push("https://mc-heads.net/body/Steve/260");
  } else {
    if (remoteSkinUrl) sources.push(remoteSkinUrl);
    if (cleanName) sources.push(`https://mc-heads.net/avatar/${encodeURIComponent(cleanName)}/160`);
    if (platformKey === "bedrock") sources.push("/assets/skins/bedrock-default.webp");
    sources.push("https://mc-heads.net/avatar/Steve/160");
  }

  return Array.from(new Set(sources.filter(Boolean)));
};

export function SkinRender({ variant, uuid, displayName, platformKey, className }) {
  const [remoteSkinUrl, setRemoteSkinUrl] = useState(() => {
    if (!uuid) return "";
    return skinCache.get(uuid) || "";
  });
  const [errorIndex, setErrorIndex] = useState(0);

  const sources = useMemo(
    () =>
      buildSkinSources({
        variant,
        displayName,
        remoteSkinUrl,
        platformKey,
      }),
    [variant, displayName, remoteSkinUrl, platformKey]
  );

  useEffect(() => {
    setErrorIndex(0);
  }, [sources]);

  useEffect(() => {
    if (!uuid) return;

    let active = true;
    const controller = new AbortController();

    fetchPlayerSkinUrl(uuid, controller.signal).then((url) => {
      if (!active || !url) return;
      setRemoteSkinUrl(url);
    });

    return () => {
      active = false;
      controller.abort();
    };
  }, [uuid]);

  const src = sources[Math.min(errorIndex, Math.max(sources.length - 1, 0))];

  return (
    <img
      className={className}
      src={src}
      alt=""
      draggable="false"
      referrerPolicy="no-referrer"
      onError={() => {
        setErrorIndex((prev) => (prev < sources.length - 1 ? prev + 1 : prev));
      }}
    />
  );
}

export const loadXpBundle = async (uuid, signal) => {
  const xpResult = await Promise.allSettled([
    fetchJSON(apiUrl(`/api/usuarios/${encodeURIComponent(uuid)}/xp`), signal),
  ]);

  return {
    xp: xpResult[0]?.status === "fulfilled" ? normalizeXp(xpResult[0].value) : null,
  };
};

export const loadServerBundle = async (uuid, signal) => {
  const data = await fetchJSON(
    apiUrl(`/api/perfil/${encodeURIComponent(uuid)}/servidor/${encodeURIComponent(SERVER_ID)}`),
    signal
  );
  return normalizeServerData(data);
};

export const parseSanctionTimestamp = (t) => {
  if (!t) return null;

  if (typeof t === "string" && !/^\d+$/.test(t.trim())) {
    const d = new Date(t);
    const time = d.getTime();
    return Number.isNaN(time) ? null : time;
  }

  const n = Number(t);
  if (Number.isNaN(n)) return null;

  return n < 1e12 ? n * 1000 : n;
};

export const parseSanctionDurationToMs = (raw) => {
  if (!raw) return null;
  const str = String(raw).toLowerCase().trim();

  if (/(perma|perm|permanent|infinite|∞)/.test(str)) return Infinity;

  if (/^\d+$/.test(str)) {
    const secs = Number(str);
    return secs * 1000;
  }

  const regex = /(\d+)\s*([smhd])/g;
  let match;
  let total = 0;
  const unitMs = { s: 1000, m: 60000, h: 3600000, d: 86400000 };

  while ((match = regex.exec(str)) !== null) {
    const val = parseInt(match[1], 10);
    const unit = match[2];
    total += val * unitMs[unit];
  }

  return total > 0 ? total : null;
};

export const getSanctionEndMs = (timestamp, raw) => {
  const start = parseSanctionTimestamp(timestamp);
  if (!start) return null;
  const ms = parseSanctionDurationToMs(raw);
  if (!ms || ms === Infinity) return null;
  return start + ms;
};

export const getSanctionEndText = (timestamp, raw) => {
  const endMs = getSanctionEndMs(timestamp, raw);
  if (!endMs) return null;
  return new Date(endMs).toLocaleString("es-ES");
};

export const isPermanentSanction = (s) => {
  const bt = String(s?.bantype || "").toLowerCase();
  if (bt === "perma" || bt === "permanent") return true;
  const ms = parseSanctionDurationToMs(s?.duration);
  return ms === Infinity;
};

export const isRevokedSanction = (s) => {
  const state = String(s?.estado || "").toLowerCase();
  return state === "revocado" || state === "revocada" || state === "anulado" || state === "anulada";
};

export const isSanctionActiveNow = (s, nowMs) => {
  if (isRevokedSanction(s)) return false;
  if (isPermanentSanction(s)) return true;

  const endMs = getSanctionEndMs(s.timestamp, s.duration);
  if (!endMs) return false;
  return endMs > nowMs;
};

export const getSanctionSituation = (s, nowMs) => {
  if (isPermanentSanction(s)) return "perma";
  if (isSanctionActiveNow(s, nowMs)) return "activa";
  return "finalizada";
};

export const getSanctionSituationLabel = (code) => {
  if (code === "perma") return "PERMABAN";
  if (code === "activa") return "Activa";
  return "Finalizada";
};

export const normalizeSanctionReason = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9]/g, "");

export const buildSanctionStrikeMap = (rows) => {
  const counters = new Map();
  const rowMap = new Map();

  const ordered = [...(rows || [])].sort((a, b) => {
    const ta = parseSanctionTimestamp(a?.timestamp) || 0;
    const tb = parseSanctionTimestamp(b?.timestamp) || 0;
    if (ta !== tb) return ta - tb;
    return (a?.__rowIndex || 0) - (b?.__rowIndex || 0);
  });

  for (const row of ordered) {
    const player = String(row?.name || "").trim().toLowerCase();
    const reason = normalizeSanctionReason(row?.type);

    if (!player || !reason) continue;

    const key = `${player}|${reason}`;
    const strike = (counters.get(key) || 0) + 1;

    counters.set(key, strike);
    rowMap.set(row.__rowIndex, strike);
  }

  return rowMap;
};

export const getSanctionStrike = (map, rowIndex) => map.get(rowIndex) || 0;

export const getSanctionFeedback = (reason, strike, sanction) => {
  const rules = SANCTION_RULES[normalizeSanctionReason(reason)];

  if (rules?.length && strike > 0) {
    const index = Math.min(strike, rules.length) - 1;
    const action = rules[index];
    return {
      action,
      isPermaban: /ban\s*perm/i.test(action),
    };
  }

  if (isPermanentSanction(sanction)) {
    return {
      action: "Ban perm.",
      isPermaban: true,
    };
  }

  return {
    action: null,
    isPermaban: false,
  };
};

export const isBanAction = (action, sanction) => {
  const bt = String(sanction?.bantype || "").toLowerCase();
  const a = String(action || "").toLowerCase().trim();

  if (isPermanentSanction(sanction)) return true;
  if (/ban\s*perm/.test(a)) return true;
  if (/^ban\b/.test(a)) return true;
  if (bt === "perma" || bt === "permanent" || bt === "ban" || bt === "tempban" || bt === "temp") return true;

  return false;
};

export const getSanctionSummary = (strike, action, sanction) => {
  const parts = [];
  const a = String(action || "").trim().toLowerCase();

  if (strike > 0) parts.push(`${strike}ª vez`);

  if (a === "aviso") parts.push("Aviso");
  if (/^jail\b/.test(a)) parts.push(action);
  if (/^ban\b/.test(a) && !isPermanentSanction(sanction)) parts.push(action);

  return parts.join(" · ");
};

export const getSanctionDurationVisible = (raw, action, sanction) => {
  const a = String(action || "").trim().toLowerCase();

  if (a === "aviso") return "Sin duración";
  if (isPermanentSanction(sanction)) return "Sin caducidad";

  const ms = parseSanctionDurationToMs(raw);
  if (ms === Infinity) return "Sin caducidad";
  if (!ms) return raw ? String(raw) : "Desconocida";

  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);

  const parts = [];
  if (d) parts.push(`${d} ${d === 1 ? "día" : "días"}`);
  if (h) parts.push(`${h} ${h === 1 ? "hora" : "horas"}`);
  if (m) parts.push(`${m} ${m === 1 ? "minuto" : "minutos"}`);
  if (!d && !h && !m && s) parts.push(`${s} ${s === 1 ? "segundo" : "segundos"}`);

  return parts.length ? parts.join(" ") : String(raw);
};

export const shouldShowSanctionEnd = (raw, action, sanction) => {
  const a = String(action || "").trim().toLowerCase();

  if (a === "aviso") return false;
  if (isPermanentSanction(sanction)) return false;

  return !!getSanctionEndMs(sanction?.timestamp, raw);
};

export const buildSanctionCandidates = (values, platformKey) => {
  const set = new Set();

  for (const value of values) {
    const raw = String(value || "").trim();
    if (!raw) continue;
    set.add(raw);
    set.add(cleanPlayerName(raw));
  }

  if (platformKey === "bedrock") {
    const current = Array.from(set);
    for (const value of current) {
      const clean = cleanPlayerName(value);
      if (!clean) continue;
      set.add(clean);
      set.add(`.${clean}`);
    }
  }

  return Array.from(set).filter(Boolean);
};

export const fetchPlayerSanctions = async (candidateNames) => {
  const merged = new Map();

  for (const candidate of candidateNames) {
    const { data, error } = await supabase
      .from("jails")
      .select("*")
      .eq("server", SERVER_ID)
      .ilike("name", candidate)
      .order("timestamp", { ascending: false });

    if (error) {
      throw error;
    }

    for (const row of data || []) {
      const key = [
        row?.id ?? "",
        row?.name ?? "",
        row?.timestamp ?? "",
        row?.type ?? "",
        row?.moderator ?? "",
        row?.duration ?? "",
      ].join("|");

      if (!merged.has(key)) {
        merged.set(key, row);
      }
    }
  }

  return Array.from(merged.values()).sort((a, b) => {
    const ta = parseSanctionTimestamp(a?.timestamp) || 0;
    const tb = parseSanctionTimestamp(b?.timestamp) || 0;
    return tb - ta;
  });
};

export const getSanctionsTone = (row, hasHistory) => {
  if (row && row.isBan && (row.situacion === "perma" || row.situacion === "activa")) return "ban";
  if (row && !row.isBan && row.situacion === "activa") return "active";
  if (hasHistory) return "history";
  return "clean";
};

export const getSanctionsHeadline = (tone) => {
  if (tone === "ban") return "Actualmente baneado";
  if (tone === "active") return "Sanción activa en curso";
  if (tone === "history") return "Historial disciplinario archivado";
  return "Jugador ejemplar";
};

export const getSanctionsSubtext = (tone, row, count) => {
  if (tone === "ban") {
    return `Este jugador tiene una sanción de expulsión activa en ${SERVER_ID}. ${row?.type ? `Motivo actual: ${row.type}.` : ""}`.trim();
  }

  if (tone === "active") {
    return `Este jugador está cumpliendo una sanción activa en ${SERVER_ID}. ${row?.type ? `Motivo actual: ${row.type}.` : ""}`.trim();
  }

  if (tone === "history") {
    return `No hay sanciones activas ahora mismo, pero sí consta historial público en el tribunal. Total registradas: ${count}.`;
  }

  return `Este jugador mantiene un expediente limpio en ${SERVER_ID}. No consta ningún castigo en el historial público del tribunal.`;
};

export const getHeroRecord = (tone, hasHistory) => {
  if (tone === "ban") {
    return { tone: "ban", label: "Baneado" };
  }

  if (tone === "active") {
    return { tone: "active", label: "Bajo sanción" };
  }

  if (hasHistory) {
    return { tone: "history", label: "Historial archivado" };
  }

  return { tone: "clean", label: "Jugador ejemplar" };
};

export const renderToneIcon = (tone, size = 16) => {
  if (tone === "ban") return <XCircle size={size} weight="bold" />;
  if (tone === "active") return <HourglassMedium size={size} weight="bold" />;
  if (tone === "clean") return <CheckCircle size={size} weight="bold" />;
  return <WarningCircle size={size} weight="bold" />;
};

export const getWebAchievementMetaNumber = (logro, keys) => {
  const sourceA = logro?.meta_definicion && typeof logro.meta_definicion === "object" ? logro.meta_definicion : {};
  const sourceB = logro?.meta_otorgado && typeof logro.meta_otorgado === "object" ? logro.meta_otorgado : {};
  const list = Array.isArray(keys) ? keys : [keys];

  for (const key of list) {
    const a = toNumClean(sourceA?.[key]);
    if (Number.isFinite(a)) return a;

    const b = toNumClean(sourceB?.[key]);
    if (Number.isFinite(b)) return b;
  }

  return null;
};

export const getWebAchievementVisual = (logro) => {
  const code = String(logro?.codigo || "").trim().toLowerCase();
  const type = String(logro?.tipo || "").trim().toLowerCase();

  if (code.startsWith("primero_nivel_")) {
    const levelTarget = getWebAchievementMetaNumber(logro, "level_target");
    return {
      accent: "legendary",
      icon: "crown",
      eyebrow: "Primero del reino",
      chip: levelTarget ? `Nivel ${fmtNum(levelTarget)}` : "Hito único",
      kind: "unique",
    };
  }

  if (code === "top_1_nivel") {
    return {
      accent: "gold",
      icon: "trophy",
      eyebrow: "Ranking histórico",
      chip: "Top 1",
      kind: "historic_rank",
    };
  }

  if (code === "top_10_nivel") {
    return {
      accent: "violet",
      icon: "medal",
      eyebrow: "Ranking histórico",
      chip: "Top 10",
      kind: "historic_rank",
    };
  }

  if (type === "account_age_days") {
    const daysRequired = getWebAchievementMetaNumber(logro, "days_required");
    return {
      accent: "emerald",
      icon: "clock",
      eyebrow: "Veterano",
      chip: daysRequired ? `${fmtNum(daysRequired)} días` : "Trayectoria",
      kind: "veteran",
    };
  }

  if (type === "daily_claim_count") {
    const claimsRequired = getWebAchievementMetaNumber(logro, "claims_required");
    return {
      accent: "cyan",
      icon: "lightning",
      eyebrow: "Constancia",
      chip: claimsRequired ? `${fmtNum(claimsRequired)} claims` : "Actividad",
      kind: "activity",
    };
  }

  if (type === "reward_claim_count") {
    const rewardsRequired = getWebAchievementMetaNumber(logro, "rewards_required");
    return {
      accent: "amber",
      icon: "gift",
      eyebrow: "Coleccionista",
      chip: rewardsRequired ? `${fmtNum(rewardsRequired)} recompensas` : "Actividad",
      kind: "activity",
    };
  }

  if (type === "vote_count") {
    const votesRequired = getWebAchievementMetaNumber(logro, "votes_required");
    return {
      accent: "rose",
      icon: "check",
      eyebrow: "Apoyo al reino",
      chip: votesRequired ? `${fmtNum(votesRequired)} votos` : "Actividad",
      kind: "activity",
    };
  }

  return {
    accent: "quiet",
    icon: "check",
    eyebrow: "Insignia web",
    chip: "Permanente",
    kind: "default",
  };
};

export const getRankingSpotlight = (rankingActual) => {
  const position = toNumClean(rankingActual?.posicion_top_10);

  if (rankingActual?.es_top_1_actual) {
    return {
      tone: "gold",
      icon: "trophy",
      title: "Actualmente Rey del Reino",
      subtitle: "Ocupa ahora mismo el puesto #1 global del ranking del reino por SVPoints.",
      badge: "#1 ACTUAL",
    };
  }

  if (rankingActual?.es_top_10_actual && Number.isFinite(position)) {
    return {
      tone: "violet",
      icon: "medal",
      title: "Actualmente dentro del Top 10",
      subtitle: `Mantiene el puesto #${fmtNum(position)} del ranking global del reino por SVPoints en este momento.`,
      badge: `#${fmtNum(position)} ACTUAL`,
    };
  }

  return {
    tone: "quiet",
    icon: "medal",
    title: "Sin puesto destacado ahora mismo",
    subtitle: "Todavía no aparece en el Top 10 actual del ranking global del reino por SVPoints.",
    badge: "FUERA DEL TOP 10",
  };
};

export const JOB_ICONS = {
  miner: ICONS.bloques_minados,
  digger: ICONS.bloques_minados,
  woodcutter: ICONS.bloques_colocados,
  builder: ICONS.bloques_colocados,
  hunter: ICONS.mobs,
  fisherman: ICONS.pesca,
  fisher: ICONS.pesca,
  farmer: ICONS.cosecha,
  brewer: ICONS.dinero,
  crafter: ICONS.puntos,
  enchanter: ICONS.puntos,
  weaponsmith: ICONS.puntos,
  explorer: ICONS.caminar,
};

export const getJobIcon = (jobId) => {
  const key = String(jobId || "").trim().toLowerCase();
  return JOB_ICONS[key] || ICONS.trabajos;
};