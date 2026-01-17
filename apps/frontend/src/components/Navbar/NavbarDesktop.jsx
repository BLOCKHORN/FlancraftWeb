import { NavLink, Link, useLocation } from "react-router-dom";
import LogoutButton from "../Auth/LogoutButton";
import { useEffect, useRef, useState } from "react";
import "../../styles/components/Navbar/navbarDesktop.scss";

const NavIcon = ({ src, alt, size = 24, className = "" }) => {
  return (
    <img
      className={`nav-icon-img ${className}`}
      src={src}
      alt={alt}
      width={size}
      height={size}
      draggable="false"
      loading="eager"
    />
  );
};

const API_BASE =
  import.meta.env.VITE_BACKEND_URL || "https://flancraft-backend.onrender.com";

const navCls = (base) => (navData) => {
  const isActive = !!(navData?.isActive ?? navData?.match);
  return `nav-item ${base}${isActive ? " active" : ""}`;
};

const WoWQuestQuestionMark = ({ className = "" }) => {
  return (
    <span className={`quest-qm ${className}`} aria-hidden="true">
      <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
        <defs>
          <linearGradient id="qmGoldA" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff6c6" />
            <stop offset="0.4" stopColor="#ffd166" />
            <stop offset="0.75" stopColor="#f2a01a" />
            <stop offset="1" stopColor="#a85f0c" />
          </linearGradient>
          <radialGradient id="qmGoldB" cx="30%" cy="20%" r="70%">
            <stop offset="0" stopColor="rgba(255,255,255,0.75)" />
            <stop offset="0.55" stopColor="rgba(255,255,255,0.0)" />
            <stop offset="1" stopColor="rgba(0,0,0,0.0)" />
          </radialGradient>
        </defs>

        <path
          d="M12 2.2c-3.7 0-6.6 2.1-6.6 5.3 0 1.8.9 3.1 2.2 4 0 0 .9.6 2.2 1 1 .3 1.4.8 1.4 1.7v1.2h2.8v-1.4c0-2.1-1.2-3-2.6-3.5-.5-.2-1-.4-1.3-.6-.7-.4-1.1-.9-1.1-1.7 0-1.4 1.5-2.6 3.4-2.6 1.8 0 3.1.9 3.1 2.3 0 .6-.2 1.1-.7 1.6-.4.4-1 .7-1.7 1.1-.9.5-1.6.9-2 1.5-.4.6-.6 1.2-.6 2.4v.8h2.8v-.4c0-.9.1-1.2.3-1.4.3-.2.8-.5 1.4-.8.8-.4 1.6-.9 2.3-1.6 1-1 1.5-2.2 1.5-3.7 0-3-2.7-5.2-6.5-5.2z"
          fill="url(#qmGoldA)"
          stroke="#1a0d07"
          strokeWidth="1.35"
          strokeLinejoin="round"
        />
        <path
          d="M12 2.2c-3.7 0-6.6 2.1-6.6 5.3 0 1.8.9 3.1 2.2 4"
          fill="none"
          stroke="url(#qmGoldB)"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.9"
        />
        <circle
          cx="12"
          cy="20"
          r="1.7"
          fill="url(#qmGoldA)"
          stroke="#1a0d07"
          strokeWidth="1.25"
        />
      </svg>
    </span>
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

  const [hasClaimables, setHasClaimables] = useState(false);
  const [claimablesCount, setClaimablesCount] = useState(0);

  const triggerRef = useRef();
  const dropdownRef = useRef();

  const location = useLocation();
  const isHome = location.pathname === "/";

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

  useEffect(() => {
    const fetchDatosNavbar = async () => {
      if (!isLoggedIn || !userData?.uuid) return;

      try {
        const [usuarioRes, xpRes] = await Promise.all([
          fetch(`${API_BASE}/api/usuarios/${userData.uuid}`),
          fetch(`${API_BASE}/api/usuarios/${userData.uuid}/xp`),
        ]);

        if (!usuarioRes.ok || !xpRes.ok) throw new Error("Bad response");

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
        console.error("NavbarDesktop: datos usuario/xp", err);
      }
    };

    fetchDatosNavbar();
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

        const res = await fetch(
          `${API_BASE}/api/logros/${userData.uuid}?${params.toString()}`
        );
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
        console.error("NavbarDesktop: claimables", err);
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

  const rangoBadgeSrc = rangoDatos?.rango
    ? `/assets/rangos/${rangoDatos.rango}.webp`
    : null;

  const premiumBadgeSrc = rangoDatos?.premium ? `/assets/premium.webp` : null;

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
            draggable="false"
          />
        </Link>
      </div>

      <div className="nav-center">
        <NavLink to="/" className={navCls("nav-home")}>
          <NavIcon src="/botones/home.svg" alt="Inicio" />
          <span className="nav-label">Inicio</span>
        </NavLink>

        <NavLink to="/news" className={navCls("nav-news")}>
          <NavIcon src="/botones/noticias.svg" alt="Noticias" />
          <span className="nav-label">Noticias</span>
        </NavLink>

        <NavLink to="/leaderboards" className={navCls("nav-stats")}>
          <NavIcon src="/botones/estadisticas.svg" alt="Estadísticas" />
          <span className="nav-label">Rankings</span>
        </NavLink>

        <NavLink to="/tienda" className={navCls("nav-store")}>
          <NavIcon src="/botones/tienda.svg" alt="Tienda" />
          <span className="nav-label">Tienda</span>
        </NavLink>

        <NavLink to="/rangos" className={navCls("nav-ranks")}>
          <NavIcon src="/botones/rangos.svg" alt="Rangos" />
          <span className="nav-label">Rangos</span>
        </NavLink>

        <NavLink to="/tribunal" className={navCls("nav-tribunal")}>
          <NavIcon src="/botones/tribunal.svg" alt="Tribunal" />
          <span className="nav-label">Tribunal</span>
        </NavLink>
      </div>

      <div className="nav-right">
        {!isLoggedIn ? (
          <button className="login-button" onClick={onLoginClick}>
            Iniciar sesión
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
            <button
              type="button"
              className={`user-trigger ${hasClaimables ? "has-claimables" : ""}`}
              ref={triggerRef}
              onClick={() => setProfileOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={profileOpen ? "true" : "false"}
              title={userData?.username || ""}
            >
              <span className="user-avatar-wrap" aria-hidden="true">
                <img
                  src={`https://mc-heads.net/avatar/${userData.username}/28`}
                  alt=""
                  className="user-avatar"
                  draggable="false"
                />
              </span>

              <span className="username-saludo">
                Hola,&nbsp;
                <span className={`nombre-colored ${getRangoColorClass()}`}>
                  {userData.username}
                </span>
              </span>

              {hasClaimables && <WoWQuestQuestionMark />}
            </button>

            {profileOpen && (
              <div
                className="user-dropdown-wrapper enhanced open"
                ref={dropdownRef}
                role="menu"
              >
                <div className="user-dropdown">
                  <div className="user-header">
                    <img
                      src={`https://mc-heads.net/avatar/${userData.username}/64`}
                      alt="avatar"
                      className="user-avatar-large"
                      draggable="false"
                    />

                    <div className="user-core">
                      <div className="user-topline">
                        <p className="username-big">
                          <span className={`nombre-colored ${getRangoColorClass()}`}>
                            {userData.username}
                          </span>
                        </p>
                      </div>

                      <div className="user-level-row">
                        <span className="user-level-pill">NIVEL</span>
                        <span className="user-level-value">{nivelNavbar}</span>
                        <div className="user-badges" aria-hidden="true">
                          {rangoBadgeSrc && (
                            <img
                              className="badge badge-rango"
                              src={rangoBadgeSrc}
                              alt=""
                              draggable="false"
                            />
                          )}
                          {premiumBadgeSrc && (
                            <img
                              className="badge badge-premium"
                              src={premiumBadgeSrc}
                              alt=""
                              draggable="false"
                            />
                          )}
                        </div>
                      </div>

                      <div className="xp-navbar-block">
                        <div className="xp-bar-profile" aria-hidden="true">
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
                        draggable="false"
                      />
                      <span className="balance-text">{userData.ecos} ECOS</span>
                    </div>
                  </div>

                  <NavLink
                    to="/dashboard"
                    className="dropdown-link dropdown-link--rewards"
                    data-has={hasClaimables ? "1" : "0"}
                  >
                    <span className="left-pack">
                      <img
                        src="/botones/recompensas.svg"
                        alt=""
                        className="dropdown-icon"
                        draggable="false"
                      />
                      <span>Mis Recompensas</span>
                    </span>

                    {hasClaimables && (
                      <>
                        <span className="rewards-count-pill">{claimablesCount}</span>
                        <span className="dropdown-tooltip" role="tooltip">
                          Tienes {claimablesCount} recompensa(s) por reclamar
                        </span>
                      </>
                    )}
                  </NavLink>

                  <NavLink
                    to={`/perfil/${userData.username}`}
                    className="dropdown-link"
                  >
                    <span className="left-pack">
                      <img
                        src="/botones/estadisticas.svg"
                        alt=""
                        className="dropdown-icon"
                        draggable="false"
                      />
                      <span>Mis estadísticas</span>
                    </span>
                  </NavLink>

                  <div className="dropdown-link logout-button" role="menuitem">
                    <span className="left-pack">
                      <img
                        src="/botones/cerrar-sesion.svg"
                        alt=""
                        className="dropdown-icon"
                        draggable="false"
                      />
                      <LogoutButton />
                    </span>
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
