import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { getLeaderboards } from "../../api/getLeaderboards";
import classNames from "classnames";
import "../../styles/components/Estadisticas/_leaderboards.scss";

const SERVIDORES = [
  { id: "survival_clasico", nombre: "Survival Clásico" },
  { id: "survival_anarquico", nombre: "Survival Anárquico" },
  { id: "survival_hardcore", nombre: "Survival Hardcore" },
  { id: "oneblock", nombre: "OneBlock" },
  { id: "chunklock", nombre: "ChunkLock" },
  { id: "parkour", nombre: "Parkour" },
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
  tiempo_jugado: "Tiempo (h)",
};

const TOOLTIP_DESCRIPCIONES = {
  bloques_minados: "Cantidad total de bloques rotos con herramientas.",
  bloques_colocados: "Número de bloques colocados en el mundo.",
  mobs_matados: "Mobs (hostiles y pasivos) eliminados.",
  kills_pvp: "Jugadores eliminados en combate.",
  muertes: "Número total de veces que has muerto.",
  tiempo_jugado: "Horas totales jugadas en este servidor.",
};

export default function Leaderboards() {
  const [servidor, setServidor] = useState(SERVIDORES[0].id);
  const [datosVisibles, setDatosVisibles] = useState([]);
  const [orden, setOrden] = useState("tiempo_jugado");
  const [ordenAscendente, setOrdenAscendente] = useState(false);
  const [offset, setOffset] = useState(0);
  const [filaSeleccionada, setFilaSeleccionada] = useState(null);
  const [animacion, setAnimacion] = useState("");
  const [usuariosVinculados, setUsuariosVinculados] = useState({});
  const limit = 10;
  const paginasTotales = 10;

  useEffect(() => {
    fetch("https://flancraft-backend.onrender.com/api/usuarios")
      .then((res) => res.json())
      .then((usuarios) => {
        const mapa = usuarios.reduce((acc, u) => {
          if (u.uuid) {
            acc[u.uuid] = {
              rango: u.rango_usuario?.toLowerCase() || null,
              premium: u.es_premium === true,
            };
          }
          return acc;
        }, {});
        setUsuariosVinculados(mapa);
      })
      .catch((err) => console.error("Error al obtener usuarios:", err));
  }, []);

  useEffect(() => {
    let cancelado = false;
    setAnimacion("fade-out");

    const timeout = setTimeout(() => {
      if (cancelado) return;

      getLeaderboards({ tipo: orden, servidor, limit, offset }).then((res) => {
        if (cancelado) return;

        const lista = res.resultados || [];
        const ordenada = ordenAscendente
          ? [...lista].sort((a, b) => (a[orden] || 0) - (b[orden] || 0))
          : [...lista].sort((a, b) => (b[orden] || 0) - (a[orden] || 0));

        setTimeout(() => {
          if (cancelado) return;
          setDatosVisibles(ordenada);
          setAnimacion("fade-in");
          setTimeout(() => setAnimacion(""), 1000);
        }, 10);
      });
    }, 500);

    return () => {
      cancelado = true;
      clearTimeout(timeout);
    };
  }, [orden, servidor, offset, ordenAscendente]);

  useEffect(() => {
    setFilaSeleccionada(null);
  }, [servidor, offset]);

  const formatearTiempo = (ticks) => {
    const totalSegundos = Math.floor((ticks || 0) / 20);
    const horas = Math.floor(totalSegundos / 3600);
    const minutos = Math.floor((totalSegundos % 3600) / 60);
    return `${horas}h ${minutos}m`;
  };

  const formatValue = useCallback((key, value) => {
    if (key === "tiempo_jugado") return formatearTiempo(value || 0);
    return (value || 0).toLocaleString("es-ES");
  }, []);

  const cambiarOrden = useCallback((stat) => {
    setOrden((prev) => {
      if (prev === stat) {
        setOrdenAscendente((asc) => !asc);
        return prev;
      } else {
        setOrdenAscendente(false);
        return stat;
      }
    });
  }, []);

  const cambiarPagina = (nuevaPagina) => {
    setOffset(nuevaPagina * limit);
  };

  const servidorSeleccionado = SERVIDORES.find((s) => s.id === servidor);

  return (
    <section className="leaderboard-epic">
      <div className="epic-header">
        <h1>Hall de la Fama</h1>
        <p>
          Solo los más constantes y valientes llegan a figurar aquí. Este
          leaderboard honra a todos los jugadores que han dejado su marca en
          los mundos de FlanCraft.
        </p>
      </div>

      <div className="selector-panel">
        {SERVIDORES.map((s) => (
          <button
            key={s.id}
            className={classNames("selector-button", { active: servidor === s.id })}
            onClick={() => {
              setServidor(s.id);
              setOffset(0);
            }}
            aria-label={`Cambiar a ${s.nombre}`}
          >
            {s.nombre}
          </button>
        ))}
      </div>

      <div className="tabla-titulo">
        {servidorSeleccionado && (
          <span className="tabla-subtitulo-servidor">
            Estadísticas en {servidorSeleccionado.nombre}
          </span>
        )}
        <br />
        Top {limit} - {LABELS[orden]}{" "}
        <span className="flecha-orden">{ordenAscendente ? "▲" : "▼"}</span>
      </div>

      <div className="table-container">
        <table className="tabla-epica">
          <thead>
            <tr>
              <th>Rango</th>
              <th>Jugador</th>
              {STATS.map((s) => (
                <th
                  key={s}
                  className={classNames("ordenable", { activo: orden === s })}
                  onClick={() => cambiarOrden(s)}
                  title={`${LABELS[s]} — ${TOOLTIP_DESCRIPCIONES[s]}`}
                >
                  {LABELS[s]}
                  {orden === s && (
                    <span className="flecha-orden">
                      {ordenAscendente ? "▲" : "▼"}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>

          <tbody
            className={classNames({
              "tbody-animado-salida": animacion === "fade-out",
              "tbody-animado-entrada": animacion === "fade-in",
            })}
          >
            {datosVisibles.length === 0 && (
              <tr className="fila fila-vacia">
                <td
                  className="mensaje-vacio"
                  colSpan={2 + STATS.length}
                >
                  Todavía no hay datos registrados para este servidor.
                  Conéctate y empieza a escribir tu nombre en el Hall de la
                  Fama.
                </td>
              </tr>
            )}

            {datosVisibles.map((player, i) => {
              const posicion = offset + i;
              const esSeleccionado = filaSeleccionada === player.uuid;
              const datosUsuario = usuariosVinculados[player.uuid] || {};
              const medalla =
                posicion === 0
                  ? "/assets/oro.webp"
                  : posicion === 1
                  ? "/assets/plata.webp"
                  : posicion === 2
                  ? "/assets/bronce.webp"
                  : null;

              return (
                <tr
                  key={`${player.uuid}-${orden}-${offset}`}
                  className={classNames(
                    `fila fila-${posicion + 1} anim-row`,
                    { seleccionada: esSeleccionado }
                  )}
                  onClick={() =>
                    setFilaSeleccionada((prev) =>
                      prev === player.uuid ? null : player.uuid
                    )
                  }
                  style={{ animationDelay: `${i * 120}ms` }}
                >
                  <td data-label="Rango">
                    {medalla ? (
                      <img
                        src={medalla}
                        alt={`Top ${posicion + 1}`}
                        className="medalla"
                      />
                    ) : (
                      <span className="numero-rango">
                        {posicion + 1}
                      </span>
                    )}
                  </td>
                  <td data-label="Jugador">
                    <div className="jugador-info">
                      <img
                        src={`https://mc-heads.net/avatar/${
                          player.nombre_minecraft || "Steve"
                        }/32`}
                        onError={(e) =>
                          (e.currentTarget.src = "/assets/default-head.png")
                        }
                        alt={`Avatar de ${
                          player.nombre_minecraft || "Desconocido"
                        }`}
                        className="avatar-head"
                      />
                      <Link
                        to={`/perfil/${player.nombre_minecraft}`}
                        className={
                          datosUsuario.rango
                            ? `nombre-colored rango-${datosUsuario.rango}`
                            : ""
                        }
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.3rem",
                          textDecoration: "none",
                        }}
                      >
                        {player.nombre_minecraft || "Desconocido"}
                        {datosUsuario.premium && (
                          <img
                            src="/assets/premium.webp"
                            alt="Premium"
                            className="icono-premium"
                          />
                        )}
                      </Link>
                    </div>
                  </td>
                  {STATS.map((stat) => (
                    <td key={stat} data-label={LABELS[stat]}>
                      {formatValue(stat, player[stat])}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="epic-pagination paginador-numerico">
        <button
          onClick={() => cambiarPagina(0)}
          disabled={offset === 0}
          aria-label="Primera página"
        >
          «
        </button>
        <button
          onClick={() =>
            cambiarPagina(Math.max(0, Math.floor(offset / limit) - 1))
          }
          disabled={offset === 0}
          aria-label="Anterior"
        >
          ‹
        </button>

        {[...Array(paginasTotales)].map((_, index) => (
          <button
            key={index}
            className={offset === index * limit ? "activo" : ""}
            onClick={() => cambiarPagina(index)}
          >
            {index + 1}
          </button>
        ))}

        <button
          onClick={() =>
            cambiarPagina(Math.floor(offset / limit) + 1)
          }
          disabled={offset + limit >= paginasTotales * limit}
          aria-label="Siguiente"
        >
          ›
        </button>
        <button
          onClick={() => cambiarPagina(paginasTotales - 1)}
          disabled={offset + limit >= paginasTotales * limit}
          aria-label="Última página"
        >
          »
        </button>
      </div>
    </section>
  );
}
