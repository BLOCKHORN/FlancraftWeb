import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../../context/UserContext";
import { apiUrl } from "../../lib/env";
import { getAuthToken } from "../../lib/auth/storage";
import Seo from "../SEO/Seo";
import { NEXO_CATALOG } from "./nexo.constants";
import "../../styles/components/Nexo/_nexo.scss";

const FLANITE_SRC = "/tienda/assets/flanite.webp";

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function formatInt(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "0";
  return new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 }).format(Math.round(v));
}

function useCountTransition(active, startVal, endVal, duration = 800) {
  const [val, setVal] = useState(startVal);
  const rafRef = useRef(null);

  useEffect(() => {
    if (!active) {
      setVal(startVal);
      return;
    }
    
    let start = null;
    const tick = (ts) => {
      if (!start) start = ts;
      const t = clamp((ts - start) / duration, 0, 1);
      const eased = easeOutCubic(t);
      setVal(Math.round(startVal - (startVal - endVal) * eased));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [active, startVal, endVal, duration]);

  return val;
}

export default function NexoLayout() {
  const navigate = useNavigate();
  const { user, setUser } = useContext(UserContext);
  const token = getAuthToken();

  const [balanceActual, setBalanceActual] = useState(0);
  const [artefactosUsuario, setArtefactosUsuario] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [forgeState, setForgeState] = useState("idle"); 
  const [errorMsg, setErrorMsg] = useState("");
  const [activeFilter, setActiveFilter] = useState("todos");
  
  const [historial, setHistorial] = useState([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);

  useEffect(() => {
    if (!user?.uuid) return;
    let active = true;
    
    fetch(apiUrl(`/api/usuarios/${user.uuid}`))
      .then(res => res.json())
      .then(data => {
        if (active) {
          if (data?.flanpoints !== undefined) setBalanceActual(Number(data.flanpoints));
          if (Array.isArray(data?.artefactos_nexo)) setArtefactosUsuario(data.artefactos_nexo);
        }
      })
      .catch(() => {});

    return () => { active = false; };
  }, [user?.uuid]);

  useEffect(() => {
    if (activeFilter === "historial" && historial.length === 0 && user?.uuid) {
      const fetchHistorial = async () => {
        setLoadingHistorial(true);
        try {
          const res = await fetch(apiUrl('/api/nexo/historial'), {
            headers: { Authorization: `Bearer ${token}` }
          });
          const data = await res.json();
          if (res.ok && Array.isArray(data)) {
            setHistorial(data);
          }
        } catch (err) {
          console.error(err);
        } finally {
          setLoadingHistorial(false);
        }
      };
      fetchHistorial();
    }
  }, [activeFilter, historial.length, user?.uuid, token]);

  const isDeducting = forgeState === "deducting";
  const targetBalance = selectedItem ? Math.max(0, balanceActual - selectedItem.precio) : balanceActual;
  
  const animatedBalance = useCountTransition(isDeducting, balanceActual, targetBalance, 1000);
  const displayBalance = forgeState === "success" ? targetBalance : (isDeducting ? animatedBalance : balanceActual);

  useEffect(() => {
    if (forgeState !== "idle") return;
    const onKey = (e) => e.key === "Escape" && setSelectedItem(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedItem, forgeState]);

  const getAvatar = () => {
    const uid = user?.uid || "";
    if (uid.startsWith(".")) return `https://crafthead.net/avatar/${user?.uuid}/40`;
    return `https://mc-heads.net/avatar/${uid}/40.png`;
  };

  const handleOpenModal = (item) => {
    if (forgeState !== "idle") return;
    setErrorMsg("");
    setSelectedItem(item);
  };

  const handleCloseModal = () => {
    if (forgeState === "forging" || forgeState === "deducting") return;
    setSelectedItem(null);
    setForgeState("idle");
    setErrorMsg("");
  };

  const handleForge = async () => {
    if (!selectedItem || forgeState !== "idle") return;
    if (balanceActual < selectedItem.precio) {
      setErrorMsg("No tienes suficiente Flanite.");
      return;
    }

    setForgeState("forging");
    setErrorMsg("");

    try {
      const [res] = await Promise.all([
        fetch(apiUrl(`/api/nexo/canjear`), {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ itemId: selectedItem.id })
        }),
        new Promise(resolve => setTimeout(resolve, 800))
      ]);

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "La forja ha fallado.");

      setForgeState("deducting");

      setTimeout(() => {
        setBalanceActual(data.nuevoSaldo);
        if (selectedItem.categoria === "permanente") {
          setArtefactosUsuario(prev => [...prev, selectedItem.id]);
        }
        setUser({ ...user, flanpoints: data.nuevoSaldo }, token);
        setHistorial([]);
        setForgeState("success");
      }, 1100);

    } catch (err) {
      setErrorMsg(err.message);
      setForgeState("idle");
    }
  };

  const majorItems = useMemo(() => NEXO_CATALOG.filter(i => i.categoria === "permanente"), []);
  const minorItems = useMemo(() => NEXO_CATALOG.filter(i => i.categoria !== "permanente"), []);
  
  const filteredItems = useMemo(() => {
    if (activeFilter === "todos" || activeFilter === "historial") return [];
    return NEXO_CATALOG.filter(i => i.categoria === activeFilter);
  }, [activeFilter]);

  const isOwned = (item) => item.categoria === "permanente" && artefactosUsuario.includes(item.id);

  const ItemCard = ({ item, isMajor }) => {
    const owned = isOwned(item);
    return (
      <article className={`nx-card is-${item.rareza} ${isMajor ? "is-major-card" : ""} ${owned ? "is-owned" : ""}`} onClick={() => handleOpenModal(item)}>
        <div className="nx-card-header">
          <div className="nx-card-rarity-tag">{item.rareza.toUpperCase()}</div>
          <h3 className="nx-card-name">{item.nombre}</h3>
          <div className="nx-card-efecto">{item.efecto}</div>
        </div>
        
        <div className="nx-card-art">
          <div className="nx-card-aura" />
          <img src={item.imagen} alt="" className="nx-card-img" draggable="false" />
        </div>

        <div className="nx-card-price-container">
          <div className="nx-card-price-pill">
            {owned ? (
              <span className="nx-owned-text">ADQUIRIDO</span>
            ) : (
              <>
                <img src={FLANITE_SRC} alt="" className="nx-mini-flt" />
                <span>{formatInt(item.precio)}</span>
              </>
            )}
          </div>
        </div>

        <div className="nx-card-footer">
          <button className="nx-card-forge-btn" disabled={owned}>
            {owned ? "EN POSESIÓN" : "FORJAR"}
          </button>
        </div>
      </article>
    );
  };

  const selectedIsOwned = selectedItem && isOwned(selectedItem);

  const modalNode = selectedItem && createPortal(
    <div className="nx-overlay" onClick={handleCloseModal}>
      <div className={`nx-modal ${forgeState === "success" ? "is-modal-success" : ""}`} onClick={(e) => e.stopPropagation()}>
        {forgeState !== "forging" && forgeState !== "deducting" && <button className="nx-close" onClick={handleCloseModal}>✖</button>}
        
        {forgeState === "success" ? (
          <div className="nx-modal-success-view">
            <h2 className="nx-success-title">¡ARTEFACTO FORJADO!</h2>
            <div className={`nx-success-art is-${selectedItem.rareza}`}>
              <div className="nx-success-aura" />
              <img src={selectedItem.imagen} alt="" className="nx-success-img" draggable="false" />
            </div>
            <p className="nx-success-text">El poder de <strong>{selectedItem.nombre}</strong> ya está disponible en tu cuenta del servidor.</p>
            <button className="nx-btn-action is-continue" onClick={handleCloseModal}>CONTINUAR</button>
          </div>
        ) : (
          <div className="nx-modal-content">
            <div className="nx-modal-left">
              <div className={`nx-item-showcase is-${selectedItem.rareza} ${forgeState === "forging" || forgeState === "deducting" ? "is-forging" : ""}`}>
                <div className="nx-showcase-aura" />
                <img src={selectedItem.imagen} alt="" className="nx-showcase-img" draggable="false" />
              </div>
            </div>
            
            <div className="nx-modal-right">
              <h2 className="nx-modal-title">{selectedItem.nombre}</h2>
              <div className={`nx-modal-rarity is-${selectedItem.rareza}`}>
                {selectedIsOwned ? "EN TU POSESIÓN" : selectedItem.rareza}
              </div>
              
              <div className="nx-modal-efecto-badge">{selectedItem.efecto}</div>
              <p className="nx-modal-lore">{selectedItem.lore}</p>
              
              <div className={`nx-modal-cost-box ${forgeState === "success" ? "is-success-box" : ""}`}>
                <div className="nx-cost-row">
                  <span className="nx-cost-label">Coste de Forja:</span>
                  <span className="nx-cost-value">{formatInt(selectedItem.precio)} <img src={FLANITE_SRC} alt="" className="nx-inline-flt" /></span>
                </div>
                <div className="nx-cost-row is-balance">
                  <span className="nx-cost-label">Tu Flanite:</span>
                  <span className={`nx-cost-value ${forgeState === "deducting" ? "is-draining" : ""}`}>{formatInt(displayBalance)} <img src={FLANITE_SRC} alt="" className="nx-inline-flt" /></span>
                </div>
              </div>

              {errorMsg && <div className="nx-modal-error">{errorMsg}</div>}

              <div className="nx-modal-actions">
                {forgeState === "forging" || forgeState === "deducting" ? (
                  <button className="nx-btn-action is-forging" disabled>CANALIZANDO ENERGÍA...</button>
                ) : (
                  <button 
                    className="nx-btn-action is-forge" 
                    onClick={handleForge} 
                    disabled={balanceActual < selectedItem.precio || selectedIsOwned}
                  >
                    {selectedIsOwned ? "YA EN POSESIÓN" : "FORJAR ARTEFACTO"}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );

  return (
    <>
      <Seo title="El Nexo | Flancraft" noindex />
      <section className="nx-layout no-tap-highlight">
        <div className="nx-background-temple" />
        
        <div className="nx-container">
          
          <div className="nx-top-bar">
            <button className="nx-back-btn" onClick={() => navigate("/dashboard")}>← VOLVER</button>
            <div className="nx-balance-box">
              <span className="nx-balance-label">SALDO FLANITE</span>
              <div className="nx-balance-amount">
                <img src={FLANITE_SRC} alt="" className="nx-balance-icon" draggable="false" />
                <span>{formatInt(balanceActual)}</span>
              </div>
            </div>
          </div>

          <div className="nx-hero">
            <h1 className="nx-title">EL NEXO</h1>
            <p className="nx-subtitle">La forja de fragmentos. Imbuye tu destino con energía ancestral.</p>
          </div>
          
          <div className="nx-board">
            
            <div className="nx-board-tabs">
              <button className={`nx-tab ${activeFilter === "todos" ? "is-active" : ""}`} onClick={() => setActiveFilter("todos")}>CATÁLOGO</button>
              <button className={`nx-tab ${activeFilter === "permanente" ? "is-active" : ""}`} onClick={() => setActiveFilter("permanente")}>PERMANENTES</button>
              <button className={`nx-tab ${activeFilter === "temporal" ? "is-active" : ""}`} onClick={() => setActiveFilter("temporal")}>TEMPORALES</button>
              <button className={`nx-tab ${activeFilter === "consumible" ? "is-active" : ""}`} onClick={() => setActiveFilter("consumible")}>CONSUMIBLES</button>
              <button className={`nx-tab ${activeFilter === "historial" ? "is-active" : ""}`} onClick={() => setActiveFilter("historial")}>REGISTRO</button>
            </div>

            <div className="nx-board-content">
              {activeFilter === "todos" ? (
                <>
                  <h2 className="nx-section-title">ARTEFACTOS MAYORES</h2>
                  <div className="nx-grid is-major">{majorItems.map(i => <ItemCard key={i.id} item={i} isMajor />)}</div>
                  
                  <div className="nx-divider" />
                  
                  <h2 className="nx-section-title">FRAGMENTOS CONSUMIBLES</h2>
                  <div className="nx-grid is-minor">{minorItems.map(i => <ItemCard key={i.id} item={i} isMajor={false} />)}</div>
                </>
              ) : activeFilter === "historial" ? (
                <div className="nx-historial-wrap">
                  <h2 className="nx-section-title">REGISTRO AKÁSHICO</h2>
                  {loadingHistorial ? (
                    <div className="nx-historial-empty">Conectando con la forja...</div>
                  ) : historial.length === 0 ? (
                    <div className="nx-historial-empty">Aún no has forjado ningún artefacto.</div>
                  ) : (
                    <div className="nx-historial-list">
                      {historial.map(mov => (
                        <div key={mov.id} className="nx-historial-item">
                          <img src={getAvatar()} alt="" className="nx-historial-avatar mc-pixelated" />
                          <div className="nx-historial-info">
                            <div className="nx-historial-action">
                              <span className="nx-historial-player">{user?.uid || "Tú"}</span> forjó <span className="nx-historial-artefact">{mov.meta?.item || "Artefacto"}</span>
                            </div>
                            <div className="nx-historial-date">
                              {new Date(mov.created_at).toLocaleString("es-ES")}
                            </div>
                          </div>
                          <div className="nx-historial-cost">
                            {formatInt(Math.abs(mov.amount))} <img src={FLANITE_SRC} alt="" className="nx-mini-flt" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="nx-grid is-minor">
                  {filteredItems.map(i => <ItemCard key={i.id} item={i} isMajor={i.categoria === "permanente"} />)}
                </div>
              )}
            </div>

          </div>

        </div>
      </section>
      {modalNode}
    </>
  );
}