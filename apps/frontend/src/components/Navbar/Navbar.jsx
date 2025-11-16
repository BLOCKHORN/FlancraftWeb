import { useContext, useEffect, useState, useRef } from "react";
import { UserContext } from "../../context/UserContext";
import { useCallback } from "react";
import { supabase } from "@lib/supabaseClient";
import NavbarMobile from "./NavbarMobile";
import NavbarDesktop from "./NavbarDesktop";
import useIsMobile from "../../hooks/useIsMobile";
import "../../styles/components/Navbar/navbar.scss";

const Navbar = ({ onLoginClick }) => {
  const { user } = useContext(UserContext);
  const isLoggedIn = Boolean(user && user.loggedIn);
  const isMobile = useIsMobile();

  const [menuOpen, setMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [profileOpen, _setProfileOpen] = useState(false);
  const setProfileOpen = useCallback((value) => {
  if (typeof value === 'function') {
    _setProfileOpen(prev => value(prev));
  } else {
    _setProfileOpen(value);
  }
}, []);
  const dropdownTimeout = useRef(null);
  const profileTimeout = useRef(null);

  const [userData, setUserData] = useState({
    username: user?.name || '',
    uuid: '',
    userXP: 0,
    userXPMax: 100,
    userLevel: 1,
    ecos: 0,
  });

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    document.body.style.position = menuOpen ? 'fixed' : '';
    document.body.style.width = menuOpen ? '100%' : '';
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!user?.uuid) return;
    const fetchUser = async () => {
      try {
        const [userRes, monedasRes] = await Promise.all([
          supabase.from("usuarios").select("*").eq("uuid", user.uuid).single(),
          fetch(`https://flancraft-backend.onrender.com/api/monedas/${user.uuid}`)
        ]);
        const userData = userRes.data;
        const monedas = monedasRes.ok ? await monedasRes.json() : { ecos: 0 };

        if (userData) {
          setUserData({
            username: userData.uid,
            uuid: userData.uuid || 'desconocido',
            userXP: userData.xp_actual,
            userXPMax: 100,
            userLevel: userData.nivel,
            ecos: monedas.ecos || 0,
          });
        }
      } catch (error) {
        console.error("Error al cargar usuario:", error);
      }
    };
    fetchUser();
  }, [user]);


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
    userData,
    onLoginClick,
    ...handlers,
  };

  if (isMobile === null) return null;

  return (
    <nav className={`navbar-flancraft ${menuOpen ? 'menu-open' : ''}`}>
      {isMobile ? (
        <NavbarMobile {...sharedProps} />
      ) : (
        <NavbarDesktop {...sharedProps} />
      )}
    </nav>
  );
};

export default Navbar;
