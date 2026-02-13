// src/components/Navbar/Navbar.jsx
import { useContext, useEffect, useState, useRef, useCallback, useMemo } from "react";
import { UserContext } from "../../context/UserContext";
import { supabase } from "@lib/supabaseClient";
import NavbarMobile from "./NavbarMobile";
import NavbarDesktop from "./NavbarDesktop";
import useIsMobile from "../../hooks/useIsMobile";
import "../../styles/components/Navbar/navbar.scss";

const API_BASE =
  import.meta.env.VITE_BACKEND_URL || "https://flancraft-backend.onrender.com";

const SERVERS_COINS = [
  { key: "gens", label: "GENS" },
  { key: "oneblock", label: "ONEBLOCK" },
  { key: "survival", label: "SURVIVAL" },
];

const toInt = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
};

const parseCoinsPayload = (m) => {
  // ✅ nuevo backend: { byServer: { gens: 0, oneblock: 0, ... } }
  if (m?.byServer && typeof m.byServer === "object") {
    const out = {};
    for (const [k, v] of Object.entries(m.byServer)) out[String(k)] = toInt(v);
    return out;
  }

  // ✅ nuevo backend alterno: { balances: [{ servidor, coins }] }
  if (Array.isArray(m?.balances)) {
    const out = {};
    for (const row of m.balances) {
      const key = String(row?.servidor || "").trim().toLowerCase();
      if (!key) continue;
      out[key] = toInt(row?.coins);
    }
    return out;
  }

  // ✅ viejo: { coins: number } o { ecos: number }
  if (m?.coins != null) return { global: toInt(m.coins) };
  if (m?.ecos != null) return { global: toInt(m.ecos) };

  return {};
};

const sumTotalCoins = (coinsByServer) => {
  if ("global" in coinsByServer) return toInt(coinsByServer.global);
  return SERVERS_COINS.reduce((acc, s) => acc + toInt(coinsByServer[s.key]), 0);
};

const Navbar = ({ onLoginClick }) => {
  const { user } = useContext(UserContext);

  // Sesión básica según contexto (lo que venga de localStorage / login)
  const baseLoggedIn = Boolean(user && user.loggedIn);

  const isMobile = useIsMobile();

  const [menuOpen, setMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [profileOpen, _setProfileOpen] = useState(false);
  const setProfileOpen = useCallback((value) => {
    if (typeof value === "function") _setProfileOpen((prev) => value(prev));
    else _setProfileOpen(value);
  }, []);

  const dropdownTimeout = useRef(null);
  const profileTimeout = useRef(null);

  // Datos visibles en el navbar
  const [userData, setUserData] = useState(() => ({
    username: user?.username || "",
    uuid: user?.uuid || "",
    userXP: 0,
    userXPMax: 100,
    userLevel: 1,
    coinsTotal: 0,
    coinsByServer: {},
  }));

  const [userLoading, setUserLoading] = useState(false);

  // Evitamos scroll cuando el menú móvil está abierto
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

  // Cargar datos frescos del usuario (nivel, xp, coins, etc.)
  useEffect(() => {
    if (!user?.uuid) {
      setUserData({
        username: "",
        uuid: "",
        userXP: 0,
        userXPMax: 100,
        userLevel: 1,
        coinsTotal: 0,
        coinsByServer: {},
      });
      setUserLoading(false);
      return;
    }

    let cancelled = false;

    const fetchUser = async () => {
      setUserLoading(true);

      try {
        const [userRes, monedasRes] = await Promise.all([
          supabase.from("usuarios").select("*").eq("uuid", user.uuid).single(),
          fetch(`${API_BASE}/api/monedas/${user.uuid}`),
        ]);

        const userDataDB = userRes.data;

        const monedas = monedasRes.ok ? await monedasRes.json() : {};
        const coinsByServer = parseCoinsPayload(monedas);
        const coinsTotal = sumTotalCoins(coinsByServer);

        if (!cancelled) {
          if (userDataDB) {
            setUserData({
              username: userDataDB.uid || user.username || "",
              uuid: userDataDB.uuid || user.uuid || "",
              userXP: userDataDB.xp_actual ?? 0,
              userXPMax: 100,
              userLevel: userDataDB.nivel ?? 1,
              coinsTotal,
              coinsByServer,
            });
          } else {
            setUserData((prev) => ({
              ...prev,
              username: user.username || prev.username,
              uuid: user.uuid || prev.uuid,
              coinsTotal,
              coinsByServer,
            }));
          }
        }
      } catch (error) {
        console.error("Error al cargar usuario:", error);
        if (!cancelled) {
          setUserData((prev) => ({
            ...prev,
            username: user.username || prev.username,
            uuid: user.uuid || prev.uuid,
          }));
        }
      } finally {
        if (!cancelled) setUserLoading(false);
      }
    };

    fetchUser();

    return () => {
      cancelled = true;
    };
  }, [user?.uuid, user?.username]);

  // Consideramos "logueado para el navbar" solo cuando:
  //  - el contexto dice loggedIn
  //  - y tenemos al menos un username para mostrar
  const isLoggedIn = baseLoggedIn && !!userData.username;

  const handlers = {
    handleDropdownHover: (key) => {
      clearTimeout(dropdownTimeout.current);
      setActiveDropdown(key);
    },
    handleDropdownLeave: () => {
      dropdownTimeout.current = setTimeout(() => setActiveDropdown(null), 200);
    },
    handleProfileEnter: () => {
      clearTimeout(profileTimeout.current);
      setProfileOpen(true);
    },
    handleProfileLeave: () => {
      profileTimeout.current = setTimeout(() => setProfileOpen(false), 250);
    },
    toggleDropdown: (key) => {
      setActiveDropdown((prev) => (prev === key ? null : key));
    },
  };

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
      onLoginClick,
      serversCoins: SERVERS_COINS,
      ...handlers,
    }),
    [
      menuOpen,
      activeDropdown,
      profileOpen,
      isLoggedIn,
      userLoading,
      baseLoggedIn,
      userData,
      onLoginClick,
    ]
  );

  if (isMobile === null) return null;

  return (
    <nav className={`navbar-flancraft ${menuOpen ? "menu-open" : ""}`}>
      {isMobile ? <NavbarMobile {...sharedProps} /> : <NavbarDesktop {...sharedProps} />}
    </nav>
  );
};

export default Navbar;
