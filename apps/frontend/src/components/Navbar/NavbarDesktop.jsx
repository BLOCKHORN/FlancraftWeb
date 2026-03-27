import { NavLink, Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState, useMemo, useContext, useLayoutEffect, useCallback } from "react";
import { UserContext } from "../../context/UserContext";
import { apiUrl } from "../../lib/env";
import { clearSessionStorage } from "../../lib/auth/storage";
import "../../styles/components/Navbar/navbarDesktop.scss";

const toInt = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
};

const formatInt = (n) => {
  const v = toInt(n);
  return new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 }).format(v);
};

const normalizePath = (p) => {
  const raw = String(p || "");
  if (raw === "/") return "/";
  return raw.replace(/\/+$/, "");
};

const getActiveKeyFromPath = (pathname, navItems) => {
  const p = normalizePath(pathname);
  let best = null;
  let bestLen = -1;
  for (const it of navItems || []) {
    const to = normalizePath(it?.to);
    if (!to) continue;
    const match = to === "/" ? p === "/" : p === to || p.startsWith(to + "/") || p.startsWith(to);
    if (match && to.length > bestLen) {
      best = it.key;
      bestLen = to.length;
    }
  }
  return best;
};

const isSaleValid = (saleNav) => {
  const expire = Number(saleNav?.expire || 0);
  if (!saleNav?.active || !expire) return false;
  return expire * 1000 > Date.now();
};

