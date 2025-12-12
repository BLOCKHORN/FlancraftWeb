import { NavLink, Link, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import LogoutButton from "../Auth/LogoutButton";
import LoginModal from "../Auth/LoginModal";

const NavbarMobile = ({
  menuOpen,
  setMenuOpen,
  profileOpen,
  setProfileOpen,
  isLoggedIn,
  isUserLoading,
  userData,
}) => {
  const wrapperRef = useRef();
  const profileButtonRef = useRef();
  const location = useLocation();
  const isHome = location.pathname === "/";
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [rangoDatos, setRangoDatos] = useState(null);

  // XP específica para navbar mobile
  const [xpNavbar, setXpNavbar] = useState({
    level: null,
    actual: 0,
    requerida: 1,
  });

  const navIconStyle = {
    width: "22px",
    height: "22px",
    marginRight: "0.55rem",
    display: "inline-block",
    verticalAlign: "middle",
    flexShrink: 0,
  };

  // Cerrar dropdown al tocar fuera (mobile)
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

  // Rango + XP usando la MISMA lógica que Dashboard / NavbarDesktop
  useEffect(() => {
    const fetchDatosUsuarioMobile = async () => {
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
          throw new Error("Error al obtener datos de usuario/XP (mobile)");
        }

        const usuario = await usuarioRes.json();
        const xpData = await xpRes.json();

        setRangoDatos({
          rango: usuario.rango_usuario?.toLowerCase() || null,
          premium: usuario.es_premium === true,
        });

        const nivelInfo = xpData?.niveles?.find(
          (n) => n.nivel === usuario.nivel
        );
        const xpDelNivelActual = nivelInfo?.xp_requerida || 1;

        setXpNavbar({
          level: usuario.nivel,
          actual: usuario.xp_actual,
          requerida: xpDelNivelActual,
        });
      } catch (err) {
        console.error("[NAVBAR MOBILE] Error al obtener datos:", err);
      }
    };

    fetchDatosUsuarioMobile();
  }, [isLoggedIn, userData?.uuid]);

  const getRangoColorClass = () => {
    if (!isLoggedIn || !userData?.uuid) return "";
    const raw = rangoDatos?.rango;
    if (!raw) return "rango-basico";
    return `rango-${raw}`;
  };

  // Cerrar dropdown al hacer click fuera (fallback)
  useEffect(() => {
    const closeOnClick = (event) => {
      const dropdown = document.querySelector(".user-dropdown-wrapper.mobile-only");
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

  // Cálculos de XP para la barra mobile
  const xpActualNavbar = xpNavbar.actual ?? 0;
  const xpRequeridaNavbar = xpNavbar.requerida || 1;
  const xpPercent =
    xpRequeridaNavbar > 0
      ? Math.min(100, (xpActualNavbar / xpRequeridaNavbar) * 100)
      : 0;

  const nivelNavbar =
    xpNavbar.level != null ? xpNavbar.level : userData?.userLevel ?? 1;

  return (
    <>
      {/* BARRA SUPERIOR MOBILE */}
      <div className="navbar-inner mobile-only">
        <div className="left-wrapper">
          <button className="burger" onClick={() => setMenuOpen(!menuOpen)}>
            <span />
            <span />
            <span />
          </button>

          <Link to="/" className="logo-inline">
            <img
              src="/assets/logonav.webp"
              alt="Flancraft logo"
              className={`logo-img ${isHome ? "logo-activo" : ""}`}
            />
          </Link>
        </div>

        {!isLoggedIn ? (
          <button
            className="profile-button full"
            onClick={() => setLoginModalOpen(true)}
          >
            <i className="fas fa-sign-in-alt" />
            <span className="profile-greeting">Iniciar sesión</span>
          </button>
        ) : isUserLoading ? (
          <div className="profile-button full loading">
            <span className="profile-greeting">Cargando perfil...</span>
          </div>
        ) : (
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
                Hola,{" "}
                <span className={`nombre-colored ${getRangoColorClass()}`}>
                  {userData.username}
                </span>
              </span>
              <i
                className={`fas ${
                  profileOpen ? "fa-chevron-up" : "fa-chevron-down"
                }`}
              />
            </button>
          </div>
        )}
      </div>

      {/* DROPDOWN PERFIL MOBILE */}
      {isLoggedIn && !isUserLoading && (
        <div
          ref={wrapperRef}
          className={`user-dropdown-wrapper mobile-only ${
            profileOpen ? "open" : ""
          }`}
        >
          <div className="user-dropdown" onClick={(e) => e.stopPropagation()}>
            <div className="user-header centered">
              <img
                src={`https://mc-heads.net/avatar/${userData.username}/64`}
                alt="avatar"
                className="user-avatar-large"
              />
              <p className="username-big">
                <span className={`nombre-colored ${getRangoColorClass()}`}>
                  {userData.username}
                </span>
              </p>

              <div className="user-level-row">
                <span className="user-level-pill">NIVEL</span>
                <span className="user-level-value">{nivelNavbar}</span>
              </div>
            </div>

            {/* BLOQUE XP MOBILE: misma barra azul que desktop */}
            <div className="xp-navbar-block">
              <div className="xp-bar-profile">
                <div
                  className="xp-fill"
                  style={{
                    width: `${xpPercent}%`,
                  }}
                />
              </div>
              <div className="xp-text-row">
                <span className="xp-actual">{xpActualNavbar}</span>
                <span className="xp-sep">/</span>
                <span className="xp-total">{xpRequeridaNavbar} XP</span>
              </div>
            </div>

            <div className="balance-wrapper">
              <div className="balance-item">
                <span>{userData.ecos} ECOS</span>
                <img
                  src="/assets/eco.webp"
                  alt="ECOS"
                  className="eco-icon-navbar"
                />
              </div>
            </div>

            <NavLink
              to="/dashboard"
              className="dropdown-link"
              onClick={() => setProfileOpen(false)}
            >
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
              onClick={() => setProfileOpen(false)}
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
              <LogoutButton onClick={() => setProfileOpen(false)} />
            </div>
          </div>
        </div>
      )}

      {/* OVERLAY para cerrar menú lateral */}
      <div
        className="mobile-menu-overlay"
        onClick={() => setMenuOpen(false)}
      ></div>

      {/* MENÚ LATERAL MOBILE */}
      <div className={`mobile-menu ${menuOpen ? "open" : ""}`}>
        <div className="mobile-logo-header">
          <i
            className="fas fa-times close-menu-button"
            onClick={() => setMenuOpen(false)}
          />
          <img
            src="/assets/blockhorn.webp"
            alt="Blockhorn"
            className="blockhorn-logo"
          />
          <div className="logo-divider"></div>
          <div className="logo-glow-wrapper">
            <img
              src="/assets/flancraftlogo.webp"
              alt="Flancraft"
              className="flancraft-logo"
            />
          </div>
        </div>

        <div className="mobile-links">
          <NavLink to="/" onClick={() => setMenuOpen(false)}>
            <img src="/botones/home.webp" alt="Inicio" style={navIconStyle} />
            Inicio
          </NavLink>

          <NavLink to="/news" onClick={() => setMenuOpen(false)}>
            <img
              src="/botones/noticias.webp"
              alt="Noticias"
              style={navIconStyle}
            />
            Noticias
          </NavLink>

          <NavLink to="/leaderboards" onClick={() => setMenuOpen(false)}>
            <img
              src="/botones/estadisticas.webp"
              alt="Estadísticas"
              style={navIconStyle}
            />
            Estadísticas
          </NavLink>

          <NavLink to="/tienda" onClick={() => setMenuOpen(false)}>
            <img
              src="/botones/tienda.webp"
              alt="Mercado"
              style={navIconStyle}
            />
            Tienda
          </NavLink>

          <NavLink to="/rangos" onClick={() => setMenuOpen(false)}>
            <img
              src="/botones/rangos.webp"
              alt="Rangos"
              style={navIconStyle}
            />
            Rangos
          </NavLink>

          <NavLink to="/tribunal" onClick={() => setMenuOpen(false)}>
            <img
              src="/botones/tribunal.webp"
              alt="Tribunal"
              style={navIconStyle}
            />
            Tribunal
          </NavLink>

          <div className="logo-divider"></div>
          <div className="mobile-social-links">
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              <i className="fab fa-instagram" />
            </a>
            <a
              href="https://tiktok.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              <i className="fab fa-tiktok" />
            </a>
            <a
              href="https://youtube.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              <i className="fab fa-youtube" />
            </a>
            <a
              href="https://discord.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              <i className="fab fa-discord" />
            </a>
            <a
              href="https://telegram.org"
              target="_blank"
              rel="noopener noreferrer"
            >
              <i className="fab fa-telegram" />
            </a>
            <a
              href="https://x.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              <i className="fab fa-x-twitter" />
            </a>
          </div>
          <div className="logo-divider"></div>
        </div>
      </div>

      {loginModalOpen && (
        <LoginModal onClose={() => setLoginModalOpen(false)} />
      )}
    </>
  );
};

export default NavbarMobile;
