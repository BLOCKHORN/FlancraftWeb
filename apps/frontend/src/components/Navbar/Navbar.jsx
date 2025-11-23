import { useContext, useEffect, useState, useRef, useCallback } from "react";
import { UserContext } from "../../context/UserContext";
import { supabase } from "@lib/supabaseClient";
import NavbarMobile from "./NavbarMobile";
import NavbarDesktop from "./NavbarDesktop";
import useIsMobile from "../../hooks/useIsMobile";
import "../../styles/components/Navbar/navbar.scss";

const Navbar = ({ onLoginClick }) => {
  const { user } = useContext(UserContext);

  // Sesión básica según contexto (lo que venga de localStorage / login)
  const baseLoggedIn = Boolean(user && user.loggedIn);

  const isMobile = useIsMobile();

  const [menuOpen, setMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [profileOpen, _setProfileOpen] = useState(false);
  const setProfileOpen = useCallback((value) => {
    if (typeof value === "function") {
      _setProfileOpen((prev) => value(prev));
    } else {
      _setProfileOpen(value);
    }
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
    ecos: 0,
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

  // Cargar datos frescos del usuario (nivel, xp, ecos, etc.)
  useEffect(() => {
    // Si no hay uuid en el contexto, reseteamos y no intentamos cargar nada
    if (!user?.uuid) {
      setUserData({
        username: "",
        uuid: "",
        userXP: 0,
        userXPMax: 100,
        userLevel: 1,
        ecos: 0,
      });
      setUserLoading(false);
      return;
    }

    const fetchUser = async () => {
      setUserLoading(true);

      try {
        const [userRes, monedasRes] = await Promise.all([
          supabase
            .from("usuarios")
            .select("*")
            .eq("uuid", user.uuid)
            .single(),
          fetch(
            `https://flancraft-backend.onrender.com/api/monedas/${user.uuid}`
          ),
        ]);

        const userDataDB = userRes.data;
        const monedas = monedasRes.ok ? await monedasRes.json() : { ecos: 0 };

        if (userDataDB) {
          setUserData({
            username: userDataDB.uid || user.username || "",
            uuid: userDataDB.uuid || user.uuid || "",
            userXP: userDataDB.xp_actual ?? 0,
            userXPMax: 100, // si más adelante sacas xp_max de la DB, lo pones aquí
            userLevel: userDataDB.nivel ?? 1,
            ecos: monedas.ecos || 0,
          });
        } else {
          // Si por lo que sea no hay datos en DB, al menos usamos lo del contexto
          setUserData((prev) => ({
            ...prev,
            username: user.username || prev.username,
            uuid: user.uuid || prev.uuid,
          }));
        }
      } catch (error) {
        console.error("Error al cargar usuario:", error);
        // Fallback: mantenemos lo que haya en el contexto
        setUserData((prev) => ({
          ...prev,
          username: user.username || prev.username,
          uuid: user.uuid || prev.uuid,
        }));
      } finally {
        setUserLoading(false);
      }
    };

    fetchUser();
  }, [user?.uuid, user?.username, user]);

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

  const sharedProps = {
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
    ...handlers,
  };

  if (isMobile === null) return null;

  return (
    <nav className={`navbar-flancraft ${menuOpen ? "menu-open" : ""}`}>
      {isMobile ? (
        <NavbarMobile {...sharedProps} />
      ) : (
        <NavbarDesktop {...sharedProps} />
      )}
    </nav>
  );
};

export default Navbar;
