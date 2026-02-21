import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import useIsMobile from "../../hooks/useIsMobile";
import { getGensValorTierInfo } from "./leaderboards.gens";
import "../../styles/components/Estadisticas/_perfiljugador.scss";

const API_BASE = (import.meta.env.VITE_BACKEND_URL || "http://localhost:10000").trim().replace(/\/$/, "");
const apiUrl = (path) => (API_BASE ? `${API_BASE}${path}` : path);

const EMPTY = "-";
const nf = new Intl.NumberFormat("es-ES");

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

const SERVER_META = [
  { key: "survival", label: "Survival", img: "/assets/reinos/survival-clasico.webp" },
  { key: "gens", label: "Gens", img: "/assets/reinos/gens.webp" },
  { key: "oneblock", label: "OneBlock", img: "/assets/reinos/oneblock.webp" },
  { key: "anarquico", label: "Survival Anárquico", img: "/assets/reinos/survival-anarquico.webp" },
  { key: "parkour", label: "Parkour", img: "/assets/reinos/parkour.webp" },
];

const ICONS = {
  tiempo: "/assets/statsperfil/playtime.webp",
  coins: "/assets/statsperfil/coin.png",
  dinero: "/assets/statsperfil/dinero.png",
  muertes: "/assets/statsperfil/deaths.webp",
  kills: "/assets/statsperfil/pvp.webp",
  dmg: "/assets/statsperfil/dmg.png",
  puntos: "/assets/statsperfil/puntos.png",
  genpoints: "/assets/statsperfil/genpoints.png",
  svpoints: "/assets/statsperfil/svpoints.png",
  obpoints: "/assets/statsperfil/obpoints.png",
  anpoints: "/assets/statsperfil/svpoints.png",
  valor_isla: "/assets/statsperfil/valorisla.png",
  nivel_web: "/assets/statsperfil/nivel.png",
  nivel_isla: "/assets/statsperfil/nivel.png",
  bloque_infinito: "/assets/statsperfil/bloqueinfinito.png",
  bioma: "/assets/statsperfil/bioma.png",
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
  sanciones: "/assets/statsperfil/sanciones.webp",
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
    return new Intl.DateTimeFormat("es-ES", { dateStyle: "medium", timeStyle: "short" }).format(d);
  } catch {
    return d.toLocaleString("es-ES");
  }
};

const pickServer = (servidoresMap) => {
  if (!servidoresMap) return "gens";
  const keys = Object.keys(servidoresMap);
  if (!keys.length) return "gens";
  if (servidoresMap.gens) return "gens";
  if (servidoresMap.oneblock) return "oneblock";
  if (servidoresMap.survival) return "survival";
  return keys[0];
};

const normalizeServerData = (raw) => {
  if (!raw) return null;
  if (raw.data) return raw.data;
  return raw;
};

const normalizeWebUser = (raw) => {
  if (!raw) return null;
  if (raw.usuario && typeof raw.usuario === "object") return raw.usuario;
  if (raw.user && typeof raw.user === "object") return raw.user;
  if (raw.data && typeof raw.data === "object") return raw.data;
  return raw;
};

const normalizeXp = (raw) => {
  if (!raw) return null;
  if (raw.data) return raw.data;
  return raw;
};

const metric = (id, label, value, iconKey, hint, onClick) => ({
  id,
  label,
  value,
  icon: ICONS[iconKey] || null,
  hint,
  onClick: typeof onClick === "function" ? onClick : null,
});

const pickServerPoints = (srvKey, payload) => {
  const p = payload || {};
  const resumen = p?.resumen || p?.summary || null;
  const economia = p?.economia || null;

  const direct = safe(resumen?.points ?? economia?.points);
  if (direct !== null) return direct;

  if (srvKey === "gens") return safe(resumen?.genspoints ?? economia?.genspoints);
  if (srvKey === "survival") return safe(resumen?.svpoints ?? economia?.svpoints);
  if (srvKey === "oneblock") return safe(resumen?.obpoints ?? economia?.obpoints);
  if (srvKey === "anarquico") return safe(resumen?.anpoints ?? economia?.anpoints);
  if (srvKey === "parkour") return safe(resumen?.pkpoints ?? economia?.pkpoints);

  return null;
};

const pointsIconKey = (srvKey) => {
  if (srvKey === "gens") return "genpoints";
  if (srvKey === "survival") return "svpoints";
  if (srvKey === "oneblock") return "obpoints";
  if (srvKey === "anarquico") return "anpoints";
  return "svpoints";
};

