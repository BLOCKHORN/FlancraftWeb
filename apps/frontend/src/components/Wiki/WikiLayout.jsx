import React, { useState, useEffect } from "react";
import { Link, Routes, Route, useLocation } from "react-router-dom";
import WikiHome from "./WikiHome";
import WikiSection from "./WikiSection";
import "../../styles/components/Wiki/Wiki.scss";

const WikiLayout = () => {
  const location = useLocation();
  const [isSidebarOpen, setSidebarOpen] = useState(window.innerWidth > 1200);
  const [theme, setTheme] = useState(localStorage.getItem("wiki-theme") || "dark");
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1200);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 1200;
      setIsMobile(mobile);
      if (!mobile && !isSidebarOpen) {
        setSidebarOpen(true);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isSidebarOpen]);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("wiki-theme", newTheme);
  };

  const closeSidebarOnMobile = () => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Repositorio verificado por el usuario
  const blockUrl = "https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20.4/assets/minecraft/textures/block/";
  const itemUrl = "https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20.4/assets/minecraft/textures/item/";
  
  const [searchTerm, setSearchTerm] = useState("");

  const categories = [
    { id: "inicio", title: "Primeros Pasos", icon: blockUrl + "crafting_table_front.png" },
    { id: "trabajos", title: "Trabajos", icon: itemUrl + "iron_helmet.png" },
    { id: "factorias", title: "Factorías", icon: blockUrl + "furnace_front.png" },
    { id: "economia", title: "Economía", icon: itemUrl + "emerald.png" },
    { id: "forja", title: "La Forja", icon: blockUrl + "anvil.png" },
    { id: "crates", title: "Cajas y Votos", icon: itemUrl + "chest_minecart.png" },
    { id: "rpg", title: "RPG & Combate", icon: itemUrl + "diamond_sword.png" },
    { id: "encantamientos", title: "Encantamientos", icon: itemUrl + "enchanted_book.png" },
    { id: "protecciones", title: "Protecciones", icon: blockUrl + "bedrock.png" },
  ];

  const filteredCategories = categories.filter(cat => 
    cat.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    if (isMobile && isSidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isSidebarOpen, isMobile]);

  return (
    <div className={`wiki-master-container theme-${theme} ${isSidebarOpen ? "sidebar-visible" : "sidebar-hidden"}`}>
      <div className="wiki-wynn-wrapper">
        {isMobile && isSidebarOpen && (
          <div className="wiki-sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
        )}
        <aside className={`wiki-sidebar ${isSidebarOpen ? "open" : "closed"}`}>
          <div className="sidebar-header">
            <div className="header-text">
              <span className="main-title">FLANCRAFT</span>
              <span className="sub-title">Wiki Oficial</span>
            </div>
            {isMobile && (
              <button className="close-sidebar-btn" onClick={() => setSidebarOpen(false)}>×</button>
            )}
          </div>
          
          <div className="sidebar-search">
            <input 
              type="text" 
              placeholder="Buscar..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <nav className="sidebar-nav">
            <Link 
              to="/wiki" 
              className={`nav-item ${location.pathname === "/wiki" ? "active" : ""}`}
              onClick={closeSidebarOnMobile}
            >
              <div className="nav-icon-wrapper">
                <img src={blockUrl + "grass_block_side.png"} alt="Home" />
              </div>
              <span>Inicio</span>
            </Link>
            
            <div className="nav-separator">CONTENIDO</div>
            
            {filteredCategories.map((cat) => (
              <Link 
                key={cat.id} 
                to={`/wiki/${cat.id}`} 
                className={`nav-item ${location.pathname.includes(cat.id) ? "active" : ""}`}
                onClick={closeSidebarOnMobile}
              >
                <div className="nav-icon-wrapper">
                  <img src={cat.icon} alt={cat.title} />
                </div>
                <span>{cat.title}</span>
              </Link>
            ))}

            <div className="nav-separator">AJUSTES</div>
            <button className="nav-item" onClick={toggleTheme} type="button">
              <div className="nav-icon-wrapper">
                <span style={{fontSize: '1.2rem'}}>{theme === "dark" ? "☀️" : "🌙"}</span>
              </div>
              <span>Modo {theme === "dark" ? "Claro" : "Oscuro"}</span>
            </button>
          </nav>
        </aside>

        <main className="wiki-main-content">
          <div className="wiki-render-area">
            <Routes>
              <Route path="/" element={<WikiHome />} />
              <Route path="/:section" element={<WikiSection />} />
            </Routes>
          </div>
        </main>
      </div>

      <button 
        className={`sidebar-mobile-toggle ${isSidebarOpen ? "active" : ""}`} 
        onClick={() => setSidebarOpen(!isSidebarOpen)} 
        aria-label="Toggle Sidebar"
      >
        <div className="burger">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </button>
    </div>
  );
};

export default WikiLayout;