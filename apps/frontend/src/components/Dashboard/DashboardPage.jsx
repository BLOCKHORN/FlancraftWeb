import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import RewardList from "./RewardList";
import LogroList from "./LogroList";
import "../../styles/components/Dashboard/_dashboardpage.scss";

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [xpData, setXpData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const ecosRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const stored = localStorage.getItem("flan_user");
    if (!stored) return navigate("/");

    const parsed = JSON.parse(stored);
    if (!parsed.uuid || !parsed.loggedIn) return navigate("/");

    const cargarDatos = async () => {
      try {
        const [usuarioRes, monedasRes, xpRes, usuariosRes] = await Promise.all([
          fetch(
            `https://flancraft-backend.onrender.com/api/usuarios/${parsed.uuid}`
          ),
          fetch(
            `https://flancraft-backend.onrender.com/api/monedas/${parsed.uuid}`
          ),
          fetch(
            `https://flancraft-backend.onrender.com/api/usuarios/${parsed.uuid}/xp`
          ),
          fetch(`https://flancraft-backend.onrender.com/api/usuarios`),
        ]);

        if (!usuarioRes.ok || !monedasRes.ok || !xpRes.ok || !usuariosRes.ok) {
          throw new Error("Error al cargar datos");
        }

        const usuario = await usuarioRes.json();
        const monedas = await monedasRes.json();
        const xp = await xpRes.json();
        const usuarios = await usuariosRes.json();

        const actual = usuarios.find((u) => u.uuid === parsed.uuid);
        const rango_usuario = actual?.rango_usuario || null;
        const es_premium = actual?.es_premium || false;

        setUser({ ...usuario, monedas, rango_usuario, es_premium });
        setXpData(xp);
      } catch (err) {
        setError(err.message || "Error");
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, [navigate]);

  const actualizarMonedas = async () => {
    if (!user) return;
    try {
      const res = await fetch(
        `https://flancraft-backend.onrender.com/api/monedas/${user.uuid}`
      );
      if (!res.ok) throw new Error("Error al actualizar monedas");
      const monedasActualizadas = await res.json();
      setUser((prev) => ({ ...prev, monedas: monedasActualizadas }));
    } catch (err) {
      console.error("[MONEDAS]", err.message);
    }
  };

  const avatarUrl = user
    ? `https://minotar.net/armor/body/${user.uid}/160.png`
    : null;

  const nivelInfo = xpData?.niveles.find((n) => n.nivel === user?.nivel);
  const xpDelNivelActual = nivelInfo?.xp_requerida || 1;
  const porcentajeNivel = user
    ? Math.min(100, (user.xp_actual / xpDelNivelActual) * 100)
    : 0;

  return (
    <section className="dashboard-epic">
      {/* HERO POSADA CON ILUSTRACIÓN */}
      <div className="hero-posada">
        <div className="hero-posada-bg" />
        <div className="hero-posada-content">
          <header className="epic-header-dashboard">
            <div className="epic-header-text">
              <h1 className="epic-title">Tu Posada</h1>
              <p className="epic-subtitle">
                Explora tu progreso, logros y riquezas acumuladas en el mundo de
                FlanCraft.
              </p>
            </div>

            {user && (
              <div className="dashboard-player-card">
                {/* BLOQUE PRINCIPAL: AVATAR + INFO */}
                <div className="player-main-layout">
                  {/* AVATAR + FONDO PROFILE + RANGO */}
                  <div className="player-avatar-column">
                    <div className="avatar-frame">
                      <div className="avatar-inner">
                        <img
                          src="/assets/profile.png"
                          alt="Fondo del perfil"
                          className="avatar-bg"
                        />
                        {avatarUrl && (
                          <img
                            src={avatarUrl}
                            alt={`Skin de ${user.uid}`}
                            className="skin-jugador"
                          />
                        )}
                      </div>

                      {user.rango_usuario && (
                        <img
                          src={`/assets/etiquetas/${user.rango_usuario.toLowerCase()}.webp`}
                          alt={user.rango_usuario}
                          className="avatar-rango-badge"
                        />
                      )}
                    </div>
                  </div>

                  {/* INFO JUGADOR */}
                  <div className="player-info-column">
                    <div className="player-identidad">
                      <div className="player-nombre-row">
                        <h2 className="player-nombre">{user.uid}</h2>

                        <div className="player-badges">
                          {user.rol_admin && (
                            <span
                              className={`badge-staff badge-${user.rol_admin.toLowerCase()}`}
                            >
                              {user.rol_admin.toUpperCase()}
                            </span>
                          )}

                          {user.es_premium && (
                            <img
                              src="/assets/premium.png"
                              alt="Cuenta premium"
                              className="badge-premium"
                            />
                          )}
                        </div>
                      </div>

                      <p className="player-tagline">
                        Aventura en curso. Tu leyenda en FlanCraft sigue
                        escribiéndose.
                      </p>
                    </div>

                    <div className="player-stats-row">
                      <div className="stat-block saldo-block">
                        <p className="stat-label">Saldo de FlanCraft</p>
                        <div className="stat-saldo">
                          <div className="saldo-info">
                            <span
                              className="saldo-cantidad"
                              ref={ecosRef}
                              id="contador-ecos"
                            >
                              {user.monedas?.ecos || 0}
                            </span>
                            <img
                              src="/assets/eco.png"
                              alt="Gema ECOS"
                              className="icono-eco pulse"
                            />
                          </div>
                          <a href="/rangos" className="btn-primario">
                            Comprar rangos
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* BARRA DE NIVEL GLOBAL */}
                <div className="nivel-global-wrapper">
                  <div className="nivel-global-header">
                    <span className="nivel-global-label">Nivel</span>
                    <span className="nivel-global-valor">{user.nivel}</span>
                  </div>

                  <div className="nivel-global-bar">
                    <div
                      className="nivel-global-fill"
                      style={{ width: `${porcentajeNivel}%` }}
                    />
                  </div>

                  <div className="nivel-global-text">
                    <span className="nivel-global-actual">
                      {user.xp_actual}
                    </span>
                    <span className="nivel-global-separador">/</span>
                    <span className="nivel-global-total">
                      {xpDelNivelActual} XP
                    </span>
                  </div>
                </div>

                {/* PANEL DEL CONTROL INTEGRADO */}
                {user.rol_admin && (
                  <>
                    <div className="player-card-separator" />
                    <div className="player-admin-panel">
                      <h3 className="panel-title">Panel del Control</h3>
                      <p className="panel-desc">
                        Accesos rápidos a las salas de gestión del reino.
                      </p>

                      <div className="player-admin-actions">
                        <button
                          className="admin-btn"
                          onClick={() => navigate("/tribunal/admin")}
                        >
                          Tribunal
                        </button>

                        {user.rol_admin.toLowerCase() === "owner" && (
                          <>
                            <button
                              className="admin-btn"
                              onClick={() => navigate("/admin")}
                            >
                              Gestión de staff
                            </button>
                            <button
                              className="admin-btn"
                              onClick={() => navigate("/admin/noticias")}
                            >
                              Panel de noticias
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </header>
        </div>
      </div>

      {/* CAPA DE CARGA / ERROR */}
      {loading && (
        <div className="loading-overlay">
          <div className="loading-orbital">
            <div className="loading-ring" />
            <div className="loading-gem-wrapper">
              <img
                src="/assets/eco.png"
                alt="Cargando perfil"
                className="loading-gem"
              />
            </div>
            <div className="loading-orbit loading-orbit-1" />
            <div className="loading-orbit loading-orbit-2" />
          </div>

          <div className="loading-text-block">
            <p className="loading-title">Invocando tu posada...</p>
            <p className="loading-subtitle">
              Cargando perfil de aventurero
            </p>
          </div>
        </div>
      )}

      {!loading && error && (
        <div className="dashboard-epic-body">
          <p className="error-msg">Error al cargar perfil: {error}</p>
        </div>
      )}

      {/* CONTENIDO PRINCIPAL */}
      {!loading && !error && user && (
        <div className="dashboard-epic-body fade-slide-in">
          <div className="separador-magico" />

          <div className="dashboard-secciones">
            <RewardList
              user={user}
              xpData={xpData}
              ecosRef={ecosRef}
              onActualizarMonedas={actualizarMonedas}
            />

            <LogroList user={user} />
          </div>
        </div>
      )}
    </section>
  );
}
