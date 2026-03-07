import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  CheckCircle,
  HourglassMedium,
  WarningCircle,
  XCircle,
} from "phosphor-react";
import { supabase } from "../../lib/supabaseClient";
import "../../styles/components/Estadisticas/_perfiljugador.scss";

const API_BASE = (import.meta.env.VITE_BACKEND_URL || "http://localhost:10000").trim().replace(/\/$/, "");
const apiUrl = (path) => (API_BASE ? `${API_BASE}${path}` : path);

const EMPTY = "-";
const SERVER_ID = "survival";
const SANCTIONS_LIMIT = 8;
const nf = new Intl.NumberFormat("es-ES");

const skinCache = new Map();
const skinPromiseCache = new Map();

const RANK_ASSETS = {
  nova: "https://dunb17ur4ymx4.cloudfront.net/wysiwyg/1447273/2de18b63a83cb0b8df9197a4eab9ca575906152d.png",
  alpha: "https://dunb17ur4ymx4.cloudfront.net/wysiwyg/1447273/9c1a0dd33eb6327f1ceb179080f232bc842e8225.png",
  inmortal: "https://dunb17ur4ymx4.cloudfront.net/wysiwyg/1447273/1aaaa34593db3f2dea9d09a7bd4d985500d69de6.png",
};

const RANK_STYLES = {
  nova: { className: "is-rank-nova" },
  alpha: { className: "is-rank-alpha" },
  inmortal: { className: "is-rank-inmortal" },
};

const AVATAR_BACKS = {
  unrank: "/assets/profileunrank.webp",
  nova: "/assets/profilenova.webp",
  alpha: "/assets/profilealpha.webp",
  inmortal: "/assets/profileinmortal.webp",
};

