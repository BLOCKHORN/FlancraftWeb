import { NavLink, useLocation } from "react-router-dom";
import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import LogoutButton from "../Auth/LogoutButton";
import LoginModal from "../Auth/LoginModal";

const API_BASE = (import.meta.env.VITE_BACKEND_URL || "https://flancraft-backend.onrender.com")
  .trim()
  .replace(/\/$/, "");

const apiUrl = (path) => (API_BASE ? `${API_BASE}${path}` : path);

const toInt = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
};

const formatInt = (n) => {
  const v = toInt(n);
  return new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 }).format(v);
};

const navClsMobile = (base) => (navData) => {
  const isActive = !!(navData?.isActive ?? navData?.match);
  return `mobile-nav-item ${base}${isActive ? " active" : ""}`;
};

const NavIcon = ({ src, alt, fallbackSrc }) => {
  const onError = useCallback(
    (e) => {
      if (!fallbackSrc) return;
      const img = e.currentTarget;
      if (img && img.src && img.src.includes(fallbackSrc)) return;
      img.onerror = null;
      img.src = fallbackSrc;
    },
    [fallbackSrc]
  );

  if (!src) return <span className="nav-icon-dot" aria-hidden="true" />;

  return <img className="nav-icon-img" src={src} alt={alt} draggable="false" onError={onError} />;
};

const isSaleValid = (saleNav) => {
  const expire = Number(saleNav?.expire || 0);
  if (!saleNav?.active || !expire) return false;
  return expire * 1000 > Date.now();
};

