import { NavLink, Link, useLocation } from "react-router-dom";
import LogoutButton from "../Auth/LogoutButton";
import { useEffect, useRef, useState } from "react";

const NavbarDesktop = ({
  isLoggedIn,
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
  const triggerRef = useRef();
  const dropdownRef = useRef();

  const location = useLocation();
  const isHome = location.pathname === "/"; // 🔥 Detectar si estamos en Home

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

  // Obtener datos de rango al loguearse
  useEffect(() => {
    const fetchRangoUsuario = async () => {
      if (isLoggedIn && userData?.uuid) {
        try {
          const res = await fetch(
            `https://flancraft-backend.onrender.com/api/usuarios/${userData.uuid}`
          );
          const data = await res.json();
          setRangoDatos({
            rango: data.rango_usuario?.toLowerCase() || null,
            premium: data.es_premium === true,
          });
        } catch (err) {
          console.error("Error al obtener datos de usuario:", err);
        }
      }
    };
    fetchRangoUsuario();
  }, [isLoggedIn, userData?.uuid]);

  const getRangoColorClass = () => {
    if (!isLoggedIn || !userData?.uuid) return "";
    const raw = rangoDatos?.rango;
    if (!raw) return "rango-basico";
    return `rango-${raw}`;
  };

  const navIconStyle = {
    width: "22px",
    height: "22px",
    marginRight: "0.45rem",
    display: "inline-block",
    verticalAlign: "middle",
  };

  return (
    <div className="navbar-content desktop-only">
      <div className="nav-left">
        <Link to="/" className="logo">
          <img
            src="/assets/logonav.png"
            alt="Flancraft logo"
            className={`logo-img ${isHome ? "logo-activo" : ""}`} // ✅ Activar clase en home
          />
        </Link>
      </div>

      <div className="nav-center">
        <NavLink to="/">
          <img src="/botones/home.webp" alt="Inicio" style={navIconStyle} />
          Inicio
        </NavLink>

        <NavLink to="/news">
          <img
            src="/botones/noticias.webp"
            alt="Noticias"
            style={navIconStyle}
          />
          Noticias
        </NavLink>

        <NavLink to="/leaderboards">
          <img
            src="/botones/estadisticas.webp"
            alt="Estadísticas"
            style={navIconStyle}
          />
          Estadísticas
        </NavLink>

        <NavLink to="/tienda">
          <img src="/botones/tienda.webp" alt="Mercado" style={navIconStyle} />
          Tienda
        </NavLink>

        <NavLink to="/rangos">
          <img src="/botones/rangos.webp" alt="Rangos" style={navIconStyle} />
          Rangos
        </NavLink>

        <NavLink to="/tribunal">
          <img
            src="/botones/tribunal.webp"
            alt="Tribunal"
            style={navIconStyle}
          />
          Tribunal
        </NavLink>
      </div>

      <div className="nav-right">
        {!isLoggedIn ? (
          <button className="login-button" onClick={onLoginClick}>
            <i className="fas fa-sign-in-alt" /> Iniciar sesión
          </button>
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
                    <div>
                      <p className="username-big">
                        <span
                          className={`nombre-colored ${getRangoColorClass()}`}
                        >
                          {userData.username}
                        </span>
                        <span className="level-text">
                          Lvl. {userData.userLevel}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="xp-bar-profile">
                    <div
                      className="xp-fill"
                      style={{
                        width: `${
                          (userData.userXP / userData.userXPMax) * 100
                        }%`,
                      }}
                    />
                  </div>

                  <div className="balance-wrapper">
                    <div className="balance-item">
                      <img
                        src="/assets/eco.png"
                        alt="ECOS"
                        className="eco-icon-navbar"
                      />
                      <span>{userData.ecos} ECOS</span>
                    </div>
                  </div>

                  {/* Recompensas */}
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

                  {/* Estadísticas */}
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

                  {/* Cerrar sesión */}
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
