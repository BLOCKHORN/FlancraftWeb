import React, { useMemo, useState, useCallback } from "react";
import useMinecraftProfile from "./useMinecraftProfile";
import "../../styles/components/Tienda/tienda-carrito.scss";

const API_BASE = import.meta.env.VITE_BACKEND_URL || "http://localhost:10000";

function formatCurrency(amount, currency = "EUR") {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "—";
  try {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: String(currency || "EUR").toUpperCase(),
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${n.toFixed(2)} ${currency}`;
  }
}

function clampInt(n, min, max) {
  const x = Math.trunc(Number(n));
  if (!Number.isFinite(x)) return min;
  return Math.max(min, Math.min(max, x));
}

export default function TiendaCarritoLateral({
  carrito = [],
  onAgregar, // toggle (fallback)
  eliminarItem, // opcional
  vaciarCarrito, // opcional
  total: totalFromHook,

  // NUEVO (recomendado): cambia cantidad por id
  onCambiarCantidad, // (id, delta, item?) => void
  onSetCantidad, // (id, qty, item?) => void

  nombreConfirmado,
  monedaSeleccionada,
  onMonedaChange,

  onAbrirLogin,
  onCambiarCuenta,
  isWebLoggedIn = false,

  onCheckoutUrl, // (url) => void
  basketPulse = false,
}) {
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const profile = useMinecraftProfile(nombreConfirmado);

  const currency = useMemo(
    () => String(monedaSeleccionada || "EUR").toUpperCase(),
    [monedaSeleccionada]
  );

  const distinctCount = carrito.length;

  const itemsCount = useMemo(() => {
    return carrito.reduce((acc, it) => acc + clampInt(it.quantity || 1, 1, 999), 0);
  }, [carrito]);

  const total = useMemo(() => {
    if (typeof totalFromHook === "number") return totalFromHook;
    return carrito.reduce(
      (acc, it) => acc + (Number(it.price) || 0) * clampInt(it.quantity || 1, 1, 999),
      0
    );
  }, [carrito, totalFromHook]);

  const monedaTexto = useMemo(() => {
    if (currency === "USD") return "$ USD";
    if (currency === "GBP") return "£ GBP";
    return "€ EUR";
  }, [currency]);

  const canCheckout = Boolean(nombreConfirmado) && distinctCount > 0 && !loadingCheckout;

  const checkoutDisabledReason = useMemo(() => {
    if (loadingCheckout) return "Generando el pago…";
    if (!nombreConfirmado) return "Elige una cuenta para poder pagar.";
    if (distinctCount === 0) return "Añade al menos un producto al carrito para poder pagar.";
    return null;
  }, [loadingCheckout, nombreConfirmado, distinctCount]);

  const handleRemove = useCallback(
    (item) => {
      if (typeof eliminarItem === "function") return eliminarItem(item.id);
      onAgregar?.(item);
    },
    [eliminarItem, onAgregar]
  );

  const handleQty = useCallback(
    (item, delta) => {
      const current = clampInt(item.quantity || 1, 1, 999);
      const next = clampInt(current + delta, 1, 999);

      // Preferimos callback explícito
      if (typeof onCambiarCantidad === "function") {
        return onCambiarCantidad(item.id, delta, item);
      }
      if (typeof onSetCantidad === "function") {
        return onSetCantidad(item.id, next, item);
      }

      // Fallback mínimo: si baja de 1, lo quitamos
      if (delta < 0 && current <= 1) return handleRemove(item);
      // Si no hay handler, no hacemos nada al +
    },
    [onCambiarCantidad, onSetCantidad, handleRemove]
  );

  const handleAccountClick = useCallback(() => {
    if (nombreConfirmado) onCambiarCuenta?.();
    else onAbrirLogin?.();
  }, [nombreConfirmado, onCambiarCuenta, onAbrirLogin]);

  const handleClear = useCallback(() => {
    if (typeof vaciarCarrito !== "function") return;
    if (distinctCount === 0) return;
    const ok = window.confirm("¿Vaciar el carrito?");
    if (ok) vaciarCarrito();
  }, [vaciarCarrito, distinctCount]);

  const handleCheckout = useCallback(async () => {
    if (!canCheckout) return;

    setLoadingCheckout(true);
    try {
      const items = carrito.map((it) => ({
        id: Number(it.id),
        quantity: clampInt(it.quantity || 1, 1, 999),
      }));

      const r = await fetch(`${API_BASE}/api/tebex/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jugador: nombreConfirmado,
          items,
          moneda: currency,
        }),
      });

      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.error || "No se pudo generar el checkout.");
      if (!data?.url) throw new Error("Respuesta inválida del servidor (sin URL).");

      if (typeof onCheckoutUrl === "function") {
        onCheckoutUrl(data.url);
        return;
      }

      window.location.href = data.url;
    } catch (e) {
      alert(e?.message || "Error al crear el checkout.");
    } finally {
      setLoadingCheckout(false);
    }
  }, [canCheckout, carrito, nombreConfirmado, currency, onCheckoutUrl]);

  const checkoutLabel = useMemo(() => {
    if (loadingCheckout) return "Generando pago…";
    if (!nombreConfirmado) return "ELIGE UNA CUENTA";
    if (distinctCount === 0) return "AÑADE PRODUCTOS";
    return "IR A PAGAR";
  }, [loadingCheckout, nombreConfirmado, distinctCount]);

  return (
    <aside className="carrito-lateral" aria-label="Carrito">
      <div className={`carrito-panel ${basketPulse ? "is-pulse" : ""}`} id="tienda-basket">
        {/* CUENTA */}
        <section className="carrito-cuenta" aria-label="Cuenta">
          <div className="cuenta-top">
            <div className="cuenta-identidad">
              <div className={`cuenta-avatar ${!nombreConfirmado ? "is-guest" : ""}`}>
                {nombreConfirmado ? (
                  <img
                    src={profile.headUrl}
                    alt={`Avatar de ${nombreConfirmado}`}
                    draggable={false}
                    onError={(e) => {
                      e.currentTarget.src =
                        "https://crafthead.net/avatar/Steve?size=64&overlay";
                    }}
                  />
                ) : (
                  <div className="cuenta-quest" aria-hidden="true">
                    ?
                  </div>
                )}
              </div>

              <div className="cuenta-textos">
                <div className="cuenta-nombre">{nombreConfirmado || "Invitado"}</div>
                <div className="cuenta-sub">
                  {nombreConfirmado
                    ? isWebLoggedIn
                      ? "Cuenta vinculada"
                      : "Cuenta del servidor"
                    : "Elige cuenta para comprar"}
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

            <div className="cuenta-btn cuenta-btn-currency" role="group" aria-label="Cambiar moneda">
              <div className="currency-left">
                <div className="currency-icon" aria-hidden="true">
                  $
                </div>
                <div className="currency-text">
                  <div className="currency-label">Cambiar moneda</div>
                  <div className="currency-current">{monedaTexto}</div>
                </div>
              </div>

              <div className="currency-chevron" aria-hidden="true">
                ▾
              </div>

              <select
                className="currency-select"
                value={currency}
                onChange={onMonedaChange}
                aria-label="Moneda"
              >
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
          </div>
        </section>

        {/* BASKET */}
        <section className="basket" aria-label="Carrito de compra">
          <div className="basket-title">CARRITO</div>


          <div className="basket-list" role="list" aria-busy={loadingCheckout}>
            {distinctCount === 0 ? (
              <div className="basket-empty-state">
                <div className="basket-empty-icon" aria-hidden="true" />
                <div className="basket-empty-text">
                  {nombreConfirmado ? "Añade productos para empezar." : "Elige una cuenta para comprar."}
                </div>
              </div>
            ) : (
              carrito.map((it) => {
                const qty = clampInt(it.quantity || 1, 1, 999);
                const canDec = qty > 1;
                const canInc = qty < 999;

                return (
                  <div className="basket-item" key={it.id} role="listitem">
                    <div className="basket-item-left">
                      <div className="basket-item-icon-frame" aria-hidden="true">
                        {it.image ? (
                          <img
                            className="basket-item-icon"
                            src={it.image}
                            alt=""
                            draggable={false}
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        ) : null}
                        <div className="basket-item-icon-fallback">⛏</div>
                      </div>

                      <div className="basket-item-info">
                        <div className="basket-item-name" title={it.name}>
                          {it.name}
                        </div>

                        <div className="basket-item-price">
                          {it.priceFormatted
                            ? it.priceFormatted
                            : formatCurrency(Number(it.price) || 0, currency)}
                        </div>
                      </div>
                    </div>

                    <div className="basket-item-right">
                      {/* Stepper cantidad */}
                      <div className="qty-stepper" role="group" aria-label={`Cantidad de ${it.name}`}>
                        <button
                          className="qty-btn"
                          type="button"
                          onClick={() => handleQty(it, -1)}
                          disabled={loadingCheckout || !canDec}
                          aria-label="Reducir cantidad"
                          title={canDec ? "Reducir" : "Cantidad mínima"}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path
                              d="M6 12h12"
                              stroke="currentColor"
                              strokeWidth="2.6"
                              strokeLinecap="round"
                            />
                          </svg>
                        </button>

                        <div className="qty-value" aria-label={`Cantidad: ${qty}`}>
                          {qty}
                        </div>

                        <button
                          className="qty-btn"
                          type="button"
                          onClick={() => handleQty(it, +1)}
                          disabled={loadingCheckout || !canInc}
                          aria-label="Aumentar cantidad"
                          title={canInc ? "Aumentar" : "Límite alcanzado"}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path
                              d="M12 6v12M6 12h12"
                              stroke="currentColor"
                              strokeWidth="2.6"
                              strokeLinecap="round"
                            />
                          </svg>
                        </button>
                      </div>

                      <button
                        className="basket-item-remove"
                        type="button"
                        onClick={() => handleRemove(it)}
                        aria-label={`Quitar ${it.name}`}
                        title="Quitar"
                        disabled={loadingCheckout}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
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
                );
              })
            )}
          </div>

          <div className="basket-footer">
            <div className="basket-total" aria-live="polite">
              <div className="basket-total-label">Total:</div>
              <div className="basket-total-value">{formatCurrency(total, currency)}</div>
            </div>

            {/* Checkout con tooltip + nota */}
            <div
              className={`checkout-wrap ${checkoutDisabledReason ? "is-disabled" : ""}`}
              data-tooltip={checkoutDisabledReason || ""}
            >
              <button
                className="basket-checkout"
                type="button"
                disabled={Boolean(checkoutDisabledReason)}
                onClick={handleCheckout}
                aria-describedby={checkoutDisabledReason ? "checkout-reason" : undefined}
              >
                {checkoutLabel}
              </button>
            </div>

            {checkoutDisabledReason ? (
              <div className="basket-hint basket-hint--checkout" id="checkout-reason" role="status">
                <span className="hint-ico" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 9v5"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                    />
                    <path
                      d="M12 17.5h.01"
                      stroke="currentColor"
                      strokeWidth="3.2"
                      strokeLinecap="round"
                    />
                    <path
                      d="M10.3 3.6h3.4c.7 0 1.4.4 1.7 1l6.5 11.3c.7 1.2-.2 2.8-1.7 2.8H3.5c-1.4 0-2.3-1.6-1.7-2.8L8.6 4.6c.3-.6 1-.9 1.7-1Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <span className="hint-text">{checkoutDisabledReason}</span>
              </div>
            ) : null}

            {typeof vaciarCarrito === "function" ? (
              <button
                className="basket-clear"
                type="button"
                onClick={handleClear}
                disabled={distinctCount === 0 || loadingCheckout}
              >
                Vaciar carrito
              </button>
            ) : null}
          </div>
        </section>
      </div>
    </aside>
  );
}
