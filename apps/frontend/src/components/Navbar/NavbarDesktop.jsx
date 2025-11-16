import { NavLink, Link, useNavigate, useLocation } from "react-router-dom";
import { FaBalanceScale } from "react-icons/fa";
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

  const navigate = useNavigate();
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
          const res = await fetch(`https://flancraft-backend.onrender.com/api/usuarios/${userData.uuid}`);
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

  // Scroll a la sección de mundos si estamos en home
  const handleMundosClick = () => {
    if (location.pathname === "/") {
      const target = document.getElementById("game-modes-section");
      if (target) {
        target.scrollIntoView({ behavior: "smooth" });
      }
    } else {
      navigate("/", { state: { scrollTo: "game-modes-section" } });
    }
  };

  const getRangoColorClass = () => {
    if (!isLoggedIn || !userData?.uuid) return "";
    const raw = rangoDatos?.rango;
    if (!raw) return "rango-basico";
    return `rango-${raw}`;
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
        <NavLink to="/"><i className="fas fa-home" /> Inicio</NavLink>
        <NavLink to="/news"><i className="fas fa-scroll" /> Noticias</NavLink>

        <div
          className={`dropdown ${activeDropdown === 'mundos' ? 'show-dropdown' : ''}`}
          onMouseEnter={() => handleDropdownHover('mundos')}
          onMouseLeave={handleDropdownLeave}
        >
          <span className="dropdown-toggle" onClick={handleMundosClick}>
            <i className="fas fa-map-marked-alt" /> Mundos 
          </span>
        </div>

        <NavLink to="/leaderboards"><i className="fas fa-chart-line" /> Estadísticas</NavLink>

<NavLink to="/tienda"><i className="fas fa-store" /> Mercado</NavLink>
<NavLink to="/rangos"><i className="fas fa-medal" /> Rangos</NavLink>

        <NavLink to="/tribunal"><FaBalanceScale /> Tribunal</NavLink>
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
              <div className="user-dropdown-wrapper enhanced open" ref={dropdownRef}>
                <div className="user-dropdown">
                  <div className="user-header">
                    <img
                      src={`https://mc-heads.net/avatar/${userData.username}/64`}
                      alt="avatar"
                      className="user-avatar-large"
                    />
                    <div>
                      <p className="username-big">
                        <span className={`nombre-colored ${getRangoColorClass()}`}>
                          {userData.username}
                        </span>
                        <span className="level-text">Nv. {userData.userLevel}</span>
                      </p>
                    </div>
                  </div>

                  <div className="xp-bar-profile">
                    <div
                      className="xp-fill"
                      style={{
                        width: `${(userData.userXP / userData.userXPMax) * 100}%`,
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

                  <NavLink to="/dashboard" className="dropdown-link">
                    <i className="fas fa-gift" /> Tu Posada
                  </NavLink>
                  <NavLink to={`/perfil/${userData.username}`} className="dropdown-link">
                    <i className="fas fa-chart-bar" /> Ver estadísticas
                  </NavLink>

                  <LogoutButton />
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
