// src/components/Tienda/TiendaCarritoLateral.jsx
import React, { useState } from "react";
import { FiUser, FiDollarSign, FiChevronDown } from "react-icons/fi";
import { API_URL, calcularTotal } from "./tiendaHelpers";
import "../../styles/components/Tienda/tienda-carrito.scss";

const TiendaCarritoLateral = ({
  carrito,
  onAgregar,
  nombreConfirmado,
  uuidConfirmado,
  onLoginClick,
  monedaSeleccionada = "EUR",
  onMonedaChange,
}) => {
  const [pagando, setPagando] = useState(false);

  const handlePago = async () => {
    if (!nombreConfirmado || carrito.length === 0 || pagando) return;

    try {
      setPagando(true);

      const items = carrito.map((it) => ({
        id: Number(it.id),
        quantity: it.cantidad || 1,
      }));

      const res = await fetch(`${API_URL}/api/tebex/crear-pedido`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jugador: nombreConfirmado, items }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.url) {
        console.error("Checkout error:", data);
        alert(
          "No se pudo crear el checkout. Inténtalo de nuevo en unos segundos."
        );
        return;
      }

      window.location.href = data.url;
    } catch (e) {
      console.error("Pago error:", e);
      alert("No se pudo iniciar el pago.");
    } finally {
      setPagando(false);
    }
  };

  const simboloMoneda =
    monedaSeleccionada === "USD" || monedaSeleccionada === "MXN" ? "$" : "€";

  const estaLogueado = Boolean(nombreConfirmado && uuidConfirmado);
  const nombreMostrar = estaLogueado ? nombreConfirmado : "Guest";

  return (
    <aside className="carrito-lateral">
      <div className="carrito-panel">
        {/* ==========================
            BLOQUE SUPERIOR: CUENTA + MONEDA
           ========================== */}
        <div className="carrito-top">
          <div className="carrito-top-header">
            <div className="carrito-avatar">
              {estaLogueado ? (
                <div
                  className="avatar-skin"
                  style={{
                    backgroundImage: `url(https://crafatar.com/avatars/${uuidConfirmado}?size=64&overlay)`,
                  }}
                />
              ) : (
                <div className="avatar-placeholder">
                  <FiUser size={26} />
                </div>
              )}
            </div>
            <div className="carrito-player-name">{nombreMostrar}</div>
          </div>

          <div className="carrito-top-actions">
            <button
              type="button"
              className="carrito-btn carrito-btn-account"
              onClick={estaLogueado ? undefined : onLoginClick}
            >
              {estaLogueado ? "CUENTA SELECCIONADA" : "ELEGIR CUENTA"}
            </button>

            <div className="carrito-btn carrito-btn-currency">
              <div className="currency-left">
                <FiDollarSign className="currency-icon" />
                <div className="currency-text">
                  <span className="currency-label">CAMBIAR MONEDA</span>
                  <span className="currency-current">
                    ({simboloMoneda}) {monedaSeleccionada}
                  </span>
                </div>
              </div>

              <FiChevronDown className="currency-chevron" />

              {/* Select real para cambiar moneda, transparente por encima */}
              <select
                className="currency-select-overlay"
                value={monedaSeleccionada}
                onChange={onMonedaChange}
              >
                <option value="EUR">€ EUR</option>
                <option value="USD">$ USD</option>
                <option value="MXN">$ MXN</option>
              </select>
            </div>
          </div>
        </div>

        {/* ==========================
            BLOQUE INFERIOR: CARRITO
           ========================== */}
        <div className="carrito-basket">
          <div className="basket-header">CARRITO</div>

          <div className="basket-scroll">
            {carrito.length === 0 ? (
              <p className="basket-empty">
                {estaLogueado
                  ? "Tu carrito está vacío."
                  : "No has iniciado sesión."}
              </p>
            ) : (
              carrito.map((item, i) => {
                const cantidad = item.cantidad || 1;
                const img =
                  item.image_url ||
                  item.image ||
                  "/assets/tienda/producto-placeholder.png";

                return (
                  <div key={i} className="basket-item">
                    <div className="basket-item-left">
                      <div className="basket-item-icon-frame">
                        <img
                          src={img}
                          alt={item.name}
                          className="basket-item-icon"
                        />
                      </div>

                      <div className="basket-item-info">
                        <span className="basket-item-name">{item.name}</span>
                        <span className="basket-item-price">
                          {(item.price * cantidad).toFixed(2)} {simboloMoneda}
                        </span>
                      </div>
                    </div>

                    <div className="basket-item-right">
                      <span className="basket-item-qty">x{cantidad}</span>

                      <button
                        className="basket-item-remove"
                        type="button"
                        onClick={() => onAgregar(item)}
                        aria-label="Eliminar del carrito"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="basket-footer">
            <div className="basket-total">
              <span className="basket-total-label">TOTAL:</span>
              <span className="basket-total-value">
                {calcularTotal(carrito)} {simboloMoneda}
              </span>
            </div>

            <button
              className="basket-checkout-btn"
              onClick={handlePago}
              disabled={!estaLogueado || carrito.length === 0 || pagando}
            >
              {pagando ? "Preparando pago..." : "IR AL PAGO"}
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default TiendaCarritoLateral;
