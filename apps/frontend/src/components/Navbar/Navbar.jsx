import { useContext, useEffect, useState, useRef, useCallback, useMemo, useLayoutEffect } from "react";
import { UserContext } from "../../context/UserContext";
import { supabase } from "@lib/supabaseClient";
import NavbarMobile from "./NavbarMobile";
import NavbarDesktop from "./NavbarDesktop";
import useIsMobile from "../../hooks/useIsMobile";
import { apiUrl } from "../../lib/env";
import { getAuthToken, clearSessionStorage } from "../../lib/auth/storage";
import "../../styles/components/Navbar/navbar.scss";

const NAV_ITEMS = [
  { key: "home", to: "/", label: "Inicio" },
  { key: "news", to: "/news", label: "Noticias" },
  { key: "leaderboards", to: "/leaderboards", label: "Rankings" },
  { key: "store", to: "/tienda", label: "Tienda" },
  { key: "tribunal", to: "/tribunal", label: "Tribunal" },
];

const toInt = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
};

const pickSalePercent = (sale) => {
  const p = typeof sale?.percentage === "number" ? sale.percentage : typeof sale?.discount === "number" ? sale.discount : 0;
  return toInt(p);
};

const isSaleStillValid = (sale) => {
  const expire = Number(sale?.expire || 0);
  if (!expire) return false;
  return expire * 1000 > Date.now();
};

const buildAvatarHeadUrl = (uuid, username, size) => {
  const cleanUuid = String(uuid || "").trim();
  const cleanUsername = String(username || "").trim().replace(/^\.+/, "");
  const identifier = cleanUuid || cleanUsername;
  if (!identifier) return "/assets/skins/default-steve.webp";
  return `https://mc-heads.net/avatar/${encodeURIComponent(identifier)}/${size}`;
};

const deriveXpStateFromTotal = (xpTotal, niveles) => {
  const total = toInt(xpTotal);
  const rows = Array.isArray(niveles) ? [...niveles].sort((a, b) => Number(a?.nivel) - Number(b?.nivel)) : [];

  if (!rows.length) {
    return { nivel: 1, xpActualNivel: 0, xpRequeridaNivel: 1, xpTotalActual: total, porcentaje: 0 };
  }

  let current = rows[0];

  for (const row of rows) {
    const threshold = toInt(row?.xp_total_acumulada);
    if (total >= threshold) current = row;
    else break;
  }

  const currentThreshold = toInt(current?.xp_total_acumulada);
  const xpRequired = Math.max(1, toInt(current?.xp_requerida || 1));
  const xpInLevel = Math.min(Math.max(0, total - currentThreshold), xpRequired);
  const porcentaje = Math.min(100, (xpInLevel / xpRequired) * 100);

  return {
    nivel: Math.max(1, toInt(current?.nivel || 1)),
    xpActualNivel: xpInLevel,
    xpRequeridaNivel: xpRequired,
    xpTotalActual: total,
    porcentaje,
  };
};

