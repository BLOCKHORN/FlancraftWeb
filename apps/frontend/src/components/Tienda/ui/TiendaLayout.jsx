import React, { useContext, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";

import "../../../styles/components/Tienda/tienda-layout.scss";

import { UserContext } from "../../../context/UserContext";
import { apiUrl } from "../../../lib/env";
import { getStoredUser } from "../../../lib/auth/storage";
import TiendaStorefront from "./TiendaStorefront";
import TiendaCarritoLateral from "./TiendaCarritoLateral";
import TiendaModalJugador from "../modals/TiendaModalJugador";
import useTiendaCarrito from "../hooks/useTiendaCarrito";
import TiendaFooter from "./TiendaFooter";
import TiendaTopDonatorPip from "./TiendaTopDonatorPip";
import Seo from "../../SEO/Seo";
import { buildBreadcrumbJsonLd, buildCanonical } from "../../../lib/seo/siteSeo";

const readWebUser = () => getStoredUser();

function pickFxRate(fxData, currencyUpper) {
  const base = String(fxData?.base || "EUR").toUpperCase();
  const c = String(currencyUpper || base).toUpperCase();
  if (c === base) return 1;

  const r = fxData?.rates?.[c] ?? fxData?.rates?.[c.toLowerCase?.()] ?? fxData?.[c] ?? fxData?.[c.toLowerCase?.()];
  const n = Number(r);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function formatCurrency(amount, currency) {
  const n = Number(amount);
  const cur = String(currency || "EUR").toUpperCase();
  if (!Number.isFinite(n)) return "—";

  const locale = cur === "USD" ? "en-US" : cur === "GBP" ? "en-GB" : "es-ES";
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: cur,
      maximumFractionDigits: 2,
      currencyDisplay: "symbol",
    }).format(n);
  } catch {
    return `${n.toFixed(2)} ${cur}`;
  }
}

const IconCart = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M6 6h15l-2 8H8L6 6Z" stroke="currentColor" strokeWidth="3" strokeLinejoin="miter" />
    <path d="M6 6 5 3H2" stroke="currentColor" strokeWidth="3" strokeLinecap="square" />
    <path d="M9 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM18 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" fill="currentColor" />
  </svg>
);

