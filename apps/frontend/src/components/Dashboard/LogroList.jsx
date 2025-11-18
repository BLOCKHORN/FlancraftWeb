import { useEffect, useState, useRef } from "react";
import { CheckCircle, Clock, Medal, Filter } from "lucide-react";
import "../../styles/components/Dashboard/_logrolist.scss";

// Tabs superiores: tipo de misión
const TABS_MISION = [
  {
    id: "permanente",
    label: "Logros permanentes",
    imagen: "/assets/logros/tab-permanentes.webp",
  },
  {
    id: "diaria",
    label: "Misiones diarias",
    imagen: "/assets/logros/tab-diarias.webp",
  },
  {
    id: "semanal",
    label: "Retos semanales",
    imagen: "/assets/logros/tab-semanales.webp",
  },
];

// Lista de reinos (solo para permanentes)
const SERVIDORES = [
  { nombre: "Todos", valor: null },
  {
    nombre: "Survival Clásico",
    valor: "survival",
    imagen: "/assets/reinos/survival-clasico.webp",
  },
  {
    nombre: "Survival Anárquico",
    valor: "anarquico",
    imagen: "/assets/reinos/survival-anarquico.webp",
  },
  {
    nombre: "Survival Hardcore",
    valor: "hardcore",
    imagen: "/assets/reinos/survival-hardcore.webp",
  },
  {
    nombre: "OneBlock",
    valor: "oneblock",
    imagen: "/assets/reinos/oneblock.webp",
  },
  {
    nombre: "Chunklock",
    valor: "chunklock",
    imagen: "/assets/reinos/chunklock.webp",
  },
  {
    nombre: "Parkour",
    valor: "parkour",
    imagen: "/assets/reinos/parkour.webp",
  },
];

// Mapa rápido: servidor -> imagen (sin "Todos")
const MAPA_SERVIDOR_IMAGEN = SERVIDORES.reduce((mapa, srv) => {
  if (srv.valor) mapa[srv.valor] = srv.imagen;
  return mapa;
}, {});

const CRITERIOS = [
  { nombre: "Completados primero", valor: "completado" },
  { nombre: "XP descendente", valor: "xp-desc" },
  { nombre: "XP ascendente", valor: "xp-asc" },
  { nombre: "Progreso descendente", valor: "progreso-desc" },
  { nombre: "Progreso ascendente", valor: "progreso-asc" },
];

// ---------- Helpers para el contador ----------

// siguiente reset: hoy 23:59:59 (diaria) o domingo 23:59:59 (semanal)
const calcularSiguienteReset = (tipoMision) => {
  const ahora = new Date();

  if (tipoMision === "diaria") {
    const fin = new Date(ahora);
    fin.setHours(23, 59, 59, 999);
    if (fin <= ahora) {
      fin.setDate(fin.getDate() + 1);
    }
    return fin;
  }

  if (tipoMision === "semanal") {
    const fin = new Date(ahora);
    const day = fin.getDay(); // 0 = domingo, 1 = lunes, ...
    const daysUntilSunday = (7 - day) % 7; // cuántos días faltan para domingo
    fin.setDate(fin.getDate() + daysUntilSunday);
    fin.setHours(23, 59, 59, 999);

    if (fin <= ahora) {
      // por si justo pasa el domingo, nos vamos a la semana siguiente
      fin.setDate(fin.getDate() + 7);
    }
    return fin;
  }

  return null;
};

