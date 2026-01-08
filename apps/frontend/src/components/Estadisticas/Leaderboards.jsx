import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, SlidersHorizontal, X, ChevronDown } from "lucide-react";

import { getLeaderboards } from "../../api/getLeaderboards";
import "../../styles/components/Estadisticas/_leaderboards.scss";

const API_BASE = import.meta.env.VITE_BACKEND_URL || "http://localhost:10000";

const SERVIDORES = [
  { id: "survival_clasico", nombre: "Survival Clásico", imagen: "/assets/reinos/survival-clasico.webp" },
  { id: "survival_anarquico", nombre: "Survival Anárquico", imagen: "/assets/reinos/survival-anarquico.webp" },
  { id: "survival_hardcore", nombre: "Survival Hardcore", imagen: "/assets/reinos/survival-hardcore.webp" },
  { id: "oneblock", nombre: "OneBlock", imagen: "/assets/reinos/oneblock.webp" },
  { id: "gens", nombre: "Gens", imagen: "/assets/reinos/gens.webp" },
  { id: "chunklock", nombre: "ChunkLock", imagen: "/assets/reinos/chunklock.webp" },
  { id: "parkour", nombre: "Parkour", imagen: "/assets/reinos/parkour.webp" },
];

const STATS = [
  "bloques_minados",
  "bloques_colocados",
  "mobs_matados",
  "kills_pvp",
  "muertes",
  "tiempo_jugado",
];

