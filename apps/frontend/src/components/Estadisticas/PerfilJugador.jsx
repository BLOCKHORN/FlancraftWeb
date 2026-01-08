// src/components/Estadisticas/PerfilJugador.jsx
import React, { useEffect, useMemo, useState, useId } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import "../../styles/components/Estadisticas/_perfiljugador.scss";

const SERVER_INFO = {
  global: { label: "Global", icon: "/assets/reinos/global.webp" },

  "survival-clasico": { label: "Survival Clásico", icon: "/assets/reinos/survival-clasico.webp" },
  survival_clasico: { label: "Survival Clásico", icon: "/assets/reinos/survival-clasico.webp" },
  survival: { label: "Survival Clásico", icon: "/assets/reinos/survival-clasico.webp" },

  "survival-anarquico": { label: "Survival Anárquico", icon: "/assets/reinos/survival-anarquico.webp" },
  survival_anarquico: { label: "Survival Anárquico", icon: "/assets/reinos/survival-anarquico.webp" },
  anarquico: { label: "Survival Anárquico", icon: "/assets/reinos/survival-anarquico.webp" },

  "survival-hardcore": { label: "Survival Hardcore", icon: "/assets/reinos/survival-hardcore.webp" },
  survival_hardcore: { label: "Survival Hardcore", icon: "/assets/reinos/survival-hardcore.webp" },
  hardcore: { label: "Survival Hardcore", icon: "/assets/reinos/survival-hardcore.webp" },

  oneblock: { label: "OneBlock", icon: "/assets/reinos/oneblock.webp" },
  chunklock: { label: "ChunkLock", icon: "/assets/reinos/chunklock.webp" },
  parkour: { label: "Parkour", icon: "/assets/reinos/parkour.webp" },
};

const SANCTIONS_PER_PAGE = 4;

/* =========================================================
   NIVEL: HONOR BADGE (LoL vibe, ids únicos con useId)
   ========================================================= */
