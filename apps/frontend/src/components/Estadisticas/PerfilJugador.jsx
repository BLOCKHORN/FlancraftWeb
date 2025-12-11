import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import "../../styles/components/Estadisticas/_perfiljugador.scss";

const SERVER_INFO = {
  global: {
    label: "Global",
    icon: "/assets/reinos/global.webp",
  },
  "survival-clasico": {
    label: "Survival Clásico",
    icon: "/assets/reinos/survival-clasico.webp",
  },
  survival_clasico: {
    label: "Survival Clásico",
    icon: "/assets/reinos/survival-clasico.webp",
  },
  survival: {
    label: "Survival Clásico",
    icon: "/assets/reinos/survival-clasico.webp",
  },
  "survival-anarquico": {
    label: "Survival Anárquico",
    icon: "/assets/reinos/survival-anarquico.webp",
  },
  survival_anarquico: {
    label: "Survival Anárquico",
    icon: "/assets/reinos/survival-anarquico.webp",
  },
  anarquico: {
    label: "Survival Anárquico",
    icon: "/assets/reinos/survival-anarquico.webp",
  },
  "survival-hardcore": {
    label: "Survival Hardcore",
    icon: "/assets/reinos/survival-hardcore.webp",
  },
  survival_hardcore: {
    label: "Survival Hardcore",
    icon: "/assets/reinos/survival-hardcore.webp",
  },
  hardcore: {
    label: "Survival Hardcore",
    icon: "/assets/reinos/survival-hardcore.webp",
  },
  oneblock: {
    label: "OneBlock",
    icon: "/assets/reinos/oneblock.webp",
  },
  chunklock: {
    label: "ChunkLock",
    icon: "/assets/reinos/chunklock.webp",
  },
  parkour: {
    label: "Parkour",
    icon: "/assets/reinos/parkour.webp",
  },
};

