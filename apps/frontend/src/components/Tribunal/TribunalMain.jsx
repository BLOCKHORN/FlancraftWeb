import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import {
  WarningCircle,
  CheckCircle,
  HourglassMedium,
  XCircle,
  BookOpen,
  FunnelSimple,
} from "phosphor-react";

import useIsMobile from "../../hooks/useIsMobile";
import "../../styles/components/Tribunal/_tribunalmain.scss";

const SERVER_IMAGES = {
  global: "/assets/reinos/global.webp",
  lobby: "/assets/reinos/global.webp",
  "play.flancraft.com": "/assets/reinos/global.webp",

  survival: "/assets/reinos/survival-clasico.webp",
  "survival-clasico": "/assets/reinos/survival-clasico.webp",
  survival_clasico: "/assets/reinos/survival-clasico.webp",

  anarquico: "/assets/reinos/survival-anarquico.webp",
  "survival-anarquico": "/assets/reinos/survival-anarquico.webp",
  survival_anarquico: "/assets/reinos/survival-anarquico.webp",

  hardcore: "/assets/reinos/survival-hardcore.webp",
  "survival-hardcore": "/assets/reinos/survival-hardcore.webp",
  survival_hardcore: "/assets/reinos/survival-hardcore.webp",

  oneblock: "/assets/reinos/oneblock.webp",
  chunklock: "/assets/reinos/chunklock.webp",
  parkour: "/assets/reinos/parkour.webp",
  creativo: "/assets/reinos/creativo.webp",
  kingdoms: "/assets/reinos/kingdoms.webp",
  boxpvp: "/assets/reinos/boxpvp.webp",
};

