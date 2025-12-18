// src/components/Tienda/TiendaCarritoLateral.jsx
import React, { useMemo, useState } from "react";
import useMinecraftProfile from "./useMinecraftProfile";
import "../../styles/components/Tienda/tienda-carrito.scss";

const API_BASE = import.meta.env.VITE_BACKEND_URL || "http://localhost:10000";

function normalizeCoupon(s) {
  return String(s || "")
    .trim()
    .replace(/\s+/g, "")
    .toUpperCase();
}

export default function TiendaCarritoLateral({
  carrito = [],
  onAgregar, // toggle
  eliminarItem, // opcional
  vaciarCarrito, // opcional
  total: totalFromHook,

  nombreConfirmado,
  monedaSeleccionada,
  onMonedaChange,

  onAbrirLogin,
  onCambiarCuenta,
  isWebLoggedIn = false,
}) {
  const [loadingCheckout, setLoadingCheckout] = useState(false);

  // Cupón inline
  const [couponInput, setCouponInput] = useState("");
  const [couponApplied, setCouponApplied] = useState("");
  const [couponError, setCouponError] = useState("");
  const [couponOk, setCouponOk] = useState("");

  const profile = useMinecraftProfile(nombreConfirmado);

  const count = carrito.length;

  const total = useMemo(() => {
    if (typeof totalFromHook === "number") return totalFromHook;
    return carrito.reduce(
      (acc, it) => acc + (Number(it.price) || 0) * (Number(it.quantity) || 1),
      0
    );
  }, [carrito, totalFromHook]);

  const canCheckout = Boolean(nombreConfirmado) && count > 0 && !loadingCheckout;

  const monedaTexto = useMemo(() => {
    const v = String(monedaSeleccionada || "EUR").toUpperCase();
    if (v === "USD") return "$ USD";
    if (v === "GBP") return "£ GBP";
    return "€ EUR";
  }, [monedaSeleccionada]);

  const handleCheckout = async () => {
    if (!canCheckout) return;

    setLoadingCheckout(true);
    setCouponError("");
    setCouponOk("");

    try {
      const items = carrito.map((it) => ({
        id: Number(it.id),
        quantity: Number(it.quantity || 1),
      }));

      const couponToSend = normalizeCoupon(couponApplied || couponInput);

      const r = await fetch(`${API_BASE}/api/tebex/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jugador: nombreConfirmado,
          items,
          codigoDescuento: couponToSend || "",
        }),
      });

      const data = await r.json().catch(() => ({}));

      if (!r.ok) {
        const msg = data?.error || "No se pudo generar el checkout.";

        // si es cupón, mensaje inline y no alert feo
        if (/cup[oó]n|coupon|c[oó]digo/i.test(msg)) {
          setCouponError(msg);
          setLoadingCheckout(false);
          return;
        }

        throw new Error(msg);
      }

      if (!data?.url) throw new Error("Respuesta inválida del servidor (sin URL).");

      window.location.href = data.url;
    } catch (e) {
      alert(e?.message || "Error al crear el checkout.");
    } finally {
      setLoadingCheckout(false);
    }
  };

  const handleRemove = (item) => {
    if (typeof eliminarItem === "function") return eliminarItem(item.id);
    onAgregar?.(item);
  };

  const handleAccountClick = () => {
    if (nombreConfirmado) onCambiarCuenta?.();
    else onAbrirLogin?.();
  };

  const onApplyCoupon = () => {
    setCouponError("");
    setCouponOk("");

    const code = normalizeCoupon(couponInput);
    if (!code) {
      setCouponApplied("");
      setCouponOk("");
      return;
    }
    if (code.length < 3) {
      setCouponError("Código demasiado corto.");
      return;
    }
    if (!/^[A-Z0-9_-]+$/.test(code)) {
      setCouponError("Formato inválido.");
      return;
    }

    setCouponApplied(code);
    setCouponOk(`Código preparado: ${code}`);
  };

  return (
    <div className="carrito-lateral">
      <div className="carrito-panel">
        {/* CUENTA */}
        <div className="carrito-cuenta">
          <div className="cuenta-top">
            <div className="cuenta-identidad">
              <div className={`cuenta-avatar ${!nombreConfirmado ? "is-guest" : ""}`}>
                {nombreConfirmado ? (
                  <img
                    src={profile.headUrl}
                    alt="Skin"
                    draggable={false}
                    onError={(e) => {
                      e.currentTarget.src =
                        "https://crafthead.net/avatar/Steve?size=64&overlay";
                    }}
                  />
                ) : (
                  <div className="cuenta-quest">?</div>
                )}
              </div>

              <div className="cuenta-textos">
                <div className="cuenta-nombre">{nombreConfirmado || "Invitado"}</div>
                <div className="cuenta-sub">
                  {nombreConfirmado
                    ? isWebLoggedIn
                      ? "Cuenta vinculada"
                      : "Cuenta del servidor"
                    : "Elige cuenta para continuar"}
                </div>
              </div>
            </div>
          </div>

          <div className="cuenta-actions">
            <button
              className="cuenta-btn cuenta-btn-account"
              type="button"
              onClick={handleAccountClick}
            >
              {nombreConfirmado ? "Cambiar cuenta" : "Elegir cuenta"}
            </button>

            <div className="cuenta-btn cuenta-btn-currency">
              <div className="currency-left">
                <div className="currency-icon">$</div>
                <div className="currency-text">
                  <div className="currency-label">Cambiar moneda</div>
                  <div className="currency-current">{monedaTexto}</div>
                </div>
              </div>

              <div className="currency-chevron">▾</div>

              <select
                className="currency-select-overlay"
                value={monedaSeleccionada}
                onChange={onMonedaChange}
                aria-label="Cambiar moneda"
              >
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
          </div>
        </div>

        {/* CARRITO */}
        <div className="carrito-basket">
          <div className="basket-header">
            <div className="basket-title">Carrito</div>
            <div className="basket-meta">{count > 0 ? `(${count})` : "(vacío)"}</div>
          </div>

          <div className="basket-scroll">
            {count === 0 ? (
              <div className="basket-empty-state">
                <div className="basket-empty-icon" />
                <div className="basket-empty-text">
                  {nombreConfirmado
                    ? "Añade productos para empezar."
                    : "Elige una cuenta para comprar."}
                </div>
              </div>
            ) : (
              <>
                {carrito.map((it) => (
                  <div className="basket-item" key={it.id}>
                    <div className="basket-item-left">
                      <div className="basket-item-icon-frame">
                        {it.image ? (
                          <img
                            className="basket-item-icon"
                            src={it.image}
                            alt={it.name}
                            draggable={false}
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        ) : null}
                      </div>

                      <div className="basket-item-info">
                        <div className="basket-item-name">{it.name}</div>
                        <div className="basket-item-price">
                          {(Number(it.price) || 0).toFixed(2)} €
                        </div>
                      </div>
                    </div>

                    <div className="basket-item-right">
                      <div className="basket-item-qty">x{it.quantity || 1}</div>

                      <button
                        className="basket-item-remove"
                        type="button"
                        onClick={() => handleRemove(it)}
                        aria-label="Quitar"
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M18 6L6 18M6 6l12 12"
                            stroke="currentColor"
                            strokeWidth="2.4"
                            strokeLinecap="round"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>

          <div className="basket-footer">
            {/* CUPÓN */}
            <div className="basket-coupon-inline">
              <div className="coupon-inline-label">Código de descuento</div>

              <div className="coupon-inline-row">
                <input
                  className="coupon-inline-input"
                  value={couponInput}
                  onChange={(e) => {
                    setCouponInput(e.target.value);
                    setCouponError("");
                    setCouponOk("");
                    setCouponApplied("");
                  }}
                  placeholder="Introduce tu código"
                  autoComplete="off"
                  spellCheck={false}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onApplyCoupon();
                  }}
                />

                <button
                  className="coupon-inline-btn"
                  type="button"
                  onClick={onApplyCoupon}
                  disabled={!couponInput.trim()}
                >
                  Aplicar
                </button>
              </div>

              {couponError ? (
                <div className="coupon-inline-msg is-error">{couponError}</div>
              ) : null}

              {couponOk && couponApplied ? (
                <div className="coupon-inline-msg is-ok">{couponOk}</div>
              ) : null}
            </div>

            <div className="basket-total">
              <div className="basket-total-label">Total:</div>
              <div className="basket-total-value">{total.toFixed(2)} €</div>
            </div>

            <button
              className="basket-checkout"
              type="button"
              disabled={!canCheckout}
              onClick={handleCheckout}
            >
              {loadingCheckout ? "CREANDO CHECKOUT…" : "IR AL CHECKOUT"}
            </button>

            <div className="basket-hint">
              {nombreConfirmado
                ? "Tus compras se entregan automáticamente al completar el pago."
                : "Necesitas elegir una cuenta antes de comprar."}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