const NavbarDesktop = ({
  isLoggedIn, isUserLoading, userData, avatarHeadUrlSm, avatarHeadUrlLg,
  profileOpen, setProfileOpen, onLoginClick, handleProfileEnter, handleProfileLeave, navItems, saleNav,
}) => {
  const { logout } = useContext(UserContext);
  const navigate = useNavigate();

  const [hasClaimables, setHasClaimables] = useState(false);
  const [claimablesCount, setClaimablesCount] = useState(0);

  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);

  const location = useLocation();
  const isHome = location.pathname === "/";

  const rootRef = useRef(null);
  const linksWrapRef = useRef(null);
  const linkRefs = useRef(new Map());

  const [ink, setInk] = useState({ x: 0, w: 0, o: 0 });

  const activeKey = useMemo(() => getActiveKeyFromPath(location.pathname, navItems), [location.pathname, navItems]);

  const measureAndSetInk = useCallback((key, forceVisible = true) => {
    const root = rootRef.current;
    const el = linkRefs.current.get(key);
    if (!root || !el) {
      setInk((s) => ({ ...s, o: 0 }));
      return;
    }
    const rootRect = root.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const x = Math.round(elRect.left - rootRect.left);
    const w = Math.round(elRect.width);
    setInk({ x, w, o: forceVisible ? 1 : 0 });
  }, []);

  useLayoutEffect(() => {
    if (!activeKey) {
      setInk((s) => ({ ...s, o: 0 }));
      return;
    }
    requestAnimationFrame(() => measureAndSetInk(activeKey, true));
  }, [activeKey, measureAndSetInk]);

  useEffect(() => {
    const root = rootRef.current;
    const wrap = linksWrapRef.current;
    if (!root || !wrap) return;
    let ro = null;
    const onResize = () => {
      if (!activeKey) return;
      measureAndSetInk(activeKey, true);
    };
    if ("ResizeObserver" in window) {
      ro = new ResizeObserver(() => onResize());
      ro.observe(root);
      ro.observe(wrap);
    }
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      if (ro) ro.disconnect();
    };
  }, [activeKey, measureAndSetInk]);

  const handleLinksLeave = useCallback(() => {
    if (activeKey) measureAndSetInk(activeKey, true);
    else setInk((s) => ({ ...s, o: 0 }));
  }, [activeKey, measureAndSetInk]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) && triggerRef.current && !triggerRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [setProfileOpen]);

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
        const res = await fetch(apiUrl(`/api/logros/${userData.uuid}?${params}`));
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const lista = Array.isArray(data) ? data : [];
        const pendientes = lista.filter((l) => l?.completado === true && l?.reclamado !== true);

        if (!cancelled) {
          setClaimablesCount(pendientes.length);
          setHasClaimables(pendientes.length > 0);
        }
      } catch (err) {
        if (!cancelled) {
          setHasClaimables(false);
          setClaimablesCount(0);
        }
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
    const raw = userData?.rawRango;
    if (!raw) return "tone--basic";
    if (raw === "nova") return "tone--nova";
    if (raw === "alpha") return "tone--alpha";
    if (raw === "inmortal") return "tone--inmortal";
    return "tone--basic";
  }, [userData?.rawRango]);

  const rangoBadgeSrc = userData?.rawRango ? `/assets/rangos/${userData.rawRango}.webp` : null;
  const premiumBadgeSrc = userData?.esPremium ? `/assets/premium.webp` : null;

  const xpActualNavbar = userData?.userXP ?? 0;
  const xpRequeridaNavbar = userData?.userXPMax || 1;
  const xpPercent = userData?.xpPercent ?? 0;
  const nivelNavbar = userData?.userLevel ?? 1;
  
  // AQUI CALCULAMOS LOS FLANITES
  const flanpointsFormatted = useMemo(() => formatInt(userData?.flanpoints ?? 0), [userData?.flanpoints]);

  const handleLogout = () => {
    clearSessionStorage();
    logout();
    navigate("/");
    window.location.reload();
  };

  const flaniteTip = "La Flanite (FLT) es la moneda premium de Flancraft. Consíguela en la tienda y fórjala en El Nexo.";
  const storeSaleActive = useMemo(() => isSaleValid(saleNav), [saleNav?.active, saleNav?.expire]);
  const storeSalePercent = toInt(saleNav?.percent || 0);
  const storeSaleText = storeSalePercent > 0 ? `-${storeSalePercent}%` : "OFERTA";
  const storeSaleTitle = storeSalePercent > 0 ? `Oferta activa ${storeSaleText}` : "Oferta activa";
  const storeSaleAria = storeSalePercent > 0 ? `Tienda, oferta activa ${storeSaleText}` : "Tienda, oferta activa";

  const handleAvatarError = (e) => {
    e.currentTarget.onerror = null;
    e.currentTarget.src = "/assets/skins/default-steve.webp";
  };

  return (
    <div className="fcbar fcbar--desktop" ref={rootRef}>
      <span
        className={`fcnav__ink ${ink.o ? "is-on" : ""}`}
        style={{
          width: `${ink.w}px`,
          transform: `translate3d(${ink.x}px,0,0)`,
          opacity: ink.o,
        }}
        aria-hidden="true"
      />

      <div className="fcbar__left">
        <Link to="/" className="fcbar__logo" aria-label="Ir al inicio">
          <img src="/assets/logonav.webp" alt="Flancraft" className={`fcbar__logoImg ${isHome ? "is-home" : ""}`} draggable="false" />
        </Link>
      </div>

      <div className="fcbar__middle" aria-label="Navegación principal">
        <div className="fcbar__links" ref={linksWrapRef} onMouseLeave={handleLinksLeave}>
          {navItems?.map((it) => {
            const isStore = it.key === "store";
            const ariaLabel = isStore && storeSaleActive ? storeSaleAria : it.label;

            return (
              <NavLink
                key={it.key}
                to={it.to}
                aria-label={ariaLabel}
                data-sale={isStore && storeSaleActive ? "true" : "false"}
                ref={(el) => {
                  if (el) linkRefs.current.set(it.key, el);
                  else linkRefs.current.delete(it.key);
                }}
                onMouseEnter={() => measureAndSetInk(it.key, true)}
                onFocus={() => measureAndSetInk(it.key, true)}
                className={({ isActive }) => `fcbar__link fcbar__link--${it.key} ${isActive ? "is-active" : ""}`}
              >
                <span className="fcbar__linkTxt">{it.label}</span>

                {isStore && storeSaleActive && (
                  <span className="fcbar__sale" title={storeSaleTitle} aria-hidden="true">
                    <span className="fcbar__saleTxt">{storeSaleText}</span>
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>
      </div>

      <div className="fcbar__right">
        {!isLoggedIn ? (
          <button className="fcbar__cta pixel-btn-green" onClick={onLoginClick}>
            INICIAR SESIÓN
          </button>
        ) : isUserLoading ? (
          <div className="fcacct fcacct--loading">
            <span className="fcacct__loadingTxt">Cargando…</span>
          </div>
        ) : (
          <div className="fcacct" onMouseEnter={handleProfileEnter} onMouseLeave={handleProfileLeave}>
            <button
              type="button"
              className={`fcacct__btn ${hasClaimables ? "fcacct__btn--hot" : ""}`}
              ref={triggerRef}
              onClick={() => setProfileOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={profileOpen ? "true" : "false"}
              title={userData?.username || ""}
            >
              <span className="fcacct__avatar" aria-hidden="true">
                <img src={avatarHeadUrlSm} alt="" className="fcacct__avatarImg" draggable="false" loading="eager" decoding="async" onError={handleAvatarError} />
              </span>
              <span className="fcacct__hello">
                Hola,&nbsp;<span className={`fcacct__name ${toneClass}`}>{userData.username}</span>
              </span>
              <span className={`fcacct__chev ${profileOpen ? "is-open" : ""}`} aria-hidden="true" />
            </button>

            {profileOpen && (
              <div className="fcacct__panel" ref={dropdownRef} role="menu">
                <div className="fcacct__top">
                  <img src={avatarHeadUrlLg} alt="" className="fcacct__avatarBig" draggable="false" loading="eager" decoding="async" onError={handleAvatarError} />
                  <div className="fcacct__meta">
                    <div className="fcacct__row1">
                      <div className={`fcacct__nick ${toneClass}`}>{userData.username}</div>
                      <div className="fcacct__badges" aria-hidden="true">
                        {rangoBadgeSrc && <img className="fcacct__badge" src={rangoBadgeSrc} alt="" draggable="false" />}
                        {premiumBadgeSrc && <img className="fcacct__badge" src={premiumBadgeSrc} alt="" draggable="false" />}
                      </div>
                    </div>
                    <div className="fcacct__lvl">
                      <span className="fcacct__lvlLabel">Nivel</span>
                      <span className="fcacct__lvlVal">{nivelNavbar}</span>
                    </div>
                    <div className="fcacct__xp">
                      <div className="fcacct__xpBar" aria-hidden="true">
                        <div className="fcacct__xpFill" style={{ width: `${xpPercent}%` }} />
                      </div>
                      <div className="fcacct__xpText">
                        <span className="fcacct__xpA">{xpActualNavbar}</span>
                        <span className="fcacct__xpSep">/</span>
                        <span className="fcacct__xpB">{xpRequeridaNavbar} XP</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="fcacct__wallet" aria-label="Flanite balance">
                  <div className="fcacct__walletRow" tabIndex={0} aria-describedby="fc-wallet-tip">
                    <img src="/tienda/assets/flanite.webp" alt="FLT" className="fcacct__coin" draggable="false" style={{ imageRendering: 'pixelated' }} />
                    <span className="fcacct__walletVal" style={{ color: '#f97316' }}>{flanpointsFormatted}</span>
                    <span className="fcacct__walletTag" style={{ color: '#d8b4fe' }}>FLT</span>
                    <span className="fcacct__walletHint" aria-hidden="true" />
                  </div>
                  <div id="fc-wallet-tip" className="fcacct__walletTip" role="tooltip">
                    {flaniteTip}
                  </div>
                </div>

                <div className="fcacct__links" role="none">
                  <NavLink to="/dashboard" className={`fcacct__item ${hasClaimables ? "is-pending" : ""}`} onClick={() => setProfileOpen(false)}>
                    <span>Mis Recompensas</span>
                    {hasClaimables && <span className="fcacct__count">{claimablesCount}</span>}
                  </NavLink>
                  <NavLink to={`/perfil/${userData.username}`} className="fcacct__item" onClick={() => setProfileOpen(false)}>
                    <span>Mis estadísticas</span>
                  </NavLink>
                  <div className="fcacct__item fcacct__item--logout" role="menuitem">
                    <button type="button" className="fcacct__logoutBtn" onClick={handleLogout}>
                      CERRAR SESIÓN
                    </button>
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