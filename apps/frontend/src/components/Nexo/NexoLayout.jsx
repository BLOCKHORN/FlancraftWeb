import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../../context/UserContext";
import { apiUrl } from "../../lib/env";
import { getAuthToken } from "../../lib/auth/storage";
import { ArrowLeft } from "lucide-react";
import Seo from "../SEO/Seo";
import "../../styles/components/Nexo/_nexo.scss";

export const FlaniteIcon = ({ size = 24, className = "flanite-img" }) => (
  <img 
    src="/tienda/assets/flanite.webp" 
    alt="Flanite" 
    className={className} 
    style={{ width: size, height: size, imageRendering: "pixelated" }} 
    draggable="false"
  />
);

export default function NexoLayout() {
  const { user, setUser } = useContext(UserContext);
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("catalogo");
  const [catalogo, setCatalogo] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [buyingId, setBuyingId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user?.loggedIn) {
      navigate("/");
      return;
    }
    cargarDatosNexo();
  }, [user?.loggedIn, navigate]);

  const cargarDatosNexo = async () => {
    const token = getAuthToken();
    if (!token) return;

    try {
      setLoading(true);
      setError(null);

      const [resUser, resCat, resHist] = await Promise.all([
        fetch(apiUrl(`/api/usuarios/${user.uuid}`)),
        fetch(apiUrl("/api/flanpoints/catalogo"), { headers: { Authorization: `Bearer ${token}` } }),
        fetch(apiUrl("/api/flanpoints/historial"), { headers: { Authorization: `Bearer ${token}` } })
      ]);

      // 1. Sincronizamos el saldo SIEMPRE, aunque el catálogo falle
      if (resUser.ok) {
        const userData = await resUser.json();
        if (userData.flanpoints !== undefined) {
          setUser({ ...user, flanpoints: userData.flanpoints }, token);
        }
      }

      // 2. Comprobamos catálogo
      if (!resCat.ok) throw new Error("El Nexo no responde. Inténtalo más tarde.");
      
      const catData = await resCat.json();
      const histData = resHist.ok ? await resHist.json() : [];

      setCatalogo(catData);
      setHistorial(histData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleComprar = async (item) => {
    if ((user.flanpoints || 0) < item.precio) {
      alert("Flanite insuficiente para forjar este artefacto.");
      return;
    }

    if (!window.confirm(`¿Inyectar ${item.precio} FLT para desbloquear: ${item.nombre}?`)) {
      return;
    }

    const token = getAuthToken();
    setBuyingId(item.id);

    try {
      const res = await fetch(apiUrl("/api/flanpoints/canjear"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ itemId: item.id })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fallo en la matriz de canje.");

      if (data.nuevoSaldo !== undefined) {
        setUser({ ...user, flanpoints: data.nuevoSaldo }, token);
      }
      
      alert(`¡${item.nombre} forjado con éxito! Se aplicará en el servidor.`);
      cargarDatosNexo(); 
    } catch (err) {
      alert(err.message);
    } finally {
      setBuyingId(null);
    }
  };

  if (!user?.loggedIn) return null;

  return (
    <section className="sc-nexo-wrapper">
      <Seo title="El Nexo | Flancraft" noindex />
      <div className="sc-ambient-bg" />

      <div className="sc-nexo-container">
        
        {/* SIDEBAR SUPERCELL STYLE */}
        <aside className="sc-sidebar">
          <button className="sc-back-btn" onClick={() => navigate("/dashboard")}>
            <ArrowLeft size={20} strokeWidth={3} /> <span className="txt">VOLVER A LA POSADA</span>
          </button>

          <div className="sc-identity-card">
            <div className="sc-id-top">
              <div className="sc-crystal-float">
                <FlaniteIcon size={72} />
              </div>
              <div className="sc-brand-group">
                <h1 className="sc-brand-title">EL NEXO</h1>
                <p className="sc-brand-user">{user.uid}</p>
              </div>
            </div>

            <div className="sc-wallet-box">
              <span className="sc-wallet-lbl">SALDO DISPONIBLE</span>
              <div className="sc-wallet-val">
                <span className="num">{user.flanpoints || 0}</span>
                <span className="iso">FLT</span>
              </div>
            </div>
          </div>

          <nav className="sc-menu">
            <button 
              className={`sc-menu-btn ${activeTab === "catalogo" ? "is-active" : ""}`}
              onClick={() => setActiveTab("catalogo")}
            >
              CATÁLOGO
            </button>
            <button 
              className={`sc-menu-btn ${activeTab === "historial" ? "is-active" : ""}`}
              onClick={() => setActiveTab("historial")}
            >
              HISTORIAL
            </button>
          </nav>
        </aside>

        {/* CONTENIDO PRINCIPAL */}
        <main className="sc-main-panel">
          {loading ? (
            <div className="sc-state-box">
              <div className="sc-spinner" />
              <span>Conectando...</span>
            </div>
          ) : error ? (
            <div className="sc-state-box is-error">
              <span>{error}</span>
              <button className="sc-btn-retry" onClick={cargarDatosNexo}>REINTENTAR</button>
            </div>
          ) : activeTab === "catalogo" ? (
            <div className="sc-view">
              <div className="sc-view-header">
                <h2>ARTEFACTOS DISPONIBLES</h2>
                <p>Tecnología prohibida a cambio de Flanite.</p>
              </div>

              {catalogo.length === 0 ? (
                <div className="sc-empty-box">Catálogo vacío.</div>
              ) : (
                <div className="sc-grid">
                  {catalogo.map((item) => {
                    const canAfford = (user.flanpoints || 0) >= item.precio;
                    const isBuying = buyingId === item.id;

                    return (
                      <article key={item.id} className="sc-new-card">
                        <div className="sc-card-header">
                          <h3 className="sc-item-name">{item.nombre}</h3>
                        </div>

                        <div className="sc-card-body">
                          <div className="sc-item-visual-container">
                            <div className="sc-item-glow-bg" />
                            <div className="sc-item-icon">
                              {item.tipo === "economia" ? "💰" : item.tipo === "permiso" ? "🗝️" : "⚡"}
                            </div>
                          </div>
                        </div>

                        <div className="sc-card-footer">
                          <button 
                            className="sc-btn-price-tag"
                            disabled={!canAfford || isBuying}
                            onClick={() => handleComprar(item)}
                          >
                            <FlaniteIcon size={20} className="flanite-icon-btn" />
                            <span className="price">{item.precio} </span>
                          </button>
                          
                          {canAfford ? (
                            <span className="sc-stock-txt">Disponible: Ilimitado</span>
                          ) : (
                            <span className="sc-locked-txt-new">SALDO INSUFICIENTE</span>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="sc-view">
              <div className="sc-view-header">
                <h2>REGISTRO AKÁSHICO</h2>
                <p>Historial inmutable de transacciones.</p>
              </div>

              {historial.length === 0 ? (
                <div className="sc-empty-box">No tienes movimientos registrados.</div>
              ) : (
                <div className="sc-table-wrap">
                  <table className="sc-table">
                    <thead>
                      <tr>
                        <th>FECHA</th>
                        <th>CONCEPTO</th>
                        <th className="align-right">IMPORTE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historial.map((log) => {
                        const isPositive = log.amount > 0;
                        return (
                          <tr key={log.id}>
                            <td className="sc-td-date">
                              {new Date(log.created_at).toLocaleDateString("es-ES", {
                                day: '2-digit', month: 'short', year: 'numeric'
                              })}
                            </td>
                            <td className="sc-td-concept">
                              {log.meta?.item || log.motivo}
                            </td>
                            <td className={`sc-td-amount align-right ${isPositive ? "is-income" : "is-expense"}`}>
                              {isPositive ? "+" : ""}{log.amount} FLT
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </main>

      </div>
    </section>
  );
}