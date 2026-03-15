import React, { useMemo, useState, useCallback } from "react";
import useMinecraftProfile from "../hooks/useMinecraftProfile";
import TiendaCheckoutModal from "../modals/TiendaCheckoutModal";
import { apiUrl } from "../../../lib/env";
import "../../../styles/components/Tienda/tienda-carrito.scss";

// Helpers
function formatCurrency(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(n);
}

function clampInt(n, min, max) {
  const x = Math.trunc(Number(n));
  return !Number.isFinite(x) ? min : Math.max(min, Math.min(max, x));
}

function pickQty(it) {
  const q = Number(it?.quantity ?? it?.cantidad ?? 0);
  return Math.max(1, Math.min(999, Number.isFinite(q) ? q : 1));
}

function pickImg(it) {
  return it?.image || it?.image_url || it?.imageUrl || it?.img || it?.icon || null;
}

const FallbackIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M21 7l-4-4-6 6 4 4 6-6Z" strokeLinejoin="round" />
    <path d="M3 21l6-6" strokeLinecap="round" />
  </svg>
);

export default function TiendaCarritoLateral({
  carrito = [],
  onAgregar,
  eliminarItem,
  vaciarCarrito,
  total: totalFromHook,
  onCambiarCantidad,
  onSetCantidad,
  nombreConfirmado,
  uuidConfirmado,
  onAbrirLogin,
  onCambiarCuenta,
  isWebLoggedIn = false,
  server = "survival",
  basketPulse = false,
  mode = "desktop",
  onRequestClose,
}) {
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutIdent, setCheckoutIdent] = useState("");

  const profile = useMinecraftProfile(nombreConfirmado);
  const isEmpty = carrito.length === 0;

  const totalBase = useMemo(() => {
    if (typeof totalFromHook === "number") return totalFromHook;
    return carrito.reduce((acc, it) => acc + (Number(it.price) || 0) * pickQty(it), 0);
  }, [carrito, totalFromHook]);

  const handleRemove = useCallback((item) => {
    if (!item?.id) return;
    if (typeof eliminarItem === "function") return eliminarItem(item.id);
    if (typeof onSetCantidad === "function") return onSetCantidad(item.id, 0, item);
  }, [eliminarItem, onSetCantidad]);

  const handleQty = useCallback((item, delta) => {
    const current = pickQty(item);
    if (typeof onCambiarCantidad === "function") return onCambiarCantidad(item.id, delta, item);
    if (typeof onSetCantidad === "function") return onSetCantidad(item.id, clampInt(current + delta, 0, 999), item);
  }, [onCambiarCantidad, onSetCantidad]);

  const handleCheckout = useCallback(async () => {
    if (!nombreConfirmado || isEmpty || loadingCheckout) return;
    setLoadingCheckout(true);
    try {
      const items = carrito.map((it) => ({ id: Number(it.id), quantity: pickQty(it) }));
      const r = await fetch(apiUrl(`/api/tebex/checkout`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jugador: nombreConfirmado, uuidJugador: uuidConfirmado || "", items, moneda: "USD", server }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.error || "Error");
      setCheckoutIdent(data?.ident || data?.basket?.ident);
      setCheckoutOpen(true);
    } catch (e) {
      alert(e?.message || "Error al crear el checkout.");
    } finally {
      setLoadingCheckout(false);
    }
  }, [carrito, nombreConfirmado, uuidConfirmado, isEmpty, loadingCheckout]);

  return (
    <>
      <aside className={`pixel-cart-sidebar ${mode === "mobileDrawer" ? "is-drawer" : ""}`}>
        <div className={`cart-container ${basketPulse ? "is-pulse" : ""}`}>
          
          {/* SECCIÓN USUARIO: ESTRUCTURA GRID PARA EVITAR SOLAPAMIENTOS */}
          <section className="cart-user-block">
            <div className="user-grid">
              <div className="grid-avatar">
                <div className={`avatar-box ${!nombreConfirmado ? "is-guest" : ""}`}>
                  {nombreConfirmado ? (
                    <img src={profile.headUrl} alt="" onError={(e) => e.target.src = "https://crafthead.net/avatar/Steve"} />
                  ) : <span>?</span>}
                </div>
              </div>
              <div className="grid-info">
                <div className="user-name" title={nombreConfirmado || "Invitado"}>
                  {nombreConfirmado || "Invitado"}
                </div>
                <div className="user-status">
                  {nombreConfirmado ? (isWebLoggedIn ? "Cuenta vinculada" : "En línea") : "Inicia sesión"}
                </div>
              </div>
              <div className="grid-button">
                <button className="pixel-btn-gray action-btn" onClick={() => nombreConfirmado ? onCambiarCuenta?.() : onAbrirLogin?.()}>
                  {nombreConfirmado ? "CAMBIAR" : "CONECTAR"}
                </button>
              </div>
            </div>
            

          </section>

          {/* CUERPO: LISTA DE PRODUCTOS */}
          <section className="cart-body-block">
            <h3 className="cart-title">TU CARRITO</h3>
            <div className="cart-scroll-area">
              {isEmpty ? (
                <div className="cart-empty">EL CARRITO ESTÁ VACÍO</div>
              ) : (
                carrito.map((it) => (
                  <div className="item-row" key={it.id}>
                    <div className="item-main">
                      <div className="item-icon">
                        {pickImg(it) ? <img src={pickImg(it)} alt="" /> : <FallbackIcon />}
                      </div>
                      <div className="item-details">
                        <div className="name">{it.name}</div>
                        <div className="price">{formatCurrency(it.price)}</div>
                      </div>
                    </div>
                    <div className="item-controls">
                      <div className="stepper">
                        <button onClick={() => handleQty(it, -1)} disabled={loadingCheckout}>-</button>
                        <span className="qty">{pickQty(it)}</span>
                        <button onClick={() => handleQty(it, 1)} disabled={loadingCheckout}>+</button>
                      </div>
                      <button className="btn-remove" onClick={() => handleRemove(it)}>✖</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* FOOTER: TOTAL Y PAGO */}
          <section className="cart-footer-block">
            <div className="total-row">
              <span className="label">TOTAL:</span>
              <span className="value">{formatCurrency(totalBase)}</span>
            </div>
            <button 
              className="pixel-btn-green btn-pay" 
              disabled={isEmpty || !nombreConfirmado || loadingCheckout}
              onClick={handleCheckout}
            >
              {loadingCheckout ? "..." : nombreConfirmado ? "IR A PAGAR" : "CONECTA TU CUENTA"}
            </button>
          </section>

        </div>
      </aside>

      <TiendaCheckoutModal
        open={checkoutOpen}
        ident={checkoutIdent}
        server={server}
        playerName={nombreConfirmado}
        cartItems={carrito}
        onPaid={() => { vaciarCarrito?.(); onRequestClose?.(); }}
        onClose={() => setCheckoutOpen(false)}
      />
    </>
  );
}