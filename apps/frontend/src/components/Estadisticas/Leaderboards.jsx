// src/pages/Leaderboards/Leaderboards.jsx (o donde lo tengas)
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, SlidersHorizontal, X, ChevronDown } from "lucide-react";

import { getLeaderboards } from "../../api/getLeaderboards";
import "../../styles/components/Estadisticas/_leaderboards.scss";

const API_BASE = import.meta.env.VITE_BACKEND_URL || "http://localhost:10000";

/**
 * UI IDs (bonitos) → IDs oficiales backend/supabase/plugin
 * IMPORTANTE: esto tiene que coincidir con tu config del plugin (servidor: "oneblock", "survival", etc.)
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

/* =========================================================
   Stats por servidor (keys que espera el frontend)
   (estas keys deben existir en tu tabla/vista del backend)
   ========================================================= */
const STATS_BY_SERVER = {
  survival_clasico: [
  "tiempo_jugado",
  "bloques_minados",
  "mobs_matados",
  "dinero",
  "kills_pvp",
  "muertes",
],

  oneblock: [
    "island_level",
    "oneblock_blocks_broken",
    "phase_actual",
    "dinero", // ✅ antes challenges_completados
    "mobs_matados",
    "tiempo_jugado",
    "muertes",
  ],
  gens: [
    "coins_ganadas_total",
    "income_rate",
    "upgrades_comprados",
    "gens_owned",
    "prestigios",
    "tiempo_jugado",
    "muertes",
  ],
  survival_anarquico: [
    "kills_pvp",
    "kdr",
    "killstreak_max",
    "damage_dealt",
    "muertes",
    "tiempo_jugado",
  ],
  parkour: [
    "mejor_tiempo",
    "completadas_total",
    "perfect_runs",
    "falls",
    "medallas_ganadas",
    "racha_dias",
    "tiempo_jugado",
  ],
};

const DEFAULTS_BY_SERVER = {
  survival_clasico: { orden: "tiempo_jugado", asc: false },
  oneblock: { orden: "island_level", asc: false },
  gens: { orden: "coins_ganadas_total", asc: false },
  survival_anarquico: { orden: "kills_pvp", asc: false },
  parkour: { orden: "mejor_tiempo", asc: true },
};

