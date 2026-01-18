// src/pages/Leaderboards/Leaderboards.jsx
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
  useLayoutEffect,
} from "react";
import { useNavigate } from "react-router-dom";
import { Search, SlidersHorizontal, X, ChevronDown, Info } from "lucide-react";

import { getLeaderboards } from "../../api/getLeaderboards";
import "../../styles/components/Estadisticas/_leaderboards.scss";

const API_BASE = import.meta.env.VITE_BACKEND_URL || "http://localhost:10000";

/**
 * UI IDs (bonitos) → IDs oficiales backend/supabase/plugin
 */
const SERVIDOR_API_MAP = {
  survival_clasico: "survival",
  oneblock: "oneblock",
  gens: "gens",
  survival_anarquico: "anarquico",
  parkour: "parkour",
};

const SERVIDORES = [
  { id: "survival_clasico", nombre: "Survival Clásico", imagen: "/assets/reinos/survival-clasico.webp" },
  { id: "oneblock", nombre: "OneBlock", imagen: "/assets/reinos/oneblock.webp" },
  { id: "gens", nombre: "Gens", imagen: "/assets/reinos/gens.webp" },
  { id: "survival_anarquico", nombre: "Survival Anárquico", imagen: "/assets/reinos/survival-anarquico.webp" },
  { id: "parkour", nombre: "Parkour", imagen: "/assets/reinos/parkour.webp" },
];

/**
 * ✅ Columnas por servidor
 * GENS: PUNTOS | COINS (total ganado) | GENS | TIEMPO | DINERO (total ganado)
 */
const STATS_BY_SERVER = {
  survival_clasico: ["tiempo_jugado", "bloques_minados", "mobs_matados", "dinero", "kills_pvp", "muertes"],

  oneblock: [
    "island_level",
    "oneblock_blocks_broken",
    "phase_actual",
    "dinero",
    "mobs_matados",
    "tiempo_jugado",
    "muertes",
  ],

  gens: [
    "puntos",
    "coins_ganadas_total",
    "gens_owned",
    "tiempo_jugado",
    "dinero_ganado_total",
  ],

  survival_anarquico: ["kills_pvp", "kdr", "killstreak_max", "damage_dealt", "muertes", "tiempo_jugado"],

  parkour: ["mejor_tiempo", "completadas_total", "perfect_runs", "falls", "medallas_ganadas", "racha_dias", "tiempo_jugado"],
};

const DEFAULTS_BY_SERVER = {
  survival_clasico: { orden: "tiempo_jugado", asc: false },
  oneblock: { orden: "island_level", asc: false },

  // ✅ GENS: por defecto ordena por puntos
  gens: { orden: "puntos", asc: false },

  survival_anarquico: { orden: "kills_pvp", asc: false },
  parkour: { orden: "mejor_tiempo", asc: true },
};

const LABELS = {
  puntos: "Puntos",

  tiempo_jugado: "Tiempo",
  muertes: "Muertes",

  bloques_minados: "Minados",
  mobs_matados: "Mobs",
  kills_pvp: "Kills PvP",
  dinero: "Dinero",

  island_level: "Nivel Isla",
  oneblock_blocks_broken: "Bloque Infinito",
  phase_actual: "Fase",

  coins_ganadas_total: "Coins",
  gens_owned: "Gens",
  dinero_ganado_total: "Dinero",

  kdr: "KDR",
  killstreak_max: "Racha Máx",
  damage_dealt: "Daño",

  mejor_tiempo: "Mejor Tiempo",
  completadas_total: "Completadas",
  perfect_runs: "Perfect",
  falls: "Caídas",
  medallas_ganadas: "Medallas",
  racha_dias: "Racha",
};

