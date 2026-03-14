import React, { useCallback, useEffect, useMemo, useState } from "react";
import { apiUrl } from "../../../lib/env";
import { normalizeProductForCart } from "../utils/tiendaHelpers";
import "../../../styles/components/Tienda/welcome-pack-popup.scss";

const VALOR_ESTIMADO = 20; // Valor original para tachar

const ICON_COIN = "/tienda/assets/coin.png";
const ICON_MONEY = "/assets/statsperfil/dinero.png";
const ICON_XP = "/tienda/assets/xp.png";
const ICON_ELIXIR = "/tienda/assets/elixir.png";
const ICON_ALPHA = "/assets/rangos/alpha.webp";

export default function TiendaWelcomePackPopup({
  nombreConfirmado,
  uuidConfirmado,
  carrito = [],
  onAgregar,
}) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [visible, setVisible] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [error, setError] = useState("");

  const pack = status?.pack || null;

  const { priceLabel, oldPriceLabel, discountPercent } = useMemo(() => {
    const n = Number(pack?.price) || 4.50;
    const discount = Math.round(((VALOR_ESTIMADO - n) / VALOR_ESTIMADO) * 100);
    
    const formatter = new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: pack?.currency || "EUR",
    });

    return { 
      priceLabel: formatter.format(n), 
      oldPriceLabel: formatter.format(VALOR_ESTIMADO),
      discountPercent: discount 
    };
  }, [pack]);

  const perks = useMemo(() => [
    { label: "1.300 COINS SURVIVAL", detail: "750 + 550 GRATIS", icon: ICON_COIN, color: "yellow" },
    { label: "75.000$ IN-GAME", detail: "Capital inicial de imperio", icon: ICON_MONEY, color: "green" },
    { label: "30 NIVELES DE XP", detail: "Potencia tus encantamientos", icon: ICON_ELIXIR, color: "purple" },
    { label: "130 XP DE /NIVELES", detail: "Progreso instantáneo", icon: ICON_XP, color: "yellow" },
  ], []);

  const inCart = useMemo(() => {
    const targetId = String(pack?.id || "");
    if (!targetId) return false;
    return (carrito || []).some((item) => String(item?.id) === targetId);
  }, [carrito, pack?.id]);

  const loadStatus = useCallback(async () => {
    const jugador = nombreConfirmado?.trim();
    if (!jugador) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({ jugador });
      if (uuidConfirmado) params.set("uuid", uuidConfirmado);

      const r = await fetch(apiUrl(`/api/tebex/bienvenida/status?${params.toString()}`));
      const data = await r.json();

      if (data?.purchased) {
        setVisible(false);
        return;
      }

      // Si la API dice que hay que mostrarlo, lo mostramos (ya no hay "dismiss" local)
      if (data?.shouldShow) {
        setStatus(data);
        setVisible(true);
        
        // Comprobamos si el usuario lo minimizó en esta sesión/navegador
        const isMinimized = localStorage.getItem(`minimized:${jugador}`) === "true";
        setMinimized(isMinimized);
      }
    } catch (e) {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }, [nombreConfirmado, uuidConfirmado]);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  const handleMinimize = (e) => {
    if (e) e.stopPropagation();
    setMinimized(true);
    if (nombreConfirmado) localStorage.setItem(`minimized:${nombreConfirmado}`, "true");
  };

  const handleMaximize = (e) => {
    if (e) e.stopPropagation();
    setMinimized(false);
    if (nombreConfirmado) localStorage.removeItem(`minimized:${nombreConfirmado}`);
  };

  const handleAdd = () => {
    if (!pack || inCart) return;
    onAgregar(normalizeProductForCart(pack, 1), 1);
    setMinimized(true); // Lo dejamos minimizado en background para cuando lo quite del carrito
  };

  // Si no es visible, no hay pack, O ESTÁ EN EL CARRITO, devolvemos null.
  if (!visible || !pack || inCart) return null;

  // VERSIÓN MINI (SIEMPRE visible, sin botón de cerrar)
  if (minimized) {
    return (
      <div className="wp-mini-badge" onClick={handleMaximize}>
        <img src={pack.image_url} alt="Pack" className="wp-mini-img" draggable="false" />
        
        <div className="wp-mini-info">
          <span className="wp-mini-title">Pack de Bienvenida</span>
          <span className="wp-mini-price">
            {priceLabel} <strike className="wp-mini-old">{oldPriceLabel}</strike>
          </span>
        </div>

        <button 
          className="wp-mini-add-btn" 
          onClick={(e) => { e.stopPropagation(); handleAdd(); }}
          disabled={loading}
          title="Añadir al carrito"
        >
          +
        </button>
      </div>
    );
  }

  // VERSIÓN COMPLETA (Modal)
  return (
    <div className="wp-overlay" onClick={handleMinimize}>
      <div className="wp-pixel-modal" onClick={(e) => e.stopPropagation()}>
        <button className="wp-close-x" onClick={handleMinimize}>×</button>
        
        <div className="wp-grid">
          <div className="wp-visual">
            <div className="wp-pixel-tag">OFERTA ÚNICA</div>
            <img src={pack.image_url} className="wp-main-chest" alt="Chest" draggable="false" />
            <div className="wp-value-badge">
              <span>VALORADO EN {VALOR_ESTIMADO}€</span>
              <small>AHORRA UN {discountPercent}%</small>
            </div>
          </div>

          <div className="wp-content">
            <h2 className="wp-pixel-title">PACK DE<br/>BIENVENIDA</h2>
            
            <div className="wp-list">
              {perks.map((perk, i) => (
                <div key={i} className="wp-item">
                  <div className="wp-item-icon">
                    <img src={perk.icon} alt="" draggable="false" />
                  </div>
                  <div className="wp-item-text">
                    <span className={`name ${perk.color}`}>{perk.label}</span>
                    <span className="desc">{perk.detail}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="wp-footer">
              <button className="wp-pixel-btn-green" onClick={handleAdd} disabled={loading}>
                <span className="old-price">~{oldPriceLabel}</span>
                <span className="new-price">{priceLabel}</span>
              </button>
              <p className="wp-disclaimer">OFERTA EXCLUSIVA PARA NUEVOS JUGADORES</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}