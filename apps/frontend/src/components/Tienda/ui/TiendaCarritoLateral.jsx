import React, { useMemo, useState, useCallback } from "react";
import useMinecraftProfile from "../hooks/useMinecraftProfile";
import TiendaCheckoutModal from "../modals/TiendaCheckoutModal";
import "../../../styles/components/Tienda/tienda-carrito.scss";

const API_BASE = import.meta.env.VITE_BACKEND_URL || "http://localhost:10000";

function formatCurrency(amount, currency = "USD") {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "—";
  const cur = String(currency || "USD").toUpperCase();
  const locale = cur === "USD" ? "en-US" : cur === "GBP" ? "en-GB" : "es-ES";
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: cur,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${n.toFixed(2)} ${cur}`;
  }
}

function clampInt(n, min, max) {
  const x = Math.trunc(Number(n));
  if (!Number.isFinite(x)) return min;
  return Math.max(min, Math.min(max, x));
}

const FallbackIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M21 7l-4-4-6 6 4 4 6-6Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    <path d="M3 21l6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M9 15l-2 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
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
  onAbrirLogin,
  onCambiarCuenta,
  isWebLoggedIn = false,
  server = "oneblock",
  basketPulse = false,
  mode = "desktop",
  onRequestClose,
}) {
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutIdent, setCheckoutIdent] = useState("");

  const profile = useMinecraftProfile(nombreConfirmado);

  const currency = "USD";

  const distinctCount = carrito.length;
  const isEmpty = distinctCount === 0;

  const totalBase = useMemo(() => {
    if (typeof totalFromHook === "number") return totalFromHook;
    return carrito.reduce((acc, it) => acc + (Number(it.price) || 0) * clampInt(it.quantity || 1, 1, 999), 0);
  }, [carrito, totalFromHook]);

  const canCheckout = Boolean(nombreConfirmado) && distinctCount > 0 && !loadingCheckout;

  const checkoutDisabledReason = useMemo(() => {
    if (loadingCheckout) return "Generando el pago…";
    if (!nombreConfirmado) return "Elige una cuenta para poder pagar.";
    if (distinctCount === 0) return "Añade al menos un producto al carrito para poder pagar.";
    return null;
  }, [loadingCheckout, nombreConfirmado, distinctCount]);

  const handleRemove = useCallback(
    (item) => {
      if (!item?.id) return;
      if (typeof eliminarItem === "function") return eliminarItem(item.id);
      if (typeof onSetCantidad === "function") return onSetCantidad(item.id, 0, item);
      if (typeof onCambiarCantidad === "function") return onCambiarCantidad(item.id, -999, item);
    },
    [eliminarItem, onSetCantidad, onCambiarCantidad]
  );

  const handleQty = useCallback(
    (item, delta) => {
      const current = clampInt(item.quantity || 1, 1, 999);
      const nextRaw = current + Number(delta || 0);

      if (typeof onCambiarCantidad === "function") {
        return onCambiarCantidad(item.id, delta, item);
      }

      if (typeof onSetCantidad === "function") {
        const next = clampInt(nextRaw, 0, 999);
        return onSetCantidad(item.id, next, item);
      }

      if (delta < 0 && current <= 1) return handleRemove(item);
      if (delta > 0 && typeof onAgregar === "function") return onAgregar(item, 1);
    },
    [onCambiarCantidad, onSetCantidad, onAgregar, handleRemove]
  );

  const handleAccountClick = useCallback(() => {
    if (nombreConfirmado) onCambiarCuenta?.();
    else onAbrirLogin?.();
  }, [nombreConfirmado, onCambiarCuenta, onAbrirLogin]);

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
          moneda: "USD",
        }),
      });

      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.error || "No se pudo generar el checkout.");

      const ident = String(data?.ident || data?.basket?.ident || data?.basket_ident || "").trim();
      if (!ident) throw new Error("Respuesta inválida del servidor (sin ident).");

      setCheckoutIdent(ident);
      setCheckoutOpen(true);
    } catch (e) {
      alert(e?.message || "Error al crear el checkout.");
    } finally {
      setLoadingCheckout(false);
    }
  }, [canCheckout, carrito, nombreConfirmado]);

  const checkoutLabel = useMemo(() => {
    if (loadingCheckout) return "Generando pago…";
    if (!nombreConfirmado) return "ELIGE UNA CUENTA";
    if (distinctCount === 0) return "AÑADE PRODUCTOS";
    return "IR A PAGAR";
  }, [loadingCheckout, nombreConfirmado, distinctCount]);

  return (
    <>
      <aside className={`carrito-lateral ${mode === "mobileDrawer" ? "is-drawer" : "is-desktop"}`} aria-label="Carrito">
        <div className={`carrito-panel ${basketPulse ? "is-pulse" : ""}`} id="tienda-basket" data-empty={isEmpty ? "true" : "false"} data-mode={mode}>
          <div className="carrito-panel-inner">
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
                          e.currentTarget.src = "https://crafthead.net/avatar/Steve?size=64&overlay";
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
                      {nombreConfirmado ? (isWebLoggedIn ? "Cuenta vinculada" : "Cuenta del servidor") : "Elige cuenta para comprar"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="cuenta-actions">
                <button className="cuenta-btn cuenta-btn-account" type="button" onClick={handleAccountClick}>
                  {nombreConfirmado ? "Cambiar cuenta" : "Elegir cuenta"}
                </button>
              </div>
            </section>

            <section className={`basket ${isEmpty ? "is-empty" : ""}`} aria-label="Carrito de compra">
              <div className="basket-title">CARRITO</div>

              <div className={`basket-list ${isEmpty ? "is-empty" : ""}`} role="list" aria-busy={loadingCheckout}>
                {isEmpty ? (
                  <div className="basket-empty-state" data-kind={nombreConfirmado ? "empty" : "account"}>
                    <div className="basket-empty-icon" aria-hidden="true" />
                    <div className="basket-empty-text">{nombreConfirmado ? "(Vacío)" : "Elige una cuenta"}</div>
                  </div>
                ) : (
                  carrito.map((it) => {
                    const qty = clampInt(it.quantity || 1, 1, 999);
                    const canDec = qty >= 1;
                    const canInc = qty < 999;

                    const priceBase = Number(it.price) || 0;

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
                            <div className="basket-item-icon-fallback">
                              <FallbackIcon />
                            </div>
                          </div>

                          <div className="basket-item-info">
                            <div className="basket-item-name" title={it.name}>
                              {it.name}
                            </div>
                            <div className="basket-item-price">{formatCurrency(priceBase, currency)}</div>
                          </div>
                        </div>

                        <div className="basket-item-right">
                          <div className="qty-stepper" role="group" aria-label={`Cantidad de ${it.name}`}>
                            <button
                              className="qty-btn"
                              type="button"
                              onClick={() => handleQty(it, -1)}
                              disabled={loadingCheckout || !canDec}
                              aria-label={qty <= 1 ? "Quitar del carrito" : "Reducir cantidad"}
                              title={qty <= 1 ? "Quitar" : "Restar 1"}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <path d="M6 12h12" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
                              </svg>
                            </button>

                            <div className="qty-value">{qty}</div>

                            <button
                              className="qty-btn"
                              type="button"
                              onClick={() => handleQty(it, +1)}
                              disabled={loadingCheckout || !canInc}
                              aria-label="Aumentar cantidad"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <path d="M12 6v12M6 12h12" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
                              </svg>
                            </button>
                          </div>

                          <button
                            className="basket-item-remove"
                            type="button"
                            onClick={() => handleRemove(it)}
                            aria-label={`Quitar ${it.name}`}
                            disabled={loadingCheckout}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
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
                  <div className="basket-total-value">{formatCurrency(totalBase, currency)}</div>
                </div>

                <div className={`checkout-wrap ${checkoutDisabledReason ? "is-disabled" : ""}`} data-tooltip={checkoutDisabledReason || ""}>
                  <button className="basket-checkout" type="button" disabled={Boolean(checkoutDisabledReason)} onClick={handleCheckout}>
                    {checkoutLabel}
                  </button>
                </div>
              </div>
            </section>
          </div>
        </div>
      </aside>

      <TiendaCheckoutModal
        open={checkoutOpen}
        ident={checkoutIdent}
        server={server}
        playerName={nombreConfirmado}
        cartItems={carrito}
        currencyHint="USD"
        onPaid={() => {
          if (typeof vaciarCarrito === "function") vaciarCarrito();
          if (typeof onRequestClose === "function") onRequestClose();
        }}
        onClose={() => setCheckoutOpen(false)}
      />
    </>
  );
}