export default function Sanciones() {
  const [sanciones, setSanciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [filtroJugador, setFiltroJugador] = useState("");
  const [filtroServidor, setFiltroServidor] = useState("todos");
  const [leyendaAbierta, setLeyendaAbierta] = useState(false);
  const [query, setQuery] = useState("");
  const [paginaActual, setPaginaActual] = useState(1);

  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const POR_PAGINA = 25;

  // -------- Utils básicos ----------

  const parseTimestamp = (t) => {
    if (!t) return null;

    // String ISO
    if (typeof t === "string" && !/^\d+$/.test(t.trim())) {
      const d = new Date(t);
      const time = d.getTime();
      return Number.isNaN(time) ? null : time;
    }

    // Número o string numérico
    const n = Number(t);
    if (Number.isNaN(n)) return null;

    // Si parece segundos, multiplicamos
    return n < 1e12 ? n * 1000 : n;
  };

  // "30m", "2h30m", "5d", "perma", "perm", "permanent"
  const parseDurationToMs = (raw) => {
    if (!raw) return null;
    const str = String(raw).toLowerCase().trim();

    // Infinitas / perma
    if (/(perma|perm|permanent|infinite|∞)/.test(str)) return Infinity;

    // Solo número → segundos
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

  const obtenerFechaFinMs = (timestamp, raw) => {
    const start = parseTimestamp(timestamp);
    if (!start) return null;
    const ms = parseDurationToMs(raw);
    if (!ms || ms === Infinity) return null;
    return start + ms;
  };

  const formatearDuracion = (raw) => {
    if (!raw) return "Desconocida";
    const ms = parseDurationToMs(raw);
    if (ms === Infinity) return "Permanente";
    if (!ms) return String(raw);

    const d = Math.floor(ms / 86400000);
    const h = Math.floor((ms % 86400000) / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);

    const partes = [];
    if (d) partes.push(`${d} ${d === 1 ? "día" : "días"}`);
    if (h) partes.push(`${h} ${h === 1 ? "hora" : "horas"}`);
    if (m) partes.push(`${m} ${m === 1 ? "minuto" : "minutos"}`);
    if (!d && !h && !m && s)
      partes.push(`${s} ${s === 1 ? "segundo" : "segundos"}`);
    return partes.length ? partes.join(" ") : String(raw);
  };

  const obtenerFechaFin = (timestamp, raw) => {
    const finMs = obtenerFechaFinMs(timestamp, raw);
    if (!finMs) return null;
    return new Date(finMs).toLocaleString("es-ES");
  };

  const esPerma = (s) => {
    const bt = String(s?.bantype || "").toLowerCase();
    if (bt === "perma" || bt === "permanent") return true;
    const ms = parseDurationToMs(s?.duration);
    return ms === Infinity;
  };

  const esRevocada = (s) => {
    const e = String(s?.estado || "").toLowerCase();
    return (
      e === "revocado" ||
      e === "revocada" ||
      e === "anulado" ||
      e === "anulada"
    );
  };

  const esSancionActiva = (s) => {
    if (esRevocada(s)) return false;
    if (esPerma(s)) return true;

    const finMs = obtenerFechaFinMs(s.timestamp, s.duration);
    if (!finMs) return false;
    return finMs > Date.now();
  };

  const calcularSituacion = (s) => {
    if (esPerma(s)) return "perma";
    if (esSancionActiva(s)) return "activa";
    return "finalizada";
  };

  const situacionLabel = (codigo) => {
    if (codigo === "perma") return "PERMABAN";
    if (codigo === "activa") return "Activa";
    return "Finalizada";
  };

  const tipoSancionLabel = (s) => {
    const bt = String(s?.bantype || "").toLowerCase();
    if (bt === "perma" || bt === "permanent") return "BAN PERMANENTE";
    if (bt === "temp" || bt === "tempban" || bt === "ban") return "BAN TEMPORAL";
    return "JAIL";
  };

  const obtenerNombreServidor = (raw) => {
    const mapa = {
      survival: "Survival",
      anarquico: "Anárquico",
      creativo: "Creativo",
      oneblock: "OneBlock",
      kingdoms: "Kingdoms",
      boxpvp: "BoxPvP",
      parkour: "Parkour",
      "play.flancraft.com": "Lobby",
      lobby: "Lobby",
    };
    return mapa[raw?.toLowerCase()] || "Lobby";
  };

  const obtenerImagenServidor = (raw) => {
    if (!raw) return SERVER_IMAGES.lobby;
    const key = raw.toLowerCase();
    return (
      SERVER_IMAGES[key] ||
      SERVER_IMAGES[key.replace("_", "-")] ||
      SERVER_IMAGES.lobby
    );
  };

  // -------- Carga de datos ----------

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setLoading(true);
        setErrorMsg("");
        const { data, error } = await supabase
          .from("jails")
          .select("*")
          .order("timestamp", { ascending: false });

        if (error) throw error;
        if (!cancel) setSanciones(data || []);
      } catch (e) {
        console.error(e);
        if (!cancel)
          setErrorMsg("No se pudo cargar el historial de sanciones.");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  // -------- Debounce búsqueda ----------

  useEffect(() => {
    const id = setTimeout(
      () => setQuery(filtroJugador.trim().toLowerCase()),
      180
    );
    return () => clearTimeout(id);
  }, [filtroJugador]);

  // -------- ESC para cerrar leyenda ----------

  useEffect(() => {
    if (!leyendaAbierta) return;
    const onKey = (e) => {
      if (e.key === "Escape") setLeyendaAbierta(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [leyendaAbierta]);

  // -------- Servidores disponibles ----------

  const servidoresDisponibles = useMemo(() => {
    const set = new Set(
      sanciones
        .map((s) => (s.server ? s.server.toLowerCase() : "lobby"))
        .filter(Boolean)
    );
    return ["todos", ...Array.from(set)];
  }, [sanciones]);

  // -------- Resumen superior ----------

  const resumen = useMemo(() => {
    const total = sanciones.length;
    const permabans = new Set();
    let activas = 0;

    sanciones.forEach((s) => {
      if (esPerma(s) && s.name) {
        permabans.add(s.name.toLowerCase());
      }
      if (esSancionActiva(s)) {
        activas++;
      }
    });

    return {
      total,
      jugadoresPerma: permabans.size,
      sancionesActivas: activas,
    };
  }, [sanciones]);

  // -------- Filtrado principal ----------

  const sancionesFiltradas = useMemo(() => {
    return sanciones.filter((s) => {
      const jugadorOK = query
        ? s.name?.toLowerCase().includes(query)
        : true;

      const servOK =
        filtroServidor === "todos"
          ? true
          : (s.server || "lobby").toLowerCase() === filtroServidor;

      return jugadorOK && servOK;
    });
  }, [sanciones, query, filtroServidor]);

  // -------- Paginación ----------

  useEffect(() => {
    // cuando cambian filtros, volvemos a página 1
    setPaginaActual(1);
  }, [query, filtroServidor]);

  const totalPaginas =
    Math.ceil(sancionesFiltradas.length / POR_PAGINA) || 1;

  useEffect(() => {
    // si la página actual se queda fuera de rango al filtrar
    if (paginaActual > totalPaginas) {
      setPaginaActual(totalPaginas);
    }
  }, [paginaActual, totalPaginas]);

  const indiceInicio = (paginaActual - 1) * POR_PAGINA;
  const sancionesPagina = sancionesFiltradas.slice(
    indiceInicio,
    indiceInicio + POR_PAGINA
  );

  const contarStrikes = (jugador, tipo) =>
    sanciones.filter((s) => s.name === jugador && s.type === tipo).length;

    // -------- Render ----------

  return (
    <section className="tribunal-epic">
      <div className="tribunal-shell">
        <div className="tribunal-frame">
          {/* HERO SUPERIOR DENTRO DEL FRAME */}
          <div className="epic-header tribunal-hero">
            <h1>Tribunal de Sanciones</h1>
            <p>
              Consulta y revisa el historial de infracciones de los jugadores de
              FlanCraft.
            </p>
          </div>

          {/* RESUMEN SUPERIOR */}
          <div className="resumen-panel">
            <div className="resumen-item">
              <span className="label">Sanciones registradas</span>
              <span className="valor">{resumen.total}</span>
            </div>
            <div className="resumen-item">
              <span className="label">Sanciones activas ahora</span>
              <span className="valor destacado">
                {resumen.sancionesActivas}
              </span>
            </div>
            <div className="resumen-item">
              <span className="label">Jugadores con PERMABAN</span>
              <span className="valor">{resumen.jugadoresPerma}</span>
            </div>
          </div>

          {/* FILTROS + BOTÓN LEYENDA */}
          <div className="selector-panel">
            <div className="filtros-left">
              <div className="campo-busqueda">
                <input
                  type="text"
                  placeholder="Buscar jugador…"
                  value={filtroJugador}
                  onChange={(e) => setFiltroJugador(e.target.value)}
                  className="filtro-input"
                  aria-label="Buscar jugador"
                />
              </div>

              <div className="campo-select">
                <FunnelSimple size={18} weight="bold" />
                <select
                  value={filtroServidor}
                  onChange={(e) => setFiltroServidor(e.target.value)}
                  aria-label="Filtrar por servidor"
                >
                  {servidoresDisponibles.map((srv) => (
                    <option key={srv} value={srv}>
                      {srv === "todos"
                        ? "Todos los servidores"
                        : obtenerNombreServidor(srv)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="button"
              className="leyenda-btn"
              onClick={() => setLeyendaAbierta(true)}
              aria-haspopup="dialog"
              aria-expanded={leyendaAbierta}
            >
              <BookOpen size={18} weight="bold" />
              <span>Tabla de sanciones</span>
            </button>
          </div>

          {/* MODAL TABLA LEYENDA */}
          {leyendaAbierta && (
            <div
              className="leyenda-modal"
              role="dialog"
              aria-modal="true"
              onClick={() => setLeyendaAbierta(false)}
            >
              <div
                className="leyenda-content"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  className="close-btn"
                  onClick={() => setLeyendaAbierta(false)}
                  aria-label="Cerrar leyenda"
                >
                  <XCircle size={22} weight="bold" />
                </button>
                <h2>Tabla orientativa de sanciones</h2>
                <table className="leyenda-table">
                  <thead>
                    <tr>
                      <th>Motivo</th>
                      <th>1º vez</th>
                      <th>2º vez</th>
                      <th>3º vez</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Hacks</td>
                      <td>Jail 12h</td>
                      <td>Jail 5d</td>
                      <td>Ban perm.</td>
                    </tr>
                    <tr>
                      <td>Fly</td>
                      <td>Jail 6h</td>
                      <td>Jail 3d</td>
                      <td>Ban perm.</td>
                    </tr>
                    <tr>
                      <td>Insultos</td>
                      <td>Jail 30m</td>
                      <td>Jail 5h</td>
                      <td>Ban perm.</td>
                    </tr>
                    <tr>
                      <td>TPAKill</td>
                      <td>Jail 6h</td>
                      <td>Jail 5d</td>
                      <td>Ban perm.</td>
                    </tr>
                    <tr>
                      <td>Grief</td>
                      <td>Jail 2h</td>
                      <td>Jail 8h</td>
                      <td>Jail 5d</td>
                    </tr>
                    <tr>
                      <td>Spam</td>
                      <td>Jail 1d</td>
                      <td>Jail 10d</td>
                      <td>Ban perm.</td>
                    </tr>
                    <tr>
                      <td>Flood</td>
                      <td>Avisar</td>
                      <td>Jail 15m</td>
                      <td>Jail 2h</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ESTADOS DE CARGA / ERROR */}
          {loading && (
            <div className="tabla-scroll-wrapper">
              <div className="skeleton-table" aria-hidden>
                <div className="row" />
                <div className="row" />
                <div className="row" />
              </div>
            </div>
          )}

          {!loading && errorMsg && (
            <div className="tabla-scroll-wrapper">
              <div className="error-box">{errorMsg}</div>
            </div>
          )}

          {/* CONTENIDO PRINCIPAL */}
          {!loading && !errorMsg && (
            <>
              {isMobile ? (
                // 📱 Mobile: tarjetas
                <div className="sanciones-cards">
                  {sancionesPagina.map((s, index) => {
                    const strikes = contarStrikes(s.name, s.type);
                    const fechaFin = obtenerFechaFin(
                      s.timestamp,
                      s.duration
                    );
                    const situacion = calcularSituacion(s);

                    return (
                      <div
                        className={`sancion-card ${situacion}`}
                        key={`${s.name}-${s.timestamp}-${index}`}
                      >
                        <div className="header">
                          <img
                            src={`https://mc-heads.net/avatar/${s.name}/40`}
                            alt={s.name}
                            width={40}
                            height={40}
                            loading="lazy"
                          />
                          <div className="player-info">
                            <strong
                              onClick={() =>
                                navigate(`/perfil/${s.name}`)
                              }
                            >
                              {s.name}
                            </strong>
                          </div>
                        </div>

                        <div className="info">
                          <div>
                            <strong>Moderador:</strong> {s.moderator}
                          </div>
                          <div>
                            <strong>Motivo:</strong> {s.type}
                          </div>
                          <div className="tipo-sancion-badge">
                            {tipoSancionLabel(s)}
                          </div>
                          <div>
                            <strong>Duración:</strong>{" "}
                            {formatearDuracion(s.duration)}
                          </div>
                          {fechaFin && (
                            <div>
                              <strong>Finaliza:</strong> {fechaFin}
                            </div>
                          )}
                          <div>
                            <strong>Fecha:</strong>{" "}
                            {new Date(
                              parseTimestamp(s.timestamp)
                            ).toLocaleString("es-ES")}
                          </div>

                          <div className="server">
                            <img
                              src={obtenerImagenServidor(s.server)}
                              alt={obtenerNombreServidor(s.server)}
                              className="server-icon-img"
                              loading="lazy"
                            />
                            {obtenerNombreServidor(s.server)}
                          </div>

                          <div
                            className={`strikes ${
                              strikes >= 3 ? "permaban" : ""
                            }`}
                          >
                            <WarningCircle
                              size={14}
                              weight="duotone"
                            />{" "}
                            Strikes: {strikes}
                          </div>

                          <div
                            className={`situacion-badge ${situacion}`}
                          >
                            {situacion === "perma" && (
                              <XCircle size={14} weight="bold" />
                            )}
                            {situacion === "activa" && (
                              <HourglassMedium
                                size={14}
                                weight="bold"
                              />
                            )}
                            {situacion === "finalizada" && (
                              <CheckCircle size={14} weight="bold" />
                            )}
                            <span className="txt">
                              {situacionLabel(situacion)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                // 🖥️ Desktop: tabla estilo leaderboard (filas-banda)
                <div className="tabla-scroll-wrapper">
                  <table className="sanciones-table tabla-epica">
                    <thead>
                      <tr>
                        <th>Jugador</th>
                        <th>Moderador</th>
                        <th>Motivo</th>
                        <th>Duración</th>
                        <th>Fecha</th>
                        <th>Servidor</th>
                        <th>Situación</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sancionesPagina.map((s, index) => {
                        const strikes = contarStrikes(s.name, s.type);
                        const fechaFin = obtenerFechaFin(
                          s.timestamp,
                          s.duration
                        );
                        const situacion = calcularSituacion(s);

                        return (
                          <tr
                            key={`${s.name}-${s.timestamp}-${index}`}
                            className={situacion}
                          >
                            <td data-label="Jugador">
                              <div className="jugador-info">
                                <img
                                  src={`https://mc-heads.net/avatar/${s.name}/32`}
                                  className="avatar-head"
                                  alt={s.name}
                                  width={32}
                                  height={32}
                                  loading="lazy"
                                />
                                <span
                                  onClick={() =>
                                    navigate(`/perfil/${s.name}`)
                                  }
                                  className="jugador-link"
                                >
                                  {s.name}
                                </span>
                              </div>
                            </td>

                            <td data-label="Moderador">
                              <strong>{s.moderator}</strong>
                            </td>

                            <td data-label="Motivo">
                              <span className="tipo">{s.type}</span>
                              <span className="tipo-sancion-pill">
                                {tipoSancionLabel(s)}
                              </span>
                              <span
                                className={`strikes ${
                                  strikes >= 3 ? "permaban" : ""
                                }`}
                              >
                                <WarningCircle
                                  size={14}
                                  weight="duotone"
                                />{" "}
                                Strikes: {strikes}
                                {strikes >= 3 && (
                                  <strong> (Permaban)</strong>
                                )}
                              </span>
                            </td>

                            <td data-label="Duración">
                              <div>{formatearDuracion(s.duration)}</div>
                              {fechaFin && (
                                <div className="duracion-extra">
                                  Finaliza: {fechaFin}
                                </div>
                              )}
                            </td>

                            <td data-label="Fecha">
                              {new Date(
                                parseTimestamp(s.timestamp)
                              ).toLocaleString("es-ES")}
                            </td>

                            <td data-label="Servidor">
                              <span className="server-badge">
                                <img
                                  src={obtenerImagenServidor(s.server)}
                                  alt={obtenerNombreServidor(s.server)}
                                  className="server-badge-img"
                                  loading="lazy"
                                />
                                <span>
                                  {obtenerNombreServidor(s.server)}
                                </span>
                              </span>
                            </td>

                            <td data-label="Situación">
                              <span
                                className={`situacion ${situacion}`}
                              >
                                {situacion === "perma" && (
                                  <XCircle
                                    size={14}
                                    weight="bold"
                                  />
                                )}
                                {situacion === "activa" && (
                                  <HourglassMedium
                                    size={14}
                                    weight="bold"
                                  />
                                )}
                                {situacion === "finalizada" && (
                                  <CheckCircle
                                    size={14}
                                    weight="bold"
                                  />
                                )}
                                <span className="txt">
                                  {situacionLabel(situacion)}
                                </span>
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* PAGINACIÓN */}
              {sancionesFiltradas.length > 0 && (
                <div className="tribunal-pagination">
                  <button
                    type="button"
                    className="page-btn"
                    onClick={() =>
                      setPaginaActual((p) => Math.max(1, p - 1))
                    }
                    disabled={paginaActual === 1}
                  >
                    Anterior
                  </button>

                  <span className="page-indicator">
                    Página {paginaActual} de {totalPaginas}
                  </span>

                  <button
                    type="button"
                    className="page-btn"
                    onClick={() =>
                      setPaginaActual((p) =>
                        Math.min(totalPaginas, p + 1)
                      )
                    }
                    disabled={paginaActual === totalPaginas}
                  >
                    Siguiente
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
