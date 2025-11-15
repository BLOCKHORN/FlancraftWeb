import { useEffect, useState, useRef } from "react";
import { CheckCircle, Clock, Medal, Filter } from "lucide-react";
import "../../styles/components/Dashboard/_logrolist.scss";

// Lista completa (incluye "Todos")
const SERVIDORES = [
  { nombre: "Todos", valor: null },
  {
    nombre: "Survival Clásico",
    valor: "survival",
    imagen: "/assets/reinos/survival-clasico.png",
  },
  {
    nombre: "Survival Anárquico",
    valor: "anarquico",
    imagen: "/assets/reinos/survival-anarquico.png",
  },
  {
    nombre: "Survival Hardcore",
    valor: "hardcore",
    imagen: "/assets/reinos/survival-hardcore.png",
  },
  {
    nombre: "OneBlock",
    valor: "oneblock",
    imagen: "/assets/reinos/oneblock.png",
  },
  {
    nombre: "Chunklock",
    valor: "chunklock",
    imagen: "/assets/reinos/chunklock.png",
  },
  {
    nombre: "Parkour",
    valor: "parkour",
    imagen: "/assets/reinos/parkour.png",
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

function LogroList({ user, onXpClaimed }) {
  const [logros, setLogros] = useState([]);
  const [error, setError] = useState(null);
  const [reclamadoId, setReclamadoId] = useState(null);
  const [cargandoId, setCargandoId] = useState(null);
  const [servidorActivo, setServidorActivo] = useState(null);
  const [criterio, setCriterio] = useState("completado");
  const [cargando, setCargando] = useState(true);
  const buttonRefs = useRef({});

  // ==========================
  // CARGA DE LOGROS
  // ==========================
  useEffect(() => {
    const param = servidorActivo ? `?servidor=${servidorActivo}` : "";

    setCargando(true);

    fetch(
      `https://flancraftweb-backend.onrender.com/api/logros/${user.uuid}${param}`
    )
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setLogros(data || []);
        setError(null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setCargando(false));
  }, [user.uuid, servidorActivo]);

  // ==========================
  // RECLAMAR LOGRO
  // ==========================
  const reclamarLogro = async (id_logro, xp_otorgada) => {
    try {
      setCargandoId(id_logro);
      const res = await fetch(
        `https://flancraftweb-backend.onrender.com/api/logros/reclamar/${id_logro}`,
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

  const logrosOrdenados = ordenarLogros(logros);
  const hayLogros = logrosOrdenados.length > 0;

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
      </header>

      {/* TOOLBAR FILTROS */}
      <div className="logros-toolbar">
        {/* Selector de reinos */}
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
          Aún no tienes logros registrados en esta modalidad.
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

        {/* OVERLAY DE CARGA – NO MUEVE NADA, SOLO SE PONE ENCIMA */}
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
