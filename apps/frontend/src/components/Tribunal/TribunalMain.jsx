import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  WarningCircle,
  CheckCircle,
  HourglassMedium,
  XCircle,
  BookOpen,
  MagnifyingGlass,
  ArrowLeft,
  ArrowRight,
} from "phosphor-react";

import useIsMobile from "../../hooks/useIsMobile";
import useTribunalSanciones from "./useTribunalSanciones";

import "../../styles/components/Tribunal/_tribunalmain.scss";

import {
  POR_PAGINA,
  parseTimestamp,
  obtenerFechaFin,
  esPerma,
  esSancionActiva,
  calcularSituacion,
  situacionLabel,
  avatarUrl,
  buildPageItems,
  buildStrikeTimelineMap,
  getStrikeFromMap,
  getStrikeFeedback,
  getResumenEscala,
  getDuracionVisible,
  debeMostrarFechaFin,
} from "./tribunalUtils";

export default function Sanciones() {
  const { sanciones, loading, errorMsg } = useTribunalSanciones();

  const [filtroJugador, setFiltroJugador] = useState("");
  const [leyendaAbierta, setLeyendaAbierta] = useState(false);
  const [query, setQuery] = useState("");
  const [paginaActual, setPaginaActual] = useState(1);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const navigate = useNavigate();
  const isMobile = useIsMobile();

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setTimeout(() => setQuery(filtroJugador.trim().toLowerCase()), 180);
    return () => clearTimeout(id);
  }, [filtroJugador]);

  useEffect(() => {
    if (!leyendaAbierta) return;
    const onKey = (e) => {
      if (e.key === "Escape") setLeyendaAbierta(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [leyendaAbierta]);

  const sancionesConMeta = useMemo(
    () => sanciones.map((s, __rowIndex) => ({ ...s, __rowIndex })),
    [sanciones]
  );

  const strikesMap = useMemo(() => buildStrikeTimelineMap(sancionesConMeta), [sancionesConMeta]);

  const getStrike = useCallback(
    (rowIndex) => getStrikeFromMap(strikesMap, rowIndex),
    [strikesMap]
  );

  const resumen = useMemo(() => {
    const total = sancionesConMeta.length;
    const permabans = new Set();
    let activas = 0;

    for (const s of sancionesConMeta) {
      if (esPerma(s) && s.name) permabans.add(String(s.name).toLowerCase());
      if (esSancionActiva(s, nowMs)) activas++;
    }

    return { total, jugadoresPerma: permabans.size, sancionesActivas: activas };
  }, [sancionesConMeta, nowMs]);

  const sancionesFiltradas = useMemo(() => {
    return sancionesConMeta.filter((s) => {
      const jugadorOK = query ? String(s.name || "").toLowerCase().includes(query) : true;
      return jugadorOK;
    });
  }, [sancionesConMeta, query]);

  useEffect(() => {
    setPaginaActual(1);
  }, [query]);

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
  }, []);

  return (
    <section className="tribunal-epic">
      <div className="tribunal-shell">
        <div className="tribunal-frame">
          <div className="epic-header tribunal-hero">
            <h1>Tribunal de Sanciones</h1>
            <p>Historial de sanciones del servidor Survival.</p>
          </div>

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
                {filtroJugador && (
                  <button type="button" className="reset-filtros" onClick={resetFiltros}>
                    Reset
                  </button>
                )}
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
                      <td>Aviso</td>
                      <td>Jail 15m</td>
                      <td>Jail 2h</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

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

          {!loading && !errorMsg && (
            <>
              {sancionesFiltradas.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-card">
                    <div className="empty-title">No hay resultados</div>
                    <div className="empty-sub">Prueba a buscar otro jugador.</div>
                    <button type="button" className="empty-btn" onClick={resetFiltros}>
                      Limpiar filtros
                    </button>
                  </div>
                </div>
              ) : isMobile ? (
                <div className="sanciones-cards">
                  {sancionesPagina.map((s, index) => {
                    const strike = getStrike(s.__rowIndex);
                    const strikeFeedback = getStrikeFeedback(s.type, strike, s);
                    const resumenEscala = getResumenEscala(strike, strikeFeedback.accion, s);
                    const duracionVisible = getDuracionVisible(s.duration, strikeFeedback.accion, s);
                    const fechaFin = debeMostrarFechaFin(s.duration, strikeFeedback.accion, s)
                      ? obtenerFechaFin(s.timestamp, s.duration)
                      : null;
                    const situacion = calcularSituacion(s, nowMs);
                    const fechaMs = parseTimestamp(s.timestamp);
                    const fechaTexto = fechaMs ? new Date(fechaMs).toLocaleString("es-ES") : "-";

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

                          {resumenEscala && (
                            <div className={`strikes ${strikeFeedback.esPermaban ? "permaban" : ""}`}>
                              <WarningCircle size={14} weight="duotone" />
                              <strong>{resumenEscala}</strong>
                            </div>
                          )}

                          <div className="dur-wrap">
                            <div>
                              <strong>Duración:</strong> {duracionVisible}
                            </div>
                            {fechaFin && (
                              <div className="duracion-extra">
                                <strong>Finaliza:</strong> {fechaFin}
                              </div>
                            )}
                          </div>

                          <div>
                            <strong>Fecha:</strong> {fechaTexto}
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
                <div className="tabla-scroll-wrapper">
                  <table className="sanciones-table tabla-epica">
                    <thead>
                      <tr>
                        <th>Jugador</th>
                        <th>Moderador</th>
                        <th>Motivo</th>
                        <th>Duración</th>
                        <th>Fecha</th>
                        <th>Situación</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sancionesPagina.map((s, index) => {
                        const strike = getStrike(s.__rowIndex);
                        const strikeFeedback = getStrikeFeedback(s.type, strike, s);
                        const resumenEscala = getResumenEscala(strike, strikeFeedback.accion, s);
                        const duracionVisible = getDuracionVisible(s.duration, strikeFeedback.accion, s);
                        const fechaFin = debeMostrarFechaFin(s.duration, strikeFeedback.accion, s)
                          ? obtenerFechaFin(s.timestamp, s.duration)
                          : null;
                        const situacion = calcularSituacion(s, nowMs);
                        const fechaMs = parseTimestamp(s.timestamp);
                        const fechaTexto = fechaMs ? new Date(fechaMs).toLocaleString("es-ES") : "-";

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

                              {resumenEscala && (
                                <span className={`strikes ${strikeFeedback.esPermaban ? "permaban" : ""}`}>
                                  <WarningCircle size={14} weight="duotone" />
                                  <strong>{resumenEscala}</strong>
                                </span>
                              )}
                            </td>

                            <td data-label="Duración">
                              <div className="truncate" title={duracionVisible}>
                                {duracionVisible}
                              </div>
                              {fechaFin && <div className="duracion-extra">Finaliza: {fechaFin}</div>}
                            </td>

                            <td data-label="Fecha">{fechaTexto}</td>

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