const NavbarMobile = ({
  menuOpen,
  setMenuOpen,
  profileOpen,
  setProfileOpen,
  isLoggedIn,
  isUserLoading,
  userData,
  avatarHeadUrlSm,
  avatarHeadUrlLg,
  navItems,
  saleNav,
}) => {
  const dropdownRef = useRef(null);
  const profileButtonRef = useRef(null);
  const location = useLocation();
  const isHome = location.pathname === "/";
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  const [rangoDatos, setRangoDatos] = useState(null);
  const [xpNavbar, setXpNavbar] = useState({ level: null, actual: 0, requerida: 1 });

  const [hasClaimables, setHasClaimables] = useState(false);
  const [claimablesCount, setClaimablesCount] = useState(0);

  const resolvedAvatarSm = useMemo(
    () => avatarHeadUrlSm || "/assets/skins/default-steve.webp",
    [avatarHeadUrlSm]
  );

  const resolvedAvatarLg = useMemo(
    () => avatarHeadUrlLg || "/assets/skins/default-steve.webp",
    [avatarHeadUrlLg]
  );

  const handleAvatarError = useCallback((e) => {
    e.currentTarget.onerror = null;
    e.currentTarget.src = "/assets/skins/default-steve.webp";
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setProfileOpen(false);
  }, [location.pathname, setMenuOpen, setProfileOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [menuOpen]);

  useEffect(() => {
    const onPointerDown = (e) => {
      if (!profileOpen) return;
      const dd = dropdownRef.current;
      const btn = profileButtonRef.current;
      const clickedInsideDropdown = dd && dd.contains(e.target);
      const clickedProfileBtn = btn && btn.contains(e.target);
      if (!clickedInsideDropdown && !clickedProfileBtn) setProfileOpen(false);
    };

    const onKeyDown = (e) => {
      if (e.key !== "Escape") return;
      if (profileOpen) setProfileOpen(false);
      if (menuOpen) setMenuOpen(false);
      if (loginModalOpen) setLoginModalOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown, { passive: true });
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [profileOpen, menuOpen, loginModalOpen, setProfileOpen, setMenuOpen]);

  useEffect(() => {
    const fetchDatosUsuarioMobile = async () => {
      if (!isLoggedIn || !userData?.uuid) return;

      try {
        const [usuarioRes, xpRes] = await Promise.all([
          fetch(apiUrl(`/api/usuarios/${userData.uuid}`)),
          fetch(apiUrl(`/api/usuarios/${userData.uuid}/xp`)),
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

        const res = await fetch(apiUrl(`/api/logros/${userData.uuid}?${params.toString()}`));
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        const lista = Array.isArray(data) ? data : [];
        const pendientes = lista.filter((l) => l && l.completado === true && l.reclamado !== true);

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

  const toneClass = useMemo(() => {
    const raw = rangoDatos?.rango;
    if (!raw) return "tone--basic";
    if (raw === "nova") return "tone--nova";
    if (raw === "alpha") return "tone--alpha";
    if (raw === "inmortal") return "tone--inmortal";
    return "tone--basic";
  }, [rangoDatos?.rango]);

  const xpActualNavbar = xpNavbar.actual ?? 0;
  const xpRequeridaNavbar = xpNavbar.requerida || 1;
  const xpPercent = xpRequeridaNavbar > 0 ? Math.min(100, (xpActualNavbar / xpRequeridaNavbar) * 100) : 0;
  const nivelNavbar = xpNavbar.level != null ? xpNavbar.level : userData?.userLevel ?? 1;

  const walletCoins = useMemo(() => formatInt(userData?.walletCoins ?? 0), [userData?.walletCoins]);

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

  const walletTip =
    "Las Wallet Coins se consiguen con el daily, el voto y los logros. Puedes enviarlas al servidor en la cantidad que elijas.";

  const storeSaleActive = useMemo(() => isSaleValid(saleNav), [saleNav?.active, saleNav?.expire]);
  const storeSalePercent = toInt(saleNav?.percent || 0);
  const storeSaleText = storeSalePercent > 0 ? `-${storeSalePercent}%` : "OFERTA";
  const storeSaleAria = storeSalePercent > 0 ? `Tienda, oferta activa ${storeSaleText}` : "Tienda, oferta activa";

  return (
    <>
      <div className={`navbar-inner mobile-only ${menuOpen ? "menu-open" : ""}`}>
        <div className="left-wrapper">
          <button
            className={`burger ${menuOpen ? "open" : ""}`}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={menuOpen ? "true" : "false"}
            aria-controls="mobile-menu"
            type="button"
          >
            <span />
            <span />
            <span />
          </button>

          <NavLink to="/" className="logo-inline" onClick={() => setMenuOpen(false)} aria-label="Ir al inicio">
            <img
              src="/assets/logonav.webp"
              alt="Flancraft logo"
              className={`logo-img ${isHome ? "logo-activo" : ""}`}
              draggable="false"
            />
          </NavLink>
        </div>

        {!isLoggedIn ? (
          <button className="profile-button full" onClick={() => setLoginModalOpen(true)} type="button">
            <span className="profile-greeting">Iniciar sesión</span>
          </button>
        ) : isUserLoading ? (
          <div className="profile-button full loading" aria-live="polite">
            <span className="profile-greeting">Cargando…</span>
          </div>
        ) : (
          <div className="profile-button-wrapper">
            <button
              className={`profile-button full ${hasClaimables ? "has-claimables" : ""}`}
              ref={profileButtonRef}
              onClick={() => setProfileOpen((prev) => !prev)}
              aria-expanded={profileOpen ? "true" : "false"}
              aria-controls="mobile-profile-dropdown"
              title={hasClaimables ? `Tienes ${claimablesCount} recompensa(s) por reclamar` : undefined}
              type="button"
            >
              <span className="user-avatar" aria-hidden="true">
                <img
                  src={resolvedAvatarSm}
                  alt=""
                  className="user-avatar-img"
                  draggable="false"
                  loading="eager"
                  decoding="async"
                  onError={handleAvatarError}
                />
              </span>

              <span className="profile-greeting">
                Hola,&nbsp;<span className={`profile-name ${toneClass}`}>{userData.username}</span>
              </span>

              {hasClaimables && <QuestIcon />}

              <span className={`profile-chev ${profileOpen ? "is-open" : ""}`} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

      {isLoggedIn && !isUserLoading && (
        <div
          ref={dropdownRef}
          id="mobile-profile-dropdown"
          className={`user-dropdown-wrapper mobile-only ${profileOpen ? "open" : ""}`}
          role="menu"
        >
          <div className="user-dropdown" onClick={(e) => e.stopPropagation()}>
            <div className="user-header centered">
              <div className="ud-top">
                <img
                  src={resolvedAvatarLg}
                  alt=""
                  className="user-avatar-large"
                  draggable="false"
                  loading="eager"
                  decoding="async"
                  onError={handleAvatarError}
                />

                <div className="ud-meta">
                  <div className="user-topline">
                    <p className={`username-big ${toneClass}`}>{userData.username}</p>

                    <div className="user-badges" aria-hidden="true">
                      {rangoDatos?.rango && (
                        <img
                          className="badge badge-rango"
                          src={`/assets/rangos/${rangoDatos.rango}.webp`}
                          alt=""
                          draggable="false"
                        />
                      )}
                      {rangoDatos?.premium && (
                        <img className="badge badge-premium" src="/assets/premium.webp" alt="" draggable="false" />
                      )}
                    </div>
                  </div>

                  <div className="user-level-row">
                    <span className="user-level-pill">Nivel</span>
                    <span className="user-level-value">{nivelNavbar}</span>
                  </div>

                  <div className="xp-navbar-block">
                    <div className="xp-bar-profile" aria-hidden="true">
                      <div className="xp-fill" style={{ width: `${xpPercent}%` }} />
                    </div>
                    <div className="xp-text-row">
                      <span className="xp-actual">{xpActualNavbar}</span>
                      <span className="xp-sep">/</span>
                      <span className="xp-total">{xpRequeridaNavbar} XP</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="balance-wrapper" aria-label="Wallet coins">
              <div className="balance-item" tabIndex={0} aria-describedby="mobile-wallet-tip">
                <img src="/tienda/assets/coin.png" alt="COINS" className="eco-icon-navbar" draggable="false" />
                <span className="balance-text">{walletCoins}</span>
                <span className="balance-tag">Wallet</span>
                <span className="balance-hint" aria-hidden="true" />
              </div>

              <div id="mobile-wallet-tip" className="balance-tip" role="tooltip">
                {walletTip}
              </div>
            </div>

            <div className="dropdown-links">
              <NavLink
                to="/dashboard"
                className={`dropdown-link dropdown-link--rewards ${hasClaimables ? "is-pending" : ""}`}
                onClick={() => setProfileOpen(false)}
              >
                <span>Mis Recompensas</span>
                {hasClaimables && <span className="rewards-count-pill">{claimablesCount}</span>}
              </NavLink>

              <NavLink
                to={`/perfil/${userData.username}`}
                className="dropdown-link dropdown-link--stats"
                onClick={() => setProfileOpen(false)}
              >
                <span>Mis estadísticas</span>
              </NavLink>

              <div className="dropdown-link dropdown-link--logout" role="menuitem">
                <span>Cerrar sesión</span>
                <LogoutButton onClick={() => setProfileOpen(false)} />
              </div>
            </div>

            <div className="dropdown-shine" />
          </div>
        </div>
      )}

      <div className={`mobile-menu-overlay ${menuOpen ? "open" : ""}`} onClick={() => setMenuOpen(false)} />

      <div id="mobile-menu" className={`mobile-menu ${menuOpen ? "open" : ""}`}>
        <div className="mobile-logo-header">
          <button className="close-menu-button" onClick={() => setMenuOpen(false)} type="button" aria-label="Cerrar menú">
            <span />
            <span />
          </button>

          <img src="/assets/blockhorn.webp" alt="Blockhorn" className="blockhorn-logo" draggable="false" />
          <div className="logo-divider" />

          <div className="logo-glow-wrapper">
            <img src="/assets/flancraftlogo.webp" alt="Flancraft" className="flancraft-logo" draggable="false" />
          </div>
        </div>

        <div className="mobile-links">
          {navItems?.map((it) => {
            const isStore = it.key === "store";
            const ariaLabel = isStore && storeSaleActive ? storeSaleAria : it.label;

            return (
              <NavLink
                key={it.key}
                to={it.to}
                aria-label={ariaLabel}
                className={navClsMobile(`nav-${it.key}`)}
                onClick={() => setMenuOpen(false)}
                data-nav={it.key}
                data-sale={isStore && storeSaleActive ? "true" : "false"}
              >
                <NavIcon src={it.icon} alt={it.label} fallbackSrc={it.fallbackIcon} />
                <span className="nav-label">{it.label}</span>
                {isStore && storeSaleActive && (
                  <span className="nav-sale" aria-hidden="true">
                    {storeSaleText}
                  </span>
                )}
              </NavLink>
            );
          })}

          <div className="logo-divider" />

          <div className="mobile-social-links" aria-label="Redes sociales">
            <a href="https://instagram.com/flancraftserver" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
              <i className="fab fa-instagram" />
            </a>
            <a href="https://tiktok.com/@flancraftserver" target="_blank" rel="noopener noreferrer" aria-label="TikTok">
              <i className="fab fa-tiktok" />
            </a>
            <a href="https://youtube.com/@flancraft" target="_blank" rel="noopener noreferrer" aria-label="YouTube">
              <i className="fab fa-youtube" />
            </a>
            <a href="https://discord.gg/uTJCqn4GsC" target="_blank" rel="noopener noreferrer" aria-label="Discord">
              <i className="fab fa-discord" />
            </a>
            <a href="https://whatsapp.com/channel/0029Vb6zjCrIXnljntqxva3v" target="_blank" rel="noopener noreferrer" aria-label="Whatsapp">
              <i className="fab fa-whatsapp" />
            </a>
            <a href="https://x.com/flancraftserver" target="_blank" rel="noopener noreferrer" aria-label="X">
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