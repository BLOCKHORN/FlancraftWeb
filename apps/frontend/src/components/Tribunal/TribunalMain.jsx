import React, { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import {
  WarningCircle,
  CheckCircle,
  HourglassMedium,
  XCircle,
  BookOpen,
  FunnelSimple,
  MagnifyingGlass,
  ArrowLeft,
  ArrowRight,
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

const POR_PAGINA = 25;

/* =========================
   Utils (fuera del componente)
   ========================= */

const parseTimestamp = (t) => {
  if (!t) return null;

  // String ISO
  if (typeof t === "string" && !/^\d+$/.test(t.trim())) {
    const d = new Date(t);
    const time = d.getTime();
    return Number.isNaN(time) ? null : time;
  }

  const n = Number(t);
  if (Number.isNaN(n)) return null;

  // Si parece segundos, multiplicamos
  return n < 1e12 ? n * 1000 : n;
};

// "30m", "2h30m", "5d", "perma", "perm", "permanent"
const parseDurationToMs = (raw) => {
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
  if (!d && !h && !m && s) partes.push(`${s} ${s === 1 ? "segundo" : "segundos"}`);
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
  return e === "revocado" || e === "revocada" || e === "anulado" || e === "anulada";
};

const esSancionActiva = (s, nowMs) => {
  if (esRevocada(s)) return false;
  if (esPerma(s)) return true;

  const finMs = obtenerFechaFinMs(s.timestamp, s.duration);
  if (!finMs) return false;
  return finMs > nowMs;
};

const calcularSituacion = (s, nowMs) => {
  if (esPerma(s)) return "perma";
  if (esSancionActiva(s, nowMs)) return "activa";
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
  return mapa[String(raw || "").toLowerCase()] || "Lobby";
};

const obtenerImagenServidor = (raw) => {
  if (!raw) return SERVER_IMAGES.lobby;
  const key = String(raw).toLowerCase();
  return SERVER_IMAGES[key] || SERVER_IMAGES[key.replace("_", "-")] || SERVER_IMAGES.lobby;
};

const avatarUrl = (name, size) => `https://mc-heads.net/avatar/${name}/${size}`;

const buildPageItems = (current, total) => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const items = [];
  const push = (v) => items.push(v);

  push(1);

  const left = Math.max(2, current - 2);
  const right = Math.min(total - 1, current + 2);

  if (left > 2) push("…");

  for (let i = left; i <= right; i++) push(i);

  if (right < total - 1) push("…");

  push(total);
  return items;
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
  const [nowMs, setNowMs] = useState(() => Date.now());

  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // Tick suave para que “Activas ahora” y estados cambien con el tiempo
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  // -------- Carga de datos ----------
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setLoading(true);
        setErrorMsg("");
        const { data, error } = await supabase.from("jails").select("*").order("timestamp", {
          ascending: false,
        });

        if (error) throw error;
        if (!cancel) setSanciones(data || []);
      } catch (e) {
        console.error(e);
        if (!cancel) setErrorMsg("No se pudo cargar el historial de sanciones.");
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
    const id = setTimeout(() => setQuery(filtroJugador.trim().toLowerCase()), 180);
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
        .map((s) => (s.server ? String(s.server).toLowerCase() : "lobby"))
        .filter(Boolean)
    );
    return ["todos", ...Array.from(set)];
  }, [sanciones]);

  // -------- PRECALC strikes (✅ rendimiento) ----------
  const strikesMap = useMemo(() => {
    const map = new Map(); // key: "name|type" -> count
    for (const s of sanciones) {
      const name = String(s?.name || "");
      const type = String(s?.type || "");
      if (!name || !type) continue;
      const key = `${name.toLowerCase()}|${type.toLowerCase()}`;
      map.set(key, (map.get(key) || 0) + 1);
    }
    return map;
  }, [sanciones]);

  const getStrikes = useCallback(
    (jugador, tipo) => {
      const key = `${String(jugador || "").toLowerCase()}|${String(tipo || "").toLowerCase()}`;
      return strikesMap.get(key) || 0;
    },
    [strikesMap]
  );

  // -------- Resumen superior ----------
  const resumen = useMemo(() => {
    const total = sanciones.length;
    const permabans = new Set();
    let activas = 0;

    for (const s of sanciones) {
      if (esPerma(s) && s.name) permabans.add(String(s.name).toLowerCase());
      if (esSancionActiva(s, nowMs)) activas++;
    }

    return { total, jugadoresPerma: permabans.size, sancionesActivas: activas };
  }, [sanciones, nowMs]);

  // -------- Filtrado principal ----------
  const sancionesFiltradas = useMemo(() => {
    return sanciones.filter((s) => {
      const jugadorOK = query ? String(s.name || "").toLowerCase().includes(query) : true;

      const servOK =
        filtroServidor === "todos"
          ? true
          : String(s.server || "lobby").toLowerCase() === filtroServidor;

      return jugadorOK && servOK;
    });
  }, [sanciones, query, filtroServidor]);

  // -------- Paginación ----------
  useEffect(() => {
    setPaginaActual(1);
  }, [query, filtroServidor]);

  const totalPaginas = Math.ceil(sancionesFiltradas.length / POR_PAGINA) || 1;

  useEffect(() => {
    if (paginaActual > totalPaginas) setPaginaActual(totalPaginas);
  }, [paginaActual, totalPaginas]);

  const indiceInicio = (paginaActual - 1) * POR_PAGINA;
  const indiceFin = Math.min(indiceInicio + POR_PAGINA, sancionesFiltradas.length);
  const sancionesPagina = sancionesFiltradas.slice(indiceInicio, indiceInicio + POR_PAGINA);

  const pageItems = useMemo(
    () => buildPageItems(paginaActual, totalPaginas),
    [paginaActual, totalPaginas]
  );

  const resetFiltros = useCallback(() => {
    setFiltroJugador("");
    setFiltroServidor("todos");
  }, []);

  // -------- Render ----------
  return (
    <section className="tribunal-epic">
      <div className="tribunal-shell">
        <div className="tribunal-frame">
          {/* HERO SUPERIOR */}
          <div className="epic-header tribunal-hero">
            <h1>Tribunal de Sanciones</h1>
            <p>Consulta y revisa el historial de infracciones de los jugadores de FlanCraft.</p>
          </div>

          {/* RESUMEN */}
          <div className="resumen-panel">
            <div className="resumen-item">
              <span className="label">Sanciones registradas</span>
              <span className="valor">{resumen.total}</span>
            </div>
            <div className="resumen-item">
              <span className="label">Sanciones activas ahora</span>
              <span className="valor destacado">{resumen.sancionesActivas}</span>
            </div>
            <div className="resumen-item">
              <span className="label">Jugadores con PERMABAN</span>
              <span className="valor">{resumen.jugadoresPerma}</span>
            </div>
          </div>

          {/* FILTROS + LEYENDA */}
          <div className="selector-panel">
            <div className="filtros-left">
              <div className="campo-busqueda">
                <MagnifyingGlass size={18} weight="bold" />
                <input
                  type="text"
                  placeholder="Buscar jugador…"
                  value={filtroJugador}
                  onChange={(e) => setFiltroJugador(e.target.value)}
                  className="filtro-input"
                  aria-label="Buscar jugador"
                />
                {(filtroJugador || filtroServidor !== "todos") && (
                  <button type="button" className="reset-filtros" onClick={resetFiltros}>
                    Reset
                  </button>
                )}
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
                      {srv === "todos" ? "Todos los servidores" : obtenerNombreServidor(srv)}
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

          {/* MODAL LEYENDA */}
          {leyendaAbierta && (
            <div
              className="leyenda-modal"
              role="dialog"
              aria-modal="true"
              onClick={() => setLeyendaAbierta(false)}
            >
              <div className="leyenda-content" onClick={(e) => e.stopPropagation()}>
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

          {/* LOADING / ERROR */}
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

          {/* CONTENIDO */}
          {!loading && !errorMsg && (
            <>
              {sancionesFiltradas.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-card">
                    <div className="empty-title">No hay resultados</div>
                    <div className="empty-sub">
                      Prueba a cambiar el servidor o buscar otro jugador.
                    </div>
                    <button type="button" className="empty-btn" onClick={resetFiltros}>
                      Limpiar filtros
                    </button>
                  </div>
                </div>
              ) : isMobile ? (
                // 📱 Mobile: tarjetas
                <div className="sanciones-cards">
                  {sancionesPagina.map((s, index) => {
                    const strikes = getStrikes(s.name, s.type);
                    const fechaFin = obtenerFechaFin(s.timestamp, s.duration);
                    const situacion = calcularSituacion(s, nowMs);

                    return (
                      <div className={`sancion-card ${situacion}`} key={`${s.name}-${s.timestamp}-${index}`}>
                        <div className="header">
                          <img
                            src={avatarUrl(s.name, 40)}
                            alt={s.name}
                            width={40}
                            height={40}
                            loading="lazy"
                            decoding="async"
                          />
                          <div className="player-info">
                            <strong onClick={() => navigate(`/perfil/${s.name}`)} title={`Ver perfil de ${s.name}`}>
                              {s.name}
                            </strong>
                            <span className="mini">
                              {obtenerNombreServidor(s.server)} · {tipoSancionLabel(s)}
                            </span>
                          </div>
                          <span className={`situacion-dot ${situacion}`} aria-hidden />
                        </div>

                        <div className="info">
                          <div>
                            <strong>Moderador:</strong> {s.moderator}
                          </div>
                          <div>
                            <strong>Motivo:</strong>{" "}
                            <span className="motivo" title={String(s.type || "")}>
                              {s.type}
                            </span>
                          </div>

                          <div className="dur-wrap">
                            <div>
                              <strong>Duración:</strong> {formatearDuracion(s.duration)}
                            </div>
                            {fechaFin && (
                              <div className="duracion-extra">
                                <strong>Finaliza:</strong> {fechaFin}
                              </div>
                            )}
                          </div>

                          <div>
                            <strong>Fecha:</strong>{" "}
                            {new Date(parseTimestamp(s.timestamp)).toLocaleString("es-ES")}
                          </div>

                          <div className="server">
                            <img
                              src={obtenerImagenServidor(s.server)}
                              alt={obtenerNombreServidor(s.server)}
                              className="server-icon-img"
                              loading="lazy"
                              decoding="async"
                            />
                            {obtenerNombreServidor(s.server)}
                          </div>

                          <div className={`strikes ${strikes >= 3 ? "permaban" : ""}`}>
                            <WarningCircle size={14} weight="duotone" /> Strikes: {strikes}
                            {strikes >= 3 && <strong> · Permaban</strong>}
                          </div>

                          <div className={`situacion-badge ${situacion}`}>
                            {situacion === "perma" && <XCircle size={14} weight="bold" />}
                            {situacion === "activa" && <HourglassMedium size={14} weight="bold" />}
                            {situacion === "finalizada" && <CheckCircle size={14} weight="bold" />}
                            <span className="txt">{situacionLabel(situacion)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                // 🖥️ Desktop: tabla
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
                        const strikes = getStrikes(s.name, s.type);
                        const fechaFin = obtenerFechaFin(s.timestamp, s.duration);
                        const situacion = calcularSituacion(s, nowMs);

                        return (
                          <tr key={`${s.name}-${s.timestamp}-${index}`} className={situacion}>
                            <td data-label="Jugador">
                              <div className="jugador-info">
                                <img
                                  src={avatarUrl(s.name, 32)}
                                  className="avatar-head"
                                  alt={s.name}
                                  width={32}
                                  height={32}
                                  loading="lazy"
                                  decoding="async"
                                />
                                <span
                                  onClick={() => navigate(`/perfil/${s.name}`)}
                                  className="jugador-link"
                                  title={`Ver perfil de ${s.name}`}
                                >
                                  {s.name}
                                </span>
                              </div>
                            </td>

                            <td data-label="Moderador">
                              <strong className="truncate" title={String(s.moderator || "")}>
                                {s.moderator}
                              </strong>
                            </td>

                            <td data-label="Motivo">
                              <span className="tipo truncate" title={String(s.type || "")}>
                                {s.type}
                              </span>

                              <span className="tipo-sancion-pill">{tipoSancionLabel(s)}</span>

                              <span className={`strikes ${strikes >= 3 ? "permaban" : ""}`}>
                                <WarningCircle size={14} weight="duotone" /> Strikes: {strikes}
                                {strikes >= 3 && <strong> (Permaban)</strong>}
                              </span>
                            </td>

                            <td data-label="Duración">
                              <div className="truncate" title={formatearDuracion(s.duration)}>
                                {formatearDuracion(s.duration)}
                              </div>
                              {fechaFin && <div className="duracion-extra">Finaliza: {fechaFin}</div>}
                            </td>

                            <td data-label="Fecha">
                              {new Date(parseTimestamp(s.timestamp)).toLocaleString("es-ES")}
                            </td>

                            <td data-label="Servidor">
                              <span className="server-badge">
                                <img
                                  src={obtenerImagenServidor(s.server)}
                                  alt={obtenerNombreServidor(s.server)}
                                  className="server-badge-img"
                                  loading="lazy"
                                  decoding="async"
                                />
                                <span className="truncate" title={obtenerNombreServidor(s.server)}>
                                  {obtenerNombreServidor(s.server)}
                                </span>
                              </span>
                            </td>

                            <td data-label="Situación">
                              <span className={`situacion ${situacion}`}>
                                {situacion === "perma" && <XCircle size={14} weight="bold" />}
                                {situacion === "activa" && <HourglassMedium size={14} weight="bold" />}
                                {situacion === "finalizada" && <CheckCircle size={14} weight="bold" />}
                                <span className="txt">{situacionLabel(situacion)}</span>
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
                  <div className="page-meta">
                    Mostrando <strong>{indiceInicio + 1}</strong>–<strong>{indiceFin}</strong> de{" "}
                    <strong>{sancionesFiltradas.length}</strong>
                  </div>

                  <div className="page-controls" role="navigation" aria-label="Paginación del tribunal">
                    <button
                      type="button"
                      className="page-btn"
                      onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
                      disabled={paginaActual === 1}
                      aria-label="Página anterior"
                    >
                      <ArrowLeft size={16} weight="bold" />
                      <span>Anterior</span>
                    </button>

                    <div className="page-numbers" aria-label="Números de página">
                      {pageItems.map((it, idx) =>
                        it === "…" ? (
                          <span key={`dots-${idx}`} className="page-dots" aria-hidden>
                            …
                          </span>
                        ) : (
                          <button
                            key={`p-${it}`}
                            type="button"
                            className={`page-num ${paginaActual === it ? "active" : ""}`}
                            onClick={() => setPaginaActual(it)}
                            aria-current={paginaActual === it ? "page" : undefined}
                          >
                            {it}
                          </button>
                        )
                      )}
                    </div>

                    <button
                      type="button"
                      className="page-btn"
                      onClick={() => setPaginaActual((p) => Math.min(totalPaginas, p + 1))}
                      disabled={paginaActual === totalPaginas}
                      aria-label="Página siguiente"
                    >
                      <span>Siguiente</span>
                      <ArrowRight size={16} weight="bold" />
                    </button>
                  </div>

                  <div className="page-indicator" aria-live="polite">
                    Página <strong>{paginaActual}</strong> de <strong>{totalPaginas}</strong>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
