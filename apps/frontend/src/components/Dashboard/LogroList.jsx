import { useEffect, useState, useRef } from "react";
import { Filter, Clock } from "lucide-react";
import "../../styles/components/Dashboard/_logrolist.scss";

const API_BASE = (import.meta.env.VITE_BACKEND_URL || "https://flancraft-backend.onrender.com").trim().replace(/\/$/, "");

const PAGE_SIZE = 10;
const LOGROS_PROXIMAMENTE = true;

const TABS_MISION = [
  { id: "permanente", label: "Logros permanentes", imagen: "/assets/logros/tab-permanentes.webp" },
  { id: "diaria", label: "Misiones diarias", imagen: "/assets/logros/tab-diarias.webp" },
  { id: "semanal", label: "Retos semanales", imagen: "/assets/logros/tab-semanales.webp" },
];

const SERVIDORES = [
  { nombre: "Todos", valor: null },
  { nombre: "Survival", valor: "survival", imagen: "/assets/reinos/survival-clasico.webp" },
];

const MAPA_SERVIDOR_IMAGEN = {
  survival: "/assets/reinos/survival-clasico.webp",
  global: "/assets/reinos/global.webp",
};

const CRITERIOS = [
  { nombre: "Completados primero", valor: "completado" },
  { nombre: "XP descendente", valor: "xp-desc" },
  { nombre: "XP ascendente", valor: "xp-asc" },
  { nombre: "Progreso descendente", valor: "progreso-desc" },
  { nombre: "Progreso ascendente", valor: "progreso-asc" },
];

const calcularSiguienteReset = (tipoMision) => {
  const ahora = new Date();

  if (tipoMision === "diaria") {
    const fin = new Date(ahora);
    fin.setHours(23, 59, 59, 999);
    if (fin <= ahora) fin.setDate(fin.getDate() + 1);
    return fin;
  }

  if (tipoMision === "semanal") {
    const fin = new Date(ahora);
    const day = fin.getDay();
    const daysUntilSunday = (7 - day) % 7;
    fin.setDate(fin.getDate() + daysUntilSunday);
    fin.setHours(23, 59, 59, 999);
    if (fin <= ahora) fin.setDate(fin.getDate() + 7);
    return fin;
  }

  return null;
};

const desglosarDiferencia = (target) => {
  const ahora = new Date();
  const totalMs = target - ahora;

  if (totalMs <= 0) return { totalMs, dias: 0, horas: 0, minutos: 0, segundos: 0 };

  let resto = Math.floor(totalMs / 1000);

  const dias = Math.floor(resto / (60 * 60 * 24));
  resto %= 60 * 60 * 24;

  const horas = Math.floor(resto / 3600);
  resto %= 3600;

  const minutos = Math.floor(resto / 60);
  const segundos = resto % 60;

  return { totalMs, dias, horas, minutos, segundos };
};

