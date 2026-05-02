import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../../context/UserContext";
import { apiUrl } from "../../lib/env";
import { getAuthToken } from "../../lib/auth/storage";
import { apiGet, apiPost } from "../../lib/api/client";
import Seo from "../SEO/Seo";
import { NEXO_CATALOG } from "./nexo.constants";
import NexoCard from "./NexoCard";
import toast from "react-hot-toast";
import "../../styles/components/Nexo/_nexo.scss";

const FLANITE_SRC = "/tienda/assets/flanite.webp";
const NETHERITE_SRC = "/tienda/assets/minerals/netherite.webp";
const FIRE_GIF_SRC = "/tienda/assets/fire.gif";

function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
function formatInt(n) { const v = Number(n); if (!Number.isFinite(v)) return "0"; return new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 }).format(Math.round(v)); }

function useCountTransition(active, startVal, endVal, duration = 800) {
  const [val, setVal] = useState(startVal);
  const rafRef = useRef(null);

  useEffect(() => {
    if (!active) { setVal(startVal); return; }
    let start = null;
    const tick = (ts) => {
      if (!start) start = ts;
      const t = clamp((ts - start) / duration, 0, 1);
      const eased = easeOutCubic(t);
      setVal(Math.round(startVal - (startVal - endVal) * eased));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
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

  const [netheriteShares, setNetheriteShares] = useState(0);
  const [netheritePrice, setNetheritePrice] = useState(350);
  
  // Nuevo estado para la animación visual del Altar
  const [isBurning, setIsBurning] = useState(false);

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
      }).catch(() => {});

    const fetchMarketData = async () => {
      try {
        const [pricesRes, portRes] = await Promise.all([
          apiGet("/api/bolsa/live"),
          apiGet(`/api/bolsa/portfolio/${user.uuid}`)
        ]);
        
        if (active && pricesRes) {
           const netherite = pricesRes.find(p => p.mineral_id === "NETHERITE_INGOT");
           if (netherite) setNetheritePrice(netherite.current_coin_price);
        }
        
        if (active && portRes && portRes.portfolio) {
           const nPort = portRes.portfolio.find(p => p.mineral_id === "NETHERITE_INGOT");
           if (nPort) setNetheriteShares(nPort.shares);
        }
      } catch (e) {}
    };

    fetchMarketData();
    const interval = setInterval(fetchMarketData, 10000); 

    return () => { active = false; clearInterval(interval); };
  }, [user?.uuid]);

  useEffect(() => {
    if (activeFilter === "historial" && historial.length === 0 && user?.uuid) {
      const fetchHistorial = async () => {
        setLoadingHistorial(true);
        try {
          const res = await fetch(apiUrl('/api/nexo/historial'), { headers: { Authorization: `Bearer ${token}` } });
          const data = await res.json();
          if (res.ok && Array.isArray(data)) setHistorial(data);
        } catch (err) {} finally { setLoadingHistorial(false); }
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
    if (balanceActual < selectedItem.precio) { setErrorMsg("No tienes suficiente Flanite."); return; }

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
        if (selectedItem.categoria === "permanente") setArtefactosUsuario(prev => [...prev, selectedItem.id]);
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

  const checkIsOwned = (item) => item.categoria === "permanente" && artefactosUsuario.includes(item.id);
  const selectedIsOwned = selectedItem && checkIsOwned(selectedItem);

  const flaniteReward = Math.round(netheritePrice / 4);

  const handleSacrifice = async () => {
    if (netheriteShares < 1 || forgeState !== "idle") return;
    setForgeState("forging");
    setIsBurning(true);

    try {
      const actualName = user.nombre_minecraft || user.username || "Inversor";
      const orderRes = await apiPost("/api/bolsa/trade", {
        uuid: user.uuid,
        playerName: actualName,
        mineralId: "NETHERITE_INGOT",
        type: "BURN",
        amount: 1
      });

      let attempts = 0;
      const poll = setInterval(async () => {
        attempts++;
        try {
          const statusRes = await apiGet(`/api/bolsa/order-status/${orderRes.id}`);
          if (statusRes.status === 'COMPLETED') {
            clearInterval(poll);
            
            try { const audio = new Audio("/tienda/assets/sounds/jackpot.mp3"); audio.volume = 0.6; audio.play().catch(()=>{}); } catch(e){}

            setNetheriteShares(prev => prev - 1);
            setBalanceActual(prev => prev + flaniteReward);
            setUser({ ...user, flanpoints: balanceActual + flaniteReward }, token);
            
            // Retrasamos un pelín el fin de la animación del fuego para dar efecto
            setTimeout(() => {
               setForgeState("idle");
               setIsBurning(false);
            }, 800);

          } else if (statusRes.status !== 'PENDING') {
            clearInterval(poll);
            setForgeState("idle");
            setIsBurning(false);
            toast.custom((t) => (
              <div className={`mc-toast-error ${t.visible ? 'animate-enter' : 'animate-leave'}`}>
                <span className="toast-title">RITUAL RECHAZADO</span>
                <span className="toast-sub">Faltan recursos en bóveda.</span>
              </div>
            ), { duration: 5000 });
          }
          if (attempts > 40) {
            clearInterval(poll);
            setForgeState("idle");
            setIsBurning(false);
          }
        } catch(e) {}
      }, 500);
    } catch (error) {
      setForgeState("idle");
      setIsBurning(false);
    }
  };

  const modalNode = selectedItem && createPortal(
    <div className="nx-overlay" onClick={handleCloseModal}>
      <div className={`nx-modal ${forgeState === "success" ? "is-modal-success" : ""}`} onClick={(e) => e.stopPropagation()}>
        {forgeState !== "forging" && forgeState !== "deducting" && <button className="nx-close" onClick={handleCloseModal}>✖</button>}
        
        {forgeState === "success" ? (
          <div className="nx-modal-success-view">
            <h2 className="nx-success-title">¡ARTEFACTO FORJADO!</h2>
            <div className={`nx-success-art is-${selectedItem.rareza}`}>
              <div className="nx-success-slot-bg" />
              <img src={selectedItem.imagen} alt="" className="nx-success-img" draggable="false" />
            </div>
            <p className="nx-success-text">El poder de <strong className={`is-${selectedItem.rareza}-text`}>{selectedItem.nombre}</strong> está en tu cuenta.</p>
            <button className="nx-btn nx-btn-success" onClick={handleCloseModal}>CONTINUAR</button>
          </div>
        ) : (
          <div className="nx-modal-content">
            <div className="nx-modal-left">
              <div className={`nx-item-showcase is-${selectedItem.rareza} ${forgeState === "forging" || forgeState === "deducting" ? "is-forging" : ""}`}>
                <div className="nx-showcase-slot-bg" />
                <img src={selectedItem.imagen} alt="" className="nx-showcase-img" draggable="false" />
              </div>
            </div>
            
            <div className="nx-modal-right">
              <h2 className="nx-modal-title">{selectedItem.nombre}</h2>
              <div className={`nx-modal-rarity is-${selectedItem.rareza}-text`}>
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
                  <button className="nx-btn nx-btn-forging" disabled>CANALIZANDO ENERGÍA...</button>
                ) : (
                  <button 
                    className="nx-btn nx-btn-forge-modal" 
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
      <Seo title="La Forja | Flancraft" noindex />
      <section className="nx-layout no-tap-highlight">
        <div className="nx-background-temple" />
        
        <div className="nx-container">
          
          <div className="nx-top-hud">
            <button className="nx-btn-hud is-back" onClick={() => navigate("/dashboard")}>← VOLVER</button>
            <div className="nx-hud-balance">
              <span className="nx-hud-label">FLANITE DISPONIBLE</span>
              <div className="nx-hud-amount">
                <span>{formatInt(balanceActual)}</span>
                <img src={FLANITE_SRC} alt="" className="nx-hud-icon" draggable="false" />
              </div>
            </div>
          </div>

          <div className="nx-hero">
            <h1 className="nx-title">LA FORJA</h1>
            <p className="nx-subtitle">Destruye la materia. Obtén poder divino.</p>
          </div>

          <div className="nx-sacrificial-altar">
             <div className="altar-info">
                <h3>EL ALTAR DE QUEMA</h3>
                <p>Sacrifica Netherites de tu bóveda bursátil (BlockStreet) para obtener energía cósmica pura <strong>(Flanite)</strong>. Al quemarlos, desaparecen del mercado para siempre, aumentando el valor de la moneda global.</p>
                <div className="altar-rates">
                  <span>Recompensa de forja hoy:</span>
                  <div className="rate-badge">
                     <strong>1</strong> <img src={NETHERITE_SRC} className="mc-pixelated inline-icon" alt="neth"/> 
                     <span> = </span> 
                     <strong style={{color: '#ffaa00'}}>+{flaniteReward}</strong> <img src={FLANITE_SRC} className="mc-pixelated inline-icon" alt="flanite"/>
                  </div>
                </div>
             </div>
             
             <div className="altar-action">
                <div className={`altar-stock-visual ${isBurning ? 'is-burning' : ''}`}>
                  {/* Animación del Fuego superpuesta al item */}
                  <img src={FIRE_GIF_SRC} className="fire-overlay" alt="fire" />
                  <img src={NETHERITE_SRC} className="mc-pixelated stock-item" alt="neth" />
                  <div className="stock-count">{netheriteShares}</div>
                </div>
                
                <button 
                  className={`nx-btn-sacrifice ${isBurning ? 'disabled-burn' : ''}`} 
                  disabled={netheriteShares < 1 || forgeState !== "idle"}
                  onClick={handleSacrifice}
                >
                  {isBurning ? "QUEMANDO MATERIA..." : "SACRIFICAR 1 NETHERITE"}
                </button>
             </div>
          </div>
          
          <div className="nx-gui-panel">
            
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
                  <div className="nx-grid">
                    {majorItems.map(i => <NexoCard key={i.id} item={i} isOwned={checkIsOwned(i)} onOpenModal={handleOpenModal} />)}
                  </div>
                  
                  <div className="nx-divider" />
                  
                  <h2 className="nx-section-title">FRAGMENTOS DE PODER</h2>
                  <div className="nx-grid">
                    {minorItems.map(i => <NexoCard key={i.id} item={i} isOwned={checkIsOwned(i)} onOpenModal={handleOpenModal} />)}
                  </div>
                </>
              ) : activeFilter === "historial" ? (
                <div className="nx-historial-wrap">
                  <h2 className="nx-section-title">REGISTRO DE LA FORJA</h2>
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
                <div className="nx-grid">
                  {filteredItems.map(i => <NexoCard key={i.id} item={i} isOwned={checkIsOwned(i)} onOpenModal={handleOpenModal} />)}
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