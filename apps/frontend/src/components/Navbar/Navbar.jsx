import { useContext, useEffect, useState, useRef, useCallback, useMemo, useLayoutEffect } from "react";
import { UserContext } from "../../context/UserContext";
import { supabase } from "@lib/supabaseClient";
import NavbarMobile from "./NavbarMobile";
import NavbarDesktop from "./NavbarDesktop";
import useIsMobile from "../../hooks/useIsMobile";
import { apiUrl } from "../../lib/env";
import { getAuthToken, clearSessionStorage } from "../../lib/auth/storage";
import "../../styles/components/Navbar/navbar.scss";

const SERVERS_COINS = [{ key: "survival", label: "SURVIVAL" }];

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

const parseCoinsPayload = (m) => {
  if (m?.byServer && typeof m.byServer === "object") {
    const out = {};
    for (const [k, v] of Object.entries(m.byServer)) out[String(k)] = toInt(v);
    return out;
  }

  if (Array.isArray(m?.balances)) {
    const out = {};
    for (const row of m.balances) {
      const key = String(row?.servidor || row?.server || "").trim().toLowerCase();
      if (!key) continue;
      out[key] = toInt(row?.coins);
    }
    return out;
  }

  if (Array.isArray(m)) {
    const out = {};
    for (const row of m) {
      const key = String(row?.servidor || row?.server || "").trim().toLowerCase();
      if (!key) continue;
      out[key] = toInt(row?.coins);
    }
    return out;
  }

  if (m?.coins != null) return { global: toInt(m.coins) };
  if (m?.ecos != null) return { global: toInt(m.ecos) };

  return {};
};

const sumTotalCoins = (coinsByServer) => {
  if ("global" in coinsByServer) return toInt(coinsByServer.global);
  return toInt(coinsByServer.survival);
};

const pickSalePercent = (sale) => {
  const p =
    typeof sale?.percentage === "number"
      ? sale.percentage
      : typeof sale?.discount === "number"
      ? sale.discount
      : 0;
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
    walletCoins: 0,
    coinsByServer: {},
    coinsServersTotal: 0,
  }));

  const [userLoading, setUserLoading] = useState(false);

  const [saleNav, setSaleNav] = useState(() => ({
    active: false,
    percent: 0,
    expire: 0,
  }));

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
          setSaleNav({
            active: true,
            percent: pickSalePercent(s),
            expire: Number(s.expire || 0),
          });
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

  const refreshUserData = useCallback(
    async (opts = {}) => {
      if (!user?.uuid) {
        setUserData({
          username: "",
          uuid: "",
          userXP: 0,
          userXPMax: 100,
          userLevel: 1,
          walletCoins: 0,
          coinsByServer: {},
          coinsServersTotal: 0,
        });
        setUserLoading(false);
        return;
      }

      const silent = opts?.silent === true;
      if (!silent) setUserLoading(true);

      try {
        const token = getAuthToken();

        const [userRes, monedasRes, walletRes] = await Promise.all([
          supabase.from("usuarios").select("*").eq("uuid", user.uuid).single(),
          fetch(apiUrl(`/api/monedas/${user.uuid}`)),
          token
            ? fetch(apiUrl(`/api/daily-claim/status`), {
                headers: { Authorization: `Bearer ${token}` },
              })
            : Promise.resolve(null),
        ]);

        const userDataDB = userRes.data;

        const monedas = monedasRes.ok ? await monedasRes.json() : {};
        const coinsByServer = parseCoinsPayload(monedas);
        const coinsServersTotal = sumTotalCoins(coinsByServer);

        let walletCoins = toInt(userDataDB?.wallet_coins ?? 0);

        if (walletRes) {
          if (walletRes.status === 401) {
            clearSessionStorage();
            logout();
          } else if (walletRes.ok) {
            const w = await walletRes.json();
            walletCoins = toInt(w?.walletBalance ?? w?.wallet_balance ?? walletCoins);
          }
        }

        setUserData((prev) => {
          const username = userDataDB?.uid || user.username || prev.username || "";
          const uuid = userDataDB?.uuid || user.uuid || prev.uuid || "";
          return {
            username,
            uuid,
            userXP: userDataDB?.xp_actual ?? prev.userXP ?? 0,
            userXPMax: prev.userXPMax ?? 100,
            userLevel: userDataDB?.nivel ?? prev.userLevel ?? 1,
            walletCoins,
            coinsByServer,
            coinsServersTotal,
          };
        });
      } catch (error) {
        console.error("Navbar: Error al cargar usuario:", error);
        setUserData((prev) => ({
          ...prev,
          username: user?.username || prev.username,
          uuid: user?.uuid || prev.uuid,
        }));
      } finally {
        if (!silent) setUserLoading(false);
      }
    },
    [user?.uuid, user?.username]
  );

  useEffect(() => {
    refreshUserData();
  }, [refreshUserData]);

  useEffect(() => {
    if (!user?.uuid) return;

    const onBalances = (e) => {
      const d = e?.detail;
      if (d && (d.walletCoins != null || d.coinsByServer)) {
        setUserData((prev) => {
          const next = { ...prev };
          if (d.walletCoins != null) next.walletCoins = toInt(d.walletCoins);
          if (d.coinsByServer && typeof d.coinsByServer === "object") {
            next.coinsByServer = d.coinsByServer;
            next.coinsServersTotal = sumTotalCoins(d.coinsByServer);
          }
          return next;
        });
      }
      refreshUserData({ silent: true });
    };

    const onFocus = () => refreshUserData({ silent: true });

    window.addEventListener("fc:balances", onBalances);
    window.addEventListener("focus", onFocus);

    const id = setInterval(() => refreshUserData({ silent: true }), 30_000);

    return () => {
      window.removeEventListener("fc:balances", onBalances);
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

  const avatarHeadUrlSm = useMemo(
    () => buildAvatarHeadUrl(userData?.uuid, userData?.username, 28),
    [userData?.uuid, userData?.username]
  );

  const avatarHeadUrlLg = useMemo(
    () => buildAvatarHeadUrl(userData?.uuid, userData?.username, 64),
    [userData?.uuid, userData?.username]
  );

  const sharedProps = useMemo(
    () => ({
      menuOpen,
      setMenuOpen,
      activeDropdown,
      setActiveDropdown,
      profileOpen,
      setProfileOpen,
      isLoggedIn,
      isUserLoading: userLoading && baseLoggedIn,
      userData,
      avatarHeadUrlSm,
      avatarHeadUrlLg,
      onLoginClick,
      serversCoins: SERVERS_COINS,
      navItems: NAV_ITEMS,
      handleDropdownHover,
      handleDropdownLeave,
      handleProfileEnter,
      handleProfileLeave,
      toggleDropdown,
      saleNav,
    }),
    [
      menuOpen,
      activeDropdown,
      profileOpen,
      setProfileOpen,
      isLoggedIn,
      userLoading,
      baseLoggedIn,
      userData,
      avatarHeadUrlSm,
      avatarHeadUrlLg,
      onLoginClick,
      handleDropdownHover,
      handleDropdownLeave,
      handleProfileEnter,
      handleProfileLeave,
      toggleDropdown,
      saleNav,
    ]
  );

  if (isMobile === null) return null;

  return (
    <nav
      ref={navRef}
      className={`navbar-flancraft ${menuOpen ? "menu-open" : ""}`}
      role="navigation"
      aria-label="Barra principal"
    >
      {isMobile ? <NavbarMobile {...sharedProps} /> : <NavbarDesktop {...sharedProps} />}
    </nav>
  );
};

export default Navbar;