import { NavLink, Link, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import LogoutButton from "../Auth/LogoutButton";
import LoginModal from "../Auth/LoginModal";

const API_BASE =
  import.meta.env.VITE_BACKEND_URL || "https://flancraft-backend.onrender.com";

const NavIcon = ({ src, alt, className = "" }) => {
  return (
    <img
      className={`nav-icon-img ${className}`}
      src={src}
      alt={alt}
      draggable="false"
    />
  );
};

const navClsMobile = (base) => (navData) => {
  const isActive = !!(navData?.isActive ?? navData?.match);
  return `mobile-nav-item ${base}${isActive ? " active" : ""}`;
};

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
  const [xpNavbar, setXpNavbar] = useState({ level: null, actual: 0, requerida: 1 });

  const [hasClaimables, setHasClaimables] = useState(false);
  const [claimablesCount, setClaimablesCount] = useState(0);

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
    return () => document.removeEventListener("pointerdown", handleTapOutside);
  }, [profileOpen, setProfileOpen]);

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

  useEffect(() => {
    const fetchDatosUsuarioMobile = async () => {
      if (!isLoggedIn || !userData?.uuid) return;

      try {
        const [usuarioRes, xpRes] = await Promise.all([
          fetch(`${API_BASE}/api/usuarios/${userData.uuid}`),
          fetch(`${API_BASE}/api/usuarios/${userData.uuid}/xp`),
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

        const nivelInfo = xpData?.niveles?.find((n) => n.nivel === usuario.nivel);
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

  useEffect(() => {
    if (!isLoggedIn || !userData?.uuid) {
      setHasClaimables(false);
      setClaimablesCount(0);
      return;
    }

    let cancelled = false;

    const fetchClaimables = async () => {
      try {
        const params = new URLSearchParams();
        params.append("tipo_mision", "permanente");

        const res = await fetch(`${API_BASE}/api/logros/${userData.uuid}?${params.toString()}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        const lista = Array.isArray(data) ? data : [];

        const pendientes = lista.filter(
          (l) => l && l.completado === true && l.reclamado !== true
        );

        if (!cancelled) {
          setClaimablesCount(pendientes.length);
          setHasClaimables(pendientes.length > 0);
        }
      } catch (err) {
        if (!cancelled) {
          setHasClaimables(false);
          setClaimablesCount(0);
        }
        console.error("[NAVBAR MOBILE] Error claimables:", err);
      }
    };

    fetchClaimables();
    const intervalId = setInterval(fetchClaimables, 60_000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [isLoggedIn, userData?.uuid]);

  const getRangoColorClass = () => {
    if (!isLoggedIn || !userData?.uuid) return "";
    const raw = rangoDatos?.rango;
    if (!raw) return "rango-basico";
    return `rango-${raw}`;
  };

  const xpActualNavbar = xpNavbar.actual ?? 0;
  const xpRequeridaNavbar = xpNavbar.requerida || 1;
  const xpPercent =
    xpRequeridaNavbar > 0 ? Math.min(100, (xpActualNavbar / xpRequeridaNavbar) * 100) : 0;

  const nivelNavbar = xpNavbar.level != null ? xpNavbar.level : userData?.userLevel ?? 1;

  const QuestIcon = () => (
    <span className="quest-qm" aria-hidden="true">
      <svg viewBox="0 0 24 24" role="img" focusable="false">
        <defs>
          <linearGradient id="qmGoldM" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff3b8" />
            <stop offset="0.45" stopColor="#ffd058" />
            <stop offset="1" stopColor="#b87410" />
          </linearGradient>
        </defs>
        <path
          d="M12 2.2c-3.6 0-6.4 2.1-6.4 5.2 0 1.6.8 2.9 2 3.8.7.5 1.1 1 .9 1.8l-.3 1.2c-.1.5.3 1 .8 1.1l1.7.3c.5.1 1-.3 1.1-.8l.2-1.2c.2-1.1.7-1.8 1.8-2.5 1.2-.8 2.1-1.9 2.1-3.7 0-3.1-2.9-5.2-6.3-5.2Zm0 2.1c2.1 0 3.8 1.1 3.8 3 0 1-.5 1.6-1.4 2.2-1.4.9-2.3 2-2.6 3.6l-.1.7-1.2-.2.1-.6c.3-1.8-.4-3-1.8-4-.8-.6-1.2-1.2-1.2-1.9 0-1.9 1.7-3 3.8-3Zm0 14.5a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2Z"
          fill="url(#qmGoldM)"
          stroke="rgba(20,10,6,0.95)"
          strokeWidth="1.25"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );

  return (
    <>
      <div className="navbar-inner mobile-only">
        <div className="left-wrapper">
          <button
            className={`burger ${menuOpen ? "open" : ""}`}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Abrir menú"
          >
            <span />
            <span />
            <span />
          </button>

          <Link to="/" className="logo-inline" onClick={() => setMenuOpen(false)}>
            <img
              src="/assets/logonav.webp"
              alt="Flancraft logo"
              className={`logo-img ${isHome ? "logo-activo" : ""}`}
            />
          </Link>
        </div>

        {!isLoggedIn ? (
          <button className="profile-button full" onClick={() => setLoginModalOpen(true)}>
            <span className="profile-greeting">Iniciar sesión</span>
          </button>
        ) : isUserLoading ? (
          <div className="profile-button full loading">
            <span className="profile-greeting">Cargando perfil...</span>
          </div>
        ) : (
          <div className="profile-button-wrapper">
            <button
              className={`profile-button full ${hasClaimables ? "has-claimables" : ""}`}
              ref={profileButtonRef}
              onClick={() => setProfileOpen((prev) => !prev)}
              title={
                hasClaimables ? `Tienes ${claimablesCount} recompensa(s) por reclamar` : undefined
              }
            >
              <img
                src={`https://mc-heads.net/avatar/${userData.username}/32`}
                alt="avatar"
                className="user-avatar"
              />

              <span className="profile-greeting">
                Hola,&nbsp;
                <span className={`nombre-colored ${getRangoColorClass()}`}>
                  {userData.username}
                </span>
              </span>

              {hasClaimables && <QuestIcon />}

              <i className={`fas ${profileOpen ? "fa-chevron-up" : "fa-chevron-down"}`} />
            </button>
          </div>
        )}
      </div>

      {isLoggedIn && !isUserLoading && (
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

              <div className="user-topline">
                <p className="username-big">
                  <span className={`nombre-colored ${getRangoColorClass()}`}>
                    {userData.username}
                  </span>
                </p>

                <div className="user-badges">
                  {rangoDatos?.rango && (
                    <img
                      className={`badge badge-rango ${rangoDatos.rango}`}
                      src={`/assets/rangos/${rangoDatos.rango}.webp`}
                      alt={rangoDatos.rango}
                    />
                  )}
                  {rangoDatos?.premium && (
                    <img
                      className="badge badge-premium"
                      src="/assets/premium.webp"
                      alt="Premium"
                    />
                  )}
                </div>
              </div>

              <div className="user-level-row">
                <span className="user-level-pill">NIVEL</span>
                <span className="user-level-value">{nivelNavbar}</span>
              </div>
            </div>

            <div className="xp-navbar-block">
              <div className="xp-bar-profile">
                <div className="xp-fill" style={{ width: `${xpPercent}%` }} />
              </div>
              <div className="xp-text-row">
                <span className="xp-actual">{xpActualNavbar}</span>
                <span className="xp-sep">/</span>
                <span className="xp-total">{xpRequeridaNavbar} XP</span>
              </div>
            </div>

            <div className="balance-wrapper">
              <div className="balance-item">
                <img src="/assets/eco.webp" alt="ECOS" className="eco-icon-navbar" />
                <span className="balance-text">{userData.ecos} ECOS</span>
              </div>
            </div>

            <NavLink
              to="/dashboard"
              className={`dropdown-link dropdown-link--rewards ${hasClaimables ? "has" : ""}`}
              data-has={hasClaimables ? "1" : "0"}
              onClick={() => setProfileOpen(false)}
            >
              <span className="left-pack">
                <NavIcon
                  src="/botones/recompensas.svg"
                  alt="Recompensas"
                  className="dropdown-icon"
                />
                <span>Mis Recompensas</span>
              </span>

              {hasClaimables && (
                <>
                  <span className="rewards-count-pill">{claimablesCount}</span>
                  <span className="dropdown-tooltip">
                    Tienes {claimablesCount} recompensa(s) por reclamar
                  </span>
                </>
              )}
            </NavLink>

            <NavLink
              to={`/perfil/${userData.username}`}
              className="dropdown-link dropdown-link--stats"
              onClick={() => setProfileOpen(false)}
            >
              <span className="left-pack">
                <NavIcon
                  src="/botones/estadisticas.svg"
                  alt="Estadísticas"
                  className="dropdown-icon"
                />
                <span>Mis estadísticas</span>
              </span>
            </NavLink>

            <div className="dropdown-link logout-button">
              <span className="left-pack">
                <NavIcon
                  src="/botones/cerrar-sesion.svg"
                  alt="Cerrar sesión"
                  className="dropdown-icon"
                />
                <span>Cerrar sesión</span>
              </span>
              <LogoutButton onClick={() => setProfileOpen(false)} />
            </div>
          </div>
        </div>
      )}

      <div
        className={`mobile-menu-overlay ${menuOpen ? "open" : ""}`}
        onClick={() => setMenuOpen(false)}
      />

      <div className={`mobile-menu ${menuOpen ? "open" : ""}`}>
        <div className="mobile-logo-header">
          <i
            className="fas fa-times close-menu-button"
            onClick={() => setMenuOpen(false)}
          />

          <img src="/assets/blockhorn.webp" alt="Blockhorn" className="blockhorn-logo" />
          <div className="logo-divider" />

          <div className="logo-glow-wrapper">
            <img
              src="/assets/flancraftlogo.webp"
              alt="Flancraft"
              className="flancraft-logo"
            />
          </div>
        </div>

        <div className="mobile-links">
          <NavLink to="/" className={navClsMobile("nav-home")} onClick={() => setMenuOpen(false)}>
            <NavIcon src="/botones/home.svg" alt="Inicio" />
            Inicio
          </NavLink>

          <NavLink to="/news" className={navClsMobile("nav-news")} onClick={() => setMenuOpen(false)}>
            <NavIcon src="/botones/noticias.svg" alt="Noticias" />
            Noticias
          </NavLink>

          <NavLink
            to="/leaderboards"
            className={navClsMobile("nav-stats")}
            onClick={() => setMenuOpen(false)}
          >
            <NavIcon src="/botones/estadisticas.svg" alt="Estadísticas" />
            Estadísticas
          </NavLink>

          <NavLink
            to="/tienda"
            className={navClsMobile("nav-store")}
            onClick={() => setMenuOpen(false)}
          >
            <NavIcon src="/botones/tienda.svg" alt="Tienda" />
            Tienda
          </NavLink>

          <NavLink
            to="/rangos"
            className={navClsMobile("nav-ranks")}
            onClick={() => setMenuOpen(false)}
          >
            <NavIcon src="/botones/rangos.svg" alt="Rangos" />
            Rangos
          </NavLink>

          <NavLink
            to="/tribunal"
            className={navClsMobile("nav-tribunal")}
            onClick={() => setMenuOpen(false)}
          >
            <NavIcon src="/botones/tribunal.svg" alt="Tribunal" />
            Tribunal
          </NavLink>

          <div className="logo-divider" />

          <div className="mobile-social-links">
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer">
              <i className="fab fa-instagram" />
            </a>
            <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer">
              <i className="fab fa-tiktok" />
            </a>
            <a href="https://youtube.com" target="_blank" rel="noopener noreferrer">
              <i className="fab fa-youtube" />
            </a>
            <a href="https://discord.com" target="_blank" rel="noopener noreferrer">
              <i className="fab fa-discord" />
            </a>
            <a href="https://telegram.org" target="_blank" rel="noopener noreferrer">
              <i className="fab fa-telegram" />
            </a>
            <a href="https://x.com" target="_blank" rel="noopener noreferrer">
              <i className="fab fa-x-twitter" />
            </a>
          </div>

          <div className="logo-divider" />
        </div>
      </div>

      {loginModalOpen && <LoginModal onClose={() => setLoginModalOpen(false)} />}
    </>
  );
};

export default NavbarMobile;