function LogroList({ user, onXpClaimed }) {
  const [logros, setLogros] = useState([]);
  const [error, setError] = useState(null);
  const [reclamadoId, setReclamadoId] = useState(null);
  const [cargandoId, setCargandoId] = useState(null);

  const [tipoMision, setTipoMision] = useState("permanente");
  const [servidorActivo, setServidorActivo] = useState(null);
  const [criterio, setCriterio] = useState("xp-asc");

  const [cargando, setCargando] = useState(true);
  const [tiempoRestante, setTiempoRestante] = useState(null);

  const [pagina, setPagina] = useState(1);

  const buttonRefs = useRef({});
  const listaTopRef = useRef(null);

  const manejarCambioTipoMision = (nuevoTipo) => {
    if (LOGROS_PROXIMAMENTE) return;
    if (nuevoTipo === tipoMision) return;
    setTipoMision(nuevoTipo);
    if (nuevoTipo !== "permanente") setServidorActivo(null);
  };

  useEffect(() => {
    const fetchLogros = async () => {
      if (LOGROS_PROXIMAMENTE) {
        setError(null);
        setLogros([]);
        setCargando(false);
        return;
      }

      try {
        setCargando(true);
        setError(null);

        let url;

        if (tipoMision === "diaria") {
          url = `${API_BASE}/api/misiones/dailys`;
        } else if (tipoMision === "semanal") {
          url = `${API_BASE}/api/misiones/semanales`;
        } else {
          const params = new URLSearchParams();
          params.append("tipo_mision", tipoMision);
          url = `${API_BASE}/api/logros/${user.uuid}?${params.toString()}`;
        }

        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        if (tipoMision === "permanente") {
          setLogros(data || []);
        } else {
          const misionesCrudas = Array.isArray(data) ? data : data.misiones || [];
          const adaptadas = (misionesCrudas || []).map((m) => ({
            id: m.id,
            nombre: m.nombre,
            descripcion: m.descripcion,
            tipo: m.tipo,
            objetivo: m.objetivo,
            xp_otorgada: m.xp_otorgada,
            servidor: m.servidor,
            categoria: m.categoria,
            progreso_compartido: m.progreso_compartido,
            orden: m.orden,
            activa: m.activa,
            progreso_actual: 0,
            completado: false,
            reclamado: false,
            tipo_mision: tipoMision,
          }));

          setLogros(adaptadas);
        }
      } catch (err) {
        console.error("[LOGROS FETCH ERROR]", err);
        setError(err.message);
        setLogros([]);
      } finally {
        setCargando(false);
      }
    };

    if (!user?.uuid) return;
    fetchLogros();
  }, [user?.uuid, tipoMision]);

  useEffect(() => {
    if (tipoMision === "permanente") {
      setTiempoRestante(null);
      return;
    }

    let target = calcularSiguienteReset(tipoMision);

    const actualizar = () => {
      const diff = desglosarDiferencia(target);
      if (diff.totalMs <= 0) {
        target = calcularSiguienteReset(tipoMision);
        setTiempoRestante(desglosarDiferencia(target));
      } else {
        setTiempoRestante(diff);
      }
    };

    actualizar();
    const id = setInterval(actualizar, 1000);
    return () => clearInterval(id);
  }, [tipoMision]);

  const reclamarLogro = async (id_logro, xp_otorgada) => {
    try {
      setCargandoId(id_logro);

      const res = await fetch(`${API_BASE}/api/logros/reclamar/${id_logro}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uuid: user.uuid }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al reclamar logro");

      setReclamadoId(id_logro);
      setLogros((prev) => prev.map((logro) => (logro.id === id_logro ? { ...logro, reclamado: true } : logro)));

      try {
        const xpSound = new Audio("/assets/sounds/success.mp3");
        xpSound.volume = 0.5;
        xpSound.play();
      } catch {}

      const sourceButton = buttonRefs.current[id_logro];
      if (onXpClaimed) onXpClaimed(xp_otorgada, sourceButton);
    } catch (err) {
      alert(err.message);
    } finally {
      setCargandoId(null);
    }
  };

  const ordenarLogros = (lista) => {
    switch (criterio) {
      case "xp-desc":
        return [...lista].sort((a, b) => b.xp_otorgada - a.xp_otorgada);
      case "xp-asc":
        return [...lista].sort((a, b) => a.xp_otorgada - b.xp_otorgada);
      case "progreso-desc":
        return [...lista].sort((a, b) => b.progreso_actual / b.objetivo - a.progreso_actual / a.objetivo);
      case "progreso-asc":
        return [...lista].sort((a, b) => a.progreso_actual / a.objetivo - b.progreso_actual / b.objetivo);
      case "completado":
      default:
        return [...lista].sort((a, b) => {
          if (a.completado === b.completado) return 0;
          return a.completado ? -1 : 1;
        });
    }
  };

  const tieneCampoTipoMision = logros.some((l) => l && Object.prototype.hasOwnProperty.call(l, "tipo_mision"));

  let logrosFiltrados = logros;

  if (tieneCampoTipoMision) {
    if (tipoMision) logrosFiltrados = logrosFiltrados.filter((l) => l.tipo_mision === tipoMision);
    if (tipoMision === "permanente" && servidorActivo) logrosFiltrados = logrosFiltrados.filter((l) => l.servidor === servidorActivo);
  } else {
    if (tipoMision !== "permanente") logrosFiltrados = [];
  }

  const esClaimable = (l) => {
    if (tipoMision !== "permanente") return false;
    if (!l) return false;
    const reclamado = !!l.reclamado || l.id === reclamadoId;
    return !!l.completado && !reclamado;
  };

  const baseOrden = ordenarLogros(logrosFiltrados);

  const logrosOrdenados =
    tipoMision === "permanente" ? [...baseOrden.filter(esClaimable), ...baseOrden.filter((l) => !esClaimable(l))] : baseOrden;

  const hayLogros = logrosOrdenados.length > 0;

  const claimablePorServidor = new Set((logros || []).filter((l) => l && l.servidor && l.completado && !l.reclamado).map((l) => l.servidor));
  const hayClaimables = claimablePorServidor.size > 0;

  const subtituloTab =
    tipoMision === "permanente"
      ? "Completa todos los desafíos"
      : tipoMision === "diaria"
      ? "Misiones rápidas que cambian cada día."
      : "Retos épicos que rotan semanalmente.";

  const totalPaginas = Math.max(1, Math.ceil(logrosOrdenados.length / PAGE_SIZE));

  useEffect(() => {
    setPagina(1);
  }, [tipoMision, servidorActivo, criterio, user?.uuid]);

  useEffect(() => {
    setPagina((p) => Math.min(p, totalPaginas));
  }, [totalPaginas]);

  const inicio = (pagina - 1) * PAGE_SIZE;
  const logrosPagina = logrosOrdenados.slice(inicio, inicio + PAGE_SIZE);

  const paginasVisibles = (() => {
    const max = 5;
    let start = Math.max(1, pagina - 2);
    let end = Math.min(totalPaginas, start + max - 1);
    start = Math.max(1, end - max + 1);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  })();

  const irPagina = (p) => {
    const next = Math.min(totalPaginas, Math.max(1, p));
    if (next === pagina) return;
    setPagina(next);
    requestAnimationFrame(() => {
      listaTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  return (
    <section className={["logros-epic", LOGROS_PROXIMAMENTE ? "logros-proximamente-mode" : ""].filter(Boolean).join(" ")}>
      <header className="logros-header">
        <h2 className="logros-titulo">Logros de Flancraft</h2>

        <div className="logros-tabs-tipo">
          {TABS_MISION.map((tab) => (
            <button
              key={tab.id}
              type="button"
              disabled={LOGROS_PROXIMAMENTE}
              className={["logros-tab-tipo", tipoMision === tab.id ? "activo" : "", LOGROS_PROXIMAMENTE ? "bloqueado" : ""]
                .filter(Boolean)
                .join(" ")}
              onClick={() => manejarCambioTipoMision(tab.id)}
            >
              <div className="logros-tab-icon-wrap">
                <img src={tab.imagen} alt={tab.label} className="logros-tab-icon" />
              </div>
              <span className="logros-tab-label">{tab.label}</span>
            </button>
          ))}
        </div>

        <p className="logros-subtitulo-secundario">{LOGROS_PROXIMAMENTE ? "Sistema en preparación" : subtituloTab}</p>

        {!LOGROS_PROXIMAMENTE && tipoMision !== "permanente" && tiempoRestante && (
          <div className={`logros-countdown logros-countdown-${tipoMision}`}>
            <span className="countdown-label">
              {tipoMision === "diaria" ? "La rotación diaria termina en" : "Este ciclo semanal termina en"}
            </span>

            <div className="countdown-digits">
              {tipoMision === "semanal" && (
                <>
                  <div className="countdown-block">
                    <span className="countdown-number">{tiempoRestante.dias}</span>
                    <span className="countdown-unit">{tiempoRestante.dias === 1 ? "día" : "días"}</span>
                  </div>
                  <span className="countdown-sep">•</span>
                </>
              )}

              <div className="countdown-block">
                <span className="countdown-number">{String(tiempoRestante.horas).padStart(2, "0")}</span>
                <span className="countdown-unit">horas</span>
              </div>
              <span className="countdown-sep">:</span>
              <div className="countdown-block">
                <span className="countdown-number">{String(tiempoRestante.minutos).padStart(2, "0")}</span>
                <span className="countdown-unit">min</span>
              </div>
              <span className="countdown-sep">:</span>
              <div className="countdown-block">
                <span className="countdown-number">{String(tiempoRestante.segundos).padStart(2, "0")}</span>
                <span className="countdown-unit">seg</span>
              </div>
            </div>
          </div>
        )}
      </header>

      {LOGROS_PROXIMAMENTE ? (
        <div className="logros-soon-wrap">
          <div className="logros-soon-card">
            <div className="logros-soon-icon">
              <Clock size={22} className="logros-soon-clock" />
            </div>
            <div className="logros-soon-text">
              <h3 className="logros-soon-title">EN MANTENIMIENTO</h3>
              <p className="logros-soon-desc">Estamos ajustando el sistema de logros y el claim de XP.</p>
              <p className="logros-soon-desc2">Vuelve en breve para empezar a progresar.</p>
            </div>
          </div>

          <div className="logros-soon-reinos">
            <p className="logros-soon-reinos-title">Reino activo</p>

            <div className="reinos-grid reinos-grid-soon">
              <div className="reino-card reino-card--soon" title="Survival" aria-hidden="true">
                <div className="reino-img-wrap">
                  <img src="/assets/reinos/survival-clasico.webp" alt="Survival" className="reino-img" />
                </div>
                <span className="reino-nombre">Survival</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="logros-toolbar">
            {tipoMision === "permanente" && (
              <div className="logros-reinos-wrapper">
                <button
                  type="button"
                  className={["todos-pill", servidorActivo === null ? "activo" : "", hayClaimables ? "todos-pill-claimable" : ""]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => setServidorActivo(null)}
                >
                  Todos
                </button>

                <div className="reinos-grid">
                  <button
                    type="button"
                    className={["reino-card", servidorActivo === "survival" ? "activo" : "", claimablePorServidor.has("survival") ? "reino-card-claimable" : ""]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => setServidorActivo("survival")}
                  >
                    <div className="reino-img-wrap">
                      <img src="/assets/reinos/survival-clasico.webp" alt="Survival" className="reino-img" />
                    </div>
                    <span className="reino-nombre">Survival</span>
                  </button>
                </div>
              </div>
            )}

            <div className="logros-filtros-orden">
              <span className="orden-label">
                <Filter size={15} /> Ordenar por
              </span>
              <select className="orden-select" value={criterio} onChange={(e) => setCriterio(e.target.value)}>
                {CRITERIOS.map((c) => (
                  <option key={c.valor} value={c.valor}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && <p className="logros-estado logros-estado-error">Error al cargar logros: {error}</p>}

          {!error && !cargando && !hayLogros && (
            <p className="logros-estado">
              {tipoMision === "permanente"
                ? "Aún no tienes logros registrados en esta modalidad."
                : tipoMision === "diaria"
                ? "No hay misiones diarias activas ahora mismo."
                : "No hay retos semanales activos ahora mismo."}
            </p>
          )}

          <div className="logros-list-wrapper">
            <div ref={listaTopRef} />

            {!error && hayLogros && (
              <>
                <ul className={["logros-lista", cargando ? "logros-lista-saliente" : "logros-lista-entrante"].filter(Boolean).join(" ")}>
                  {logrosPagina.map((logro, index) => {
                    const progresoPercent = Math.min(100, (logro.progreso_actual / logro.objetivo) * 100);

                    const esCompletado = !!logro.completado;
                    const esReclamado = !!logro.reclamado || logro.id === reclamadoId;
                    const claimable = esClaimable(logro);

                    const imagenServidor = logro.servidor && MAPA_SERVIDOR_IMAGEN[logro.servidor];

                    return (
                      <li
                        key={logro.id}
                        className={["logro-row", esCompletado ? "logro-completado" : "logro-progreso", esReclamado ? "logro-reclamado" : "", claimable ? "logro-claimable" : ""]
                          .filter(Boolean)
                          .join(" ")}
                        style={{ "--delay": `${index * 45}ms` }}
                      >
                        <span className="logro-acento" />

                        <div className="logro-main">
                          <div className="logro-top">
                            <div className="logro-top-left">
                              <h3 className="logro-nombre">{logro.nombre || logro.tipo || "Logro"}</h3>
                              <p className="logro-descripcion">{logro.descripcion || "Progreso de logro en este servidor."}</p>
                            </div>

                            <div className="logro-top-right">
                              <div className="logro-xp-wrap">
                                <img
                                  src={
                                    esReclamado
                                      ? "/assets/logros/estado-reclamado.webp"
                                      : esCompletado
                                      ? "/assets/logros/estado-reclamar.webp"
                                      : "/assets/logros/estado-progreso.webp"
                                  }
                                  alt={esReclamado ? "Reclamado" : esCompletado ? "Listo para reclamar" : "En progreso"}
                                  className="logro-xp-status-img"
                                  draggable="false"
                                />
                                <span className="logro-xp-chip">{logro.xp_otorgada} XP</span>
                              </div>
                            </div>
                          </div>

                          <div className="logro-progress">
                            <div className="logro-progress-track">
                              <div className="logro-progress-fill" style={{ width: `${progresoPercent}%` }} />
                            </div>
                            <div className="logro-progress-meta">
                              <span className="logro-progress-texto">
                                {logro.progreso_actual} / {logro.objetivo}
                              </span>
                            </div>
                          </div>

                          {tipoMision === "permanente" && esCompletado && !esReclamado && (
                            <div className="logro-footer">
                              <button
                                ref={(el) => (buttonRefs.current[logro.id] = el)}
                                type="button"
                                className={["logro-claim-btn", "tsf-btn", "tsf-btn--aqua"].join(" ")}
                                onClick={() => reclamarLogro(logro.id, logro.xp_otorgada)}
                                disabled={cargandoId === logro.id}
                              >
                                <span className="tsf-btnDepth" aria-hidden="true" />
                                <span className="tsf-btnFace">
                                  <span className="tsf-btnLabel">{cargandoId === logro.id ? "Reclamando..." : "Reclamar XP"}</span>
                                </span>
                              </button>
                            </div>
                          )}
                        </div>

                        {imagenServidor && (
                          <div className="logro-reino-overlay">
                            <div className="logro-reino-glow" />
                            <img src={imagenServidor} alt={logro.servidor} className="logro-reino-img" />
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>

                {!cargando && totalPaginas > 1 && (
                  <nav className="logros-paginacion" aria-label="Paginación de logros">
                    <button type="button" className="logros-pag-btn" onClick={() => irPagina(pagina - 1)} disabled={pagina === 1}>
                      Anterior
                    </button>

                    <div className="logros-pag-numeros">
                      {paginasVisibles.map((n) => (
                        <button
                          key={n}
                          type="button"
                          className={["logros-pag-num", n === pagina ? "activo" : ""].filter(Boolean).join(" ")}
                          onClick={() => irPagina(n)}
                        >
                          {n}
                        </button>
                      ))}
                    </div>

                    <button type="button" className="logros-pag-btn" onClick={() => irPagina(pagina + 1)} disabled={pagina === totalPaginas}>
                      Siguiente
                    </button>

                    <span className="logros-pag-info">
                      Página {pagina} / {totalPaginas}
                    </span>
                  </nav>
                )}
              </>
            )}

            {cargando && (
              <div className="logros-loading-overlay">
                <div className="logros-loading-inner">
                  <img src="/assets/eco.webp" alt="Cargando logros" className="logros-loading-gem" />
                  <p className="logros-loading-text">Invocando nuevos desafíos...</p>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}

export default LogroList;