const STAT_HELP = {
  // ✅ PUNTOS: explicación breve y “para niños de 12”
  puntos:
    "Tu score de Gens. Subes puntos consiguiendo coins, ganando dinero, poniendo más gens y jugando. Gastar coins o dinero no te baja puntos.",

  tiempo_jugado: "Tiempo total jugado en este servidor (en horas y minutos).",
  muertes: "Número total de muertes del jugador en este servidor.",

  dinero: "Dinero del jugador (balance actual en ese servidor).",
  bloques_minados: "Bloques minados (estadística de Minecraft).",
  mobs_matados: "Mobs eliminados (estadística de Minecraft).",
  kills_pvp: "Kills a otros jugadores (PvP).",

  island_level: "Nivel de tu isla. Si está a 0, se usa la fase como aproximación.",
  oneblock_blocks_broken: "Bloques rotos en el bloque infinito (lifetime).",
  phase_actual: "Fase numérica del progreso de OneBlock.",

  mejor_tiempo: "Mejor tiempo registrado en Parkour (mm:ss.ms).",
  completadas_total: "Número total de recorridos completados.",
  perfect_runs: "Recorridos perfectos (sin fallos).",
  falls: "Caídas registradas.",
  medallas_ganadas: "Medallas conseguidas en Parkour.",
  racha_dias: "Racha de días consecutivos jugando Parkour.",

  kdr: "Ratio K/D: kills PvP dividido entre muertes.",
  killstreak_max: "Mayor racha de kills sin morir.",
  damage_dealt: "Daño total infligido (estadística).",

  // ✅ GENS PRO
  coins_ganadas_total: "Coins totales ganadas en Gens. Si gastas, no baja.",
  gens_owned: "Generadores colocados en tu isla.",
  dinero_ganado_total: "Dinero total ganado en Gens. Si gastas, no baja.",
};

const MEDALLAS = {
  1: "/assets/oro.webp",
  2: "/assets/plata.webp",
  3: "/assets/bronce.webp",
};

const cn = (...args) =>
  args
    .flatMap((a) => {
      if (!a) return [];
      if (typeof a === "string") return [a];
      if (typeof a === "object") return Object.keys(a).filter((k) => !!a[k]);
      return [];
    })
    .join(" ");

const isNombreValido = (nombre) => {
  const n = (nombre || "").trim();
  if (!n) return false;
  const low = n.toLowerCase();
  if (low === "desconocido" || low === "unknown") return false;
  return true;
};

/* =========================================================
   Tooltip PRO (fixed + flip + legible)
   ========================================================= */