const TiendaLayout = () => {
  const { user, setUser } = useContext(UserContext);

  const [mostrarLogin, setMostrarLogin] = useState(false);
  const [nombreConfirmado, setNombreConfirmado] = useState(() => localStorage.getItem("nombreJugador") || "");
  const [uuidConfirmado, setUuidConfirmado] = useState(() => localStorage.getItem("uuidJugador") || "");
  const [moneda, setMoneda] = useState(() => localStorage.getItem("monedaSeleccionada") || "EUR");

  const { carrito, toggleProducto, agregar, eliminar, vaciar, total, cambiarCantidad, setCantidad } = useTiendaCarrito(nombreConfirmado);

  const location = useLocation();
  const serverFromPath = useMemo(() => {
    const parts = String(location.pathname || "").split("/").filter(Boolean);
    if (parts[0] !== "tienda") return "global";
    const next = String(parts[1] || "").toLowerCase();
    if (next === "gens" || next === "oneblock" || next === "survival") return next;
    return "global";
  }, [location.pathname]);

  const [webUser, setWebUser] = useState(() => readWebUser());
  const [isMobile, setIsMobile] = useState(false);
  const [cartOpenMobile, setCartOpenMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === "flan_user") setWebUser(readWebUser());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const isWebLoggedIn = useMemo(() => Boolean(user?.loggedIn || webUser?.loggedIn), [user?.loggedIn, webUser?.loggedIn]);

  useEffect(() => {
    const ctxLogged = Boolean(user?.loggedIn && user?.username);
    const username = (user?.username || webUser?.username || "").trim();
    const uuid = (user?.uuid || webUser?.uuid || "").trim();

    if (!username) return;

    if (String(nombreConfirmado).trim() === username) {
      if (!uuidConfirmado && uuid) {
        localStorage.setItem("uuidJugador", uuid);
        setUuidConfirmado(uuid);
      }
      return;
    }

    if (ctxLogged || webUser?.loggedIn) {
      localStorage.setItem("nombreJugador", username);
      if (uuid) localStorage.setItem("uuidJugador", uuid);
      setNombreConfirmado(username);
      setUuidConfirmado(uuid);
      setMostrarLogin(false);
    }
  }, [user, webUser, nombreConfirmado, uuidConfirmado]);

  const confirmarNombre = (nombre, uuid) => {
    localStorage.setItem("nombreJugador", nombre);
    localStorage.setItem("uuidJugador", uuid);
    setNombreConfirmado(nombre);
    setUuidConfirmado(uuid);
    setMostrarLogin(false);
  };

  const handleMonedaChange = (e) => {
    const nuevaMoneda = e.target.value;
    setMoneda(nuevaMoneda);
    localStorage.setItem("monedaSeleccionada", nuevaMoneda);
  };

  const abrirModalCuenta = () => setMostrarLogin(true);
  const cambiarCuenta = () => {
    if (isWebLoggedIn) {
      localStorage.removeItem("flan_user");
      setUser?.(null);
      setWebUser(null);
    }
    localStorage.removeItem("nombreJugador");
    localStorage.removeItem("uuidJugador");
    setNombreConfirmado("");
    setUuidConfirmado("");
    setMostrarLogin(true);
  };

  useEffect(() => {
    if (isMobile && cartOpenMobile) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isMobile, cartOpenMobile]);

  useEffect(() => { setCartOpenMobile(false); }, [location.pathname]);

  const totalQty = useMemo(() => (carrito || []).reduce((acc, it) => acc + (Number(it.quantity) || 1), 0), [carrito]);

  const [fx, setFx] = useState(null);
  useEffect(() => {
    let cancelled = false;
    const ctrl = new AbortController();
    const load = async () => {
      try {
        const r = await fetch(apiUrl(`/api/tebex/fx`), { signal: ctrl.signal });
        const data = await r.json().catch(() => null);
        if (!r.ok) throw new Error(data?.error || "fx");
        if (!cancelled) setFx(data);
      } catch {
        if (!cancelled) setFx(null);
      }
    };
    load();
    const t = window.setInterval(load, 10 * 60 * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(t);
      ctrl.abort();
    };
  }, []);

  const baseCurrency = useMemo(() => String(fx?.base || "EUR").toUpperCase(), [fx]);
  const currencyUpper = useMemo(() => String(moneda || baseCurrency).toUpperCase(), [moneda, baseCurrency]);
  const fxRate = useMemo(() => pickFxRate(fx, currencyUpper), [fx, currencyUpper]);

  const totalDisplay = useMemo(() => {
    const base = Number(total) || 0;
    const out = base * (Number.isFinite(fxRate) ? fxRate : 1);
    return Number.isFinite(out) ? out : base;
  }, [total, fxRate]);

  const totalFormatted = useMemo(() => formatCurrency(totalDisplay, currencyUpper), [totalDisplay, currencyUpper]);

  return (
    <>
      <Seo
        title="Tienda de FlanCraft | Rangos, packs y ventajas"
        description="Explora la tienda oficial de FlanCraft y descubre rangos, ventajas y artículos para apoyar al servidor."
        canonical={buildCanonical("/tienda")}
        jsonLd={buildBreadcrumbJsonLd([
          { name: "Inicio", item: buildCanonical("/") },
          { name: "Tienda", item: buildCanonical("/tienda") },
        ])}
      />
      
      <div className="pixel-layout-root">
        {mostrarLogin && <TiendaModalJugador onConfirmar={confirmarNombre} onCerrar={() => setMostrarLogin(false)} />}
        
        <main className="pixel-layout-grid">
          {/* Zona Principal (Storefront) */}
          <section className="pixel-content-area">
            <Routes>
              <Route
                path="/"
                element={
                  <TiendaStorefront
                    carrito={carrito}
                    toggleProducto={toggleProducto}
                    onAgregar={agregar}
                    onCambiarCantidad={cambiarCantidad}
                    onSetCantidad={setCantidad}
                    nombreConfirmado={nombreConfirmado}
                    uuidConfirmado={uuidConfirmado}
                    monedaSeleccionada={currencyUpper}
                    fx={fx}
                  />
                }
              />
              <Route path="/rangos" element={<Navigate to="/tienda" replace />} />
              <Route path="/gens" element={<Navigate to="/tienda" replace />} />
              <Route path="/oneblock" element={<Navigate to="/tienda" replace />} />
              <Route path="/survival" element={<Navigate to="/tienda" replace />} />
              <Route path="/antes-de-comprar" element={<Navigate to="/tienda" replace />} />
              <Route path="/:server/:categoria/*" element={<Navigate to="/tienda" replace />} />
            </Routes>
          </section>

          {/* Zona Lateral (Carrito Desktop + Top Donators Desktop) */}
          {!isMobile && (
            <aside className="pixel-sidebar-area">
              <div className="pixel-cart-box">
                <TiendaCarritoLateral
                  carrito={carrito}
                  onAgregar={agregar}
                  eliminarItem={eliminar}
                  vaciarCarrito={vaciar}
                  total={total}
                  onCambiarCantidad={cambiarCantidad}
                  onSetCantidad={setCantidad}
                  nombreConfirmado={nombreConfirmado}
                  uuidConfirmado={uuidConfirmado}
                  monedaSeleccionada={currencyUpper}
                  onMonedaChange={handleMonedaChange}
                  onAbrirLogin={abrirModalCuenta}
                  onCambiarCuenta={cambiarCuenta}
                  isWebLoggedIn={isWebLoggedIn}
                  server={serverFromPath}
                  mode="desktop"
                  fx={fx}
                />
              </div>
              <TiendaTopDonatorPip server={serverFromPath} />
            </aside>
          )}
        </main>

        {/* Zona Inferior (Top Donators Mobile) -> Fuera del main para que ocupe bien el espacio */}
        {isMobile && (
          <div className="pixel-mobile-top-donators-area">
            <TiendaTopDonatorPip server={serverFromPath} />
          </div>
        )}

        {/* Botón Flotante y Drawer (Carrito Mobile) */}
        {isMobile && (
          <>
            <button
              className="pixel-mobile-cart-btn"
              onClick={() => setCartOpenMobile(true)}
              disabled={totalQty === 0}
            >
              <div className="cart-btn-inner">
                <span className="cart-left">
                  <IconCart size={22} />
                  <span className="cart-qty">{totalQty}</span>
                </span>
                <span className="cart-right">
                  <span className="cart-price">{totalFormatted}</span>
                  <span className="cart-buy">VER CESTA</span>
                </span>
              </div>
            </button>

            {cartOpenMobile && createPortal(
              <div className="wp-overlay">
                <div className="wp-pixel-modal mobile-cart-modal">
                  <button className="wp-close-x" onClick={() => setCartOpenMobile(false)}>✖</button>
                  <div className="mobile-cart-content">
                    <div className="pixel-cart-box">
                      <TiendaCarritoLateral
                        carrito={carrito}
                        onAgregar={agregar}
                        eliminarItem={eliminar}
                        vaciarCarrito={vaciar}
                        total={total}
                        onCambiarCantidad={cambiarCantidad}
                        onSetCantidad={setCantidad}
                        nombreConfirmado={nombreConfirmado}
                        uuidConfirmado={uuidConfirmado}
                        monedaSeleccionada={currencyUpper}
                        onMonedaChange={handleMonedaChange}
                        onAbrirLogin={abrirModalCuenta}
                        onCambiarCuenta={cambiarCuenta}
                        isWebLoggedIn={isWebLoggedIn}
                        server={serverFromPath}
                        mode="mobileDrawer"
                        onRequestClose={() => setCartOpenMobile(false)}
                        fx={fx}
                      />
                    </div>
                  </div>
                </div>
              </div>,
              document.body
            )}
          </>
        )}

        <TiendaFooter />
      </div>
    </>
  );
};

export default TiendaLayout;