const sectionIconKey = (k) => {
  if (k === "general") return "bloques_minados";
  if (k === "combate") return "kills";
  if (k === "recursos") return "diamante";
  return "coins";
};

export default function PerfilJugador() {
  const { nombre } = useParams();
  const nav = useNavigate();
  const isMobile = useIsMobile();
  const location = useLocation();

  const [enterFx, setEnterFx] = useState(false);
  const [enterPayload, setEnterPayload] = useState(null);

  const [loading, setLoading] = useState(true);
  const [loadingServer, setLoadingServer] = useState(false);
  const [loadingWeb, setLoadingWeb] = useState(false);

  const [error, setError] = useState("");
  const [perfil, setPerfil] = useState(null);

  const [servidor, setServidor] = useState("gens");
  const [serverData, setServerData] = useState(null);

  const [webUser, setWebUser] = useState(null);
  const [xpData, setXpData] = useState(null);

  const [tab, setTab] = useState("all");
  const [animKey, setAnimKey] = useState(0);

  const abortRef = useRef(null);
  const abortServerRef = useRef(null);
  const abortWebRef = useRef(null);

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

  const loadWeb = useCallback(async (uuid) => {
    if (!uuid) return;
    if (abortWebRef.current) abortWebRef.current.abort();
    const ac = new AbortController();
    abortWebRef.current = ac;

    setLoadingWeb(true);
    try {
      const [uRaw, xpRaw] = await Promise.all([
        fetchJSON(apiUrl(`/api/usuarios/${encodeURIComponent(uuid)}`), ac.signal),
        fetchJSON(apiUrl(`/api/usuarios/${encodeURIComponent(uuid)}/xp`), ac.signal),
      ]);

      const u = normalizeWebUser(uRaw);
      const xp = normalizeXp(xpRaw);

      setWebUser(u || null);
      setXpData(xp || null);
    } catch {
      setWebUser(null);
      setXpData(null);
    } finally {
      setLoadingWeb(false);
    }
  }, []);

  const loadServer = useCallback(async (srv, uuid, initial = false) => {
    if (!uuid) return;
    if (abortServerRef.current) abortServerRef.current.abort();
    const ac = new AbortController();
    abortServerRef.current = ac;

    if (!initial) setLoadingServer(true);
    setError("");

    try {
      const data = await fetchJSON(apiUrl(`/api/perfil/${encodeURIComponent(uuid)}/servidor/${encodeURIComponent(srv)}`), ac.signal);
      setServerData(normalizeServerData(data));
    } catch (e) {
      if (e?.name === "AbortError") return;
      setError(e?.message || "Error cargando servidor");
      setServerData(null);
    } finally {
      setLoadingServer(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    setError("");
    setPerfil(null);
    setServerData(null);
    setWebUser(null);
    setXpData(null);
    setTab("all");
    setAnimKey((v) => v + 1);

    if (abortRef.current) abortRef.current.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    const run = async () => {
      try {
        const data = await fetchJSON(apiUrl(`/api/perfil/${encodeURIComponent(nombre)}`), ac.signal);

        const jugador = data?.jugador || data?.player || null;
        const servidores = data?.servidores || data?.servers || null;

        const nextPerfil = { ...data, jugador, servidores };
        setPerfil(nextPerfil);

        const preferred = data?.servidor_activo || data?.active_server || pickServer(servidores);
        setServidor(preferred);

        const uuid = jugador?.uuid || data?.uuid || null;
        if (uuid) loadWeb(uuid);

        const embedded = normalizeServerData(servidores?.[preferred]);
        if (embedded) {
          setServerData(embedded);
          setLoading(false);
          return;
        }

        if (uuid) {
          setLoading(false);
          await loadServer(preferred, uuid, true);
        } else {
          setLoading(false);
        }
      } catch (e) {
        if (e?.name === "AbortError") return;
        setError(e?.message || "Error cargando perfil");
        setLoading(false);
      }
    };

    run();
    return () => ac.abort();
  }, [nombre, loadServer, loadWeb]);

  useEffect(() => {
    const uuid = perfil?.jugador?.uuid || perfil?.uuid || null;
    const embedded = normalizeServerData(perfil?.servidores?.[servidor]);
    if (embedded) {
      setServerData(embedded);
      return;
    }
    if (uuid) loadServer(servidor, uuid);
  }, [servidor, perfil?.jugador?.uuid, perfil?.uuid, perfil?.servidores, loadServer]);

  const jugador = perfil?.jugador || null;

  const mergedWeb = useMemo(() => {
    const base = jugador || {};
    const w = webUser || {};
    const wallet = w?.wallet_coins ?? w?.walletCoins ?? w?.wallet ?? base?.wallet_coins ?? base?.walletCoins ?? base?.wallet ?? perfil?.totales?.wallet_coins ?? null;

    return {
      ...base,
      ...w,
      wallet_coins: wallet,
      rango_usuario: w?.rango_usuario ?? base?.rango_usuario ?? null,
      nivel: w?.nivel ?? base?.nivel ?? null,
      xp_actual: w?.xp_actual ?? base?.xp_actual ?? null,
      es_premium: w?.es_premium ?? base?.es_premium ?? null,
      uid: w?.uid ?? base?.uid ?? base?.nombre_minecraft ?? null,
      plataforma: w?.plataforma ?? base?.plataforma ?? null,
      actualizado: base?.actualizado ?? null,
    };
  }, [jugador, webUser, perfil?.totales?.wallet_coins]);

  const hasWebAccount = useMemo(() => {
    const u = webUser;
    if (!u || typeof u !== "object") return false;
    return Boolean(u?.uuid || u?.uid || u?.nivel !== undefined || u?.xp_actual !== undefined || u?.wallet_coins !== undefined);
  }, [webUser]);

  const rankRaw = useMemo(() => {
    if (!hasWebAccount) return "";
    return (mergedWeb?.rango_usuario || mergedWeb?.rank || "").toString().toLowerCase().trim();
  }, [mergedWeb?.rango_usuario, mergedWeb?.rank, hasWebAccount]);

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

  const plataforma = (mergedWeb?.plataforma || mergedWeb?.platform || "").toString().toLowerCase();
  const plataformaLabel = plataforma === "bedrock" ? "Bedrock" : plataforma === "java" ? "Java" : "";

  const webNivel = hasWebAccount ? safe(webUser?.nivel) : null;
  const webXpActual = hasWebAccount ? safe(webUser?.xp_actual) : null;
  const webWallet = hasWebAccount ? safe(mergedWeb?.wallet_coins) : null;

  const xpDelNivelActual = useMemo(() => {
    if (!hasWebAccount) return null;
    const lvl = toNumClean(webUser?.nivel);
    if (!Number.isFinite(lvl)) return null;
    const niveles = xpData?.niveles;
    if (!Array.isArray(niveles)) return null;
    const row = niveles.find((n) => toNumClean(n?.nivel) === lvl);
    const req = toNumClean(row?.xp_requerida);
    if (!Number.isFinite(req) || req <= 0) return null;
    return req;
  }, [xpData?.niveles, webUser?.nivel, hasWebAccount]);

  const xpPct = useMemo(() => {
    if (!hasWebAccount) return 0;
    const a = toNumClean(webXpActual);
    const t = toNumClean(xpDelNivelActual);
    if (!Number.isFinite(a) || !Number.isFinite(t) || t <= 0) return 0;
    return clamp((a / t) * 100, 0, 100);
  }, [webXpActual, xpDelNivelActual, hasWebAccount]);

  const displayName = mergedWeb?.uid || mergedWeb?.nombre_minecraft || mergedWeb?.nombre || nombre;

  const skinFace = useMemo(() => {
    const n = encodeURIComponent(displayName || "Steve");
    return `https://mc-heads.net/avatar/${n}/160`;
  }, [displayName]);

  const skinBody = useMemo(() => {
    const n = encodeURIComponent(displayName || "Steve");
    return `https://mc-heads.net/body/${n}/260`;
  }, [displayName]);

  const resumen = serverData?.resumen || serverData?.summary || null;
  const general = serverData?.general || null;
  const combate = serverData?.combate || null;
  const recursos = serverData?.recursos || null;
  const economia = serverData?.economia || null;
  const isla = serverData?.isla || serverData?.valor_isla_detalle || null;

  const totals = useMemo(() => {
    const t = perfil?.totales || null;
    return {
      points: safe(t?.points_total),
      time: safe(t?.tiempo_jugado_total),
      kills: safe(t?.kills_pvp_total),
      wallet: webWallet,
    };
  }, [perfil?.totales, webWallet]);

  const gensValorInfo = useMemo(() => {
    if (servidor !== "gens") return null;
    const valorRaw = safe(
      resumen?.valor_isla ??
        economia?.valor_isla ??
        isla?.valor ??
        isla?.valor_isla ??
        economia?.gens_value_total ??
        serverData?.valor_isla ??
        serverData?.island_value ??
        serverData?.islandValue
    );
    if (valorRaw === null) return null;
    const v = toNumClean(valorRaw);
    if (!Number.isFinite(v)) return null;
    try {
      return getGensValorTierInfo(v);
    } catch {
      return null;
    }
  }, [servidor, resumen, economia, isla, serverData]);

  const quickMetrics = useMemo(() => {
    const out = [];
    out.push(metric("points_total", "Points totales", totals.points !== null ? fmtNum(totals.points) : EMPTY, "puntos"));
    out.push(metric("wallet_coins", "Wallet Coins", totals.wallet !== null ? fmtNum(totals.wallet) : EMPTY, "coins"));
    out.push(metric("tiempo_total", "Tiempo total", totals.time !== null ? fmtTimeHM(totals.time) : EMPTY, "tiempo"));
    out.push(metric("kills_total", "Kills PvP", totals.kills !== null ? fmtNum(totals.kills) : EMPTY, "kills"));
    return out;
  }, [totals.points, totals.time, totals.kills, totals.wallet]);

  const omitIds = useMemo(() => new Set(quickMetrics.map((m) => m.id)), [quickMetrics]);

  const sections = useMemo(() => {
    const s = [];

    const generalTiles = [];
    const bMin = safe(general?.bloques_minados ?? general?.mined);
    const bCol = safe(general?.bloques_colocados ?? general?.placed);
    const saltos = safe(general?.saltos ?? general?.jumps);
    const caminarKm = safe(general?.walk_km ?? general?.caminar);
    const volarKm = safe(general?.fly_km ?? general?.volar);

    if (bMin !== null && !omitIds.has("bloques_minados")) generalTiles.push(metric("bloques_minados", "Bloques minados", fmtNum(bMin), "bloques_minados"));
    if (bCol !== null && !omitIds.has("bloques_colocados")) generalTiles.push(metric("bloques_colocados", "Bloques colocados", fmtNum(bCol), "bloques_colocados"));
    if (saltos !== null && !omitIds.has("saltos")) generalTiles.push(metric("saltos", "Saltos", fmtNum(saltos), "saltos"));
    if (caminarKm !== null && !omitIds.has("caminar")) generalTiles.push(metric("caminar", "Caminar", `${fmtNum(caminarKm)} km`, "caminar"));
    if (volarKm !== null && !omitIds.has("volar")) generalTiles.push(metric("volar", "Volar", `${fmtNum(volarKm)} km`, "vuelo"));

    if (generalTiles.length) s.push({ key: "general", title: "General", tiles: generalTiles });

    const combateTiles = [];
    const mobs = safe(combate?.mobs_matados ?? combate?.mobs);
    const kills = safe(combate?.kills_pvp ?? combate?.kills);
    const muertes = safe(combate?.muertes ?? combate?.deaths);
    const dano = safe(combate?.dano_infligido ?? combate?.damage);

    if (mobs !== null && !omitIds.has("mobs")) combateTiles.push(metric("mobs", "Mobs matados", fmtNum(mobs), "mobs"));
    if (kills !== null && !omitIds.has("kills")) combateTiles.push(metric("kills", "Kills PvP", fmtNum(kills), "kills"));
    if (muertes !== null && !omitIds.has("muertes")) combateTiles.push(metric("muertes", "Muertes", fmtNum(muertes), "muertes"));
    if (dano !== null && !omitIds.has("dano")) combateTiles.push(metric("dano", "Daño infligido", fmtNum(dano), "dmg"));

    if (combateTiles.length) s.push({ key: "combate", title: "Combate", tiles: combateTiles });

    const recursosTiles = [];
    const diam = safe(recursos?.diamantes ?? recursos?.diamond);
    const hierro = safe(recursos?.hierro ?? recursos?.iron);
    const oro = safe(recursos?.oro ?? recursos?.gold);
    const esmer = safe(recursos?.esmeraldas ?? recursos?.emerald);
    const cult = safe(recursos?.cultivos ?? recursos?.crops);
    const pesca = safe(recursos?.pesca ?? recursos?.fish);

    if (diam !== null) recursosTiles.push(metric("diamantes", "Diamantes", fmtNum(diam), "diamante"));
    if (hierro !== null) recursosTiles.push(metric("hierro", "Hierro", fmtNum(hierro), "hierro"));
    if (oro !== null) recursosTiles.push(metric("oro", "Oro", fmtNum(oro), "oro"));
    if (esmer !== null) recursosTiles.push(metric("esmeraldas", "Esmeraldas", fmtNum(esmer), "esmeralda"));
    if (cult !== null) recursosTiles.push(metric("cultivos", "Cultivos", fmtNum(cult), "cosecha"));
    if (pesca !== null) recursosTiles.push(metric("pesca", "Pesca", fmtNum(pesca), "pesca"));

    if (recursosTiles.length) s.push({ key: "recursos", title: "Recursos", tiles: recursosTiles });

    const economiaTiles = [];
    const srvPoints = safe(pickServerPoints(servidor, serverData));
    if (srvPoints !== null && !omitIds.has("points")) economiaTiles.push(metric("points", "Points", fmtNum(srvPoints), pointsIconKey(servidor)));

    const dinero = safe(economia?.dinero ?? economia?.money ?? resumen?.dinero);
    const dineroTotal = safe(economia?.dinero_ganado_total ?? economia?.total_ganado ?? economia?.total_ganado_dinero ?? resumen?.dinero_ganado_total);
    const coins = safe(economia?.coins ?? resumen?.coins);
    const coinsTotal = safe(economia?.coins_ganadas_total ?? resumen?.coins_ganadas_total);

    if (dineroTotal !== null && !omitIds.has("dinero_total")) economiaTiles.push(metric("dinero_total", "Dinero total", fmtMoney(dineroTotal), "dinero"));
    if (dinero !== null && !omitIds.has("dinero")) economiaTiles.push(metric("dinero", "Dinero actual", fmtMoney(dinero), "dinero"));
    if (coinsTotal !== null && !omitIds.has("coins_total")) economiaTiles.push(metric("coins_total", "Coins total", fmtNum(coinsTotal), "coins"));
    if (coins !== null && !omitIds.has("coins")) economiaTiles.push(metric("coins", "Coins", fmtNum(coins), "coins"));

    const incomeH = safe(isla?.income_h ?? isla?.income_por_hora ?? economia?.gens_income_h);
    if (incomeH !== null && servidor === "gens") economiaTiles.push(metric("income_h", "Income/h", fmtMoney(incomeH), "valor_isla"));

    if (economiaTiles.length) s.push({ key: "economia", title: "Economía", tiles: economiaTiles });

    return s;
  }, [general, combate, recursos, economia, resumen, isla, servidor, omitIds, serverData]);

  const shownSections = useMemo(() => {
    if (tab === "all") return sections;
    return sections.filter((s) => s.key === tab);
  }, [tab, sections]);

  const tabs = useMemo(() => {
    const base = [{ key: "all", label: "Todo", icon: "tiempo", count: sections.reduce((a, s) => a + (s?.tiles?.length || 0), 0) }];
    return base.concat(
      sections.map((s) => ({
        key: s.key,
        label: s.title,
        icon: sectionIconKey(s.key),
        count: s?.tiles?.length || 0,
      }))
    );
  }, [sections]);

  const onPickTab = (k) => {
    setTab(k);
    setAnimKey((v) => v + 1);
  };

  const serversAvailable = useMemo(() => {
    const map = perfil?.servidores || null;
    if (map && typeof map === "object") {
      const keys = new Set(Object.keys(map));
      return SERVER_META.filter((s) => keys.has(s.key));
    }
    return SERVER_META;
  }, [perfil?.servidores]);

  const updatedRaw = jugador?.actualizado || jugador?.updated_at || jugador?.ultimo_sync || null;
  const updatedTxt = useMemo(() => fmtUpdated(updatedRaw), [updatedRaw]);

  const rootClass = useMemo(() => {
    return ["perfil-epic", enterFx ? "pf-enter" : ""].filter(Boolean).join(" ");
  }, [enterFx]);

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

            <div className={`perfil-hero ${rankClass}`} style={{ "--hero-bg": `url(${heroBgUrl})` }}>
              <div className="perfil-heroBg" />
              <div className="perfil-heroInner">
                <div className="perfil-skinSlot">
                  <img
                    className="perfil-skinBody"
                    src={skinBody}
                    alt=""
                    draggable="false"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      if (e.currentTarget.dataset.fallback === "1") return;
                      e.currentTarget.dataset.fallback = "1";
                      e.currentTarget.src = `https://mc-heads.net/body/Steve/260`;
                    }}
                  />
                </div>

                <div className="perfil-heroMain">
                  <div className="perfil-nameRow">
                    <div className="perfil-nameLine">
                      <div className="perfil-name">{displayName}</div>
                      {rankAsset ? <img className="perfil-rankIconInline" src={rankAsset} alt="" draggable="false" /> : null}
                    </div>

                    <div className="perfil-subRow">
                      {plataformaLabel ? (
                        <div className={`perfil-platform ${plataforma === "bedrock" ? "is-bedrock" : "is-java"}`}>{plataformaLabel}</div>
                      ) : null}
                      {updatedTxt ? (
                        <div className="perfil-miniMeta">
                          Actualizado: <span>{updatedTxt}</span>
                        </div>
                      ) : null}
                      {loadingWeb ? <div className="perfil-miniMeta">Cargando cuenta…</div> : null}
                      {!loadingWeb && !hasWebAccount ? <div className="perfil-miniMeta is-warn">No vinculado</div> : null}
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
                      <button key={m.id} type="button" className="perfil-quickCard" title={m.hint || ""}>
                        {m.icon ? <img className="perfil-quickIcon" src={m.icon} alt="" draggable="false" /> : null}
                        <div className="perfil-quickText">
                          <div className="perfil-quickLabel">{m.label}</div>
                          <div className="perfil-quickValue">{m.value}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="perfil-heroSide">
                  <div className="perfil-headCard">
                    <img
                      className="perfil-headImg"
                      src={skinFace}
                      alt=""
                      draggable="false"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        if (e.currentTarget.dataset.fallback === "1") return;
                        e.currentTarget.dataset.fallback = "1";
                        e.currentTarget.src = `https://mc-heads.net/avatar/Steve/160`;
                      }}
                    />
                  </div>

                  <div className="perfil-webLevel">
                    <div className="perfil-webLevelLabel">Nivel</div>
                    <div className="perfil-webLevelValue">{hasWebAccount && webNivel !== null ? fmtNum(webNivel) : EMPTY}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="perfil-servers">
              <div className="perfil-serversHead">
                <div className="perfil-sectionTitle">Servidores</div>
                <div className="perfil-sectionSub">Elige uno para ver sus estadísticas completas.</div>
              </div>

              <div className="perfil-serversGrid">
                {serversAvailable.map((s) => {
                  const active = s.key === servidor;
                  return (
                    <button
                      key={s.key}
                      type="button"
                      className={`perfil-serverCard ${active ? "is-active" : ""}`}
                      onClick={() => {
                        setServidor(s.key);
                        setAnimKey((v) => v + 1);
                      }}
                    >
                      <div className="perfil-serverArt" style={{ backgroundImage: `url(${s.img})` }} />
                      <div className="perfil-serverLabel">{s.label}</div>
                      <div className="perfil-serverGlow" />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="perfil-detail">
              <div className="perfil-detailHead">
                <div className="perfil-sectionTitle">Detalle · {SERVER_META.find((x) => x.key === servidor)?.label || servidor}</div>
                <div className="perfil-detailMeta">{loading ? "Cargando perfil…" : loadingServer ? "Actualizando servidor…" : error ? error : ""}</div>
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
                    {t.icon ? <img className="pf-tabIcon" src={ICONS[t.icon]} alt="" draggable="false" /> : null}
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
              ) : error ? (
                <div className="perfil-errorBox">
                  <div className="perfil-errorTitle">No se pudo cargar</div>
                  <div className="perfil-errorMsg">{error}</div>
                </div>
              ) : (
                <div className="perfil-sections" key={`sec-${servidor}-${tab}-${animKey}`}>
                  {shownSections.map((sec) => (
                    <div key={sec.key} className="perfil-section">
                      <div className="perfil-sectionHeader">
                        <div className="perfil-sectionTitle2">{sec.title}</div>
                      </div>

                      <div className="perfil-tiles">
                        {sec.tiles.map((t, idx) => (
                          <button key={t.id} type="button" className="perfil-tile pf-tileIn" style={{ "--i": idx }} title={t.hint || ""}>
                            {t.icon ? <img className="perfil-tileIcon" src={t.icon} alt="" draggable="false" /> : null}
                            <div className="perfil-tileBody">
                              <div className="perfil-tileLabel">{t.label}</div>
                              <div className="perfil-tileValue">{t.value}</div>
                            </div>
                            <div className="perfil-tileSheen" />
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {gensValorInfo ? null : null}

            <div className="perfil-footNote">
              <span>{isMobile ? "" : ""}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}