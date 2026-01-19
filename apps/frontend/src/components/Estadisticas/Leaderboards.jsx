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
import { Search, SlidersHorizontal, X, ChevronDown, Info, ChevronRight } from "lucide-react";

import { getLeaderboards } from "../../api/getLeaderboards";
import "../../styles/components/Estadisticas/_leaderboards.scss";

const API_BASE = import.meta.env.VITE_BACKEND_URL || "http://localhost:10000";

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

  gens: ["genpoints", "coins_balance", "gens_value_total", "gens_highest_tier", "tiempo_jugado", "dinero"],

  survival_anarquico: ["kills_pvp", "kdr", "killstreak_max", "damage_dealt", "muertes", "tiempo_jugado"],

  parkour: ["mejor_tiempo", "completadas_total", "perfect_runs", "falls", "medallas_ganadas", "racha_dias", "tiempo_jugado"],
};

const DEFAULTS_BY_SERVER = {
  survival_clasico: { orden: "tiempo_jugado", asc: false },
  oneblock: { orden: "island_level", asc: false },
  gens: { orden: "genpoints", asc: false },
  survival_anarquico: { orden: "kills_pvp", asc: false },
  parkour: { orden: "mejor_tiempo", asc: true },
};

const LABELS = {
  genpoints: "GENPOINTS",

  tiempo_jugado: "Tiempo",
  muertes: "Muertes",

  bloques_minados: "Minados",
  mobs_matados: "Mobs",
  kills_pvp: "Kills PvP",
  dinero: "Dinero",

  island_level: "Nivel Isla",
  oneblock_blocks_broken: "Bloque Infinito",
  phase_actual: "Fase",

  coins_balance: "Coins",

  gens_value_total: "Valor Gens",
  gens_highest_tier: "Tier Máx",

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
  genpoints:
    "Puntuación competitiva de Gens. Usa Coins/Dinero totales ganados (no bajan al gastar), Valor real de generadores por tier, Income/h estimado y tiempo. Tener 10 gens tier 10 puntúa mucho más que 10 gens tier 1.",

  tiempo_jugado: "Tiempo total jugado en este servidor.",
  muertes: "Número total de muertes del jugador en este servidor.",

  dinero: "Balance actual del jugador en este servidor.",
  bloques_minados: "Bloques minados (estadística de Minecraft).",
  mobs_matados: "Mobs eliminados (estadística de Minecraft).",
  kills_pvp: "Kills a otros jugadores (PvP).",

  island_level: "Nivel de tu isla.",
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
  damage_dealt: "Daño total infligido.",

  coins_balance: "Coins actuales en Gens. Abre el detalle para ver total ganado.",
  gens_value_total: "Valor total invertido en generadores (por tier), calculado desde AxGens.",
  gens_highest_tier: "Tier más alto que tiene el jugador (generadores activos).",
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

function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function log10p1(v) {
  return Math.log10(1 + Math.max(0, safeNum(v)));
}
function sqrtp(v) {
  return Math.sqrt(Math.max(0, safeNum(v)));
}

function computeGensScore(p) {
  const coinsTotal = log10p1(p?.coins_ganadas_total);
  const moneyTotal = log10p1(p?.dinero_ganado_total);

  const gensValue = log10p1(p?.gens_value_total);
  const incomeH = log10p1(p?.gens_income_h);
  const maxTier = log10p1(p?.gens_highest_tier);

  const hours = safeNum(p?.tiempo_jugado) / 3600;
  const time = sqrtp(Math.min(160, Math.max(0, hours)));

  const w = {
    coins: 420,
    money: 260,
    value: 460,
    income: 360,
    tier: 220,
    time: 85,
  };

  const score =
    coinsTotal * w.coins +
    moneyTotal * w.money +
    gensValue * w.value +
    incomeH * w.income +
    maxTier * w.tier +
    time * w.time;

  return Math.max(0, Math.round(score));
}

function HelpTip({ text }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const bubbleRef = useRef(null);

  const placeBubble = useCallback(() => {
    const wrap = wrapRef.current;
    const bubble = bubbleRef.current;
    if (!wrap || !bubble) return;

    const w = wrap.getBoundingClientRect();

    const margin = 12;
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

function StatHeader({ stat, active, ordenAsc, onClick, sortable, helpOverride }) {
  const label = LABELS[stat] || stat;
  const help = helpOverride || STAT_HELP[stat] || label;

  return (
    <th
      className={cn("th-sort", { active, "is-locked": !sortable })}
      data-stat={stat}
      onClick={sortable ? onClick : undefined}
      role="columnheader"
      aria-sort={active ? (ordenAsc ? "ascending" : "descending") : "none"}
      title={label}
    >
      <span className="th-sort__label">
        <span className="th-sort__text">{label}</span>
        <HelpTip text={help} />
      </span>

      {active && sortable && <i className="th-sort__arrow">{ordenAsc ? "▲" : "▼"}</i>}
    </th>
  );
}

function formatMoney(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "—";
  return `${x.toLocaleString("es-ES")} $`;
}
function formatInt(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "—";
  return x.toLocaleString("es-ES");
}

export default function Leaderboards() {
  const navigate = useNavigate();

  const [servidor, setServidor] = useState(SERVIDORES[2].id);
  const servidorApi = useMemo(() => SERVIDOR_API_MAP[servidor] || servidor, [servidor]);

  const defaults = DEFAULTS_BY_SERVER[servidor] || { orden: "tiempo_jugado", asc: false };

  const [orden, setOrden] = useState(defaults.orden);
  const [ordenAsc, setOrdenAsc] = useState(defaults.asc);

  const [datos, setDatos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorTabla, setErrorTabla] = useState("");

  const [offset, setOffset] = useState(0);
  const limit = 10;

  const [totalRows, setTotalRows] = useState(0);

  const [query, setQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [soloVinculados, setSoloVinculados] = useState(false);

  const [usuariosVinculados, setUsuariosVinculados] = useState({});
  const [openCard, setOpenCard] = useState(null);

  const servidorSeleccionado = useMemo(() => SERVIDORES.find((s) => s.id === servidor), [servidor]);

  const STATS = useMemo(() => STATS_BY_SERVER[servidor] || ["tiempo_jugado"], [servidor]);
  const paginasTotales = useMemo(() => Math.max(1, Math.ceil((totalRows || 0) / limit)), [totalRows, limit]);
  const paginaActual = useMemo(() => Math.floor(offset / limit) + 1, [offset]);

  useEffect(() => {
    const d = DEFAULTS_BY_SERVER[servidor] || { orden: "tiempo_jugado", asc: false };
    setOrden(d.orden);
    setOrdenAsc(d.asc);
    setOffset(0);
    setOpenCard(null);
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

  const getPlatform = useCallback((p) => {
    const pl = (p?.plataforma || "").toString().toLowerCase();
    if (pl === "bedrock") return "bedrock";
    if (pl === "java") return "java";
    return null;
  }, []);

  const getStatNumber = useCallback(
    (p, key) => {
      if (!p) return 0;

      if (key === "genpoints") return computeGensScore(p);
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
      const n = Number(value);

      if (key === "genpoints") return formatInt(n);
      if (key === "tiempo_jugado") return formatearTiempo(n);
      if (key === "mejor_tiempo") return formatearTiempoParkour(n);

      if (key === "dinero") return formatMoney(n);
      if (key === "coins_balance") return formatInt(n);

      if (key === "gens_value_total") return formatMoney(n);
      if (key === "gens_highest_tier") return formatInt(n);

      if (key === "kdr") return Number.isFinite(n) ? n.toFixed(2) : "—";

      return Number.isFinite(n) ? formatInt(n) : "—";
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
        if (servidorApi === "gens") {
          const res = await getLeaderboards({
            tipo: "dinero_ganado_total",
            servidor: servidorApi,
            limit: 700,
            offset: 0,
          });
          if (!alive) return;

          const lista = (res?.resultados || [])
            .filter((p) => isNombreValido(p?.nombre_minecraft))
            .map((p) => ({
              ...p,
              genpoints: computeGensScore(p),
            }))
            .sort((a, b) => b.genpoints - a.genpoints);

          setTotalRows(res?.total || lista.length);

          const slice = lista.slice(offset, offset + limit);
          setDatos(slice);

          return;
        }

        const res = await getLeaderboards({
          tipo: orden,
          servidor: servidorApi,
          limit,
          offset,
        });
        if (!alive) return;

        const lista = (res?.resultados || []).filter((p) => isNombreValido(p?.nombre_minecraft));
        setTotalRows(res?.total || 0);

        const ordenada = ordenAsc
          ? [...lista].sort((a, b) => getStatNumber(a, orden) - getStatNumber(b, orden))
          : [...lista].sort((a, b) => getStatNumber(b, orden) - getStatNumber(a, orden));

        setDatos(ordenada);
      } catch (err) {
        if (!alive) return;
        console.error(err);
        setErrorTabla("No se pudo cargar el ranking.");
        setDatos([]);
        setTotalRows(0);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [orden, ordenAsc, servidorApi, offset, limit, getStatNumber]);

  const cambiarOrden = useCallback(
    (stat) => {
      if (servidorApi === "gens") return;
      setOrden((prev) => {
        if (prev === stat) {
          setOrdenAsc((v) => !v);
          return prev;
        }
        setOrdenAsc(stat === "mejor_tiempo");
        return stat;
      });
      setOffset(0);
    },
    [servidorApi]
  );

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
    const list = (datosFiltrados.length ? datosFiltrados : datos).filter((p) => isNombreValido(p?.nombre_minecraft));

    if (servidorApi === "gens") {
      return [...list]
        .map((p) => ({ ...p, genpoints: p?.genpoints ?? computeGensScore(p) }))
        .sort((a, b) => (b.genpoints || 0) - (a.genpoints || 0))
        .slice(0, 3);
    }

    return (list || []).slice(0, 3);
  }, [datos, datosFiltrados, servidorApi]);

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

  const renderGensDualHint = useCallback((p, key) => {
    if (!p) return null;

    if (key === "coins_balance") {
      const actual = safeNum(p?.coins_balance);
      const total = safeNum(p?.coins_ganadas_total);
      const txt = `Actual: ${formatInt(actual)}\nTotal ganado: ${formatInt(total)}`;
      return <HelpTip text={txt} />;
    }

    if (key === "dinero") {
      const actual = safeNum(p?.dinero);
      const total = safeNum(p?.dinero_ganado_total);
      const txt = `Actual: ${formatMoney(actual)}\nTotal ganado: ${formatMoney(total)}`;
      return <HelpTip text={txt} />;
    }

    if (key === "gens_value_total") {
      const v = safeNum(p?.gens_value_total);
      const inc = safeNum(p?.gens_income_h);
      const txt = `Valor total: ${formatMoney(v)}\nIncome/h estimado: ${formatMoney(inc)}\nTier máx: ${formatInt(p?.gens_highest_tier)}`;
      return <HelpTip text={txt} />;
    }

    return null;
  }, []);

  const StatCell = useCallback(
    ({ stat, p, value }) => {
      if (servidorApi !== "gens") {
        return <span className="num">{formatValue(stat, value)}</span>;
      }

      if (stat === "genpoints") {
        return <span className="num num--score">{formatValue("genpoints", value)}</span>;
      }

      if (stat === "coins_balance" || stat === "dinero" || stat === "gens_value_total") {
        return (
          <span className="num num--dual">
            <span className="num__v">{formatValue(stat, value)}</span>
            <span className="num__hint">{renderGensDualHint(p, stat)}</span>
          </span>
        );
      }

      return <span className="num">{formatValue(stat, value)}</span>;
    },
    [formatValue, servidorApi, renderGensDualHint]
  );

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
                    {servidorApi === "gens" ? "GENPOINTS ▼" : `${LABELS[orden] || orden} ${ordenAsc ? "▲" : "▼"}`}
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
              const absPos = idx + 1;
              const medal = MEDALLAS[absPos];
              const meta = getMeta(p.uuid);
              const name = p?.nombre_minecraft;
              const platform = getPlatform(p);

              const points = servidorApi === "gens" ? (p?.genpoints ?? computeGensScore(p)) : getStatNumber(p, orden);

              return (
                <button
                  key={`${p.uuid}-${idx}`}
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
                        <span className="pod-stat__k">GENPOINTS</span>
                        <span className="pod-stat__v">{formatInt(points)}</span>
                      </div>

                      {servidorApi === "gens" && (
                        <div className="pod-mini">
                          <div className="pod-mini__row">
                            <span>Coins</span>
                            <b>{formatInt(p?.coins_balance)}</b>
                            <span className="pod-mini__hint">{renderGensDualHint(p, "coins_balance")}</span>
                          </div>
                          <div className="pod-mini__row">
                            <span>Valor Gens</span>
                            <b>{formatMoney(p?.gens_value_total)}</b>
                            <span className="pod-mini__hint">{renderGensDualHint(p, "gens_value_total")}</span>
                          </div>
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
                  value={servidorApi === "gens" ? "genpoints" : orden}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (servidorApi === "gens") return;
                    setOrden(v);
                    setOrdenAsc(v === "mejor_tiempo");
                    setOffset(0);
                  }}
                  disabled={servidorApi === "gens"}
                >
                  {(servidorApi === "gens" ? ["genpoints"] : STATS).map((st) => (
                    <option key={st} value={st}>
                      {LABELS[st] || st}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} />
              </div>

              {servidorApi === "gens" ? (
                <div className="lb-orderHint">{STAT_HELP.genpoints}</div>
              ) : (
                STAT_HELP[orden] && <div className="lb-orderHint">{STAT_HELP[orden]}</div>
              )}
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
                    {servidorApi === "gens" ? "GENPOINTS" : (LABELS[orden] || orden)}
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

                          {STATS.map((st) => {
                            const isGens = servidorApi === "gens";

                            if (isGens && st !== "genpoints") {
                              return (
                                <StatHeader
                                  key={st}
                                  stat={st}
                                  active={false}
                                  ordenAsc={false}
                                  sortable={false}
                                  helpOverride={STAT_HELP[st]}
                                />
                              );
                            }

                            if (isGens && st === "genpoints") {
                              return (
                                <StatHeader
                                  key={st}
                                  stat={st}
                                  active={true}
                                  ordenAsc={false}
                                  sortable={true}
                                  onClick={() => {}}
                                  helpOverride={STAT_HELP.genpoints}
                                />
                              );
                            }

                            return (
                              <StatHeader
                                key={st}
                                stat={st}
                                active={orden === st}
                                ordenAsc={ordenAsc}
                                sortable={true}
                                onClick={() => cambiarOrden(st)}
                              />
                            );
                          })}
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
                                key={`${p.uuid}-${absPos}`}
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
                                      : st === "genpoints"
                                      ? (p?.genpoints ?? computeGensScore(p))
                                      : p?.[st];

                                  return (
                                    <td key={st} className={cn("td-stat", { active: servidorApi === "gens" ? st === "genpoints" : orden === st })}>
                                      <StatCell stat={st} p={p} value={rawValue} />
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>

                  <div className="lb-cards">
                    {!loading &&
                      datosFiltrados.map((p, i) => {
                        const absPos = offset + i + 1;
                        const meta = getMeta(p.uuid);
                        const name = p?.nombre_minecraft;
                        const medal = MEDALLAS[absPos] || null;
                        const platform = getPlatform(p);

                        const isOpen = openCard === `${p.uuid}-${absPos}`;
                        const genpoints = servidorApi === "gens" ? (p?.genpoints ?? computeGensScore(p)) : null;

                        return (
                          <button
                            key={`m-${p.uuid}-${absPos}`}
                            type="button"
                            className={cn("lb-card", {
                              top1: absPos === 1,
                              top2: absPos === 2,
                              top3: absPos === 3,
                              open: isOpen,
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

                                <div className="lb-card__sub">{meta?.rango ? meta.rango : "—"}</div>
                              </div>

                              {servidorApi === "gens" && (
                                <button
                                  type="button"
                                  className="lb-card__detailsBtn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const key = `${p.uuid}-${absPos}`;
                                    setOpenCard((cur) => (cur === key ? null : key));
                                  }}
                                  aria-label="Ver detalles"
                                >
                                  <span>Detalles</span>
                                  <ChevronRight size={16} />
                                </button>
                              )}
                            </div>

                            {servidorApi === "gens" ? (
                              <>
                                <div className="lb-card__scoreRow">
                                  <div className="lb-card__score">
                                    <span className="k">
                                      GENPOINTS <span className="k-help"><HelpTip text={STAT_HELP.genpoints} /></span>
                                    </span>
                                    <span className="v">{formatInt(genpoints)}</span>
                                  </div>
                                </div>

                                {isOpen && (
                                  <div className="lb-card__details" onClick={(e) => e.stopPropagation()}>
                                    <div className="lb-card__grid lb-card__grid--gens">
                                      <div className="lb-card__stat">
                                        <span className="k">
                                          Coins (actual) <span className="k-help">{renderGensDualHint(p, "coins_balance")}</span>
                                        </span>
                                        <span className="v">{formatInt(p?.coins_balance)}</span>
                                        <span className="sub">Total: {formatInt(p?.coins_ganadas_total)}</span>
                                      </div>

                                      <div className="lb-card__stat">
                                        <span className="k">
                                          Valor Gens <span className="k-help">{renderGensDualHint(p, "gens_value_total")}</span>
                                        </span>
                                        <span className="v">{formatMoney(p?.gens_value_total)}</span>
                                        <span className="sub">Income/h: {formatMoney(p?.gens_income_h)}</span>
                                      </div>

                                      <div className="lb-card__stat">
                                        <span className="k">Tier Máx</span>
                                        <span className="v">{formatInt(p?.gens_highest_tier)}</span>
                                      </div>

                                      <div className="lb-card__stat">
                                        <span className="k">Tiempo</span>
                                        <span className="v">{formatearTiempo(p?.tiempo_jugado)}</span>
                                      </div>

                                      <div className="lb-card__stat">
                                        <span className="k">
                                          Dinero (actual) <span className="k-help">{renderGensDualHint(p, "dinero")}</span>
                                        </span>
                                        <span className="v">{formatMoney(p?.dinero)}</span>
                                        <span className="sub">Total: {formatMoney(p?.dinero_ganado_total)}</span>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </>
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