const LABELS = {
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
  income_rate: "Multiplicador",
  upgrades_comprados: "Upgrades",
  gens_owned: "Gens",
  prestigios: "Nivel",

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

export default function Leaderboards() {
  const navigate = useNavigate();

  const [servidor, setServidor] = useState(SERVIDORES[2].id); // gens por defecto (UI)
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

  const servidorSeleccionado = useMemo(
    () => SERVIDORES.find((s) => s.id === servidor),
    [servidor]
  );

  const STATS = useMemo(() => STATS_BY_SERVER[servidor] || ["tiempo_jugado"], [servidor]);
  const paginaActual = useMemo(() => Math.floor(offset / limit) + 1, [offset]);

  useEffect(() => {
    const d = DEFAULTS_BY_SERVER[servidor] || { orden: "tiempo_jugado", asc: false };
    setOrden(d.orden);
    setOrdenAsc(d.asc);
    setOffset(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [servidor]);

  // Tiempo EN SEGUNDOS (tu plugin/DB deberían enviar segundos)
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

  // ✅ FIX NIVEL ISLA:
  // Si island_level viene 0 pero phase_actual ya existe (Llanuras=1, Bosque=2...), usamos phase_actual.
  const getIslandLevel = useCallback((p) => {
    const isl = Number(p?.island_level || 0);
    const ph = Number(p?.phase_actual || 0);
    const v = Math.max(isl, ph);
    return Number.isFinite(v) ? v : 0;
  }, []);

  const getStatNumber = useCallback(
    (p, key) => {
      if (!p) return 0;

      if (key === "island_level") return getIslandLevel(p);

      const n = Number(p?.[key] ?? 0);
      if (!Number.isFinite(n)) return 0;
      return n;
    },
    [getIslandLevel]
  );

const formatValue = useCallback(
  (key, value) => {
    const n = Number(value || 0);

    if (key === "tiempo_jugado") return formatearTiempo(n);
    if (key === "mejor_tiempo") return formatearTiempoParkour(n);

    // Dinero (Vault)
    if (key === "dinero") {
      if (!Number.isFinite(n)) return "—";
      return `${n.toLocaleString("es-ES")} $`;
    }

    // Gens: coins totales
    if (key === "coins_ganadas_total") {
      if (!Number.isFinite(n)) return "—";
      return n.toLocaleString("es-ES");
      // si quieres “Coins”:
      // return `${n.toLocaleString("es-ES")} Coins`;
    }

    // Gens: coins por hora (ya lo usas)
    if (key === "income_rate") {
  if (!Number.isFinite(n)) return "—";
  return `${n.toLocaleString("es-ES")}x`;
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

  /* Vinculados + rango */
  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/usuarios`, { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const usuarios = await res.json();

        const mapa = (usuarios || []).reduce((acc, u) => {
          if (u?.uuid) {
            acc[u.uuid] = {
              rango: u.rango_usuario?.toLowerCase() || null,
            };
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

  /* Carga leaderboard */
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErrorTabla("");

    (async () => {
      try {
        const res = await getLeaderboards({
          tipo: orden,
          servidor: servidorApi, // 👈 AQUI VA EL ID OFICIAL
          limit,
          offset,
        });
        if (!alive) return;

        const lista = (res?.resultados || []).filter((p) => isNombreValido(p?.nombre_minecraft));

        // ✅ ordenar usando el valor "real" (incluye fix de island_level)
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

              const valueForPodium =
                orden === "phase_actual"
                  ? (p?.phase_nombre || "—")
                  : orden === "island_level"
                  ? getIslandLevel(p)
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
                            : formatValue(orden, valueForPodium)}
                        </span>
                      </div>
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
                <button
                  className="lb-clear"
                  onClick={() => setQuery("")}
                  type="button"
                  aria-label="Limpiar"
                >
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
                  {/* IMPORTANTE: sin scroll horizontal, y sin recortes */}
                  <div className="lb-tableWrap">
                    <table
                      className="lb-table"
                      style={{
                        "--stats": STATS.length,
                      }}
                    >
                      <thead>
                        <tr>
                          <th className="col-pos">Top</th>
                          <th className="col-player">Jugador</th>

                          {STATS.map((st) => (
                            <th
                              key={st}
                              className={cn("th-sort", { active: orden === st })}
                              onClick={() => cambiarOrden(st)}
                              title={`Ordenar por ${LABELS[st] || st}`}
                            >
                              <span>{LABELS[st] || st}</span>
                              {orden === st && (
                                <i className="th-sort__arrow">{ordenAsc ? "▲" : "▼"}</i>
                              )}
                            </th>
                          ))}
                        </tr>
                      </thead>

                      <tbody>
                        {loading &&
                          [...Array(limit)].map((_, i) => (
                            <tr key={`sk-${i}`} className="lb-row sk-row">
                              <td>
                                <span className="sk sk--pos" />
                              </td>
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
                                <td key={st}>
                                  <span className="sk sk--num" />
                                </td>
                              ))}
                            </tr>
                          ))}

                        {!loading && datosFiltrados.length === 0 && (
                          <tr className="lb-row empty">
                            <td colSpan={2 + STATS.length}>
                              No hay resultados con los filtros actuales.
                            </td>
                          </tr>
                        )}

                        {!loading &&
                          datosFiltrados.map((p, i) => {
                            const absPos = offset + i + 1;
                            const meta = getMeta(p.uuid);
                            const medal = MEDALLAS[absPos] || null;
                            const name = p?.nombre_minecraft;

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
                                    <img
                                      src={medal}
                                      alt={`Top ${absPos}`}
                                      className="lb-medal"
                                      loading="lazy"
                                    />
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
                                      onError={(e) =>
                                        (e.currentTarget.src = "/assets/default-head.png")
                                      }
                                    />
                                    <div className="lb-player__text">
                                      <div className="lb-nameRow">
                                        <span className="lb-name">{name}</span>
                                        <span className="lb-badges">
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
                                      <div className="lb-player__sub">
                                        {meta?.rango ? meta.rango : "—"}
                                      </div>
                                    </div>
                                  </div>
                                </td>

                                {STATS.map((st) => {
                                  const rawValue =
                                    st === "phase_actual"
                                      ? (p?.phase_nombre || "—")
                                      : st === "island_level"
                                      ? getIslandLevel(p)
                                      : p?.[st] ?? 0;

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

                  {/* Cards (móvil) */}
                  <div className="lb-cards">
                    {loading &&
                      [...Array(limit)].map((_, i) => (
                        <div key={`csk-${i}`} className="lb-card sk-card">
                          <div className="lb-card__top">
                            <span className="sk sk--head" />
                            <div className="sk-col">
                              <span className="sk sk--name" />
                              <span className="sk sk--mini" />
                            </div>
                          </div>
                          <div className="lb-card__grid">
                            {[...Array(Math.min(6, STATS.length))].map((__, j) => (
                              <span key={j} className="sk sk--num" />
                            ))}
                          </div>
                        </div>
                      ))}

                    {!loading &&
                      datosFiltrados.map((p, i) => {
                        const absPos = offset + i + 1;
                        const meta = getMeta(p.uuid);
                        const name = p?.nombre_minecraft;
                        const medal = MEDALLAS[absPos] || null;

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
                                  {LABELS[orden] || orden} {ordenAsc ? "▲" : "▼"} ·{" "}
                                  {meta?.rango ? meta.rango : "—"}
                                </div>
                              </div>
                            </div>

                            <div className="lb-card__grid">
                              {STATS.slice(0, 6).map((st) => {
                                const rawValue =
                                  st === "phase_actual"
                                    ? (p?.phase_nombre || "—")
                                    : st === "island_level"
                                    ? getIslandLevel(p)
                                    : p?.[st] ?? 0;

                                return (
                                  <div
                                    key={st}
                                    className={cn("lb-card__stat", { active: orden === st })}
                                  >
                                    <span className="k">{LABELS[st] || st}</span>
                                    <span className="v">
                                      {st === "phase_actual"
                                        ? (p?.phase_nombre || "—")
                                        : formatValue(st, rawValue)}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
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
