import { NavLink, Link, useLocation } from "react-router-dom";
import LogoutButton from "../Auth/LogoutButton";
import { useEffect, useRef, useState } from "react";

/**
 * Icono tintado con currentColor usando mask.
 * - Esto hace que el icono tenga el mismo color que el texto del botón.
 * - Funciona muy bien con PNGs con transparencia o SVGs.
 */
const NavIcon = ({ src, alt, size = 22, className = "" }) => {
  const s = `${size}px`;
  return (
    <span
      className={`nav-icon ${className}`}
      aria-hidden="true"
      title={alt}
      style={{
        width: s,
        height: s,
        marginRight: "0.45rem",
        display: "inline-block",
        verticalAlign: "middle",
        flexShrink: 0,

        // Tintado = mismo color que el texto del botón
        backgroundColor: "currentColor",

        // Máscara (Chrome/Edge/Safari + Firefox moderno)
        WebkitMask: `url(${src}) center / contain no-repeat`,
        mask: `url(${src}) center / contain no-repeat`,

        // Un pelín de profundidad (se integra mejor con tu SVG)
        filter: "drop-shadow(0 1px 0 rgba(0,0,0,0.28))",
        opacity: 0.95,
      }}
    />
  );
};

const NavbarDesktop = ({
  isLoggedIn,
  isUserLoading,
  userData,
  activeDropdown,
  handleDropdownHover,
  handleDropdownLeave,
  profileOpen,
  setProfileOpen,
  onLoginClick,
  handleProfileEnter,
  handleProfileLeave,
}) => {
  const [rangoDatos, setRangoDatos] = useState(null);
  const [xpNavbar, setXpNavbar] = useState({
    level: null,
    actual: 0,
    requerida: 1,
  });

  const triggerRef = useRef();
  const dropdownRef = useRef();

  const location = useLocation();
  const isHome = location.pathname === "/";

  // Click fuera del dropdown del perfil
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target)
      ) {
        setProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [setProfileOpen]);

  // Obtener rango + datos de XP con la MISMA lógica que el Dashboard
  useEffect(() => {
    const fetchDatosNavbar = async () => {
      if (!isLoggedIn || !userData?.uuid) return;

      try {
        const [usuarioRes, xpRes] = await Promise.all([
          fetch(
            `https://flancraft-backend.onrender.com/api/usuarios/${userData.uuid}`
          ),
          fetch(
            `https://flancraft-backend.onrender.com/api/usuarios/${userData.uuid}/xp`
          ),
        ]);

        if (!usuarioRes.ok || !xpRes.ok) {
          throw new Error("Error al obtener datos de usuario/XP");
        }

        const usuario = await usuarioRes.json();
        const xpData = await xpRes.json();

        // Rango + premium
        setRangoDatos({
          rango: usuario.rango_usuario?.toLowerCase() || null,
          premium: usuario.es_premium === true,
        });

        // === LÓGICA DE XP IGUAL QUE EN EL DASHBOARD ===
        const nivelInfo = xpData?.niveles?.find((n) => n.nivel === usuario.nivel);
        const xpDelNivelActual = nivelInfo?.xp_requerida || 1;

        setXpNavbar({
          level: usuario.nivel,
          actual: usuario.xp_actual,
          requerida: xpDelNivelActual,
        });
      } catch (err) {
        console.error("Error al obtener datos para navbar:", err);
      }
    };

    fetchDatosNavbar();
  }, [isLoggedIn, userData?.uuid]);

  const getRangoColorClass = () => {
    if (!isLoggedIn || !userData?.uuid) return "";
    const raw = rangoDatos?.rango;
    if (!raw) return "rango-basico";
    return `rango-${raw}`;
  };

  // XP para la barra del dropdown
  const xpActualNavbar = xpNavbar.actual ?? 0;
  const xpRequeridaNavbar = xpNavbar.requerida || 1;
  const xpPercent =
    xpRequeridaNavbar > 0
      ? Math.min(100, (xpActualNavbar / xpRequeridaNavbar) * 100)
      : 0;

  const nivelNavbar =
    xpNavbar.level != null ? xpNavbar.level : userData?.userLevel ?? 1;

  return (
    <div className="navbar-content desktop-only">
      <div className="nav-left">
        <Link to="/" className="logo">
          <img
            src="/assets/logonav.webp"
            alt="Flancraft logo"
            className={`logo-img ${isHome ? "logo-activo" : ""}`}
          />
        </Link>
      </div>

      <div className="nav-center">
        <NavLink to="/">
          <NavIcon src="/botones/home.webp" alt="Inicio" />
          Inicio
        </NavLink>

        <NavLink to="/news">
          <NavIcon src="/botones/noticias.webp" alt="Noticias" />
          Noticias
        </NavLink>

        <NavLink to="/leaderboards">
          <NavIcon src="/botones/estadisticas.webp" alt="Estadísticas" />
          Estadísticas
        </NavLink>

        {/* Tienda con estilo especial */}
        <NavLink to="/tienda" className="nav-store">
          <NavIcon src="/botones/tienda.webp" alt="Tienda" />
          Tienda
        </NavLink>

        <NavLink to="/rangos">
          <NavIcon src="/botones/rangos.webp" alt="Rangos" />
          Rangos
        </NavLink>

        <NavLink to="/tribunal">
          <NavIcon src="/botones/tribunal.webp" alt="Tribunal" />
          Tribunal
        </NavLink>
      </div>

      <div className="nav-right">
        {!isLoggedIn ? (
          <button className="login-button" onClick={onLoginClick}>
            <i className="fas fa-sign-in-alt" /> Iniciar sesión
          </button>
        ) : isUserLoading ? (
          <div className="user-box user-loading">
            <span className="username-saludo">Cargando perfil...</span>
          </div>
        ) : (
          <div
            className="user-box"
            onMouseEnter={handleProfileEnter}
            onMouseLeave={handleProfileLeave}
          >
            <div className="user-trigger" ref={triggerRef}>
              <img
                src={`https://mc-heads.net/avatar/${userData.username}/32`}
                alt="avatar"
                className="user-avatar"
              />
              <span className="username-saludo">
                Hola,&nbsp;
                <span className={`nombre-colored ${getRangoColorClass()}`}>
                  {userData.username}
                </span>
              </span>
            </div>

            {profileOpen && (
              <div
                className="user-dropdown-wrapper enhanced open"
                ref={dropdownRef}
              >
                <div className="user-dropdown">
                  <div className="user-header">
                    <img
                      src={`https://mc-heads.net/avatar/${userData.username}/64`}
                      alt="avatar"
                      className="user-avatar-large"
                    />
                    <div className="user-core">
                      <p className="username-big">
                        <span className={`nombre-colored ${getRangoColorClass()}`}>
                          {userData.username}
                        </span>
                      </p>

                      <div className="user-level-row">
                        <span className="user-level-pill">NIVEL</span>
                        <span className="user-level-value">{nivelNavbar}</span>
                      </div>

                      {/* BLOQUE XP EN NAVBAR (MISMA LÓGICA QUE DASHBOARD) */}
                      <div className="xp-navbar-block">
                        <div className="xp-bar-profile">
                          <div
                            className="xp-fill"
                            style={{ width: `${xpPercent}%` }}
                          />
                        </div>
                        <div className="xp-text-row">
                          <span className="xp-actual">{xpActualNavbar}</span>
                          <span className="xp-sep">/</span>
                          <span className="xp-total">{xpRequeridaNavbar} XP</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="balance-wrapper">
                    <div className="balance-item">
                      <img
                        src="/assets/eco.webp"
                        alt="ECOS"
                        className="eco-icon-navbar"
                      />
                      <span>{userData.ecos} ECOS</span>
                    </div>
                  </div>

                  <NavLink to="/dashboard" className="dropdown-link">
                    <img
                      src="/botones/recompensas.webp"
                      alt="Recompensas"
                      style={{
                        width: "26px",
                        height: "26px",
                        marginRight: "0.6rem",
                        flexShrink: 0,
                      }}
                    />
                    <span>Mis Recompensas</span>
                  </NavLink>

                  <NavLink
                    to={`/perfil/${userData.username}`}
                    className="dropdown-link"
                  >
                    <img
                      src="/botones/estadisticas.webp"
                      alt="Ver estadísticas"
                      style={{
                        width: "26px",
                        height: "26px",
                        marginRight: "0.6rem",
                        flexShrink: 0,
                      }}
                    />
                    <span>Mis estadísticas</span>
                  </NavLink>

                  <div
                    className="dropdown-link"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      cursor: "pointer",
                    }}
                  >
                    <img
                      src="/botones/atras.webp"
                      alt="Cerrar sesión"
                      style={{
                        width: "26px",
                        height: "26px",
                        marginRight: "0.6rem",
                        flexShrink: 0,
                      }}
                    />
                    <LogoutButton />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default NavbarDesktop;
