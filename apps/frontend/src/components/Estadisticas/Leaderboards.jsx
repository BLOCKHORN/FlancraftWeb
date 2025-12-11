import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getLeaderboards } from "../../api/getLeaderboards";
import classNames from "classnames";
import "../../styles/components/Estadisticas/_leaderboards.scss";

const SERVIDORES = [
  {
    id: "survival_clasico",
    nombre: "Survival Clásico",
    imagen: "/assets/reinos/survival-clasico.webp",
  },
  {
    id: "survival_anarquico",
    nombre: "Survival Anárquico",
    imagen: "/assets/reinos/survival-anarquico.webp",
  },
  {
    id: "survival_hardcore",
    nombre: "Survival Hardcore",
    imagen: "/assets/reinos/survival-hardcore.webp",
  },
  {
    id: "oneblock",
    nombre: "OneBlock",
    imagen: "/assets/reinos/oneblock.webp",
  },
  {
    id: "chunklock",
    nombre: "ChunkLock",
    imagen: "/assets/reinos/chunklock.webp",
  },
  {
    id: "parkour",
    nombre: "Parkour",
    imagen: "/assets/reinos/parkour.webp",
  },
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
  const [filaEnTransicion, setFilaEnTransicion] = useState(null);
  const [closing, setClosing] = useState(false);

  const limit = 10;
  const paginasTotales = 10;

  const navigate = useNavigate();

  // Mapa de usuarios vinculados (rango + premium + nivel web)
  useEffect(() => {
    fetch("https://flancraft-backend.onrender.com/api/usuarios")
      .then((res) => res.json())
      .then((usuarios) => {
        const mapa = usuarios.reduce((acc, u) => {
          if (u.uuid) {
            acc[u.uuid] = {
              rango: u.rango_usuario?.toLowerCase() || null,
              premium: u.es_premium === true,
              nivel: typeof u.nivel === "number" ? u.nivel : null,
            };
          }
          return acc;
        }, {});
        setUsuariosVinculados(mapa);
      })
      .catch((err) => console.error("Error al obtener usuarios:", err));
  }, []);

  // Carga del ranking
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
    }, 400);

    return () => {
      cancelado = true;
      clearTimeout(timeout);
    };
  }, [orden, servidor, offset, ordenAscendente]);

  // Reset de fila seleccionada al cambiar de servidor/página
  useEffect(() => {
    setFilaSeleccionada(null);
    setFilaEnTransicion(null);
    setClosing(false);
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

  // Click en la fila -> animación + navegación al perfil
  const handleRowClick = useCallback(
    (player) => {
      if (!player?.nombre_minecraft || closing) return;

      setFilaSeleccionada(player.uuid);
      setFilaEnTransicion(player.uuid);
      setClosing(true);

      // Duración sincronizada con @keyframes filaExpandToPerfil / leaderboardClosing
      setTimeout(() => {
        navigate(`/perfil/${player.nombre_minecraft}`);
      }, 550);
    },
    [navigate, closing]
  );

  return (
    <section className="leaderboard-epic">
      <div className="leaderboard-shell">
        <div
          className={classNames("leaderboard-frame", {
            "leaderboard-frame--closing": closing,
          })}
        >
          {/* CABECERA */}
          <header className="epic-header">
            <h1>RANKING DE FLANCRAFT</h1>
            <p>Top jugadores por servidor.</p>
          </header>

          {/* SERVIDORES */}
          <section className="server-section">
            <div className="server-grid">
              {SERVIDORES.map((s) => {
                const activo = servidor === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    className={classNames(
                      "server-card",
                      `server-card--${s.id}`,
                      {
                        "server-card--active": activo,
                      }
                    )}
                    onClick={() => {
                      if (closing) return;
                      setServidor(s.id);
                      setOffset(0);
                    }}
                    aria-label={`Cambiar a ${s.nombre}`}
                  >
                    <div className="server-card-inner">
                      <div className="server-card-image-wrap">
                        <img
                          src={s.imagen}
                          alt={s.nombre}
                          className="server-card-image"
                        />
                      </div>
                      <span className="server-card-label">{s.nombre}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* TABLA */}
          <section className="tabla-section">
            <div className="tabla-titulo">
              {servidorSeleccionado && (
                <div className="tabla-titulo-main">
                  <span className="tabla-titulo-servidor">
                    {servidorSeleccionado.nombre}
                  </span>
                  <span className="tabla-titulo-stat">
                    {" · "}
                    {LABELS[orden]}
                    {orden === "tiempo_jugado" && " (h)"}
                    <span className="flecha-orden">
                      {ordenAscendente ? "▲" : "▼"}
                    </span>
                  </span>
                </div>
              )}

              <div className="tabla-separator">
                <span className="tabla-separator-line" />
                <span className="tabla-separator-dot" />
                <span className="tabla-separator-line" />
              </div>
            </div>

            <div className="table-container">
              <table className="tabla-epica">
                <thead>
                  <tr>
                    <th>Posición</th>
                    <th>Jugador</th>
                    <th className="col-nivel" title="Nivel de la web">
                      Nivel
                    </th>
                    {STATS.map((s) => (
                      <th
                        key={s}
                        className={classNames("ordenable", {
                          activo: orden === s,
                        })}
                        onClick={() => !closing && cambiarOrden(s)}
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
                        colSpan={3 + STATS.length}
                      >
                        Todavía no hay datos registrados para este servidor.
                        Conéctate y empieza a escribir tu nombre en el Hall de
                        la Fama.
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

                    const tieneRango = !!datosUsuario.rango;
                    const clasesNombre = classNames(
                      "nombre-colored",
                      datosUsuario.rango && `rango-${datosUsuario.rango}`,
                      {
                        "nombre-colored--con-rango": tieneRango,
                        "nombre-colored--premium-sin-rango":
                          !tieneRango && datosUsuario.premium,
                      }
                    );

                    return (
                      <tr
                        key={`${player.uuid}-${orden}-${offset}`}
                        className={classNames(
                          `fila fila-${posicion + 1} anim-row`,
                          { seleccionada: esSeleccionado },
                          {
                            "fila--transition":
                              filaEnTransicion === player.uuid,
                            "fila--fade-out":
                              closing &&
                              filaEnTransicion &&
                              filaEnTransicion !== player.uuid,
                          }
                        )}
                        onClick={() => handleRowClick(player)}
                        style={{ animationDelay: `${i * 120}ms` }}
                      >
                        <td data-label="Posición">
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
                                (e.currentTarget.src =
                                  "/assets/default-head.png")
                              }
                              alt={`Avatar de ${
                                player.nombre_minecraft || "Desconocido"
                              }`}
                              className="avatar-head"
                            />
                            <span className={clasesNombre}>
                              <span className="nombre-colored-label">
                                {player.nombre_minecraft || "Desconocido"}
                              </span>

                              {tieneRango && (
                                <img
                                  src={`/assets/rangos/${datosUsuario.rango}.webp`}
                                  alt={`Rango ${datosUsuario.rango}`}
                                  className="badge-rango"
                                />
                              )}

                              {datosUsuario.premium && (
                                <img
                                  src="/assets/premium.webp"
                                  alt="Premium"
                                  className="icono-premium"
                                />
                              )}
                            </span>
                          </div>
                        </td>

                        <td data-label="Nivel" className="col-nivel-td">
                          {datosUsuario.nivel != null
                            ? datosUsuario.nivel
                            : "—"}
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
                disabled={offset === 0 || closing}
                aria-label="Primera página"
              >
                «
              </button>
              <button
                onClick={() =>
                  cambiarPagina(Math.max(0, Math.floor(offset / limit) - 1))
                }
                disabled={offset === 0 || closing}
                aria-label="Anterior"
              >
                ‹
              </button>

              {[...Array(paginasTotales)].map((_, index) => (
                <button
                  key={index}
                  className={offset === index * limit ? "activo" : ""}
                  onClick={() => !closing && cambiarPagina(index)}
                >
                  {index + 1}
                </button>
              ))}

              <button
                onClick={() =>
                  cambiarPagina(Math.floor(offset / limit) + 1)
                }
                disabled={offset + limit >= paginasTotales * limit || closing}
                aria-label="Siguiente"
              >
                ›
              </button>
              <button
                onClick={() => cambiarPagina(paginasTotales - 1)}
                disabled={
                  offset + limit >= paginasTotales * limit || closing
                }
                aria-label="Última página"
              >
                »
              </button>
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
