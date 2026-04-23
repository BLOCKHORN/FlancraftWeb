import { NavLink, useLocation } from "react-router-dom";
import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import LogoutButton from "../Auth/LogoutButton";
import { useAuthModal } from "../../context/AuthModalContext";
import { apiUrl } from "../../lib/env";

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
  const onError = useCallback((e) => {
    if (!fallbackSrc) return;
    const img = e.currentTarget;
    if (img && img.src && img.src.includes(fallbackSrc)) return;
    img.onerror = null;
    img.src = fallbackSrc;
  }, [fallbackSrc]);

  if (!src) return <span className="nav-icon-dot" aria-hidden="true" />;
  return <img className="nav-icon-img" src={src} alt={alt} draggable="false" onError={onError} />;
};

const isSaleValid = (saleNav) => {
  const expire = Number(saleNav?.expire || 0);
  if (!saleNav?.active || !expire) return false;
  return expire * 1000 > Date.now();
};

const InstagramSVG = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
);
const TikTokSVG = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/></svg>
);
const YouTubeSVG = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 7.1C2.5 7.1 2.4 5.4 3.1 4.7C4 3.8 5.1 3.8 5.6 3.7C8.9 3.5 12 3.5 12 3.5C12 3.5 15.1 3.5 18.4 3.7C18.9 3.8 20 3.8 20.9 4.7C21.6 5.4 21.5 7.1 21.5 7.1C21.5 7.1 21.8 9.3 21.8 11.5V12.5C21.8 14.7 21.5 16.9 21.5 16.9C21.5 16.9 21.6 18.6 20.9 19.3C20 20.2 18.7 20.2 18.2 20.3C14.5 20.6 12 20.5 12 20.5C12 20.5 8.9 20.5 5.6 20.3C5.1 20.2 4 20.2 3.1 19.3C2.4 18.6 2.5 16.9 2.5 16.9C2.5 16.9 2.2 14.7 2.2 12.5V11.5C2.2 9.3 2.5 7.1 2.5 7.1Z"/><path d="M9.7 15.8L15.5 12L9.7 8.2V15.8Z"/></svg>
);
const DiscordSVG = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/></svg>
);
const WhatsappSVG = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/><path d="M16.5 16c-1.5.5-3-.5-4.5-2s-2.5-3-2-4.5c.3-.8 1.1-1 1.7-1a.9.9 0 0 1 .8.6l1 2.5a.9.9 0 0 1-.2 1l-1 1c1 2 3 3 5 2l1-1a.9.9 0 0 1 1-.2l2.5 1a.9.9 0 0 1 .6.8c0 .6-.2 1.4-1 1.7z"/></svg>
);
const XTwitterSVG = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4l11.733 16h4.267l-11.733 -16z"/><path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772"/></svg>
);

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
  const { openAuthModal } = useAuthModal();

  const [hasClaimables, setHasClaimables] = useState(false);
  const [claimablesCount, setClaimablesCount] = useState(0);

  const resolvedAvatarSm = useMemo(() => avatarHeadUrlSm || "/assets/skins/default-steve.webp", [avatarHeadUrlSm]);
  const resolvedAvatarLg = useMemo(() => avatarHeadUrlLg || "/assets/skins/default-steve.webp", [avatarHeadUrlLg]);

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
      if (dd && !dd.contains(e.target) && btn && !btn.contains(e.target)) {
        setProfileOpen(false);
      }
    };

    const onKeyDown = (e) => {
      if (e.key !== "Escape") return;
      if (profileOpen) setProfileOpen(false);
      if (menuOpen) setMenuOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown, { passive: true });
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [profileOpen, menuOpen, setProfileOpen, setMenuOpen]);

  useEffect(() => {
    if (!isLoggedIn || !userData?.uuid) {
      setHasClaimables(false);
      setClaimablesCount(0);
      return;
    }

    let controller = new AbortController();

    const fetchClaimables = async () => {
      try {
        const params = new URLSearchParams({ tipo_mision: "permanente" });
        const res = await fetch(apiUrl(`/api/logros/${userData.uuid}?${params.toString()}`), { signal: controller.signal });
        
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        const pendientes = (Array.isArray(data) ? data : []).filter((l) => l?.completado === true && l?.reclamado !== true);

        setClaimablesCount(pendientes.length);
        setHasClaimables(pendientes.length > 0);
      } catch (err) {
        if (err.name !== 'AbortError') {
          setHasClaimables(false);
          setClaimablesCount(0);
        }
      }
    };

    fetchClaimables();
    const intervalId = setInterval(() => {
      controller.abort();
      controller = new AbortController();
      fetchClaimables();
    }, 60_000);

    return () => {
      controller.abort();
      clearInterval(intervalId);
    };
  }, [isLoggedIn, userData?.uuid]);

  const toneClass = useMemo(() => {
    const raw = userData?.rawRango;
    if (!raw) return "tone--basic";
    if (raw === "nova") return "tone--nova";
    if (raw === "alpha") return "tone--alpha";
    if (raw === "inmortal") return "tone--inmortal";
    return "tone--basic";
  }, [userData?.rawRango]);

  const xpActualNavbar = userData?.userXP ?? 0;
  const xpRequeridaNavbar = userData?.userXPMax || 1;
  const xpPercent = userData?.xpPercent ?? 0;
  const nivelNavbar = userData?.userLevel ?? 1;
  
  // AQUI CALCULAMOS LOS FLANITES
  const flanpointsFormatted = useMemo(() => formatInt(userData?.flanpoints ?? 0), [userData?.flanpoints]);

  const QuestIcon = () => (
    <span className="quest-qm" aria-hidden="true">
      <svg viewBox="0 0 24 24" role="img" focusable="false">
        <defs>
          <linearGradient id="qmGoldM" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fbbf24" />
            <stop offset="1" stopColor="#d97706" />
          </linearGradient>
        </defs>
        <path
          d="M12 2.2c-3.6 0-6.4 2.1-6.4 5.2 0 1.6.8 2.9 2 3.8.7.5 1.1 1 .9 1.8l-.3 1.2c-.1.5.3 1 .8 1.1l1.7.3c.5.1 1-.3 1.1-.8l.2-1.2c.2-1.1.7-1.8 1.8-2.5 1.2-.8 2.1-1.9 2.1-3.7 0-3.1-2.9-5.2-6.3-5.2Zm0 2.1c2.1 0 3.8 1.1 3.8 3 0 1-.5 1.6-1.4 2.2-1.4.9-2.3 2-2.6 3.6l-.1.7-1.2-.2.1-.6c.3-1.8-.4-3-1.8-4-.8-.6-1.2-1.2-1.2-1.9 0-1.9 1.7-3 3.8-3Zm0 14.5a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2Z"
          fill="url(#qmGoldM)" stroke="#000" strokeWidth="1.5" strokeLinejoin="round"
        />
      </svg>
    </span>
  );

  const storeSaleActive = useMemo(() => isSaleValid(saleNav), [saleNav?.active, saleNav?.expire]);
  const storeSalePercent = toInt(saleNav?.percent || 0);
  const storeSaleText = storeSalePercent > 0 ? `-${storeSalePercent}%` : "OFERTA";
  const storeSaleAria = storeSalePercent > 0 ? `Tienda, oferta activa ${storeSaleText}` : "Tienda, oferta activa";

  return (
    <>
      <div className={`navbar-inner mobile-only no-tap-highlight ${menuOpen ? "menu-open" : ""}`}>
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
            <img src="/assets/logonav.webp" alt="Flancraft logo" className={`logo-img ${isHome ? "logo-activo" : ""}`} draggable="false" />
          </NavLink>
        </div>

        {!isLoggedIn ? (
          <button className="profile-button full login-btn" onClick={() => openAuthModal()} type="button">
            <span className="profile-greeting">INICIAR SESIÓN</span>
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
              title={hasClaimables ? `Tienes ${claimablesCount} recompensa(s)` : undefined}
              type="button"
            >
              <span className="user-avatar" aria-hidden="true">
                <img src={resolvedAvatarSm} alt="" className="user-avatar-img" draggable="false" loading="eager" decoding="async" onError={handleAvatarError} />
              </span>
              <span className="profile-greeting">
                <span className={`profile-name ${toneClass}`}>{userData.username}</span>
              </span>
              {hasClaimables && <QuestIcon />}
              <span className={`profile-chev ${profileOpen ? "is-open" : ""}`} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

      {isLoggedIn && !isUserLoading && (
        <div id="mobile-profile-dropdown" className={`user-dropdown-wrapper mobile-only no-tap-highlight ${profileOpen ? "open" : ""}`} role="menu">
          <div className="user-dropdown" ref={dropdownRef} onClick={(e) => e.stopPropagation()}>
            <div className="user-header centered">
              <div className="ud-top">
                <img src={resolvedAvatarLg} alt="" className="user-avatar-large" draggable="false" loading="eager" decoding="async" onError={handleAvatarError} />
                <div className="ud-meta">
                  <div className="user-topline">
                    <p className={`username-big ${toneClass}`}>{userData.username}</p>
                    <div className="user-badges" aria-hidden="true">
                      {userData?.rawRango && <img className="badge badge-rango" src={`/assets/rangos/${userData.rawRango}.webp`} alt="" draggable="false" />}
                      {userData?.esPremium && <img className="badge badge-premium" src="/assets/premium.webp" alt="" draggable="false" />}
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

            <div className="balance-wrapper" aria-label="Flanite balance">
              <div className="balance-item" tabIndex={0}>
                <img src="/tienda/assets/flanite.webp" alt="FLT" className="eco-icon-navbar" draggable="false" style={{ imageRendering: 'pixelated' }} />
                <span className="balance-text" style={{ color: '#f97316' }}>{flanpointsFormatted}</span>
                <span className="balance-tag" style={{ color: '#d8b4fe' }}>FLT</span>
              </div>
            </div>

            <div className="dropdown-links">
              <NavLink to="/dashboard" className={`dropdown-link dropdown-link--rewards ${hasClaimables ? "is-pending" : ""}`} onClick={() => setProfileOpen(false)}>
                <span>Mis Recompensas</span>
                {hasClaimables && <span className="rewards-count-pill">{claimablesCount}</span>}
              </NavLink>
              <NavLink to={`/perfil/${userData.username}`} className="dropdown-link dropdown-link--stats" onClick={() => setProfileOpen(false)}>
                <span>Mis estadísticas</span>
              </NavLink>
              <div className="dropdown-link dropdown-link--logout" role="menuitem">
                <LogoutButton onClick={() => setProfileOpen(false)} />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={`mobile-menu-overlay no-tap-highlight ${menuOpen ? "open" : ""}`} onClick={() => setMenuOpen(false)} />

      <div id="mobile-menu" className={`mobile-menu no-tap-highlight ${menuOpen ? "open" : ""}`}>
        <div className="mobile-logo-header">
          <button className="close-menu-button" onClick={() => setMenuOpen(false)} type="button" aria-label="Cerrar menú">
            <span /><span />
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
              >
                <NavIcon src={it.icon} alt={it.label} fallbackSrc={it.fallbackIcon} />
                <span className="nav-label">{it.label}</span>
                {isStore && storeSaleActive && (
                  <span className="nav-sale" aria-hidden="true">{storeSaleText}</span>
                )}
              </NavLink>
            );
          })}

          <div className="logo-divider" />

          <div className="mobile-social-links" aria-label="Redes sociales">
            <a href="https://instagram.com/flancraftserver" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
              <InstagramSVG />
            </a>
            <a href="https://tiktok.com/@flancraftserver" target="_blank" rel="noopener noreferrer" aria-label="TikTok">
              <TikTokSVG />
            </a>
            <a href="https://youtube.com/@flancraft" target="_blank" rel="noopener noreferrer" aria-label="YouTube">
              <YouTubeSVG />
            </a>
            <a href="https://discord.gg/uTJCqn4GsC" target="_blank" rel="noopener noreferrer" aria-label="Discord">
              <DiscordSVG />
            </a>
            <a href="https://whatsapp.com/channel/0029Vb6zjCrIXnljntqxva3v" target="_blank" rel="noopener noreferrer" aria-label="Whatsapp">
              <WhatsappSVG />
            </a>
            <a href="https://x.com/flancraftserver" target="_blank" rel="noopener noreferrer" aria-label="X">
              <XTwitterSVG />
            </a>
          </div>
          
          <div className="mobile-bottom-spacer" />
        </div>
      </div>
    </>
  );
};

export default NavbarMobile;