function LevelHonorBadge({ level = 1 }) {
  const uid = useId().replace(/:/g, "");
  const G = (s) => `${uid}-${s}`;

  return (
    <div className="levelHonor" title={`Nivel ${level}`} aria-label={`Nivel ${level}`}>
      <svg className="levelHonor__svg" viewBox="0 0 260 90" role="img" aria-hidden="true">
        <defs>
          <linearGradient id={G("gold")} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fae6b7" />
            <stop offset="0.55" stopColor="#d8b066" />
            <stop offset="1" stopColor="#9a6d2f" />
          </linearGradient>

          <linearGradient id={G("goldInner")} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="rgba(255,255,255,0.22)" />
            <stop offset="0.45" stopColor="rgba(255,255,255,0.10)" />
            <stop offset="1" stopColor="rgba(0,0,0,0.10)" />
          </linearGradient>

          <linearGradient id={G("steel")} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#2c261f" />
            <stop offset="1" stopColor="#12100d" />
          </linearGradient>

          <linearGradient id={G("plate")} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="rgba(10,9,8,0.62)" />
            <stop offset="1" stopColor="rgba(10,9,8,0.30)" />
          </linearGradient>

          <linearGradient id={G("gem")} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#cfffff" />
            <stop offset="0.55" stopColor="#55c7ff" />
            <stop offset="1" stopColor="#1b5f96" />
          </linearGradient>

          <filter id={G("shadow")} x="-30%" y="-60%" width="160%" height="240%">
            <feDropShadow dx="0" dy="6" stdDeviation="4" floodColor="#000" floodOpacity="0.38" />
          </filter>

          <filter id={G("inner")} x="-20%" y="-20%" width="140%" height="140%">
            <feOffset dx="0" dy="1" />
            <feGaussianBlur stdDeviation="1.1" result="b" />
            <feComposite in="SourceGraphic" in2="b" operator="arithmetic" k2="1" k3="-0.65" />
          </filter>

          <filter id={G("gemGlow")} x="-40%" y="-40%" width="180%" height="180%">
            <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#63d9ff" floodOpacity="0.35" />
          </filter>
        </defs>

        {/* ALAS */}
        <g filter={`url(#${G("shadow")})`} opacity="0.98">
          {/* Izquierda */}
          <path
            d="M16 48 L62 22 L106 32 L92 48 L106 64 L62 74 Z"
            fill={`url(#${G("steel")})`}
            stroke="rgba(0,0,0,0.55)"
            strokeWidth="2"
          />
          <path d="M22 48 L63 28 L97 35 L85 48 L97 61 L63 70 Z" fill="rgba(255,255,255,0.06)" />
          <path d="M34 48 L70 36 L84 40 L76 48 L84 56 L70 60 Z" fill="rgba(0,0,0,0.18)" />

          {/* Derecha */}
          <path
            d="M244 48 L198 22 L154 32 L168 48 L154 64 L198 74 Z"
            fill={`url(#${G("steel")})`}
            stroke="rgba(0,0,0,0.55)"
            strokeWidth="2"
          />
          <path d="M238 48 L197 28 L163 35 L175 48 L163 61 L197 70 Z" fill="rgba(255,255,255,0.06)" />
          <path d="M226 48 L190 36 L176 40 L184 48 L176 56 L190 60 Z" fill="rgba(0,0,0,0.18)" />
        </g>

        {/* ESCUDO CENTRAL */}
        <g filter={`url(#${G("shadow")})`}>
          <path
            d="M112 14 H148 L180 46 L148 78 H112 L80 46 Z"
            fill={`url(#${G("gold")})`}
            stroke="rgba(30,20,12,0.85)"
            strokeWidth="2.2"
          />
          <path
            d="M116 18 H144 L172 46 L144 74 H116 L88 46 Z"
            fill={`url(#${G("goldInner")})`}
            filter={`url(#${G("inner")})`}
            opacity="0.95"
          />

          {/* Placa número */}
          <path
            d="M102 46
               C102 41 106 37 111 37
               H149
               C154 37 158 41 158 46
               C158 51 154 55 149 55
               H111
               C106 55 102 51 102 46 Z"
            fill={`url(#${G("plate")})`}
            stroke="rgba(0,0,0,0.35)"
            strokeWidth="1.6"
          />
          <path
            d="M108 40 H152"
            stroke="rgba(255,255,255,0.18)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />

          {/* Gema */}
<g filter={`url(#${G("gemGlow")})`}>
  <path
    d="M130 14 L142 26 L130 38 L118 26 Z"
    fill={`url(#${G("gem")})`}
    stroke="rgba(0,0,0,0.42)"
    strokeWidth="2"
  />
  <path d="M130 17 L138 26 L130 35 L122 26 Z" fill="rgba(255,255,255,0.12)" />
</g>


          {/* Remaches */}
          <circle cx="96" cy="46" r="2.2" fill="rgba(0,0,0,0.45)" />
          <circle cx="164" cy="46" r="2.2" fill="rgba(0,0,0,0.45)" />
          <circle cx="96" cy="46" r="1.1" fill="rgba(255,255,255,0.16)" />
          <circle cx="164" cy="46" r="1.1" fill="rgba(255,255,255,0.16)" />

          {/* TEXTO dentro del plate (2 capas: stroke + fill) */}
          <text
            x="130"
            y="46.2"
            textAnchor="middle"
            dominantBaseline="middle"
            className="levelHonor__textStroke"
          >
            {level}
          </text>
          <text
            x="130"
            y="46.2"
            textAnchor="middle"
            dominantBaseline="middle"
            className="levelHonor__textFill"
          >
            {level}
          </text>
        </g>
      </svg>
    </div>
  );
}


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
  const [sanPage, setSanPage] = useState(1);

  useEffect(() => {
    const fetchData = async () => {
      setCargando(true);
      setSinEstadisticas(false);

      try {
        const { data: userMeta, error: userError } = await supabase
          .from("usuarios")
          .select("uuid, uid, nivel, xp_actual, rango_usuario, es_premium")
          .eq("uid", nombre)
          .maybeSingle();

        let jugador = null;
        let statsData = [];
        let sancionesData = [];

        if (userError) console.error("Error al obtener usuario:", userError);

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

          if (statsError) console.error("Error al obtener estadísticas:", statsError);
          statsData = statsByUuid || [];

          if (jugador.uuid) {
            const { data: jailsData, error: jailsError } = await supabase
              .from("jails")
              .select("*")
              .eq("uuid", jugador.uuid);

            if (jailsError) console.error("Error al obtener sanciones:", jailsError);
            sancionesData = jailsData || [];
          }
        } else {
          const { data: statsByName, error: statsByNameError } = await supabase
            .from("estadisticas_agrupadas")
            .select("*")
            .eq("nombre_minecraft", nombre);

          if (statsByNameError) console.error("Error al obtener estadísticas por nombre:", statsByNameError);

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

          if (jugador.uuid) {
            const { data: metaFromUuid, error: metaUuidError } = await supabase
              .from("usuarios")
              .select("uid, nivel, xp_actual, rango_usuario, es_premium")
              .eq("uuid", jugador.uuid)
              .maybeSingle();

            if (metaUuidError) console.error("Error al obtener meta por uuid:", metaUuidError);

            if (metaFromUuid) {
              jugador = {
                ...jugador,
                nivel: metaFromUuid.nivel,
                xp_actual: metaFromUuid.xp_actual,
                rango_usuario: metaFromUuid.rango_usuario,
                es_premium: metaFromUuid.es_premium,
                nombre_minecraft: metaFromUuid.uid || jugador.nombre_minecraft,
              };
            }

            const { data: jailsData, error: jailsError } = await supabase
              .from("jails")
              .select("*")
              .eq("uuid", jugador.uuid);

            if (jailsError) console.error("Error al obtener sanciones:", jailsError);
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

  useEffect(() => {
    const fetchXpData = async () => {
      if (!usuario?.uuid) return;

      try {
        const res = await fetch(`https://flancraft-backend.onrender.com/api/usuarios/${usuario.uuid}/xp`);
        if (!res.ok) throw new Error("Error al obtener XP");
        const data = await res.json();
        setXpData(data);
      } catch (err) {
        console.error("Error al cargar xpData:", err);
      }
    };

    fetchXpData();
  }, [usuario?.uuid]);

  useEffect(() => {
    setSanPage(1);
  }, [nombre, sanciones.length]);

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

  const statIcons = {
    bloques_minados: "/assets/statsperfil/mining.webp",
    bloques_colocados: "/assets/statsperfil/build.webp",
    mobs_matados: "/assets/statsperfil/mobs.webp",
    kills_pvp: "/assets/statsperfil/pvp.webp",
    muertes: "/assets/statsperfil/deaths.webp",
    tiempo_jugado: "/assets/statsperfil/playtime.webp",
  };

  const servidoresDisponibles = useMemo(() => [...new Set(estadisticas.map((e) => e.servidor))], [estadisticas]);

  const statsActuales = useMemo(
    () => estadisticas.find((e) => e.servidor === servidorActivo),
    [estadisticas, servidorActivo]
  );

  const totalTiempoTicks = useMemo(() => estadisticas.reduce((acc, e) => acc + (e.tiempo_jugado || 0), 0), [estadisticas]);
  const totalBloquesMinados = useMemo(() => estadisticas.reduce((acc, e) => acc + (e.bloques_minados || 0), 0), [estadisticas]);
  const totalMobsMatados = useMemo(() => estadisticas.reduce((acc, e) => acc + (e.mobs_matados || 0), 0), [estadisticas]);
  const totalKillsPvp = useMemo(() => estadisticas.reduce((acc, e) => acc + (e.kills_pvp || 0), 0), [estadisticas]);

  const antiguedadTexto = useMemo(() => {
    const fechasPosibles = estadisticas
      .map((e) => e.fecha_primera_vez || e.primera_vez || e.fecha || e.created_at)
      .filter(Boolean);

    if (fechasPosibles.length === 0) return "—";

    const fechasDate = fechasPosibles.map((f) => new Date(f)).filter((d) => !isNaN(d));
    if (fechasDate.length === 0) return "—";

    const masAntigua = fechasDate.reduce((min, d) => (d < min ? d : min), fechasDate[0]);
    return masAntigua.toLocaleDateString("es-ES");
  }, [estadisticas]);

  const xpActual = usuario?.xp_actual || 0;
  const nivelActual = usuario?.nivel || 1;
  const nivelInfo = xpData?.niveles?.find((n) => n.nivel === nivelActual);
  const xpDelNivelActual = nivelInfo?.xp_requerida || 1;
  const xpPercent = Math.min(100, xpDelNivelActual > 0 ? (xpActual / xpDelNivelActual) * 100 : 0);

  const featuredStats = useMemo(
    () => [
      { label: "Tiempo jugado total", value: formatearTiempo(totalTiempoTicks) },
      { label: "Antigüedad", value: antiguedadTexto },
      { label: "Bloques minados", value: totalBloquesMinados.toLocaleString("es-ES") },
      { label: "Mobs matados", value: totalMobsMatados.toLocaleString("es-ES") },
      { label: "Kills PvP", value: totalKillsPvp.toLocaleString("es-ES") },
    ],
    [totalTiempoTicks, antiguedadTexto, totalBloquesMinados, totalMobsMatados, totalKillsPvp]
  );

  const getServerInfo = (servidor) => {
    if (!servidor) return null;
    const key = servidor.toLowerCase();
    return SERVER_INFO[key] || SERVER_INFO[key.replace("_", "-")] || { label: servidor, icon: null };
  };

  const normalizarRango = (r) => {
    const s = (r || "").toLowerCase().trim();
    if (s.includes("nova")) return "nova";
    if (s.includes("alpha")) return "alpha";
    if (s.includes("inmortal")) return "inmortal";
    return "unrank";
  };

  const rangoKey = normalizarRango(usuario?.rango_usuario);

  const nombreClaseRango =
    rangoKey === "nova" ? "nombre-nova" : rangoKey === "alpha" ? "nombre-alpha" : rangoKey === "inmortal" ? "nombre-inmortal" : "";

  const avatarBgByRango = {
    unrank: "/assets/profileunrank.webp",
    nova: "/assets/profilenova.webp",
    alpha: "/assets/profilealpha.webp",
    inmortal: "/assets/profileinmortal.webp",
  };
  const avatarBgUrl = avatarBgByRango[rangoKey] || avatarBgByRango.unrank;

  const sancionesOrdenadas = useMemo(() => {
    const copy = [...(sanciones || [])];
    copy.sort((a, b) => {
      const da = a?.fecha ? new Date(a.fecha).getTime() : 0;
      const db = b?.fecha ? new Date(b.fecha).getTime() : 0;
      return db - da;
    });
    return copy;
  }, [sanciones]);

  const sanTotalPages = useMemo(() => {
    const pages = Math.ceil(sancionesOrdenadas.length / SANCTIONS_PER_PAGE);
    return Math.max(1, pages);
  }, [sancionesOrdenadas.length]);

  const sanPageSafe = Math.min(Math.max(1, sanPage), sanTotalPages);

  const sancionesPagina = useMemo(() => {
    const start = (sanPageSafe - 1) * SANCTIONS_PER_PAGE;
    return sancionesOrdenadas.slice(start, start + SANCTIONS_PER_PAGE);
  }, [sancionesOrdenadas, sanPageSafe]);

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
            <img src="/assets/interrogante.webp" alt="Jugador no encontrado" className="perfiljugador-skin" />
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

  return (
    <div className="perfiljugador-page">
      <div className="perfiljugador-bg-scene" />
      <div className="perfiljugador-shell">
        <div className="perfiljugador-maincard">
          {/* AVATAR */}
          <div className="perfiljugador-avatar-wrapper">
            <div className="perfiljugador-avatar-frame">
              <div className="perfiljugador-avatar-bg" style={{ backgroundImage: `url(${avatarBgUrl})` }} />

              <img
                src={`https://mc-heads.net/body/${usuario.nombre_minecraft}/180`}
                alt={`Skin de ${usuario.nombre_minecraft}`}
                className="perfiljugador-avatar-img"
                onError={(e) => {
                  e.currentTarget.src = "/assets/default-head.png";
                }}
              />

              {/* NIVEL: HONOR SVG */}
              <LevelHonorBadge level={nivelActual} />
            </div>
          </div>

          <div className="perfiljugador-maincard-inner">
            <header className="perfiljugador-header">
              <div className="perfiljugador-headergrid">
                <div className="perfiljugador-headleft">
                  {rangoKey !== "unrank" && (
                    <span className="perfiljugador-rankicon-wrap" title={usuario.rango_usuario || "Rango"}>
                      <img
                        src={`/assets/rangos/${rangoKey}.webp`}
                        alt={usuario.rango_usuario || "Rango"}
                        className="perfiljugador-rankicon"
                      />
                    </span>
                  )}

                  <div className="perfiljugador-nameblock">
                    <div className="perfiljugador-nameline">
                      <h1 className={`perfiljugador-name ${nombreClaseRango}`.trim()}>{usuario.nombre_minecraft}</h1>
                      <span className="perfiljugador-star" aria-hidden="true">
                        ★
                      </span>
                    </div>
                  </div>
                </div>

                <div className="perfiljugador-headright">
                  <button className="perfiljugador-topbtn" onClick={() => navigate(-1)}>
                    Inicio
                  </button>
                </div>
              </div>

              <div className="perfiljugador-xprow">
                <div className="perfiljugador-xpbar" aria-label="Barra de experiencia">
                  <div className="perfiljugador-xpfill" style={{ width: `${xpPercent}%` }} />
                  <div className="perfiljugador-xpshine" aria-hidden="true" />
                </div>
                <span className="perfiljugador-xptext">
                  {xpActual} / {xpDelNivelActual} XP
                </span>
              </div>
            </header>

            <section className="perfiljugador-featured">
              <div className="perfiljugador-featured-wrapper">
                <div className="featured-header">
                  <span className="featured-kicker">Resumen</span>
                  <span className="featured-title">Estadísticas destacadas</span>
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

            <section className="perfiljugador-columns">
              <div className="perfiljugador-col perfiljugador-col--activity">
                <div className="panel-header">
                  <h2>Estadísticas por servidor</h2>
                </div>

                {!sinEstadisticas && servidoresDisponibles.length > 0 && (
                  <div className="server-selector">
                    {servidoresDisponibles.map((s) => {
                      const info = getServerInfo(s);
                      if (!info) return null;
                      const isActive = servidorActivo === s;

                      return (
                        <button
                          key={s}
                          type="button"
                          className={`server-tab ${isActive ? "server-tab--active" : ""}`}
                          onClick={() => setServidorActivo(s)}
                        >
                          {info.icon && (
                            <span className="server-tab-icon">
                              <img src={info.icon} alt={info.label} />
                            </span>
                          )}
                          <span className="server-tab-label">{info.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {sinEstadisticas ? (
                  <div className="panel-empty">
                    <p>Este jugador está vinculado, pero todavía no tiene estadísticas registradas.</p>
                  </div>
                ) : statsActuales ? (
                  <div className="stats-grid">
                    {Object.entries(etiquetas).map(([clave, label]) => (
                      <article key={clave} className={`stat-card stat-card--${clave}`}>
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
                              : (statsActuales[clave] || 0).toLocaleString("es-ES")}
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

              <div className="perfiljugador-col perfiljugador-col--sanctions">
                <div className="panel-header panel-header--san">
                  <h2>Sanciones</h2>
                  <span className="panel-subcount">{sancionesOrdenadas.length} registro(s)</span>

                  <div className="panel-header-icon panel-header-icon--sanciones">
                    <img src="/assets/statsperfil/sanciones.webp" alt="Sanciones" />
                  </div>
                </div>

                {sancionesOrdenadas.length === 0 ? (
                  <p className="panel-empty panel-empty--text">Este jugador no tiene sanciones registradas.</p>
                ) : (
                  <>
                    <ul className="sanciones-list">
                      {sancionesPagina.map((s, i) => (
                        <li key={`${s?.id || "san"}-${i}`} className="sancion-item">
                          <div className="sancion-line">
                            <span className="sancion-label">Razón</span>
                            <span className="sancion-value">{s.razon || "No especificada"}</span>
                          </div>
                          <div className="sancion-line">
                            <span className="sancion-label">Fecha</span>
                            <span className="sancion-value">
                              {s.fecha ? new Date(s.fecha).toLocaleDateString("es-ES") : "—"}
                            </span>
                          </div>
                          <div className="sancion-line">
                            <span className="sancion-label">Staff</span>
                            <span className="sancion-value">{s.staff || "Desconocido"}</span>
                          </div>
                        </li>
                      ))}
                    </ul>

                    {sanTotalPages > 1 && (
                      <div className="san-pager">
                        <button
                          className="san-btn"
                          onClick={() => setSanPage((p) => Math.max(1, p - 1))}
                          disabled={sanPageSafe === 1}
                        >
                          Anterior
                        </button>

                        <div className="san-pages">
                          {Array.from({ length: sanTotalPages }).slice(0, 7).map((_, idx) => {
                            const p = idx + 1;
                            const active = p === sanPageSafe;
                            return (
                              <button
                                key={p}
                                className={`san-page ${active ? "san-page--active" : ""}`}
                                onClick={() => setSanPage(p)}
                              >
                                {p}
                              </button>
                            );
                          })}
                          {sanTotalPages > 7 && <span className="san-ellipsis">…</span>}
                        </div>

                        <button
                          className="san-btn"
                          onClick={() => setSanPage((p) => Math.min(sanTotalPages, p + 1))}
                          disabled={sanPageSafe === sanTotalPages}
                        >
                          Siguiente
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </section>

            <div className="perfiljugador-actions">
              <button className="btn-volver" onClick={() => navigate(-1)}>
                Volver
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