const Navbar = ({ onLoginClick }) => {
  const { user, logout } = useContext(UserContext);
  const baseLoggedIn = Boolean(user && user.loggedIn);
  const isMobile = useIsMobile();
  const navRef = useRef(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [profileOpen, _setProfileOpen] = useState(false);

  const setProfileOpen = useCallback((value) => {
    if (typeof value === "function") _setProfileOpen((prev) => value(prev));
    else _setProfileOpen(value);
  }, []);

  const dropdownTimeout = useRef(null);
  const profileTimeout = useRef(null);

  const [userData, setUserData] = useState(() => ({
    username: user?.username || "",
    uuid: user?.uuid || "",
    userXP: 0,
    userXPMax: 100,
    userLevel: 1,
    xpPercent: 0,
    flanpoints: 0,
  }));

  const [userLoading, setUserLoading] = useState(false);
  const [saleNav, setSaleNav] = useState({ active: false, percent: 0, expire: 0 });

  useLayoutEffect(() => {
    const el = navRef.current;
    if (!el) return;
    const apply = () => {
      const h = el.getBoundingClientRect().height;
      document.documentElement.style.setProperty("--nav-h", `${Math.ceil(h)}px`);
    };
    apply();
    let ro;
    if ("ResizeObserver" in window) {
      ro = new ResizeObserver(() => apply());
      ro.observe(el);
    }
    window.addEventListener("resize", apply);
    return () => {
      window.removeEventListener("resize", apply);
      if (ro) ro.disconnect();
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    document.body.style.position = menuOpen ? "fixed" : "";
    document.body.style.width = menuOpen ? "100%" : "";
    return () => {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
    };
  }, [menuOpen]);

  useEffect(() => {
    let cancelled = false;
    const loadSale = async () => {
      try {
        const refresh = import.meta.env.DEV ? "?refresh=1" : "";
        const res = await fetch(apiUrl(`/api/tebex/sale${refresh}`));
        if (!res.ok) {
          if (!cancelled) setSaleNav({ active: false, percent: 0, expire: 0 });
          return;
        }
        const json = await res.json();
        const s = json?.ok && json?.active ? json?.sale : null;
        if (!s || !isSaleStillValid(s)) {
          if (!cancelled) setSaleNav({ active: false, percent: 0, expire: 0 });
          return;
        }
        if (!cancelled) {
          setSaleNav({ active: true, percent: pickSalePercent(s), expire: Number(s.expire || 0) });
        }
      } catch {
        if (!cancelled) setSaleNav({ active: false, percent: 0, expire: 0 });
      }
    };
    loadSale();
    const id = setInterval(loadSale, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const refreshUserData = useCallback(async (opts = {}) => {
    if (!user?.uuid) {
      setUserData({ username: "", uuid: "", userXP: 0, userXPMax: 100, userLevel: 1, xpPercent: 0, flanpoints: 0 });
      setUserLoading(false);
      return;
    }

    const silent = opts?.silent === true;
    if (!silent) setUserLoading(true);

    try {
      const token = getAuthToken();
      const [userRes, xpRes, authCheckRes] = await Promise.all([
        supabase.from("usuarios").select("uuid, uid, xp_actual, flanpoints, rango_usuario, es_premium").eq("uuid", user.uuid).single(),
        fetch(apiUrl(`/api/usuarios/${user.uuid}/xp`)),
        token ? fetch(apiUrl(`/api/daily-claim/status`), { headers: { Authorization: `Bearer ${token}` } }) : Promise.resolve(null),
      ]);

      if (authCheckRes && authCheckRes.status === 401) {
        clearSessionStorage();
        logout();
        return;
      }

      const userDataDB = userRes.data;
      const xpData = xpRes.ok ? await xpRes.json() : {};
      
      const trueTotalXp = toInt(userDataDB?.xp_actual || 0);
      const xpDerived = deriveXpStateFromTotal(trueTotalXp, xpData?.niveles || []);

      setUserData((prev) => ({
        username: userDataDB?.uid || user.username || prev.username || "",
        uuid: userDataDB?.uuid || user.uuid || prev.uuid || "",
        userLevel: xpDerived.nivel,
        userXP: xpDerived.xpActualNivel,
        userXPMax: xpDerived.xpRequeridaNivel,
        xpPercent: xpDerived.porcentaje,
        flanpoints: toInt(userDataDB?.flanpoints ?? 0),
        rawRango: userDataDB?.rango_usuario?.toLowerCase() || null,
        esPremium: userDataDB?.es_premium === true
      }));
    } catch (error) {
      console.error("Navbar: Error al cargar usuario:", error);
      setUserData((prev) => ({ ...prev, username: user?.username || prev.username, uuid: user?.uuid || prev.uuid }));
    } finally {
      if (!silent) setUserLoading(false);
    }
  }, [user?.uuid, user?.username, logout]);

  useEffect(() => {
    refreshUserData();
  }, [refreshUserData]);

  useEffect(() => {
    if (!user?.uuid) return;
    const onFocus = () => refreshUserData({ silent: true });

    window.addEventListener("focus", onFocus);
    const id = setInterval(() => refreshUserData({ silent: true }), 300_000);

    return () => {
      window.removeEventListener("focus", onFocus);
      clearInterval(id);
    };
  }, [user?.uuid, refreshUserData]);

  const isLoggedIn = baseLoggedIn && !!userData.username;

  const handleDropdownHover = useCallback((key) => {
    clearTimeout(dropdownTimeout.current);
    setActiveDropdown(key);
  }, []);

  const handleDropdownLeave = useCallback(() => {
    dropdownTimeout.current = setTimeout(() => setActiveDropdown(null), 200);
  }, []);

  const handleProfileEnter = useCallback(() => {
    clearTimeout(profileTimeout.current);
    setProfileOpen(true);
  }, [setProfileOpen]);

  const handleProfileLeave = useCallback(() => {
    profileTimeout.current = setTimeout(() => setProfileOpen(false), 180);
  }, [setProfileOpen]);

  const toggleDropdown = useCallback((key) => {
    setActiveDropdown((prev) => (prev === key ? null : key));
  }, []);

  const avatarHeadUrlSm = useMemo(() => buildAvatarHeadUrl(userData?.uuid, userData?.username, 28), [userData?.uuid, userData?.username]);
  const avatarHeadUrlLg = useMemo(() => buildAvatarHeadUrl(userData?.uuid, userData?.username, 64), [userData?.uuid, userData?.username]);

  const sharedProps = useMemo(() => ({
    menuOpen, setMenuOpen, activeDropdown, setActiveDropdown, profileOpen, setProfileOpen,
    isLoggedIn, isUserLoading: userLoading && baseLoggedIn, userData, avatarHeadUrlSm, avatarHeadUrlLg,
    onLoginClick, navItems: NAV_ITEMS, handleDropdownHover, handleDropdownLeave,
    handleProfileEnter, handleProfileLeave, toggleDropdown, saleNav,
  }), [
    menuOpen, activeDropdown, profileOpen, setProfileOpen, isLoggedIn, userLoading, baseLoggedIn,
    userData, avatarHeadUrlSm, avatarHeadUrlLg, onLoginClick, handleDropdownHover, handleDropdownLeave,
    handleProfileEnter, handleProfileLeave, toggleDropdown, saleNav,
  ]);

  if (isMobile === null) return null;

  return (
    <nav ref={navRef} className={`navbar-flancraft ${menuOpen ? "menu-open" : ""}`} role="navigation" aria-label="Barra principal">
      {isMobile ? <NavbarMobile {...sharedProps} /> : <NavbarDesktop {...sharedProps} />}
    </nav>
  );
};

export default Navbar;