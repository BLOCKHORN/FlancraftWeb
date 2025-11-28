import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import "../../styles/components/Estadisticas/_perfiljugador.scss";

// mismas rutas
import borde2 from "/assets/borde2.webp";
import topborder from "/assets/topborder.webp";
import madera from "/assets/madera.jpeg";

export default function PerfilJugador() {
  const { nombre } = useParams();
  const navigate = useNavigate();

  const [usuario, setUsuario] = useState(null);
  const [estadisticas, setEstadisticas] = useState([]);
  const [sanciones, setSanciones] = useState([]);
  const [servidorActivo, setServidorActivo] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [sinEstadisticas, setSinEstadisticas] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setCargando(true);
      setSinEstadisticas(false);

      try {
        // 1) Intentar encontrar al jugador en "usuarios" por nombre
        const { data: userMeta, error: userError } = await supabase
          .from("usuarios")
          .select("uuid, nombre_minecraft, nivel, xp_actual, rango_usuario, es_premium")
          .eq("nombre_minecraft", nombre)
          .maybeSingle();

        let jugador = null;
        let statsData = [];
        let sancionesData = [];

        if (userError) {
          console.error("Error al obtener usuario:", userError);
        }

        if (userMeta) {
          // Jugador existe en usuarios -> base del perfil
          jugador = {
            uuid: userMeta.uuid,
            nombre_minecraft: userMeta.nombre_minecraft || nombre,
            nivel: userMeta.nivel,
            xp_actual: userMeta.xp_actual,
            rango_usuario: userMeta.rango_usuario,
            es_premium: userMeta.es_premium,
          };

          // Stats por uuid (puede que no tenga aún)
          const { data: statsByUuid, error: statsError } = await supabase
            .from("estadisticas_agrupadas")
            .select("*")
            .eq("uuid", jugador.uuid);

          if (statsError) {
            console.error("Error al obtener estadísticas:", statsError);
          }

          statsData = statsByUuid || [];

          // Sanciones por uuid
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
          // 2) Fallback antiguo: no está en usuarios, pero podría haber stats
          const { data: statsByName, error: statsByNameError } = await supabase
            .from("estadisticas_agrupadas")
            .select("*")
            .eq("nombre_minecraft", nombre);

          if (statsByNameError) {
            console.error("Error al obtener estadísticas por nombre:", statsByNameError);
          }

          if (!statsByName || statsByName.length === 0) {
            // No está ni en usuarios ni en estadísticas -> jugador realmente no encontrado
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

          // Metadatos desde usuarios por uuid
          const { data: metaFromUuid, error: metaUuidError } = await supabase
            .from("usuarios")
            .select("nivel, xp_actual, rango_usuario, es_premium")
            .eq("uuid", jugador.uuid)
            .maybeSingle();

          if (metaUuidError) {
            console.error("Error al obtener meta por uuid:", metaUuidError);
          }

          if (metaFromUuid) {
            jugador = { ...jugador, ...metaFromUuid };
          }

          // Sanciones por uuid
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
    // Caso realmente no existe en la BBDD
    return (
      <div className="perfiljugador-wrapper no-encontrado">
        <div className="perfiljugador-card error">
          <img
            src="/assets/default-head.png"
            alt="No encontrado"
            className="perfiljugador-skin"
          />
          <h2>Jugador no encontrado</h2>
          <p>No hay registros en FlanCraft para "{nombre}".</p>
          <button className="btn" onClick={() => navigate(-1)}>
            Volver atrás
          </button>
        </div>
      </div>
    );
  }

  const servidoresDisponibles = [
    ...new Set(estadisticas.map((e) => e.servidor)),
  ];
  const statsActuales = estadisticas.find((e) => e.servidor === servidorActivo);

  const xpActual = usuario.xp_actual || 0;
  const xpTope = 100;
  const xpPercent = Math.min((xpActual / xpTope) * 100, 100);

  return (
    <div className="perfiljugador-page">
      {/* HERO SUPERIOR */}
      <header className="perfiljugador-hero">
        <div className="hero-bg" />
        <div className="hero-inner">
          <div className="perfiljugador-headcard">
            <img
              src={`https://mc-heads.net/body/${usuario.nombre_minecraft}/right`}
              alt={`Skin de ${usuario.nombre_minecraft}`}
              className="perfiljugador-skin"
              onError={(e) => {
                e.currentTarget.src = "/assets/default-head.png";
              }}
            />
            <div className="perfiljugador-info">
              <h1
                className={`nombre-jugador ${
                  usuario.rango_usuario
                    ? `rango-${usuario.rango_usuario.toLowerCase()}`
                    : ""
                }`}
              >
                {usuario.nombre_minecraft}
                {usuario.es_premium && (
                  <img
                    src="/assets/premium.webp"
                    alt="Premium"
                    className="icono-premium"
                  />
                )}
              </h1>
              <p className="nivel">Nivel {usuario.nivel || 1}</p>
              <div className="xp-bar">
                <div className="xp-fill" style={{ width: `${xpPercent}%` }} />
              </div>
              <p className="xp-text">{xpActual} XP</p>
            </div>
          </div>
        </div>

        {/* Tira de madera */}
        <div
          className="hero-wood"
          style={{ backgroundImage: `url(${madera})` }}
        />
      </header>

      {/* CUERPO */}
      <main className="perfiljugador-body">
        {/* deco del pergamino debajo de la madera */}
        <div className="paper-decor">
          <img src={topborder} alt="" className="paper-top" />
          <img src={borde2} alt="" className="paper-fold" />
        </div>

        <div className="perfiljugador-body-inner">
          {/* ESTADÍSTICAS */}
          {sinEstadisticas ? (
            <section className="estadisticas-panel estadisticas-vacias">
              <h2 className="panel-title">Actividad aún por registrar</h2>
              <p className="mensaje-vacio-global">
                Este jugador está vinculado a FlanCraft,
                pero todavía no tiene estadísticas registradas en los servidores.
                En cuanto juegue, sus logros y progreso aparecerán aquí.
              </p>
            </section>
          ) : (
            <>
              {/* selector de servidor */}
              <div className="selector-servidor">
                {servidoresDisponibles.map((s) => (
                  <button
                    key={s}
                    className={`selector-btn ${
                      servidorActivo === s ? "active" : ""
                    }`}
                    onClick={() => setServidorActivo(s)}
                    type="button"
                  >
                    {s}
                  </button>
                ))}
              </div>

              {/* panel con estadísticas del servidor activo */}
              <section className="estadisticas-panel">
                {statsActuales ? (
                  <>
                    <h2 className="panel-title">{statsActuales.servidor}</h2>
                    <div className="stats-grid">
                      {Object.entries(etiquetas).map(([clave, label]) => (
                        <article key={clave} className="stat-card">
                          <span className="label">{label}</span>
                          <span className="valor">
                            {clave === "tiempo_jugado"
                              ? formatearTiempo(statsActuales[clave])
                              : (statsActuales[clave] || 0).toLocaleString(
                                  "es-ES"
                                )}
                          </span>
                        </article>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="mensaje-vacio">
                    Sin estadísticas registradas en este servidor.
                  </p>
                )}
              </section>
            </>
          )}

          {/* SANCIONES */}
          <section className="sanciones-panel">
            <h2>Sanciones</h2>
            {sanciones.length === 0 ? (
              <p className="sin-sanciones">
                Este jugador es un ejemplo a seguir. No tiene ninguna sanción.
              </p>
            ) : (
              <ul className="sanciones-lista">
                {sanciones.map((s, i) => (
                  <li key={i} className="sancion-item">
                    <p>
                      <strong>Razón:</strong> {s.razon || "No especificada"}
                    </p>
                    <p>
                      <strong>Fecha:</strong>{" "}
                      {s.fecha
                        ? new Date(s.fecha).toLocaleDateString()
                        : "—"}
                    </p>
                    <p>
                      <strong>Staff:</strong> {s.staff || "Desconocido"}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="volver-btn">
            <button className="btn" onClick={() => navigate(-1)}>
              Volver atrás
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