const LABELS = {
  bloques_minados: "Minados",
  bloques_colocados: "Colocados",
  mobs_matados: "Mobs",
  kills_pvp: "Kills PvP",
  muertes: "Muertes",
  tiempo_jugado: "Tiempo",
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

  const [servidor, setServidor] = useState(SERVIDORES[2].id);
  const [orden, setOrden] = useState("tiempo_jugado");
  const [ordenAsc, setOrdenAsc] = useState(false);

  const [datos, setDatos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorTabla, setErrorTabla] = useState("");

  const [offset, setOffset] = useState(0);
  const limit = 10;
  const paginasTotales = 10;

  const [query, setQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [soloVinculados, setSoloVinculados] = useState(false);
  const [soloPremium, setSoloPremium] = useState(false);

  const [usuariosVinculados, setUsuariosVinculados] = useState({});
  const tableWrapRef = useRef(null);

  const servidorSeleccionado = useMemo(
    () => SERVIDORES.find((s) => s.id === servidor),
    [servidor]
  );

  const paginaActual = useMemo(() => Math.floor(offset / limit) + 1, [offset]);

  const formatearTiempo = useCallback((ticks) => {
    const totalSegundos = Math.floor((ticks || 0) / 20);
    const horas = Math.floor(totalSegundos / 3600);
    const minutos = Math.floor((totalSegundos % 3600) / 60);
    return `${horas}h ${minutos}m`;
  }, []);

  const formatValue = useCallback(
    (key, value) => {
      if (key === "tiempo_jugado") return formatearTiempo(value || 0);
      return (value || 0).toLocaleString("es-ES");
    },
    [formatearTiempo]
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
            acc[u.uuid] = {
              rango: u.rango_usuario?.toLowerCase() || null,
              premium: u.es_premium === true,
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

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErrorTabla("");

    (async () => {
      try {
        const res = await getLeaderboards({ tipo: orden, servidor, limit, offset });
        if (!alive) return;

        const lista = (res?.resultados || []).filter((p) => isNombreValido(p?.nombre_minecraft));

        const ordenada = ordenAsc
          ? [...lista].sort((a, b) => (a?.[orden] || 0) - (b?.[orden] || 0))
          : [...lista].sort((a, b) => (b?.[orden] || 0) - (a?.[orden] || 0));

        setDatos(ordenada);

        requestAnimationFrame(() => {
          if (tableWrapRef.current) tableWrapRef.current.scrollLeft = 0;
        });
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
  }, [orden, ordenAsc, servidor, offset]);

  const cambiarOrden = useCallback((stat) => {
    setOrden((prev) => {
      if (prev === stat) {
        setOrdenAsc((v) => !v);
        return prev;
      }
      setOrdenAsc(false);
      return stat;
    });
    setOffset(0);
  }, []);

  const getMeta = useCallback(
    (uuid) => usuariosVinculados[uuid] || null,
    [usuariosVinculados]
  );

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
      const prem = meta?.premium === true;

      const okVinc = !soloVinculados || vinc;
      const okPrem = !soloPremium || prem;

      return matchNombre && okVinc && okPrem;
    });
  }, [datos, query, soloVinculados, soloPremium, getMeta]);

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
                    {LABELS[orden]} {ordenAsc ? "▲" : "▼"}
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
                          {meta?.premium && (
                            <img
                              src="/assets/premium.webp"
                              alt="Premium"
                              className="lb-badge-premium"
                              loading="lazy"
                            />
                          )}
                        </span>
                      </div>

                      <div className="pod-stat">
                        <span className="pod-stat__k">{LABELS[orden]}</span>
                        <span className="pod-stat__v">{formatValue(orden, p?.[orden])}</span>
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
                    onClick={() => {
                      setServidor(s.id);
                      setOffset(0);
                    }}
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
                    setOrden(e.target.value);
                    setOrdenAsc(false);
                    setOffset(0);
                  }}
                >
                  {STATS.map((st) => (
                    <option key={st} value={st}>
                      {LABELS[st]}
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

                <label className={cn("lb-toggle", { on: soloPremium })}>
                  <input
                    type="checkbox"
                    checked={soloPremium}
                    onChange={(e) => setSoloPremium(e.target.checked)}
                  />
                  <span>Solo premium</span>
                </label>

                <button
                  type="button"
                  className="lb-reset"
                  onClick={() => {
                    setQuery("");
                    setSoloPremium(false);
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
                    {LABELS[orden]} {ordenAsc ? "▲" : "▼"}
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
                  <div className="lb-tableWrap" ref={tableWrapRef}>
                    <div className="lb-scrollHint" aria-hidden="true">
                      <span className="lb-scrollHint__arrow">→</span>
                      <span className="lb-scrollHint__text">Desliza para ver más</span>
                    </div>

                    <table className="lb-table">
                      <thead>
                        <tr>
                          <th className="col-pos">Top</th>
                          <th className="col-player">Jugador</th>

                          {STATS.map((st) => (
                            <th
                              key={st}
                              className={cn("th-sort", { active: orden === st })}
                              onClick={() => cambiarOrden(st)}
                              title={`Ordenar por ${LABELS[st]}`}
                            >
                              <span>{LABELS[st]}</span>
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
                                          {meta?.premium && (
                                            <img
                                              src="/assets/premium.webp"
                                              alt=""
                                              className="lb-badge-premium"
                                              loading="lazy"
                                            />
                                          )}
                                        </span>
                                      </div>
                                      <div className="lb-player__sub">
                                        {meta?.rango ? meta.rango : "—"} ·{" "}
                                        {meta?.premium ? "Premium" : "Normal"}
                                      </div>
                                    </div>
                                  </div>
                                </td>

                                {STATS.map((st) => (
                                  <td key={st} className={cn("td-stat", { active: orden === st })}>
                                    <span className="num">{formatValue(st, p?.[st] || 0)}</span>
                                  </td>
                                ))}
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>

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
                            {[...Array(6)].map((__, j) => (
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
                                onError={(e) =>
                                  (e.currentTarget.src = "/assets/default-head.png")
                                }
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
                                    {meta?.premium && (
                                      <img
                                        src="/assets/premium.webp"
                                        alt=""
                                        className="lb-badge-premium"
                                        loading="lazy"
                                      />
                                    )}
                                  </span>
                                </div>
                                <div className="lb-card__sub">
                                  {LABELS[orden]} {ordenAsc ? "▲" : "▼"} ·{" "}
                                  {meta?.premium ? "Premium" : "Normal"}
                                </div>
                              </div>
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
