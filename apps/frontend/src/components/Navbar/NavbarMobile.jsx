import { NavLink, Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import LogoutButton from "../Auth/LogoutButton";
import LoginModal from "../Auth/LoginModal";

const NavbarMobile = ({
  menuOpen,
  setMenuOpen,
  profileOpen,
  setProfileOpen,
  isLoggedIn,
  userData,
}) => {
  const wrapperRef = useRef();
  const profileButtonRef = useRef();
  const location = useLocation();
  const isHome = location.pathname === "/";
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [rangoDatos, setRangoDatos] = useState(null);
  const navigate = useNavigate();


  useEffect(() => {
    const handleTapOutside = (event) => {
      if (
        profileOpen &&
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target) &&
        profileButtonRef.current &&
        !profileButtonRef.current.contains(event.target)
      ) {
        setProfileOpen(false);
      }
    };

    document.addEventListener("pointerdown", handleTapOutside);
    return () => {
      document.removeEventListener("pointerdown", handleTapOutside);
    };
  }, [profileOpen, setProfileOpen]);

  useEffect(() => {
    const fetchRangoUsuario = async () => {
      if (isLoggedIn && userData?.uuid) {
        try {
          const res = await fetch(`https://flancraftweb-backend.onrender.com/api/usuarios/${userData.uuid}`);
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

useEffect(() => {
  const closeOnClick = (event) => {
    const dropdown = document.querySelector(".user-dropdown-wrapper");
    const profileBtn = profileButtonRef.current;

    if (
      dropdown &&
      !dropdown.contains(event.target) &&
      profileBtn &&
      !profileBtn.contains(event.target)
    ) {
      setProfileOpen(false);
    }
  };

  document.addEventListener("click", closeOnClick);
  return () => document.removeEventListener("click", closeOnClick);
}, [setProfileOpen]);

  return (
  <>
    <div className="navbar-inner mobile-only">
      <div className="left-wrapper">
        <button className="burger" onClick={() => setMenuOpen(!menuOpen)}>
          <span />
          <span />
          <span />
        </button>

        <Link to="/" className="logo-inline">
          <img
            src="/assets/logonav.png"
            alt="Flancraft logo"
            className={`logo-img ${isHome ? "logo-activo" : ""}`}
          />
        </Link>
      </div>

      {isLoggedIn ? (
        <div className="profile-button-wrapper">
          <button
            className="profile-button full"
            ref={profileButtonRef}
            onClick={() => setProfileOpen((prev) => !prev)}
          >
            <img
              src={`https://mc-heads.net/avatar/${userData.username}/32`}
              alt="avatar"
              className="user-avatar"
            />
            <span className="profile-greeting">
              Hola, <span className={`nombre-colored ${getRangoColorClass()}`}>{userData.username}</span>
            </span>
            <i className={`fas ${profileOpen ? "fa-chevron-up" : "fa-chevron-down"}`} />
          </button>
        </div>
      ) : (
        <button className="profile-button full" onClick={() => setLoginModalOpen(true)}>
          <i className="fas fa-sign-in-alt" />
          <span className="profile-greeting">Iniciar sesión</span>
        </button>
      )}
    </div>

    {isLoggedIn && (
      <div
        ref={wrapperRef}
        className={`user-dropdown-wrapper mobile-only ${profileOpen ? "open" : ""}`}
      >
        <div className="user-dropdown" onClick={(e) => e.stopPropagation()}>
          <div className="user-header centered">
            <img
              src={`https://mc-heads.net/avatar/${userData.username}/64`}
              alt="avatar"
              className="user-avatar-large"
            />
            <p className="username-big">
              <span className={`nombre-colored ${getRangoColorClass()}`}>{userData.username}</span>
              <span className="level-text">Nv. {userData.userLevel}</span>
            </p>
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
              <span> ECOS: {userData.ecos}</span>
              <img src="/assets/eco.png" alt="ECOS" className="eco-icon-navbar" />
            </div>
          </div>

          <NavLink to="/dashboard" className="dropdown-link" onClick={() => setProfileOpen(false)}>
            <i className="fas fa-gift" /> Recompensas
          </NavLink>
          <NavLink to={`/perfil/${userData.username}`} className="dropdown-link" onClick={() => setProfileOpen(false)}>
            <i className="fas fa-chart-bar" /> Ver estadísticas
          </NavLink>

          <LogoutButton onClick={() => setProfileOpen(false)} />
        </div>
      </div>
    )}

    <div className="mobile-menu-overlay" onClick={() => setMenuOpen(false)}></div>

    <div className={`mobile-menu ${menuOpen ? "open" : ""}`}>
      <div className="mobile-logo-header">
        <i className="fas fa-times close-menu-button" onClick={() => setMenuOpen(false)} />
        <img src="/assets/blockhorn.png" alt="Blockhorn" className="blockhorn-logo" />
        <div className="logo-divider"></div>
        <div className="logo-glow-wrapper">
          <img src="/assets/flancraftlogo.png" alt="Flancraft" className="flancraft-logo" />
        </div>
      </div>

      <div className="mobile-links">
        <NavLink to="/" onClick={() => setMenuOpen(false)}><i className="fas fa-home" /> Inicio</NavLink>
        <NavLink to="/news" onClick={() => setMenuOpen(false)}><i className="fas fa-scroll" /> Noticias</NavLink>

        <div className="mobile-link" onClick={() => {
  setMenuOpen(false);
  if (location.pathname === "/") {
    const target = document.getElementById("game-modes-section");
    if (target) {
      target.scrollIntoView({ behavior: "smooth" });
    }
  } else {
    navigate("/", { state: { scrollTo: "game-modes-section" } });
  }
}}>
  <i className="fas fa-map-marked-alt" /> Mundos
</div>

        <NavLink to="/leaderboards" onClick={() => setMenuOpen(false)}><i className="fas fa-chart-line" /> Estadísticas</NavLink>

       <NavLink to="/tienda" onClick={() => setMenuOpen(false)}>
  <i className="fas fa-store" /> Mercado
</NavLink>

        <NavLink to="/tribunal" onClick={() => setMenuOpen(false)}><i className="fas fa-gavel" /> Tribunal</NavLink>

        <div className="logo-divider"></div>
        <div className="mobile-social-links">
          <a href="https://instagram.com" target="_blank" rel="noopener noreferrer"><i className="fab fa-instagram" /></a>
          <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer"><i className="fab fa-tiktok" /></a>
          <a href="https://youtube.com" target="_blank" rel="noopener noreferrer"><i className="fab fa-youtube" /></a>
          <a href="https://discord.com" target="_blank" rel="noopener noreferrer"><i className="fab fa-discord" /></a>
          <a href="https://telegram.org" target="_blank" rel="noopener noreferrer"><i className="fab fa-telegram" /></a>
          <a href="https://x.com" target="_blank" rel="noopener noreferrer"><i className="fab fa-x-twitter" /></a>
        </div>
        <div className="logo-divider"></div>
      </div>
    </div>

{loginModalOpen && <LoginModal onClose={() => setLoginModalOpen(false)} />}
</>
);
};

export default NavbarMobile;