const ICONS = {
  tiempo: "/assets/statsperfil/playtime.webp",
  coins: "/assets/statsperfil/coin.png",
  dinero: "/assets/statsperfil/dinero.png",
  muertes: "/assets/statsperfil/deaths.webp",
  kills: "/assets/statsperfil/pvp.webp",
  dmg: "/assets/statsperfil/dmg.png",
  puntos: "/assets/statsperfil/puntos.png",
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

const SANCTION_RULES = {
  hacks: ["Jail 12h", "Jail 5d", "Ban perm."],
  fly: ["Jail 6h", "Jail 3d", "Ban perm."],
  insultos: ["Jail 30m", "Jail 5h", "Ban perm."],
  tpakill: ["Jail 6h", "Jail 5d", "Ban perm."],
  grief: ["Jail 2h", "Jail 8h", "Jail 5d"],
  spam: ["Jail 1d", "Jail 10d", "Ban perm."],
  flood: ["Aviso", "Jail 15m", "Jail 2h"],
};

const fetchJSON = async (url, signal) => {
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

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const safe = (v) => (v === null || v === undefined || v === "" ? null : v);

const cleanPlayerName = (value) => String(value || "").trim().replace(/^\.+/, "");
const looksLikeBedrockName = (value) => String(value || "").trim().startsWith(".");

const normalizePlatform = (value) => {
  const s = String(value || "").trim().toLowerCase();
  if (s.includes("bedrock")) return "bedrock";
  if (s.includes("java")) return "java";
  return "other";
};

const guessPlatform = (platformValue, playerName) => {
  const normalized = normalizePlatform(platformValue);
  if (normalized !== "other") return normalized;
  if (looksLikeBedrockName(playerName)) return "bedrock";
  return "other";
};

const toNumClean = (v) => {
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

const fmtMoney = (v, suffix = " $") => {
  const n = toNumClean(v);
  if (!Number.isFinite(n)) return EMPTY;
  return `${nf.format(n)}${suffix}`;
};

const fmtNum = (v) => {
  const n = toNumClean(v);
  if (!Number.isFinite(n)) return EMPTY;
  return nf.format(n);
};

const fmtTimeHM = (seconds) => {
  const s = toNumClean(seconds);
  if (!Number.isFinite(s) || s < 0) return EMPTY;
  const totalMin = Math.floor(s / 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}h ${m}m`;
};

const fmtUpdated = (v) => {
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

const normalizeServerData = (raw) => {
  if (!raw) return null;
  if (raw.data) return raw.data;
  return raw;
};

const normalizeXp = (raw) => {
  if (!raw) return null;
  if (raw.data) return raw.data;
  return raw;
};

const makeMetric = ({ id, label, iconKey, value, lines, hint }) => ({
  id,
  label,
  value: value ?? EMPTY,
  lines: Array.isArray(lines) ? lines.filter(Boolean) : null,
  icon: ICONS[iconKey] || null,
  hint,
});

const pickServerPoints = (payload) => {
  const p = payload || {};
  const resumen = p?.resumen || p?.summary || null;
  const economia = p?.economia || null;
  const direct = safe(resumen?.points ?? economia?.points);
  if (direct !== null) return direct;
  return safe(resumen?.svpoints ?? economia?.svpoints ?? p?.svpoints);
};

const sectionIconKey = (k) => {
  if (k === "general") return "bloques_minados";
  if (k === "combate") return "kills";
  if (k === "recursos") return "diamante";
  if (k === "economia") return "dinero";
  return "coins";
};

const renderMetricValue = (m) => {
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

const fetchPlayerSkinUrl = async (uuid, signal) => {
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

const buildSkinSources = ({ variant, displayName, remoteSkinUrl, platformKey }) => {
  const cleanName = cleanPlayerName(displayName);
  const sources = [];

  if (remoteSkinUrl) {
    sources.push(remoteSkinUrl);
  }

  if (cleanName) {
    sources.push(
      variant === "body"
        ? `https://mc-heads.net/body/${encodeURIComponent(cleanName)}/260`
        : `https://mc-heads.net/avatar/${encodeURIComponent(cleanName)}/160`
    );
  }

  if (platformKey === "bedrock") {
    sources.push("/assets/skins/bedrock-default.webp");
  }

  if (variant === "body") {
    sources.push("/assets/skins/default-steve.webp");
    sources.push("https://mc-heads.net/body/Steve/260");
  } else {
    sources.push("https://mc-heads.net/avatar/Steve/160");
  }

  return Array.from(new Set(sources.filter(Boolean)));
};

function SkinRender({ variant, uuid, displayName, platformKey, className }) {
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

const loadXpBundle = async (uuid, signal) => {
  const xpResult = await Promise.allSettled([
    fetchJSON(apiUrl(`/api/usuarios/${encodeURIComponent(uuid)}/xp`), signal),
  ]);

  return {
    xp: xpResult[0]?.status === "fulfilled" ? normalizeXp(xpResult[0].value) : null,
  };
};

const loadServerBundle = async (uuid, signal) => {
  const data = await fetchJSON(
    apiUrl(`/api/perfil/${encodeURIComponent(uuid)}/servidor/${encodeURIComponent(SERVER_ID)}`),
    signal
  );
  return normalizeServerData(data);
};

const parseSanctionTimestamp = (t) => {
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

const parseSanctionDurationToMs = (raw) => {
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

const getSanctionEndMs = (timestamp, raw) => {
  const start = parseSanctionTimestamp(timestamp);
  if (!start) return null;
  const ms = parseSanctionDurationToMs(raw);
  if (!ms || ms === Infinity) return null;
  return start + ms;
};

const getSanctionEndText = (timestamp, raw) => {
  const endMs = getSanctionEndMs(timestamp, raw);
  if (!endMs) return null;
  return new Date(endMs).toLocaleString("es-ES");
};

const isPermanentSanction = (s) => {
  const bt = String(s?.bantype || "").toLowerCase();
  if (bt === "perma" || bt === "permanent") return true;
  const ms = parseSanctionDurationToMs(s?.duration);
  return ms === Infinity;
};

const isRevokedSanction = (s) => {
  const state = String(s?.estado || "").toLowerCase();
  return state === "revocado" || state === "revocada" || state === "anulado" || state === "anulada";
};

const isSanctionActiveNow = (s, nowMs) => {
  if (isRevokedSanction(s)) return false;
  if (isPermanentSanction(s)) return true;

  const endMs = getSanctionEndMs(s.timestamp, s.duration);
  if (!endMs) return false;
  return endMs > nowMs;
};

const getSanctionSituation = (s, nowMs) => {
  if (isPermanentSanction(s)) return "perma";
  if (isSanctionActiveNow(s, nowMs)) return "activa";
  return "finalizada";
};

const getSanctionSituationLabel = (code) => {
  if (code === "perma") return "PERMABAN";
  if (code === "activa") return "Activa";
  return "Finalizada";
};

const normalizeSanctionReason = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9]/g, "");

const buildSanctionStrikeMap = (rows) => {
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

const getSanctionStrike = (map, rowIndex) => map.get(rowIndex) || 0;

const getSanctionFeedback = (reason, strike, sanction) => {
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

const isBanAction = (action, sanction) => {
  const bt = String(sanction?.bantype || "").toLowerCase();
  const a = String(action || "").toLowerCase().trim();

  if (isPermanentSanction(sanction)) return true;
  if (/ban\s*perm/.test(a)) return true;
  if (/^ban\b/.test(a)) return true;
  if (bt === "perma" || bt === "permanent" || bt === "ban" || bt === "tempban" || bt === "temp") return true;

  return false;
};

const getSanctionSummary = (strike, action, sanction) => {
  const parts = [];
  const a = String(action || "").trim().toLowerCase();

  if (strike > 0) parts.push(`${strike}ª vez`);

  if (a === "aviso") parts.push("Aviso");
  if (/^jail\b/.test(a)) parts.push(action);
  if (/^ban\b/.test(a) && !isPermanentSanction(sanction)) parts.push(action);

  return parts.join(" · ");
};

const getSanctionDurationVisible = (raw, action, sanction) => {
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

const shouldShowSanctionEnd = (raw, action, sanction) => {
  const a = String(action || "").trim().toLowerCase();

  if (a === "aviso") return false;
  if (isPermanentSanction(sanction)) return false;

  return !!getSanctionEndMs(sanction?.timestamp, raw);
};

const buildSanctionCandidates = (values, platformKey) => {
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

const fetchPlayerSanctions = async (candidateNames) => {
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

const getSanctionsTone = (row, hasHistory) => {
  if (row && row.isBan && (row.situacion === "perma" || row.situacion === "activa")) return "ban";
  if (row && !row.isBan && row.situacion === "activa") return "active";
  if (hasHistory) return "history";
  return "clean";
};

const getSanctionsHeadline = (tone) => {
  if (tone === "ban") return "Actualmente baneado";
  if (tone === "active") return "Sanción activa en curso";
  if (tone === "history") return "Historial disciplinario archivado";
  return "Jugador ejemplar";
};

const getSanctionsSubtext = (tone, row, count) => {
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

const getHeroRecord = (tone, hasHistory) => {
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

const renderToneIcon = (tone, size = 16) => {
  if (tone === "ban") return <XCircle size={size} weight="bold" />;
  if (tone === "active") return <HourglassMedium size={size} weight="bold" />;
  if (tone === "clean") return <CheckCircle size={size} weight="bold" />;
  return <WarningCircle size={size} weight="bold" />;
};

export default function PerfilJugador() {
  const { nombre } = useParams();
  const nav = useNavigate();
  const location = useLocation();

  const [enterFx, setEnterFx] = useState(false);
  const [enterPayload, setEnterPayload] = useState(null);

  const [loading, setLoading] = useState(true);
  const [loadingServer, setLoadingServer] = useState(false);
  const [loadingXp, setLoadingXp] = useState(false);

  const [error, setError] = useState("");
  const [perfil, setPerfil] = useState(null);
  const [serverData, setServerData] = useState(null);
  const [xpData, setXpData] = useState(null);

  const [sanctions, setSanctions] = useState([]);
  const [sanctionsLoading, setSanctionsLoading] = useState(true);
  const [sanctionsError, setSanctionsError] = useState("");

  const [tab, setTab] = useState("all");
  const [animKey, setAnimKey] = useState(0);

  const abortRef = useRef(null);

  useEffect(() => {
    const fx = location?.state?.fx || null;

    if (!fx) {
      setEnterFx(false);
      setEnterPayload(null);
      return;
    }

    setEnterPayload(fx);
    setEnterFx(true);

    const t = setTimeout(() => {
      setEnterFx(false);
    }, 760);

    return () => clearTimeout(t);
  }, [location?.state]);

  useEffect(() => {
    setLoading(true);
    setLoadingServer(false);
    setLoadingXp(false);
    setError("");
    setPerfil(null);
    setServerData(null);
    setXpData(null);
    setSanctions([]);
    setSanctionsError("");
    setSanctionsLoading(true);
    setTab("all");
    setAnimKey((v) => v + 1);

    if (abortRef.current) {
      abortRef.current.abort();
    }

    const controller = new AbortController();
    abortRef.current = controller;
    let active = true;

    const run = async () => {
      try {
        const raw = await fetchJSON(apiUrl(`/api/perfil/${encodeURIComponent(nombre)}`), controller.signal);
        if (!active) return;

        const jugador = raw?.jugador || raw?.player || null;
        const servidores = raw?.servidores || raw?.servers || null;
        const normalizedPerfil = { ...raw, jugador, servidores };

        setPerfil(normalizedPerfil);

        const uuid = jugador?.uuid || raw?.uuid || null;
        const embeddedSurvival = normalizeServerData(servidores?.survival);

        const hasWebAccount = Boolean(
          jugador &&
            (
              jugador?.rango_usuario !== null ||
              jugador?.nivel !== null ||
              jugador?.xp_actual !== null ||
              jugador?.wallet_coins !== null ||
              jugador?.es_premium !== null
            )
        );

        const shouldLoadXp = Boolean(uuid && hasWebAccount);
        const shouldLoadServer = Boolean(uuid && !embeddedSurvival);

        setLoadingXp(shouldLoadXp);
        setLoadingServer(shouldLoadServer);

        const [xpResult, serverResult] = await Promise.allSettled([
          shouldLoadXp ? loadXpBundle(uuid, controller.signal) : Promise.resolve({ xp: null }),
          shouldLoadServer ? loadServerBundle(uuid, controller.signal) : Promise.resolve(embeddedSurvival),
        ]);

        if (!active) return;

        if (xpResult.status === "fulfilled") {
          setXpData(xpResult.value?.xp || null);
        } else {
          setXpData(null);
        }

        if (serverResult.status === "fulfilled") {
          setServerData(serverResult.value || null);
        } else {
          setServerData(null);
          setError(serverResult.reason?.message || "Error cargando Survival");
        }
      } catch (e) {
        if (!active || e?.name === "AbortError") return;
        setError(e?.message || "Error cargando perfil");
      } finally {
        if (!active) return;
        setLoading(false);
        setLoadingXp(false);
        setLoadingServer(false);
      }
    };

    run();

    return () => {
      active = false;
      controller.abort();
    };
  }, [nombre]);

  const jugador = perfil?.jugador || null;

  const hasWebAccount = useMemo(() => {
    if (!jugador || typeof jugador !== "object") return false;
    return Boolean(
      jugador?.rango_usuario !== null ||
        jugador?.nivel !== null ||
        jugador?.xp_actual !== null ||
        jugador?.wallet_coins !== null ||
        jugador?.es_premium !== null
    );
  }, [jugador]);

  const displayName =
    jugador?.uid ||
    jugador?.nombre_minecraft ||
    jugador?.nombre ||
    nombre;

  const platformKey = useMemo(() => {
    return guessPlatform(
      jugador?.plataforma || jugador?.platform,
      displayName
    );
  }, [jugador?.plataforma, jugador?.platform, displayName]);

  const plataformaLabel =
    platformKey === "bedrock" ? "Bedrock" : platformKey === "java" ? "Java" : "";

  const sanctionCandidates = useMemo(
    () =>
      buildSanctionCandidates(
        [
          nombre,
          displayName,
          jugador?.uid,
          jugador?.nombre_minecraft,
          jugador?.nombre,
        ],
        platformKey
      ),
    [nombre, displayName, jugador?.uid, jugador?.nombre_minecraft, jugador?.nombre, platformKey]
  );

  const sanctionsQueryKey = sanctionCandidates.join("|");

  useEffect(() => {
    let active = true;

    const run = async () => {
      try {
        setSanctionsLoading(true);
        setSanctionsError("");

        if (!sanctionCandidates.length) {
          if (!active) return;
          setSanctions([]);
          return;
        }

        const rows = await fetchPlayerSanctions(sanctionCandidates);

        if (!active) return;
        setSanctions(rows || []);
      } catch (e) {
        if (!active) return;
        setSanctions([]);
        setSanctionsError("No se pudo cargar el historial disciplinario.");
      } finally {
        if (!active) return;
        setSanctionsLoading(false);
      }
    };

    run();

    return () => {
      active = false;
    };
  }, [sanctionsQueryKey]);

  const rankRaw = useMemo(() => {
    if (!hasWebAccount) return "";
    return (jugador?.rango_usuario || jugador?.rank || "").toString().toLowerCase().trim();
  }, [jugador?.rango_usuario, jugador?.rank, hasWebAccount]);

  const rankKey = useMemo(() => {
    if (!rankRaw) return "";
    if (rankRaw.includes("nova")) return "nova";
    if (rankRaw.includes("alpha")) return "alpha";
    if (rankRaw.includes("inmortal")) return "inmortal";
    return "";
  }, [rankRaw]);

  const rankAsset = RANK_ASSETS[rankKey] || null;
  const rankClass = RANK_STYLES[rankKey]?.className || "";
  const heroBgUrl = AVATAR_BACKS[rankKey] || AVATAR_BACKS.unrank;

  const webNivel = hasWebAccount ? safe(jugador?.nivel) : null;
  const webXpActual = hasWebAccount ? safe(jugador?.xp_actual) : null;
  const webWallet = hasWebAccount ? safe(jugador?.wallet_coins) : null;

  const xpDelNivelActual = useMemo(() => {
    if (!hasWebAccount) return null;

    const lvl = toNumClean(jugador?.nivel);
    if (!Number.isFinite(lvl)) return null;

    const niveles = xpData?.niveles;
    if (!Array.isArray(niveles)) return null;

    const row = niveles.find((n) => toNumClean(n?.nivel) === lvl);
    const req = toNumClean(row?.xp_requerida);

    if (!Number.isFinite(req) || req <= 0) return null;
    return req;
  }, [xpData?.niveles, jugador?.nivel, hasWebAccount]);

  const xpPct = useMemo(() => {
    if (!hasWebAccount) return 0;

    const actual = toNumClean(webXpActual);
    const total = toNumClean(xpDelNivelActual);

    if (!Number.isFinite(actual) || !Number.isFinite(total) || total <= 0) return 0;
    return clamp((actual / total) * 100, 0, 100);
  }, [webXpActual, xpDelNivelActual, hasWebAccount]);

  const resumen = serverData?.resumen || serverData?.summary || null;
  const general = serverData?.general || null;
  const combate = serverData?.combate || null;
  const recursos = serverData?.recursos || null;
  const economia = serverData?.economia || null;

  const totals = useMemo(() => {
    const t = perfil?.totales || null;
    return {
      time: safe(t?.tiempo_jugado_total),
      kills: safe(t?.kills_pvp_total),
      pointsTotal: safe(t?.points_total),
    };
  }, [perfil?.totales]);

  const survivalPoints = useMemo(() => {
    const direct = safe(pickServerPoints(serverData));
    if (direct !== null) return direct;
    return safe(totals.pointsTotal);
  }, [serverData, totals.pointsTotal]);

  const dineroActual = useMemo(
    () => safe(economia?.dinero_actual ?? economia?.dinero),
    [economia]
  );

  const dineroTotal = useMemo(
    () => safe(economia?.dinero_ganado_total ?? economia?.dinero_total),
    [economia]
  );

  const coinsActual = useMemo(
    () => safe(economia?.coins_actual ?? economia?.coins),
    [economia]
  );

  const coinsTotal = useMemo(
    () => safe(economia?.coins_ganadas_total ?? economia?.coins_total),
    [economia]
  );

  const quickMetrics = useMemo(() => {
    return [
      makeMetric({
        id: "survival_points",
        label: "Puntos Survival",
        iconKey: "puntos",
        value: survivalPoints !== null ? fmtNum(survivalPoints) : EMPTY,
      }),
      makeMetric({
        id: "wallet_coins",
        label: "Wallet Coins",
        iconKey: "coins",
        value: webWallet !== null ? fmtNum(webWallet) : EMPTY,
      }),
      makeMetric({
        id: "tiempo_total",
        label: "Tiempo jugado",
        iconKey: "tiempo",
        value: totals.time !== null ? fmtTimeHM(totals.time) : EMPTY,
      }),
      makeMetric({
        id: "kills_total",
        label: "Kills PvP",
        iconKey: "kills",
        value: totals.kills !== null ? fmtNum(totals.kills) : EMPTY,
      }),
    ];
  }, [survivalPoints, webWallet, totals.time, totals.kills]);

  const omitIds = useMemo(() => new Set(quickMetrics.map((m) => m.id)), [quickMetrics]);

  const sections = useMemo(() => {
    const output = [];

    const generalTiles = [];
    const bMin = safe(general?.bloques_minados ?? general?.mined);
    const bCol = safe(general?.bloques_colocados ?? general?.placed);
    const saltos = safe(general?.saltos ?? general?.jumps);
    const caminarKm = safe(general?.walk_km ?? general?.caminar);
    const volarKm = safe(general?.fly_km ?? general?.volar);

    if (bMin !== null && !omitIds.has("bloques_minados")) {
      generalTiles.push(
        makeMetric({
          id: "bloques_minados",
          label: "Bloques minados",
          iconKey: "bloques_minados",
          value: fmtNum(bMin),
        })
      );
    }

    if (bCol !== null && !omitIds.has("bloques_colocados")) {
      generalTiles.push(
        makeMetric({
          id: "bloques_colocados",
          label: "Bloques colocados",
          iconKey: "bloques_colocados",
          value: fmtNum(bCol),
        })
      );
    }

    if (saltos !== null && !omitIds.has("saltos")) {
      generalTiles.push(
        makeMetric({
          id: "saltos",
          label: "Saltos",
          iconKey: "saltos",
          value: fmtNum(saltos),
        })
      );
    }

    if (caminarKm !== null && !omitIds.has("caminar")) {
      generalTiles.push(
        makeMetric({
          id: "caminar",
          label: "Distancia caminada",
          iconKey: "caminar",
          value: `${fmtNum(caminarKm)} km`,
        })
      );
    }

    if (volarKm !== null && !omitIds.has("volar")) {
      generalTiles.push(
        makeMetric({
          id: "volar",
          label: "Distancia volada",
          iconKey: "vuelo",
          value: `${fmtNum(volarKm)} km`,
        })
      );
    }

    if (generalTiles.length) {
      output.push({ key: "general", title: "General", tiles: generalTiles });
    }

    const combateTiles = [];
    const mobs = safe(combate?.mobs_matados ?? combate?.mobs);
    const kills = safe(combate?.kills_pvp ?? combate?.kills);
    const muertes = safe(combate?.muertes ?? combate?.deaths);
    const dano = safe(combate?.dano_infligido ?? combate?.damage);

    if (mobs !== null) {
      combateTiles.push(
        makeMetric({
          id: "mobs",
          label: "Mobs matados",
          iconKey: "mobs",
          value: fmtNum(mobs),
        })
      );
    }

    if (kills !== null) {
      combateTiles.push(
        makeMetric({
          id: "kills",
          label: "Kills PvP",
          iconKey: "kills",
          value: fmtNum(kills),
        })
      );
    }

    if (muertes !== null) {
      combateTiles.push(
        makeMetric({
          id: "muertes",
          label: "Muertes",
          iconKey: "muertes",
          value: fmtNum(muertes),
        })
      );
    }

    if (dano !== null) {
      combateTiles.push(
        makeMetric({
          id: "dano",
          label: "Daño infligido",
          iconKey: "dmg",
          value: fmtNum(dano),
        })
      );
    }

    if (combateTiles.length) {
      output.push({ key: "combate", title: "Combate", tiles: combateTiles });
    }

    const recursosTiles = [];
    const diam = safe(recursos?.diamantes ?? recursos?.diamond);
    const hierro = safe(recursos?.hierro ?? recursos?.iron);
    const oro = safe(recursos?.oro ?? recursos?.gold);
    const esmer = safe(recursos?.esmeraldas ?? recursos?.emerald);
    const cult = safe(recursos?.cultivos ?? recursos?.crops);
    const pesca = safe(recursos?.pesca ?? recursos?.fish);

    if (diam !== null) {
      recursosTiles.push(
        makeMetric({
          id: "diamantes",
          label: "Diamantes",
          iconKey: "diamante",
          value: fmtNum(diam),
        })
      );
    }

    if (hierro !== null) {
      recursosTiles.push(
        makeMetric({
          id: "hierro",
          label: "Hierro",
          iconKey: "hierro",
          value: fmtNum(hierro),
        })
      );
    }

    if (oro !== null) {
      recursosTiles.push(
        makeMetric({
          id: "oro",
          label: "Oro",
          iconKey: "oro",
          value: fmtNum(oro),
        })
      );
    }

    if (esmer !== null) {
      recursosTiles.push(
        makeMetric({
          id: "esmeraldas",
          label: "Esmeraldas",
          iconKey: "esmeralda",
          value: fmtNum(esmer),
        })
      );
    }

    if (cult !== null) {
      recursosTiles.push(
        makeMetric({
          id: "cultivos",
          label: "Cultivos",
          iconKey: "cosecha",
          value: fmtNum(cult),
        })
      );
    }

    if (pesca !== null) {
      recursosTiles.push(
        makeMetric({
          id: "pesca",
          label: "Pesca",
          iconKey: "pesca",
          value: fmtNum(pesca),
        })
      );
    }

    if (recursosTiles.length) {
      output.push({ key: "recursos", title: "Recursos", tiles: recursosTiles });
    }

    const economiaTiles = [];

    if (dineroTotal !== null || dineroActual !== null) {
      economiaTiles.push(
        makeMetric({
          id: "dinero_block",
          label: "Dinero",
          iconKey: "dinero",
          lines: [
            { label: "Disponible", value: dineroActual !== null ? fmtMoney(dineroActual) : EMPTY },
            { label: "Total ganado", value: dineroTotal !== null ? fmtMoney(dineroTotal) : EMPTY },
          ],
        })
      );
    }

    if (coinsTotal !== null || coinsActual !== null) {
      economiaTiles.push(
        makeMetric({
          id: "coins_block",
          label: "Coins",
          iconKey: "coins",
          lines: [
            { label: "Disponibles", value: coinsActual !== null ? fmtNum(coinsActual) : EMPTY },
            { label: "Total ganadas", value: coinsTotal !== null ? fmtNum(coinsTotal) : EMPTY },
          ],
        })
      );
    }

    if (economiaTiles.length) {
      output.push({ key: "economia", title: "Economía", tiles: economiaTiles });
    }

    return output;
  }, [
    general,
    combate,
    recursos,
    economia,
    omitIds,
    dineroActual,
    dineroTotal,
    coinsActual,
    coinsTotal,
  ]);

  const shownSections = useMemo(() => {
    if (tab === "all") return sections;
    return sections.filter((s) => s.key === tab);
  }, [tab, sections]);

  const tabs = useMemo(() => {
    const allCount = sections.reduce((acc, section) => acc + (section?.tiles?.length || 0), 0);

    return [
      { key: "all", label: "Todo", icon: "tiempo", count: allCount },
      ...sections.map((s) => ({
        key: s.key,
        label: s.title,
        icon: sectionIconKey(s.key),
        count: s?.tiles?.length || 0,
      })),
    ];
  }, [sections]);

  const onPickTab = useCallback((nextTab) => {
    setTab(nextTab);
    setAnimKey((v) => v + 1);
  }, []);

  const updatedRaw =
    serverData?.updated_at ||
    jugador?.actualizado ||
    jugador?.updated_at ||
    jugador?.ultimo_sync ||
    null;

  const updatedTxt = useMemo(() => fmtUpdated(updatedRaw), [updatedRaw]);

  const sanctionsWithMeta = useMemo(
    () => sanctions.map((s, __rowIndex) => ({ ...s, __rowIndex })),
    [sanctions]
  );

  const sanctionStrikeMap = useMemo(
    () => buildSanctionStrikeMap(sanctionsWithMeta),
    [sanctionsWithMeta]
  );

  const sanctionRows = useMemo(() => {
    return sanctionsWithMeta.map((row) => {
      const strike = getSanctionStrike(sanctionStrikeMap, row.__rowIndex);
      const feedback = getSanctionFeedback(row.type, strike, row);
      const situacion = getSanctionSituation(row, Date.now());
      const isBan = isBanAction(feedback.action, row);
      const durationVisible = getSanctionDurationVisible(row.duration, feedback.action, row);
      const endText = shouldShowSanctionEnd(row.duration, feedback.action, row)
        ? getSanctionEndText(row.timestamp, row.duration)
        : null;
      const dateMs = parseSanctionTimestamp(row.timestamp);
      const dateText = dateMs ? new Date(dateMs).toLocaleString("es-ES") : EMPTY;

      return {
        ...row,
        strike,
        feedback,
        situacion,
        situacionLabel: getSanctionSituationLabel(situacion),
        isBan,
        resumenEscala: getSanctionSummary(strike, feedback.action, row),
        durationVisible,
        endText,
        dateText,
      };
    });
  }, [sanctionsWithMeta, sanctionStrikeMap]);

  const activeSanction = useMemo(
    () => sanctionRows.find((row) => row.situacion === "perma" || row.situacion === "activa") || null,
    [sanctionRows]
  );

  const latestSanction = sanctionRows[0] || null;
  const hasSanctionHistory = sanctionRows.length > 0;
  const sanctionsTone = getSanctionsTone(activeSanction, hasSanctionHistory);
  const sanctionsHeadline = getSanctionsHeadline(sanctionsTone);
  const sanctionsSubtext = getSanctionsSubtext(sanctionsTone, activeSanction || latestSanction, sanctionRows.length);
  const heroRecord = getHeroRecord(sanctionsTone, hasSanctionHistory);
  const hasBanOverlay = sanctionsTone === "ban";
  const hasFlagOverlay = sanctionsTone === "active";

  const visibleSanctions = useMemo(
    () => sanctionRows.slice(0, SANCTIONS_LIMIT),
    [sanctionRows]
  );

  const rootClass = useMemo(
    () => ["perfil-epic", enterFx ? "pf-enter" : ""].filter(Boolean).join(" "),
    [enterFx]
  );

  return (
    <div className={rootClass}>
      <div className="perfil-shell">
        <div className="perfil-frame">
          {enterFx && enterPayload ? (
            <div className="pf-enterOverlay" aria-hidden="true">
              <div className="pf-enterCard">
                <img className="pf-enterSkin" src={enterPayload.skin} alt="" draggable="false" />
                <div className="pf-enterText">
                  <div className="pf-enterName">{enterPayload.nombre}</div>
                  <div className="pf-enterSub">Construyendo perfil…</div>
                </div>
                <div className="pf-enterBar">
                  <div className="pf-enterBarFill" />
                  <div className="pf-enterBarSheen" />
                </div>
              </div>
            </div>
          ) : null}

          <div className="perfil-wrap">
            <div className="perfil-topbar">
              <div className="perfil-topbarLeft">
                <div className="perfil-breadcrumb">Perfil público</div>
              </div>

              <div className="perfil-topbarRight">
                <button
                  className="perfil-btn"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(window.location.href);
                    } catch {}
                  }}
                  type="button"
                >
                  Copiar enlace
                </button>

                <button className="perfil-btn is-ghost" onClick={() => nav(-1)} type="button">
                  Volver
                </button>
              </div>
            </div>

            <div
              className={[
                "perfil-hero",
                rankClass,
                hasBanOverlay ? "is-banned" : "",
                hasFlagOverlay ? "is-flagged" : "",
              ].filter(Boolean).join(" ")}
              style={{ "--hero-bg": `url(${heroBgUrl})` }}
            >
              <div className="perfil-heroBg" />

              <div className="perfil-heroInner">
                <div className={`perfil-skinSlot ${hasBanOverlay ? "is-banned" : hasFlagOverlay ? "is-flagged" : ""}`}>
                  <SkinRender
                    variant="body"
                    uuid={jugador?.uuid}
                    displayName={displayName}
                    platformKey={platformKey}
                    className="perfil-skinBody"
                  />
                  {hasBanOverlay ? <div className="perfil-banStamp">BAN</div> : null}
                  {hasFlagOverlay ? <div className="perfil-banStamp is-flagged">JAIL</div> : null}
                </div>

                <div className="perfil-heroMain">
                  <div className="perfil-nameRow">
                    <div className="perfil-nameLine">
                      <div className="perfil-name">{displayName}</div>
                      {rankAsset ? (
                        <img
                          className="perfil-rankIconInline"
                          src={rankAsset}
                          alt=""
                          draggable="false"
                        />
                      ) : null}
                    </div>

                    <div className="perfil-subRow">
                      <div className={`perfil-recordBadge is-${heroRecord.tone}`}>
                        {renderToneIcon(heroRecord.tone, 14)}
                        <span>{heroRecord.label}</span>
                      </div>

                      {plataformaLabel ? (
                        <div className={`perfil-platform ${platformKey === "bedrock" ? "is-bedrock" : "is-java"}`}>
                          {plataformaLabel}
                        </div>
                      ) : null}

                      {updatedTxt ? (
                        <div className="perfil-miniMeta">
                          Actualizado: <span>{updatedTxt}</span>
                        </div>
                      ) : null}

                      {loadingXp ? <div className="perfil-miniMeta">Cargando progreso…</div> : null}

                      {!loadingXp && !hasWebAccount ? (
                        <div className="perfil-miniMeta is-warn">No vinculado</div>
                      ) : null}
                    </div>
                  </div>

                  <div className={`perfil-xpBlock ${hasWebAccount ? "" : "is-disabled"}`}>
                    <div className="perfil-xpTop">
                      <div className="perfil-xpTitle">Experiencia</div>
                      <div className="perfil-xpNums">
                        <span>{hasWebAccount && webXpActual !== null ? fmtNum(webXpActual) : EMPTY}</span>
                        <span className="perfil-xpSep">/</span>
                        <span>{hasWebAccount && xpDelNivelActual !== null ? fmtNum(xpDelNivelActual) : EMPTY}</span>
                        <span className="perfil-xpUnit">XP</span>
                      </div>
                    </div>

                    <div className="perfil-xpBar" aria-hidden="true">
                      <div className="perfil-xpFill" style={{ width: `${xpPct}%` }} />
                    </div>
                  </div>

                  <div className="perfil-quickRow">
                    {quickMetrics.map((m) => (
                      <div key={m.id} className="perfil-quickCard" title={m.hint || ""}>
                        {m.icon ? (
                          <img className="perfil-quickIcon" src={m.icon} alt="" draggable="false" />
                        ) : null}

                        <div className="perfil-quickText">
                          <div className="perfil-quickLabel">{m.label}</div>
                          <div className="perfil-quickValue">{renderMetricValue(m)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="perfil-heroSide">
                  <div className={`perfil-headCard ${hasBanOverlay ? "is-banned" : hasFlagOverlay ? "is-flagged" : ""}`}>
                    <SkinRender
                      variant="head"
                      uuid={jugador?.uuid}
                      displayName={displayName}
                      platformKey={platformKey}
                      className="perfil-headImg"
                    />
                  </div>

                  <div className="perfil-webLevel">
                    <div className="perfil-webLevelLabel">Nivel</div>
                    <div className="perfil-webLevelValue">
                      {hasWebAccount && webNivel !== null ? fmtNum(webNivel) : EMPTY}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="perfil-detail">
              <div className="perfil-detailHead">
                <div className="perfil-sectionTitle">Detalle · Survival</div>
                <div className="perfil-detailMeta">
                  {loading
                    ? "Cargando perfil…"
                    : loadingServer
                    ? "Actualizando servidor…"
                    : error
                    ? error
                    : ""}
                </div>
              </div>

              <div className="pf-tabs" role="tablist" aria-label="Categorías">
                {tabs.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    className={`pf-tab ${tab === t.key ? "is-active" : ""}`}
                    onClick={() => onPickTab(t.key)}
                    role="tab"
                    aria-selected={tab === t.key}
                  >
                    {t.icon ? (
                      <img className="pf-tabIcon" src={ICONS[t.icon]} alt="" draggable="false" />
                    ) : null}
                    <span className="pf-tabTxt">{t.label}</span>
                    <span className="pf-tabCount">{t.count}</span>
                  </button>
                ))}
              </div>

              {loading ? (
                <div className="perfil-skeletonGrid">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} className="perfil-skeletonTile" />
                  ))}
                </div>
              ) : error && !serverData ? (
                <div className="perfil-errorBox">
                  <div className="perfil-errorTitle">No se pudo cargar</div>
                  <div className="perfil-errorMsg">{error}</div>
                </div>
              ) : (
                <div className="perfil-sections" key={`sec-${tab}-${animKey}`}>
                  {shownSections.map((sec) => (
                    <div key={sec.key} className="perfil-section">
                      <div className="perfil-sectionHeader">
                        <div className="perfil-sectionTitle2">{sec.title}</div>
                      </div>

                      <div className="perfil-tiles">
                        {sec.tiles.map((t, idx) => (
                          <div
                            key={t.id}
                            className={`perfil-tile pf-tileIn ${Array.isArray(t.lines) && t.lines.length ? "is-multi" : ""}`}
                            style={{ "--i": idx }}
                            title={t.hint || ""}
                          >
                            <div className="perfil-tileHead">
                              {t.icon ? (
                                <img className="perfil-tileIcon" src={t.icon} alt="" draggable="false" />
                              ) : null}

                              <div className="perfil-tileLabel">{t.label}</div>
                            </div>

                            <div className="perfil-tileValue">{renderMetricValue(t)}</div>

                            <div className="perfil-tileSheen" />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="perfil-sanctionsPanel">
              <div className="perfil-sanctionsHead">
                <div className="perfil-sectionTitle">Sanciones</div>
                <div className={`perfil-sanctionsState is-${sanctionsTone}`}>
                  {renderToneIcon(sanctionsTone, 15)}
                  <span>
                    {sanctionsTone === "ban"
                      ? "Baneado"
                      : sanctionsTone === "active"
                      ? "Sanción activa"
                      : sanctionsTone === "history"
                      ? "Historial"
                      : "Limpio"}
                  </span>
                </div>
              </div>

              {sanctionsLoading ? (
                <div className="perfil-sanctionsSkeleton">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="perfil-sanctionsSkeletonItem" />
                  ))}
                </div>
              ) : sanctionsError ? (
                <div className="perfil-errorBox">
                  <div className="perfil-errorTitle">No se pudo cargar</div>
                  <div className="perfil-errorMsg">{sanctionsError}</div>
                </div>
              ) : !hasSanctionHistory ? (
                <div className="perfil-sanctionsEmpty">
                  <div className="perfil-sanctionsEmptyIcon">
                    <CheckCircle size={24} weight="bold" />
                  </div>
                  <div className="perfil-sanctionsEmptyText">
                    <div className="perfil-sanctionsEmptyTitle">Jugador ejemplar</div>
                    <div className="perfil-sanctionsEmptySub">
                      Este jugador mantiene un expediente limpio en Survival. No hay sanciones registradas en el historial público del tribunal.
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className={`perfil-sanctionsHero is-${sanctionsTone}`}>
                    <div className="perfil-sanctionsHeroMain">
                      <div className={`perfil-sanctionsHeroIcon is-${sanctionsTone}`}>
                        {renderToneIcon(sanctionsTone, 22)}
                      </div>

                      <div className="perfil-sanctionsHeroText">
                        <div className="perfil-sanctionsHeroTitle">{sanctionsHeadline}</div>
                        <div className="perfil-sanctionsHeroSub">{sanctionsSubtext}</div>
                      </div>
                    </div>

                    <div className="perfil-sanctionsStats">
                      <div className="perfil-sanctionsStat">
                        <div className="perfil-sanctionsStatLabel">Estado actual</div>
                        <div className="perfil-sanctionsStatValue">
                          {sanctionsTone === "ban"
                            ? "PERMABAN"
                            : sanctionsTone === "active"
                            ? "ACTIVA"
                            : sanctionsTone === "history"
                            ? "ARCHIVADO"
                            : "LIMPIO"}
                        </div>
                      </div>

                      <div className="perfil-sanctionsStat">
                        <div className="perfil-sanctionsStatLabel">Historial</div>
                        <div className="perfil-sanctionsStatValue">{fmtNum(sanctionRows.length)}</div>
                      </div>

                      <div className="perfil-sanctionsStat">
                        <div className="perfil-sanctionsStatLabel">Último motivo</div>
                        <div className="perfil-sanctionsStatValue is-small">
                          {latestSanction?.type || EMPTY}
                        </div>
                      </div>

                      <div className="perfil-sanctionsStat">
                        <div className="perfil-sanctionsStatLabel">Última fecha</div>
                        <div className="perfil-sanctionsStatValue is-small">
                          {latestSanction?.dateText || EMPTY}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="perfil-sanctionsList">
                    {visibleSanctions.map((row) => (
                      <div key={`${row.name}-${row.timestamp}-${row.type}-${row.moderator}`} className={`perfil-sanctionRow is-${row.situacion}`}>
                        <div className="perfil-sanctionMain">
                          <div className="perfil-sanctionReason">{row.type || "Sanción"}</div>

                          <div className="perfil-sanctionMeta">
                            {row.resumenEscala ? (
                              <span className={`perfil-sanctionScale ${row.feedback.isPermaban ? "is-permaban" : ""}`}>
                                <WarningCircle size={13} weight="duotone" />
                                <strong>{row.resumenEscala}</strong>
                              </span>
                            ) : null}

                            {row.moderator ? (
                              <span className="perfil-sanctionModerator">Moderador: {row.moderator}</span>
                            ) : null}
                          </div>
                        </div>

                        <div className="perfil-sanctionCell">
                          <div className="perfil-sanctionCellLabel">Duración</div>
                          <div className="perfil-sanctionCellValue">{row.durationVisible}</div>
                          {row.endText ? (
                            <div className="perfil-sanctionCellSub">Finaliza: {row.endText}</div>
                          ) : null}
                        </div>

                        <div className="perfil-sanctionCell">
                          <div className="perfil-sanctionCellLabel">Fecha</div>
                          <div className="perfil-sanctionCellValue">{row.dateText}</div>
                        </div>

                        <div className="perfil-sanctionStateWrap">
                          <span className={`perfil-sanctionBadge is-${row.situacion}`}>
                            {row.situacion === "perma" && <XCircle size={14} weight="bold" />}
                            {row.situacion === "activa" && <HourglassMedium size={14} weight="bold" />}
                            {row.situacion === "finalizada" && <CheckCircle size={14} weight="bold" />}
                            <span>{row.situacionLabel}</span>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {sanctionRows.length > visibleSanctions.length ? (
                    <div className="perfil-sanctionsFoot">
                      Mostrando las últimas <strong>{fmtNum(visibleSanctions.length)}</strong> de{" "}
                      <strong>{fmtNum(sanctionRows.length)}</strong> sanciones registradas.
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}