export default function PerfilJugador() {
  const { nombre } = useParams();
  const navigate = useNavigate();

  const [usuario, setUsuario] = useState(null);
  const [estadisticas, setEstadisticas] = useState([]);
  const [sanciones, setSanciones] = useState([]);
  const [servidorActivo, setServidorActivo] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [sinEstadisticas, setSinEstadisticas] = useState(false);

  const [xpData, setXpData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setCargando(true);
      setSinEstadisticas(false);

      try {
        // Buscar en `usuarios` por uid (nick)
        const { data: userMeta, error: userError } = await supabase
          .from("usuarios")
          .select("uuid, uid, nivel, xp_actual, rango_usuario, es_premium")
          .eq("uid", nombre)
          .maybeSingle();

        let jugador = null;
        let statsData = [];
        let sancionesData = [];

        if (userError) {
          console.error("Error al obtener usuario:", userError);
        }

        if (userMeta) {
          jugador = {
            uuid: userMeta.uuid,
            nombre_minecraft: userMeta.uid || nombre,
            nivel: userMeta.nivel,
            xp_actual: userMeta.xp_actual,
            rango_usuario: userMeta.rango_usuario,
            es_premium: userMeta.es_premium,
          };

          const { data: statsByUuid, error: statsError } = await supabase
            .from("estadisticas_agrupadas")
            .select("*")
            .eq("uuid", jugador.uuid);

          if (statsError) {
            console.error("Error al obtener estadísticas:", statsError);
          }

          statsData = statsByUuid || [];

          if (jugador.uuid) {
            const { data: jailsData, error: jailsError } = await supabase
              .from("jails")
              .select("*")
              .eq("uuid", jugador.uuid);

            if (jailsError) {
              console.error("Error al obtener sanciones:", jailsError);
            }

            sancionesData = jailsData || [];
          }
        } else {
          // Fallback: buscar en estadísticas por nombre
          const { data: statsByName, error: statsByNameError } =
            await supabase
              .from("estadisticas_agrupadas")
              .select("*")
              .eq("nombre_minecraft", nombre);

          if (statsByNameError) {
            console.error(
              "Error al obtener estadísticas por nombre:",
              statsByNameError
            );
          }

          if (!statsByName || statsByName.length === 0) {
            setUsuario(null);
            setEstadisticas([]);
            setSanciones([]);
            setServidorActivo(null);
            setSinEstadisticas(false);
            setCargando(false);
            return;
          }

          statsData = statsByName;

          jugador = {
            nombre_minecraft: statsByName[0].nombre_minecraft || nombre,
            uuid: statsByName[0].uuid,
          };

          // Completar con meta de `usuarios` si existe por uuid
          if (jugador.uuid) {
            const { data: metaFromUuid, error: metaUuidError } = await supabase
              .from("usuarios")
              .select("uid, nivel, xp_actual, rango_usuario, es_premium")
              .eq("uuid", jugador.uuid)
              .maybeSingle();

            if (metaUuidError) {
              console.error("Error al obtener meta por uuid:", metaUuidError);
            }

            if (metaFromUuid) {
              jugador = {
                ...jugador,
                nivel: metaFromUuid.nivel,
                xp_actual: metaFromUuid.xp_actual,
                rango_usuario: metaFromUuid.rango_usuario,
                es_premium: metaFromUuid.es_premium,
                nombre_minecraft:
                  metaFromUuid.uid || jugador.nombre_minecraft,
              };
            }

            const { data: jailsData, error: jailsError } = await supabase
              .from("jails")
              .select("*")
              .eq("uuid", jugador.uuid);

            if (jailsError) {
              console.error("Error al obtener sanciones:", jailsError);
            }

            sancionesData = jailsData || [];
          }
        }

        setUsuario(jugador);
        setEstadisticas(statsData);
        setSanciones(sancionesData);
        setServidorActivo(statsData[0]?.servidor || null);
        setSinEstadisticas(statsData.length === 0);
      } catch (e) {
        console.error("Error en fetchData PerfilJugador:", e);
        setUsuario(null);
        setEstadisticas([]);
        setSanciones([]);
        setServidorActivo(null);
        setSinEstadisticas(false);
      } finally {
        setCargando(false);
      }
    };

    fetchData();
  }, [nombre]);

  // XP para la barra
  useEffect(() => {
    const fetchXpData = async () => {
      if (!usuario?.uuid) return;

      try {
        const res = await fetch(
          `https://flancraft-backend.onrender.com/api/usuarios/${usuario.uuid}/xp`
        );
        if (!res.ok) throw new Error("Error al obtener XP");
        const data = await res.json();
        setXpData(data);
      } catch (err) {
        console.error("Error al cargar xpData:", err);
      }
    };

    fetchXpData();
  }, [usuario?.uuid]);

  const formatearTiempo = (ticks) => {
    const totalSegundos = Math.floor((ticks || 0) / 20);
    const horas = Math.floor(totalSegundos / 3600);
    const minutos = Math.floor((totalSegundos % 3600) / 60);
    return `${horas}h ${minutos}m`;
  };

  const etiquetas = {
    bloques_minados: "Bloques minados",
    bloques_colocados: "Bloques colocados",
    mobs_matados: "Mobs matados",
    kills_pvp: "Kills PvP",
    muertes: "Muertes",
    tiempo_jugado: "Tiempo jugado",
  };

  // Iconos para cada estadística
  const statIcons = {
    bloques_minados: "/assets/statsperfil/mining.webp",
    bloques_colocados: "/assets/statsperfil/build.webp",
    mobs_matados: "/assets/statsperfil/mobs.webp",
    kills_pvp: "/assets/statsperfil/pvp.webp",
    muertes: "/assets/statsperfil/deaths.webp",
    tiempo_jugado: "/assets/statsperfil/playtime.webp",
  };

  if (cargando) {
    return (
      <div className="perfiljugador-loading">
        <div className="loading-inner">
          <span className="loading-gema" />
          <p>Cargando perfil...</p>
        </div>
      </div>
    );
  }

  if (!usuario) {
    return (
      <div className="perfiljugador-page perfiljugador-page--empty">
        <div className="perfiljugador-shell">
          <div className="perfiljugador-card perfiljugador-card--error">
            <img
              src="/assets/interrogante.webp"
              alt="Jugador no encontrado"
              className="perfiljugador-skin"
            />
            <h2>Jugador no encontrado</h2>
            <p>No hay registros en FlanCraft para "{nombre}".</p>
            <button className="btn-volver" onClick={() => navigate(-1)}>
              Volver atrás
            </button>
          </div>
        </div>
      </div>
    );
  }

  const servidoresDisponibles = [
    ...new Set(estadisticas.map((e) => e.servidor)),
  ];
  const statsActuales = estadisticas.find((e) => e.servidor === servidorActivo);

  const totalTiempoTicks = estadisticas.reduce(
    (acc, e) => acc + (e.tiempo_jugado || 0),
    0
  );
  const totalBloquesMinados = estadisticas.reduce(
    (acc, e) => acc + (e.bloques_minados || 0),
    0
  );
  const totalMobsMatados = estadisticas.reduce(
    (acc, e) => acc + (e.mobs_matados || 0),
    0
  );
  const totalKillsPvp = estadisticas.reduce(
    (acc, e) => acc + (e.kills_pvp || 0),
    0
  );

  const fechasPosibles = estadisticas
    .map(
      (e) => e.fecha_primera_vez || e.primera_vez || e.fecha || e.created_at
    )
    .filter(Boolean);

  let antiguedadTexto = "—";
  if (fechasPosibles.length > 0) {
    const fechasDate = fechasPosibles
      .map((f) => new Date(f))
      .filter((d) => !isNaN(d));
    if (fechasDate.length > 0) {
      const masAntigua = fechasDate.reduce(
        (min, d) => (d < min ? d : min),
        fechasDate[0]
      );
      antiguedadTexto = masAntigua.toLocaleDateString("es-ES");
    }
  }

  const xpActual = usuario.xp_actual || 0;
  const nivelActual = usuario.nivel || 1;
  const nivelInfo = xpData?.niveles?.find((n) => n.nivel === nivelActual);
  const xpDelNivelActual = nivelInfo?.xp_requerida || 1;
  const xpPercent = Math.min(
    100,
    xpDelNivelActual > 0 ? (xpActual / xpDelNivelActual) * 100 : 0
  );

  const featuredStats = [
    {
      label: "Tiempo jugado total",
      value: formatearTiempo(totalTiempoTicks),
    },
    {
      label: "Antigüedad",
      value: antiguedadTexto,
    },
    {
      label: "Bloques minados",
      value: totalBloquesMinados.toLocaleString("es-ES"),
    },
    {
      label: "Mobs matados",
      value: totalMobsMatados.toLocaleString("es-ES"),
    },
    {
      label: "Kills PvP",
      value: totalKillsPvp.toLocaleString("es-ES"),
    },
  ];

  const getServerInfo = (servidor) => {
    if (!servidor) return null;
    const key = servidor.toLowerCase();
    return (
      SERVER_INFO[key] ||
      SERVER_INFO[key.replace("_", "-")] || {
        label: servidor,
        icon: null,
      }
    );
  };

  const rangoLower = (usuario.rango_usuario || "").toLowerCase();
  const nombreClaseRango =
    rangoLower === "nova"
      ? "nombre-nova"
      : rangoLower === "alpha"
      ? "nombre-alpha"
      : rangoLower === "inmortal"
      ? "nombre-inmortal"
      : "";

  return (
    <div className="perfiljugador-page">
      <div className="perfiljugador-bg-scene" />
      <div className="perfiljugador-shell">
        <div className="perfiljugador-maincard">
          {/* AVATAR */}
          <div className="perfiljugador-avatar-wrapper">
            <div className="perfiljugador-avatar-frame">
              <div className="perfiljugador-avatar-bg" />
              <img
                src={`https://mc-heads.net/body/${usuario.nombre_minecraft}/180`}
                alt={`Skin de ${usuario.nombre_minecraft}`}
                className="perfiljugador-avatar-img"
                onError={(e) => {
                  e.currentTarget.src = "/assets/default-head.png";
                }}
              />
            </div>
          </div>

          {/* INTERIOR PERGAMINO */}
          <div className="perfiljugador-maincard-inner">
            <div className="perfiljugador-topwrap">
              <header className="perfiljugador-header">
                <div className="perfiljugador-name-block">
                  <div className="perfiljugador-name-row">
                    {rangoLower && (
                      <div className="perfiljugador-rankicon-wrap">
                        <img
                          src={`/assets/rangos/${rangoLower}.webp`}
                          alt={usuario.rango_usuario}
                          className="perfiljugador-rankicon"
                        />
                      </div>
                    )}

                    <h1
                      className={`perfiljugador-name ${nombreClaseRango}`.trim()}
                    >
                      {usuario.nombre_minecraft}
                    </h1>

                    {usuario.es_premium && (
                      <span className="perfiljugador-premium">
                        <img
                          src="/assets/premium.webp"
                          alt="Cuenta premium"
                          className="perfiljugador-premium-img"
                        />
                      </span>
                    )}
                  </div>

                  <div className="perfiljugador-level-row">
                    <span className="perfiljugador-level-label">
                      Nivel {nivelActual}
                    </span>
                    <div className="perfiljugador-xpbar">
                      <div
                        className="perfiljugador-xpfill"
                        style={{ width: `${xpPercent}%` }}
                      />
                    </div>
                    <span className="perfiljugador-xptext">
                      {xpActual} / {xpDelNivelActual} XP
                    </span>
                  </div>
                </div>
              </header>
            </div>

            {/* STATS PRINCIPALES */}
            <section className="perfiljugador-featured">
              <div className="perfiljugador-featured-wrapper">
                <div
                  className="featured-header"
                  style={{ textAlign: "center" }}
                >
                  <span className="featured-title">
                    Estadísticas destacadas
                  </span>
                </div>
                <div className="featured-grid">
                  {featuredStats.map((stat, idx) => (
                    <div key={idx} className="featured-card">
                      <span className="featured-value">{stat.value}</span>
                      <span className="featured-label">{stat.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <hr className="perfiljugador-divider" />

            {/* COLUMNAS: ACTIVIDAD & SANCIONES */}
            <section className="perfiljugador-columns">
              {/* ACTIVIDAD POR SERVIDOR */}
              <div className="perfiljugador-col perfiljugador-col--activity">
                <div
                  className="panel-header"
                  style={{ justifyContent: "center", textAlign: "center" }}
                >
                  <h2>Estadísticas por servidor</h2>
                </div>

                {!sinEstadisticas && servidoresDisponibles.length > 0 && (
                  <div
                    className="server-selector"
                    style={{
                      justifyContent: "center",
                      marginBottom: "0.6rem",
                    }}
                  >
                    {servidoresDisponibles.map((s) => {
                      const info = getServerInfo(s);
                      if (!info) return null;
                      const isActive = servidorActivo === s;

                      return (
                        <button
                          key={s}
                          type="button"
                          className={`server-pill ${
                            isActive ? "server-pill--active" : ""
                          }`}
                          onClick={() => setServidorActivo(s)}
                        >
                          {info.icon && (
                            <span className="server-pill-icon-wrap">
                              <img
                                src={info.icon}
                                alt={info.label}
                                className="server-pill-icon"
                              />
                            </span>
                          )}
                          <span className="server-pill-label">
                            {info.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {sinEstadisticas ? (
                  <div className="panel-empty">
                    <p>
                      Este jugador está vinculado a FlanCraft, pero todavía no
                      tiene estadísticas registradas.
                    </p>
                  </div>
                ) : statsActuales ? (
                  <div className="stats-grid">
                    {Object.entries(etiquetas).map(([clave, label]) => (
                      <article
                        key={clave}
                        className={`stat-card stat-card--${clave}`}
                      >
                        {statIcons[clave] && (
                          <div className="stat-icon-inline">
                            <img src={statIcons[clave]} alt={label} />
                          </div>
                        )}

                        <div className="stat-text">
                          <span className="stat-label">{label}</span>
                          <span className="stat-value">
                            {clave === "tiempo_jugado"
                              ? formatearTiempo(statsActuales[clave])
                              : (statsActuales[clave] || 0).toLocaleString(
                                  "es-ES"
                                )}
                          </span>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="panel-empty">
                    <p>Sin estadísticas registradas en este servidor.</p>
                  </div>
                )}
              </div>

              {/* SANCIONES */}
              <div className="perfiljugador-col perfiljugador-col--sanctions">
                <div
                  className="panel-header"
                  style={{
                    justifyContent: "center",
                    textAlign: "center",
                    gap: "0.5rem",
                  }}
                >
                  <h2>Sanciones</h2>
                  <div className="panel-header-icon panel-header-icon--sanciones">
                    <img
                      src="/assets/statsperfil/sanciones.webp"
                      alt="Sanciones"
                    />
                  </div>
                </div>

                {sanciones.length === 0 ? (
                  <p className="panel-empty panel-empty--text">
                    Este jugador no tiene sanciones registradas.
                  </p>
                ) : (
                  <ul className="sanciones-list">
                    {sanciones.map((s, i) => (
                      <li key={i} className="sancion-item">
                        <div className="sancion-line">
                          <span className="sancion-label">Razón</span>
                          <span className="sancion-value">
                            {s.razon || "No especificada"}
                          </span>
                        </div>
                        <div className="sancion-line">
                          <span className="sancion-label">Fecha</span>
                          <span className="sancion-value">
                            {s.fecha
                              ? new Date(s.fecha).toLocaleDateString()
                              : "—"}
                          </span>
                        </div>
                        <div className="sancion-line">
                          <span className="sancion-label">Staff</span>
                          <span className="sancion-value">
                            {s.staff || "Desconocido"}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>

            <div className="perfiljugador-actions">
              <button className="btn-volver" onClick={() => navigate(-1)}>
                Inicio
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