function HelpTip({ text }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const bubbleRef = useRef(null);

  const placeBubble = useCallback(() => {
    const wrap = wrapRef.current;
    const bubble = bubbleRef.current;
    if (!wrap || !bubble) return;

    const w = wrap.getBoundingClientRect();

    const margin = 10;
    const gap = 10;

    const b = bubble.getBoundingClientRect();

    let left = w.left + w.width / 2;

    let top = w.bottom + gap;
    let place = "bottom";

    if (top + b.height > window.innerHeight - margin) {
      top = w.top - gap - b.height;
      place = "top";
    }

    const halfW = b.width / 2;
    if (left - halfW < margin) left = margin + halfW;
    if (left + halfW > window.innerWidth - margin) left = window.innerWidth - margin - halfW;

    bubble.style.left = `${left}px`;
    bubble.style.top = `${top}px`;

    bubble.classList.toggle("is-top", place === "top");
    bubble.classList.toggle("is-bottom", place === "bottom");
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    const id1 = requestAnimationFrame(() => {
      placeBubble();
      const id2 = requestAnimationFrame(placeBubble);
      bubbleRef.current && (bubbleRef.current.__raf2 = id2);
    });
    return () => {
      cancelAnimationFrame(id1);
      const id2 = bubbleRef.current?.__raf2;
      if (id2) cancelAnimationFrame(id2);
    };
  }, [open, placeBubble]);

  useEffect(() => {
    if (!open) return;

    const onResize = () => placeBubble();
    const onScroll = () => placeBubble();
    const onDown = (e) => {
      const wrap = wrapRef.current;
      if (!wrap) return;
      if (!wrap.contains(e.target)) setOpen(false);
    };

    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("pointerdown", onDown);

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [open, placeBubble]);

  if (!text) return null;

  return (
    <span
      ref={wrapRef}
      className="lb-tip"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className="lb-tip__btn"
        aria-label={text}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        <Info size={14} />
      </button>

      {open && (
        <span ref={bubbleRef} className="lb-tip__bubble is-bottom" role="tooltip">
          {text}
        </span>
      )}
    </span>
  );
}

function StatHeader({ stat, active, ordenAsc, onClick }) {
  const label = LABELS[stat] || stat;
  const help = STAT_HELP[stat] || `Ordenar por ${label}`;

  return (
    <th
      className={cn("th-sort", { active })}
      data-stat={stat}
      onClick={onClick}
      role="columnheader"
      aria-sort={active ? (ordenAsc ? "ascending" : "descending") : "none"}
      title={label}
    >
      <span className="th-sort__label">
        <span className="th-sort__text">{label}</span>
        <HelpTip text={help} />
      </span>

      {active && <i className="th-sort__arrow">{ordenAsc ? "▲" : "▼"}</i>}
    </th>
  );
}

/* =========================================================
   ✅ PUNTOS GENS (PRO)
   - Usa TOTAL ganado (coins_ganadas_total y dinero_ganado_total)
   - No baja si gastas
   - Suaviza valores enormes para que sea competitivo (log + sqrt)
   - Tiempo capado para que no gane el AFK por horas infinitas
   ========================================================= */
function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function log1p10(v) {
  const x = Math.max(0, safeNum(v));
  return Math.log10(1 + x);
}
function sqrtp(v) {
  const x = Math.max(0, safeNum(v));
  return Math.sqrt(x);
}
function computeGensScore(p) {
  const coinsEarned = log1p10(p?.coins_ganadas_total);       // total ganado
  const moneyEarned = log1p10(p?.dinero_ganado_total);       // total ganado
  const gens = sqrtp(p?.gens_owned);                         // retorno decreciente
  const hours = safeNum(p?.tiempo_jugado) / 3600;
  const time = Math.min(60, Math.max(0, hours));             // cap 60h

  // Pesos: equilibrado y competitivo
  const w = {
    coins: 320,
    gens: 260,
    time: 14,
    money: 120,
  };

  const score =
    coinsEarned * w.coins +
    gens * w.gens +
    time * w.time +
    moneyEarned * w.money;

  return Math.max(0, Math.round(score));
}

export default function Leaderboards() {
  const navigate = useNavigate();

  const [servidor, setServidor] = useState(SERVIDORES[2].id); // gens por defecto
  const servidorApi = useMemo(() => SERVIDOR_API_MAP[servidor] || servidor, [servidor]);

  const defaults = DEFAULTS_BY_SERVER[servidor] || { orden: "tiempo_jugado", asc: false };

  const [orden, setOrden] = useState(defaults.orden);
  const [ordenAsc, setOrdenAsc] = useState(defaults.asc);

  const [datos, setDatos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorTabla, setErrorTabla] = useState("");

  const [offset, setOffset] = useState(0);
  const limit = 10;
  const paginasTotales = 10;

  const [query, setQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [soloVinculados, setSoloVinculados] = useState(false);

  const [usuariosVinculados, setUsuariosVinculados] = useState({});

  const servidorSeleccionado = useMemo(() => SERVIDORES.find((s) => s.id === servidor), [servidor]);

  const STATS = useMemo(() => STATS_BY_SERVER[servidor] || ["tiempo_jugado"], [servidor]);
  const paginaActual = useMemo(() => Math.floor(offset / limit) + 1, [offset]);

  useEffect(() => {
    const d = DEFAULTS_BY_SERVER[servidor] || { orden: "tiempo_jugado", asc: false };
    setOrden(d.orden);
    setOrdenAsc(d.asc);
    setOffset(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [servidor]);

  const formatearTiempo = useCallback((seconds) => {
    const totalSegundos = Math.floor(Number(seconds || 0));
    const horas = Math.floor(totalSegundos / 3600);
    const minutos = Math.floor((totalSegundos % 3600) / 60);
    return `${horas}h ${minutos}m`;
  }, []);

  const formatearTiempoParkour = useCallback((v) => {
    const n = Number(v || 0);
    if (!Number.isFinite(n) || n <= 0) return "—";
    const isMs = n > 1000;
    const totalMs = isMs ? Math.floor(n) : Math.floor(n * 1000);

    const min = Math.floor(totalMs / 60000);
    const sec = Math.floor((totalMs % 60000) / 1000);
    const ms = totalMs % 1000;

    const mm = String(min).padStart(2, "0");
    const ss = String(sec).padStart(2, "0");
    const mss = String(ms).padStart(3, "0");
    return `${mm}:${ss}.${mss}`;
  }, []);

  const getIslandLevel = useCallback((p) => {
    const isl = Number(p?.island_level || 0);
    const ph = Number(p?.phase_actual || 0);
    const v = Math.max(isl, ph);
    return Number.isFinite(v) ? v : 0;
  }, []);

  // ✅ Plataforma desde backend: "java" | "bedrock"
  const getPlatform = useCallback((p) => {
    const pl = (p?.plataforma || "").toString().toLowerCase();
    if (pl === "bedrock") return "bedrock";
    if (pl === "java") return "java";
    return null;
  }, []);

  const getStatNumber = useCallback(
    (p, key) => {
      if (!p) return 0;

      // ✅ PUNTOS (solo gens)
      if (key === "puntos") return computeGensScore(p);

      if (key === "island_level") return getIslandLevel(p);

      const raw = p?.[key];
      if (raw === null || raw === undefined || raw === "") return 0;

      const n = Number(raw);
      if (!Number.isFinite(n)) return 0;
      return n;
    },
    [getIslandLevel]
  );

  const formatValue = useCallback(
    (key, value) => {
      if (value === null || value === undefined) return "—";

      if (key === "puntos") {
        const n = Number(value || 0);
        if (!Number.isFinite(n)) return "—";
        return n.toLocaleString("es-ES");
      }

      const n = Number(value);

      if (key === "tiempo_jugado") return formatearTiempo(n);
      if (key === "mejor_tiempo") return formatearTiempoParkour(n);

      if (key === "dinero") {
        if (!Number.isFinite(n)) return "—";
        return `${n.toLocaleString("es-ES")} $`;
      }

      if (key === "dinero_ganado_total") {
        if (!Number.isFinite(n)) return "—";
        return `${n.toLocaleString("es-ES")} $`;
      }

      if (key === "coins_ganadas_total") {
        if (!Number.isFinite(n)) return "—";
        return n.toLocaleString("es-ES");
      }

      if (key === "kdr") {
        if (!Number.isFinite(n)) return "—";
        return n.toFixed(2);
      }

      if (!Number.isFinite(n)) return "—";
      return n.toLocaleString("es-ES");
    },
    [formatearTiempo, formatearTiempoParkour]
  );

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/usuarios`, { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const usuarios = await res.json();

        const mapa = (usuarios || []).reduce((acc, u) => {
          if (u?.uuid) {
            acc[u.uuid] = { rango: u.rango_usuario?.toLowerCase() || null };
          }
          return acc;
        }, {});

        setUsuariosVinculados(mapa);
      } catch (err) {
        if (err?.name === "AbortError") return;
        console.error("Error usuarios:", err);
      }
    })();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErrorTabla("");

    (async () => {
      try {
        // ✅ Si el usuario ordena por "puntos", pedimos al backend por coins_ganadas_total (paginación),
        // y luego ordenamos en frontend por puntos.
        const tipoBackend = orden === "puntos" ? "coins_ganadas_total" : orden;

        const res = await getLeaderboards({
          tipo: tipoBackend,
          servidor: servidorApi,
          limit,
          offset,
        });
        if (!alive) return;

        const lista = (res?.resultados || []).filter((p) => isNombreValido(p?.nombre_minecraft));

        const ordenada = ordenAsc
          ? [...lista].sort((a, b) => getStatNumber(a, orden) - getStatNumber(b, orden))
          : [...lista].sort((a, b) => getStatNumber(b, orden) - getStatNumber(a, orden));

        setDatos(ordenada);
      } catch (err) {
        if (!alive) return;
        console.error(err);
        setErrorTabla("No se pudo cargar el ranking.");
        setDatos([]);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [orden, ordenAsc, servidorApi, offset, limit, getStatNumber]);

  const cambiarOrden = useCallback((stat) => {
    setOrden((prev) => {
      if (prev === stat) {
        setOrdenAsc((v) => !v);
        return prev;
      }
      setOrdenAsc(stat === "mejor_tiempo");
      return stat;
    });
    setOffset(0);
  }, []);

  const getMeta = useCallback((uuid) => usuariosVinculados[uuid] || null, [usuariosVinculados]);

  const irPerfil = useCallback(
    (player) => {
      if (!player?.nombre_minecraft) return;
      navigate(`/perfil/${player.nombre_minecraft}`);
    },
    [navigate]
  );

  const datosFiltrados = useMemo(() => {
    const q = query.trim().toLowerCase();

    return (datos || []).filter((p) => {
      if (!isNombreValido(p?.nombre_minecraft)) return false;

      const nombre = (p?.nombre_minecraft || "").toLowerCase();
      const matchNombre = !q || nombre.includes(q);

      const meta = getMeta(p?.uuid);
      const vinc = !!meta;
      const okVinc = !soloVinculados || vinc;

      return matchNombre && okVinc;
    });
  }, [datos, query, soloVinculados, getMeta]);

  const top3 = useMemo(() => {
    const list = (datosFiltrados.length ? datosFiltrados : datos).filter((p) =>
      isNombreValido(p?.nombre_minecraft)
    );
    return (list || []).slice(0, 3);
  }, [datos, datosFiltrados]);

  const cambiarPagina = (pageIndex) => setOffset(pageIndex * limit);

  const { wideCount, mediumCount } = useMemo(() => {
    const WIDE = new Set(["oneblock_blocks_broken"]);
    const MED = new Set(["killstreak_max", "mejor_tiempo"]);

    let w = 0;
    let m = 0;
    for (const s of STATS) {
      if (WIDE.has(s)) w += 1;
      else if (MED.has(s)) m += 1;
    }
    return { wideCount: w, mediumCount: m };
  }, [STATS]);

  return (
    <section className="lb-page">
      <div className="lb-shell">
        <div className="lb-frame">
          <div className="lb-topHeader">
            <header className="lb-header">
              <div className="lb-header__center">
                <h1 className="lb-title">Ranking Flancraft</h1>
                <h2 className="lb-subtitle">
                  <span className="lb-subtitle__server">{servidorSeleccionado?.nombre}</span>
                  <span className="lb-dot">•</span>
                  <span className="lb-subtitle__order">
                    {LABELS[orden] || orden} {ordenAsc ? "▲" : "▼"}
                  </span>
                </h2>
              </div>

              <div className="lb-header__right">
                <div className="lb-pagePill">
                  <span>Página</span>
                  <b>
                    {paginaActual}/{paginasTotales}
                  </b>
                </div>
              </div>
            </header>
          </div>

          <section className="lb-podium">
            {top3.map((p, idx) => {
              const absPos = offset + idx + 1;
              const medal = MEDALLAS[absPos] || MEDALLAS[idx + 1];
              const meta = getMeta(p.uuid);
              const name = p?.nombre_minecraft;
              const platform = getPlatform(p);

              const valueForPodium =
                orden === "phase_actual"
                  ? (p?.phase_nombre || "—")
                  : orden === "island_level"
                  ? getIslandLevel(p)
                  : orden === "puntos"
                  ? computeGensScore(p)
                  : p?.[orden];

              return (
                <button
                  key={p.uuid}
                  type="button"
                  className={cn("pod-card", `pod-card--${idx + 1}`)}
                  onClick={() => irPerfil(p)}
                  title="Abrir perfil"
                >
                  <div className="pod-card__medal">
                    <img src={medal} alt={`Top ${idx + 1}`} />
                  </div>

                  <div className="pod-card__main">
                    <img
                      className="pod-head"
                      src={`https://mc-heads.net/avatar/${name}/44`}
                      alt=""
                      loading="lazy"
                      onError={(e) => (e.currentTarget.src = "/assets/default-head.png")}
                    />

                    <div className="pod-card__info">
                      <div className="pod-nameLine">
                        <span className="pod-name">{name}</span>
                        <span className="pod-badges">
                          {platform && (
                            <span
                              className={cn("lb-badge-platform", {
                                bedrock: platform === "bedrock",
                                java: platform === "java",
                              })}
                            >
                              {platform === "bedrock" ? "BEDROCK" : "JAVA"}
                            </span>
                          )}
                          {meta?.rango && (
                            <img
                              src={`/assets/rangos/${meta.rango}.webp`}
                              alt={`Rango ${meta.rango}`}
                              className="lb-badge-rango"
                              loading="lazy"
                            />
                          )}
                        </span>
                      </div>

                      <div className="pod-stat">
                        <span className="pod-stat__k">{LABELS[orden] || orden}</span>
                        <span className="pod-stat__v">
                          {orden === "phase_actual"
                            ? (p?.phase_nombre || "—")
                            : orden === "puntos"
                            ? Number(valueForPodium || 0).toLocaleString("es-ES")
                            : formatValue(orden, valueForPodium)}
                        </span>
                      </div>

                      {servidor === "gens" && orden !== "puntos" && (
                        <div className="pod-stat" style={{ marginTop: 6, opacity: 0.95 }}>
                          <span className="pod-stat__k">Puntos</span>
                          <span className="pod-stat__v">{computeGensScore(p).toLocaleString("es-ES")}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </section>

          <section className="lb-servers">
            <div className="server-rail">
              <div className="server-grid" role="tablist" aria-label="Servidores">
                {SERVIDORES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={cn("server-pill", { active: servidor === s.id })}
                    onClick={() => setServidor(s.id)}
                    role="tab"
                    aria-selected={servidor === s.id}
                  >
                    <div className="server-pill__iconWrap">
                      <img className="server-pill__icon" src={s.imagen} alt="" />
                    </div>

                    <div className="server-pill__label">{s.nombre}</div>

                    <div className="server-pill__underline" />
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="lb-toolbar">
            <div className="lb-search">
              <Search size={18} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar jugador…"
                spellCheck={false}
              />
              {query && (
                <button className="lb-clear" onClick={() => setQuery("")} type="button" aria-label="Limpiar">
                  <X size={18} />
                </button>
              )}
            </div>

            <button
              type="button"
              className={cn("lb-filterBtn", { active: filtersOpen })}
              onClick={() => setFiltersOpen((v) => !v)}
              title="Filtros"
            >
              <SlidersHorizontal size={18} />
              <span>Filtros</span>
            </button>

            <div className="lb-mobileOrder">
              <div className="lb-select">
                <span className="lb-select__k">Orden</span>
                <select
                  value={orden}
                  onChange={(e) => {
                    const v = e.target.value;
                    setOrden(v);
                    setOrdenAsc(v === "mejor_tiempo");
                    setOffset(0);
                  }}
                >
                  {STATS.map((st) => (
                    <option key={st} value={st}>
                      {LABELS[st] || st}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} />
              </div>

              {STAT_HELP[orden] && <div className="lb-orderHint">{STAT_HELP[orden]}</div>}
            </div>

            {filtersOpen && (
              <div className="lb-filtersPanel">
                <label className={cn("lb-toggle", { on: soloVinculados })}>
                  <input
                    type="checkbox"
                    checked={soloVinculados}
                    onChange={(e) => setSoloVinculados(e.target.checked)}
                  />
                  <span>Solo vinculados</span>
                </label>

                <button
                  type="button"
                  className="lb-reset"
                  onClick={() => {
                    setQuery("");
                    setSoloVinculados(false);
                  }}
                >
                  Reset
                </button>

                <div className="lb-count">
                  <span className="lb-count__k">Resultados</span>
                  <span className="lb-count__v">{datosFiltrados.length}</span>
                </div>
              </div>
            )}
          </section>

          <section className="lb-content">
            <div className="lb-tableCard">
              <div className="lb-tableTop">
                <div className="lb-tableTitle">
                  <span className="lb-tableTitle__server">{servidorSeleccionado?.nombre}</span>
                  <span className="lb-sep">•</span>
                  <span className="lb-tableTitle__stat">
                    {LABELS[orden] || orden} {ordenAsc ? "▲" : "▼"}
                  </span>
                </div>
              </div>

              {errorTabla ? (
                <div className="lb-error">
                  <div className="lb-error__title">Error</div>
                  <div className="lb-error__text">{errorTabla}</div>
                </div>
              ) : (
                <>
                  <div className="lb-tableWrap">
                    <table
                      className="lb-table"
                      style={{
                        "--stats": STATS.length,
                        "--wideCount": wideCount,
                        "--mediumCount": mediumCount,
                      }}
                    >
                      <thead>
                        <tr>
                          <th className="col-pos">Top</th>
                          <th className="col-player">Jugador</th>

                          {STATS.map((st) => (
                            <StatHeader
                              key={st}
                              stat={st}
                              active={orden === st}
                              ordenAsc={ordenAsc}
                              onClick={() => cambiarOrden(st)}
                            />
                          ))}
                        </tr>
                      </thead>

                      <tbody>
                        {loading &&
                          [...Array(limit)].map((_, i) => (
                            <tr key={`sk-${i}`} className="lb-row sk-row">
                              <td><span className="sk sk--pos" /></td>
                              <td>
                                <div className="lb-player">
                                  <span className="sk sk--head" />
                                  <div className="sk-col">
                                    <span className="sk sk--name" />
                                    <span className="sk sk--mini" />
                                  </div>
                                </div>
                              </td>
                              {STATS.map((st) => (
                                <td key={st}><span className="sk sk--num" /></td>
                              ))}
                            </tr>
                          ))}

                        {!loading && datosFiltrados.length === 0 && (
                          <tr className="lb-row empty">
                            <td colSpan={2 + STATS.length}>No hay resultados con los filtros actuales.</td>
                          </tr>
                        )}

                        {!loading &&
                          datosFiltrados.map((p, i) => {
                            const absPos = offset + i + 1;
                            const meta = getMeta(p.uuid);
                            const medal = MEDALLAS[absPos] || null;
                            const name = p?.nombre_minecraft;
                            const platform = getPlatform(p);

                            return (
                              <tr
                                key={`${p.uuid}-${absPos}-${orden}`}
                                className={cn("lb-row", {
                                  top1: absPos === 1,
                                  top2: absPos === 2,
                                  top3: absPos === 3,
                                })}
                                onClick={() => irPerfil(p)}
                                tabIndex={0}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") irPerfil(p);
                                }}
                                title="Abrir perfil"
                              >
                                <td className="td-pos">
                                  {medal ? (
                                    <img src={medal} alt={`Top ${absPos}`} className="lb-medal" loading="lazy" />
                                  ) : (
                                    <span className="lb-rank">{absPos}</span>
                                  )}
                                </td>

                                <td className="td-player">
                                  <div className="lb-player">
                                    <img
                                      className="lb-head"
                                      src={`https://mc-heads.net/avatar/${name}/32`}
                                      alt=""
                                      loading="lazy"
                                      onError={(e) => (e.currentTarget.src = "/assets/default-head.png")}
                                    />
                                    <div className="lb-player__text">
                                      <div className="lb-nameRow">
                                        <span className="lb-name">{name}</span>
                                        <span className="lb-badges">
                                          {platform && (
                                            <span
                                              className={cn("lb-badge-platform", {
                                                bedrock: platform === "bedrock",
                                                java: platform === "java",
                                              })}
                                            >
                                              {platform === "bedrock" ? "BEDROCK" : "JAVA"}
                                            </span>
                                          )}
                                          {meta?.rango && (
                                            <img
                                              src={`/assets/rangos/${meta.rango}.webp`}
                                              alt=""
                                              className="lb-badge-rango"
                                              loading="lazy"
                                            />
                                          )}
                                        </span>
                                      </div>
                                      <div className="lb-player__sub">{meta?.rango ? meta.rango : "—"}</div>
                                    </div>
                                  </div>
                                </td>

                                {STATS.map((st) => {
                                  const rawValue =
                                    st === "phase_actual"
                                      ? (p?.phase_nombre || "—")
                                      : st === "island_level"
                                      ? getIslandLevel(p)
                                      : st === "puntos"
                                      ? computeGensScore(p)
                                      : p?.[st];

                                  return (
                                    <td key={st} className={cn("td-stat", { active: orden === st })}>
                                      <span className="num">
                                        {st === "phase_actual"
                                          ? (p?.phase_nombre || "—")
                                          : formatValue(st, rawValue)}
                                      </span>
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>

                  {/* MOBILE CARDS: en GENS mostramos 5 stats (Puntos + 4) */}
                  <div className="lb-cards">
                    {!loading &&
                      datosFiltrados.map((p, i) => {
                        const absPos = offset + i + 1;
                        const meta = getMeta(p.uuid);
                        const name = p?.nombre_minecraft;
                        const medal = MEDALLAS[absPos] || null;
                        const platform = getPlatform(p);

                        const gensScore = servidor === "gens" ? computeGensScore(p) : null;

                        return (
                          <button
                            key={`m-${p.uuid}-${absPos}`}
                            type="button"
                            className={cn("lb-card", {
                              top1: absPos === 1,
                              top2: absPos === 2,
                              top3: absPos === 3,
                            })}
                            onClick={() => irPerfil(p)}
                            title="Abrir perfil"
                          >
                            <div className="lb-card__top">
                              <div className="lb-card__pos">
                                {medal ? <img src={medal} alt="" /> : <span>#{absPos}</span>}
                              </div>

                              <img
                                className="lb-card__head"
                                src={`https://mc-heads.net/avatar/${name}/40`}
                                alt=""
                                loading="lazy"
                                onError={(e) => (e.currentTarget.src = "/assets/default-head.png")}
                              />

                              <div className="lb-card__who">
                                <div className="lb-nameRow">
                                  <span className="lb-name">{name}</span>
                                  <span className="lb-badges">
                                    {platform && (
                                      <span
                                        className={cn("lb-badge-platform", {
                                          bedrock: platform === "bedrock",
                                          java: platform === "java",
                                        })}
                                      >
                                        {platform === "bedrock" ? "BEDROCK" : "JAVA"}
                                      </span>
                                    )}
                                    {meta?.rango && (
                                      <img
                                        src={`/assets/rangos/${meta.rango}.webp`}
                                        alt=""
                                        className="lb-badge-rango"
                                        loading="lazy"
                                      />
                                    )}
                                  </span>
                                </div>

                                <div className="lb-card__sub">
                                  {meta?.rango ? meta.rango : "—"}
                                </div>
                              </div>
                            </div>

                            {servidor === "gens" ? (
                              <div className="lb-card__grid">
                                <div className="lb-card__stat active">
                                  <span className="k">
                                    Puntos <span className="k-help"><HelpTip text={STAT_HELP.puntos} /></span>
                                  </span>
                                  <span className="v">{gensScore?.toLocaleString("es-ES")}</span>
                                </div>

                                <div className="lb-card__stat">
                                  <span className="k">Coins <span className="k-help"><HelpTip text={STAT_HELP.coins_ganadas_total} /></span></span>
                                  <span className="v">{formatValue("coins_ganadas_total", p?.coins_ganadas_total)}</span>
                                </div>

                                <div className="lb-card__stat">
                                  <span className="k">Gens <span className="k-help"><HelpTip text={STAT_HELP.gens_owned} /></span></span>
                                  <span className="v">{formatValue("gens_owned", p?.gens_owned)}</span>
                                </div>

                                <div className="lb-card__stat">
                                  <span className="k">Tiempo <span className="k-help"><HelpTip text={STAT_HELP.tiempo_jugado} /></span></span>
                                  <span className="v">{formatValue("tiempo_jugado", p?.tiempo_jugado)}</span>
                                </div>

                                <div className="lb-card__stat">
                                  <span className="k">Dinero <span className="k-help"><HelpTip text={STAT_HELP.dinero_ganado_total} /></span></span>
                                  <span className="v">{formatValue("dinero_ganado_total", p?.dinero_ganado_total)}</span>
                                </div>
                              </div>
                            ) : (
                              <div className="lb-card__grid">
                                {STATS.slice(0, 6).map((st) => {
                                  const rawValue =
                                    st === "phase_actual"
                                      ? (p?.phase_nombre || "—")
                                      : st === "island_level"
                                      ? getIslandLevel(p)
                                      : p?.[st];

                                  return (
                                    <div key={st} className={cn("lb-card__stat", { active: orden === st })}>
                                      <span className="k">
                                        {LABELS[st] || st}
                                        <span className="k-help">
                                          <HelpTip text={STAT_HELP[st] || ""} />
                                        </span>
                                      </span>
                                      <span className="v">
                                        {st === "phase_actual" ? (p?.phase_nombre || "—") : formatValue(st, rawValue)}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </button>
                        );
                      })}
                  </div>
                </>
              )}

              <div className="lb-pagination">
                {[...Array(paginasTotales)].map((_, idx) => (
                  <button
                    key={idx}
                    className={offset === idx * limit ? "active" : ""}
                    onClick={() => cambiarPagina(idx)}
                    aria-label={`Página ${idx + 1}`}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