const desglosarDiferencia = (target) => {
  const ahora = new Date();
  const totalMs = target - ahora;

  if (totalMs <= 0) {
    return {
      totalMs,
      dias: 0,
      horas: 0,
      minutos: 0,
      segundos: 0,
    };
  }

  let resto = Math.floor(totalMs / 1000); // seg totales

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

  // pestaña activa: permanente / diaria / semanal
  const [tipoMision, setTipoMision] = useState("permanente");

  // filtro de reino (solo para permanentes)
  const [servidorActivo, setServidorActivo] = useState(null);

  // por defecto, ordenamos por XP ascendente (dificultad)
  const [criterio, setCriterio] = useState("xp-asc");

  const [cargando, setCargando] = useState(true);
  const [tiempoRestante, setTiempoRestante] = useState(null);

  const buttonRefs = useRef({});

  // ==========================
  // CAMBIO DE PESTAÑA
  // ==========================
  const manejarCambioTipoMision = (nuevoTipo) => {
    if (nuevoTipo === tipoMision) return;
    setTipoMision(nuevoTipo);

    // Si salimos de permanentes, reseteamos el filtro de servidor
    if (nuevoTipo !== "permanente") {
      setServidorActivo(null);
    }
  };

  // ==========================
  // CARGA DE LOGROS (desde backend)
  // ==========================
  useEffect(() => {
    const fetchLogros = async () => {
      try {
        setCargando(true);
        setError(null);

        const params = new URLSearchParams();
        // siempre indicamos el tipo de misión al backend
        params.append("tipo_mision", tipoMision);

        // solo filtramos por servidor cuando estamos en permanentes
        if (tipoMision === "permanente" && servidorActivo) {
          params.append("servidor", servidorActivo);
        }

        const url = `https://flancraft-backend.onrender.com/api/logros/${user.uuid}?${params.toString()}`;

        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        setLogros(data || []);
      } catch (err) {
        console.error("[LOGROS FETCH ERROR]", err);
        setError(err.message);
      } finally {
        setCargando(false);
      }
    };

    fetchLogros();
  }, [user.uuid, servidorActivo, tipoMision]);

  // ==========================
  // CONTADOR (diaria / semanal)
  // ==========================
  useEffect(() => {
    if (tipoMision === "permanente") {
      setTiempoRestante(null);
      return;
    }

    let target = calcularSiguienteReset(tipoMision);

    const actualizar = () => {
      const diff = desglosarDiferencia(target);

      if (diff.totalMs <= 0) {
        // cuando llegue a 0, calculamos el siguiente ciclo
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

  // ==========================
  // RECLAMAR LOGRO
  // ==========================
  const reclamarLogro = async (id_logro, xp_otorgada) => {
    try {
      setCargandoId(id_logro);
      const res = await fetch(
        `https://flancraft-backend.onrender.com/api/logros/reclamar/${id_logro}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uuid: user.uuid }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al reclamar logro");

      setReclamadoId(id_logro);
      setLogros((prev) =>
        prev.map((logro) =>
          logro.id === id_logro ? { ...logro, reclamado: true } : logro
        )
      );

      try {
        const xpSound = new Audio("/assets/sounds/success.mp3");
        xpSound.volume = 0.5;
        xpSound.play();
      } catch {
        /* ignorar fallo de audio */
      }

      const sourceButton = buttonRefs.current[id_logro];
      if (onXpClaimed) {
        onXpClaimed(xp_otorgada, sourceButton);
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setCargandoId(null);
    }
  };

  // ==========================
  // ORDENAR LOGROS
  // ==========================
  const ordenarLogros = (lista) => {
    switch (criterio) {
      case "xp-desc":
        return [...lista].sort((a, b) => b.xp_otorgada - a.xp_otorgada);
      case "xp-asc":
        return [...lista].sort((a, b) => a.xp_otorgada - b.xp_otorgada);
      case "progreso-desc":
        return [...lista].sort(
          (a, b) =>
            b.progreso_actual / b.objetivo - a.progreso_actual / a.objetivo
        );
      case "progreso-asc":
        return [...lista].sort(
          (a, b) =>
            a.progreso_actual / a.objetivo - b.progreso_actual / b.objetivo
        );
      case "completado":
      default:
        return [...lista].sort((a, b) => {
          if (a.completado === b.completado) return 0;
          return a.completado ? -1 : 1;
        });
    }
  };

  // ==========================
  // FILTRO FINAL EN EL FRONT
  // ==========================
  const tieneCampoTipoMision = logros.some(
    (l) => l && Object.prototype.hasOwnProperty.call(l, "tipo_mision")
  );

  let logrosFiltrados = logros;

  if (tieneCampoTipoMision) {
    // filtro por tipo de misión
    if (tipoMision) {
      logrosFiltrados = logrosFiltrados.filter(
        (l) => l.tipo_mision === tipoMision
      );
    }

    // filtro por servidor solo en permanentes
    if (tipoMision === "permanente" && servidorActivo) {
      logrosFiltrados = logrosFiltrados.filter(
        (l) => l.servidor === servidorActivo
      );
    }
  } else {
    // fallback: si por lo que sea la RPC aún no devuelve tipo_mision,
    // mostramos todo en permanentes y nada en diarias/semanales
    if (tipoMision !== "permanente") {
      logrosFiltrados = [];
    }
  }

  const logrosOrdenados = ordenarLogros(logrosFiltrados);
  const hayLogros = logrosOrdenados.length > 0;

  // Texto pequeño debajo del título según pestaña
  const subtituloTab =
    tipoMision === "permanente"
      ? "Completa desafíos únicos en cada servidor."
      : tipoMision === "diaria"
      ? "Misiones rápidas que cambian cada día."
      : "Retos épicos que rotan semanalmente.";

  // ==========================
  // RENDER
  // ==========================
  return (
    <section className="logros-epic">
      {/* CABECERA */}
      <header className="logros-header">
        <h2 className="logros-titulo">Logros de Flancraft</h2>
        <p className="logros-subtitulo">
          Completa desafíos en cada servidor, gana experiencia y forja tu
          leyenda.
        </p>

        {/* TABS TIPO DE MISIÓN */}
        <div className="logros-tabs-tipo">
          {TABS_MISION.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={[
                "logros-tab-tipo",
                tipoMision === tab.id ? "activo" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => manejarCambioTipoMision(tab.id)}
            >
              <div className="logros-tab-icon-wrap">
                <img
                  src={tab.imagen}
                  alt={tab.label}
                  className="logros-tab-icon"
                />
              </div>
              <span className="logros-tab-label">{tab.label}</span>
            </button>
          ))}
        </div>

        <p className="logros-subtitulo-secundario">{subtituloTab}</p>

        {/* COUNTDOWN SOLO DIARIA / SEMANAL */}
        {tipoMision !== "permanente" && tiempoRestante && (
          <div
            className={`logros-countdown logros-countdown-${tipoMision}`}
          >
            <span className="countdown-label">
              {tipoMision === "diaria"
                ? "La rotación diaria termina en"
                : "Este ciclo semanal termina en"}
            </span>

            <div className="countdown-digits">
              {tipoMision === "semanal" && (
                <>
                  <div className="countdown-block">
                    <span className="countdown-number">
                      {tiempoRestante.dias}
                    </span>
                    <span className="countdown-unit">
                      {tiempoRestante.dias === 1 ? "día" : "días"}
                    </span>
                  </div>
                  <span className="countdown-sep">•</span>
                </>
              )}

              <div className="countdown-block">
                <span className="countdown-number">
                  {String(tiempoRestante.horas).padStart(2, "0")}
                </span>
                <span className="countdown-unit">horas</span>
              </div>
              <span className="countdown-sep">:</span>
              <div className="countdown-block">
                <span className="countdown-number">
                  {String(tiempoRestante.minutos).padStart(2, "0")}
                </span>
                <span className="countdown-unit">min</span>
              </div>
              <span className="countdown-sep">:</span>
              <div className="countdown-block">
                <span className="countdown-number">
                  {String(tiempoRestante.segundos).padStart(2, "0")}
                </span>
                <span className="countdown-unit">seg</span>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* TOOLBAR FILTROS */}
      <div className="logros-toolbar">
        {/* Selector de reinos SOLO en permanentes */}
        {tipoMision === "permanente" && (
          <div className="logros-reinos-wrapper">
            <button
              type="button"
              className={["todos-pill", servidorActivo === null ? "activo" : ""]
                .filter(Boolean)
                .join(" ")}
              onClick={() => setServidorActivo(null)}
            >
              Todos
            </button>

            <div className="reinos-grid">
              {SERVIDORES.slice(1).map(({ nombre, valor, imagen }) => (
                <button
                  key={valor}
                  type="button"
                  className={[
                    "reino-card",
                    valor === servidorActivo ? "activo" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => setServidorActivo(valor)}
                >
                  <div className="reino-img-wrap">
                    <img src={imagen} alt={nombre} className="reino-img" />
                  </div>
                  <span className="reino-nombre">{nombre}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Orden */}
        <div className="logros-filtros-orden">
          <span className="orden-label">
            <Filter size={15} /> Ordenar por
          </span>
          <select
            className="orden-select"
            value={criterio}
            onChange={(e) => setCriterio(e.target.value)}
          >
            {CRITERIOS.map((c) => (
              <option key={c.valor} value={c.valor}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ESTADOS DE ERROR / VACÍO */}
      {error && (
        <p className="logros-estado logros-estado-error">
          Error al cargar logros: {error}
        </p>
      )}

      {!error && !cargando && !hayLogros && (
        <p className="logros-estado">
          {tipoMision === "permanente"
            ? "Aún no tienes logros registrados en esta modalidad."
            : tipoMision === "diaria"
            ? "No hay misiones diarias activas ahora mismo."
            : "No hay retos semanales activos ahora mismo."}
        </p>
      )}

      {/* LISTA + OVERLAY DE CARGA */}
      <div className="logros-list-wrapper">
        {!error && hayLogros && (
          <ul
            className={[
              "logros-lista",
              cargando ? "logros-lista-saliente" : "logros-lista-entrante",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {logrosOrdenados.map((logro, index) => {
              const progresoPercent = Math.min(
                100,
                (logro.progreso_actual / logro.objetivo) * 100
              );

              const esCompletado = !!logro.completado;
              const esReclamado =
                !!logro.reclamado || logro.id === reclamadoId;

              const imagenServidor =
                logro.servidor && MAPA_SERVIDOR_IMAGEN[logro.servidor];

              return (
                <li
                  key={logro.id}
                  className={[
                    "logro-row",
                    esCompletado ? "logro-completado" : "logro-progreso",
                    esReclamado ? "logro-reclamado" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  style={{ "--delay": `${index * 45}ms` }}
                >
                  <span className="logro-acento" />

                  <div className="logro-main">
                    {/* TÍTULO + XP */}
                    <div className="logro-top">
                      <div className="logro-top-left">
                        <h3 className="logro-nombre">
                          {logro.nombre || logro.tipo || "Logro"}
                        </h3>
                        <p className="logro-descripcion">
                          {logro.descripcion ||
                            "Progreso de logro en este servidor."}
                        </p>
                      </div>

                      <div className="logro-top-right">
                        <span className="logro-xp-chip">
                          <Medal size={14} /> {logro.xp_otorgada} XP
                        </span>
                      </div>
                    </div>

                    {/* PROGRESO */}
                    <div className="logro-progress">
                      <div className="logro-progress-track">
                        <div
                          className="logro-progress-fill"
                          style={{ width: `${progresoPercent}%` }}
                        />
                      </div>
                      <div className="logro-progress-meta">
                        <span className="logro-progress-texto">
                          {logro.progreso_actual} / {logro.objetivo}
                        </span>
                      </div>
                    </div>

                    {/* FOOTER */}
                    <div className="logro-footer">
                      <span
                        className={[
                          "logro-status",
                          esReclamado
                            ? "logro-status-reclamado"
                            : esCompletado
                            ? "logro-status-completado"
                            : "logro-status-pendiente",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        {esReclamado ? (
                          <>
                            <CheckCircle size={14} /> Reclamado
                          </>
                        ) : esCompletado ? (
                          <>
                            <CheckCircle size={14} /> Listo para reclamar
                          </>
                        ) : (
                          <>
                            <Clock size={14} /> En progreso
                          </>
                        )}
                      </span>

                      {esCompletado && !esReclamado && (
                        <button
                          ref={(el) => (buttonRefs.current[logro.id] = el)}
                          type="button"
                          className="logro-claim-btn"
                          onClick={() =>
                            reclamarLogro(logro.id, logro.xp_otorgada)
                          }
                          disabled={cargandoId === logro.id}
                        >
                          {cargandoId === logro.id
                            ? "Reclamando..."
                            : "Reclamar XP"}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* FRANJA OSCURA CON ICONO DEL REINO */}
                  {imagenServidor && (
                    <div className="logro-reino-overlay">
                      <div className="logro-reino-glow" />
                      <img
                        src={imagenServidor}
                        alt={logro.servidor}
                        className="logro-reino-img"
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {/* OVERLAY DE CARGA – GEMITA GIRANDO SIN MOVER LA LISTA */}
        {cargando && (
          <div className="logros-loading-overlay">
            <div className="logros-loading-inner">
              <img
                src="/assets/eco.png"
                alt="Cargando logros"
                className="logros-loading-gem"
              />
              <p className="logros-loading-text">
                Invocando nuevos desafíos...
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default LogroList;
