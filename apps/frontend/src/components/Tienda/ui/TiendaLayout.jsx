// src/components/Tienda/ui/TiendaLayout.jsx
import React, {
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";

import "../../../styles/components/Tienda/tienda-layout.scss";
import "../../../styles/components/Tienda/tienda-layout-sticky.scss";

import { UserContext } from "../../../context/UserContext";
import TiendaStorefront from "./TiendaStorefront";
import TiendaCarritoLateral from "./TiendaCarritoLateral";
import TiendaModalJugador from "../modals/TiendaModalJugador";
import useTiendaCarrito from "../hooks/useTiendaCarrito";
import TiendaFooter from "./TiendaFooter";
import TiendaTopDonatorPip from "./TiendaTopDonatorPip";

const readWebUser = () => {
  try {
    const raw = localStorage.getItem("flan_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const uid = () => Math.random().toString(16).slice(2);

function useIsMobileQuery(maxWidth = 767.98) {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(`(max-width: ${maxWidth}px)`).matches;
  });

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${maxWidth}px)`);
    const onChange = () => setIsMobile(mq.matches);

    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else mq.addListener(onChange);

    onChange();

    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", onChange);
      else mq.removeListener(onChange);
    };
  }, [maxWidth]);

  return isMobile;
}

// ===== icons (pro, sin emojis) =====
const IconCart = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M6 6h15l-2 8H8L6 6Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    <path d="M6 6 5 3H2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path
      d="M9 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM18 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
      fill="currentColor"
    />
  </svg>
);

const IconClose = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
  </svg>
);

const TiendaLayout = () => {
  const rootRef = useRef(null);
  const { user, setUser } = useContext(UserContext);

  const [mostrarLogin, setMostrarLogin] = useState(false);
  const [nombreConfirmado, setNombreConfirmado] = useState(
    () => localStorage.getItem("nombreJugador") || ""
  );
  const [uuidConfirmado, setUuidConfirmado] = useState(
    () => localStorage.getItem("uuidJugador") || ""
  );

  const [moneda, setMoneda] = useState(() => localStorage.getItem("monedaSeleccionada") || "EUR");

  const { carrito, toggleProducto, agregar, eliminar, vaciar, total, cambiarCantidad, setCantidad } =
    useTiendaCarrito(nombreConfirmado);

  const location = useLocation();
  const isMobile = useIsMobileQuery(767.98);

  const esPortada = useMemo(() => {
    return location.pathname === "/tienda" || location.pathname === "/tienda/";
  }, [location.pathname]);

  const serverFromPath = useMemo(() => {
    const parts = String(location.pathname || "").split("/").filter(Boolean);
    if (parts[0] !== "tienda") return "global";
    const next = String(parts[1] || "").toLowerCase();
    if (next === "gens" || next === "oneblock" || next === "survival") return next;
    return "global";
  }, [location.pathname]);

  const [webUser, setWebUser] = useState(() => readWebUser());

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === "flan_user") setWebUser(readWebUser());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const isWebLoggedIn = useMemo(() => {
    return Boolean(user?.loggedIn || webUser?.loggedIn);
  }, [user?.loggedIn, webUser?.loggedIn]);

  const prevEsPortadaRef = useRef(esPortada);
  const [expandiendo, setExpandiendo] = useState(false);

  useEffect(() => {
    const prev = prevEsPortadaRef.current;
    if (prev === true && esPortada === false) {
      setExpandiendo(true);
      const t = setTimeout(() => setExpandiendo(false), 520);
      return () => clearTimeout(t);
    }
    prevEsPortadaRef.current = esPortada;
  }, [esPortada]);

  // ====== altura navbar ======
  useLayoutEffect(() => {
    const host = rootRef.current;
    if (!host) return;

    const pick = () => {
      const candidates = [
        document.querySelector(".navbar-content"),
        document.querySelector(".mobile-only"),
      ].filter(Boolean);

      return candidates.find((el) => {
        const cs = window.getComputedStyle(el);
        return cs.display !== "none" && cs.visibility !== "hidden" && el.offsetHeight > 0;
      });
    };

    let el = pick();
    if (!el) return;

    const apply = () => {
      host.style.setProperty("--navH", `${el?.offsetHeight || 0}px`);
    };

    apply();

    const ro = new ResizeObserver(() => apply());
    ro.observe(el);

    const onResize = () => {
      const next = pick();
      if (next && next !== el) {
        ro.unobserve(el);
        el = next;
        ro.observe(el);
      }
      apply();
    };

    window.addEventListener("resize", onResize);

    const t1 = window.setTimeout(apply, 120);
    const t2 = window.setTimeout(apply, 400);

    return () => {
      window.removeEventListener("resize", onResize);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      ro.disconnect();
    };
  }, []);

  // ====== sync nombre/uuid ======
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
    const isLoggedWeb = Boolean(user?.loggedIn || webUser?.loggedIn);

    if (isLoggedWeb) {
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

  // =========================================================
  // Mobile cart drawer (bottom sheet)
  // =========================================================
  const [cartOpenMobile, setCartOpenMobile] = useState(false);

  useEffect(() => {
    if (!isMobile) setCartOpenMobile(false);
  }, [isMobile]);

  useEffect(() => {
    if (!isMobile) return;
    if (!cartOpenMobile) return;

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev || "";
    };
  }, [isMobile, cartOpenMobile]);

  // =========================================================
  // FX: Fly-to-basket + basket pulse
  // =========================================================
  const [flyers, setFlyers] = useState([]);
  const [basketPulse, setBasketPulse] = useState(false);

  useEffect(() => {
    const onFly = (ev) => {
      const d = ev?.detail || {};
      const img = d.img;
      const rect = d.rect;
      if (!img || !rect) return;

      const basket =
        document.querySelector('[data-basket-anchor="true"]') ||
        document.getElementById("tienda-basket");

      const br = basket?.getBoundingClientRect?.();
      if (!br) return;

      const fromX = (Number(rect.x) || 0) - 26;
      const fromY = (Number(rect.y) || 0) - 26;

      const toX = br.left + br.width * 0.85;
      const toY = br.top + br.height * 0.25;

      const id = uid();
      const dx = toX - fromX;
      const dy = toY - fromY;

      setFlyers((prev) => [...prev, { id, img, fromX, fromY, dx, dy }]);

      window.setTimeout(() => {
        setFlyers((prev) => prev.filter((f) => f.id !== id));
      }, 900);

      setBasketPulse(true);
      window.clearTimeout(onFly.__t);
      onFly.__t = window.setTimeout(() => setBasketPulse(false), 320);
    };

    document.addEventListener("tienda:fly", onFly);
    return () => document.removeEventListener("tienda:fly", onFly);
  }, []);

  const removeFlyer = (id) => {
    setFlyers((prev) => prev.filter((f) => f.id !== id));
  };

  // =========================================================
  // Mini cart metrics
  // =========================================================
  const distinctCount = carrito?.length || 0;

  const totalQty = useMemo(() => {
    return (carrito || []).reduce((acc, it) => acc + (Number(it.quantity) || 1), 0);
  }, [carrito]);

  const currencyUpper = useMemo(() => String(moneda || "EUR").toUpperCase(), [moneda]);

  const totalFormatted = useMemo(() => {
    const n = Number(total) || 0;
    try {
      return new Intl.NumberFormat("es-ES", {
        style: "currency",
        currency: currencyUpper,
        maximumFractionDigits: 2,
      }).format(n);
    } catch {
      return `${n.toFixed(2)} ${currencyUpper}`;
    }
  }, [total, currencyUpper]);

  // =========================================================
  // Badge pop (pro) al añadir / cambiar cantidad
  // =========================================================
  const [badgePop, setBadgePop] = useState(false);
  const prevQtyRef = useRef(totalQty);

  useEffect(() => {
    const prev = prevQtyRef.current;
    if (totalQty > prev) {
      setBadgePop(true);
      window.clearTimeout(prevQtyRef.__t);
      prevQtyRef.__t = window.setTimeout(() => setBadgePop(false), 220);
    }
    prevQtyRef.current = totalQty;
  }, [totalQty]);

  return (
    <div
      ref={rootRef}
      className={[
        "tienda-layout",
        esPortada ? "is-portada" : "is-contenido",
        expandiendo ? "is-expanding" : "",
        isMobile ? "is-mobile" : "is-desktop",
      ].join(" ")}
    >
      {mostrarLogin && (
        <TiendaModalJugador onConfirmar={confirmarNombre} onCerrar={() => setMostrarLogin(false)} />
      )}

      <div className="tienda-fly-layer" aria-hidden="true">
        {flyers.map((f) => (
          <img
            key={f.id}
            className="tienda-flyer"
            src={f.img}
            alt=""
            style={{
              left: `${f.fromX}px`,
              top: `${f.fromY}px`,
              "--dx": `${f.dx}px`,
              "--dy": `${f.dy}px`,
            }}
            onAnimationEnd={() => removeFlyer(f.id)}
            draggable={false}
          />
        ))}
      </div>

      <main className="tienda-layout-main">
        <section className="tienda-layout-left">
          <div className="tienda-shelf-frame">
            <div
              className={
                "tienda-shelf-inner " + (esPortada ? "tienda-shelf-portada" : "tienda-shelf-contenido")
              }
            >
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
            </div>
          </div>
        </section>

        {!isMobile && (
          <aside className="tienda-layout-sidebar">
            <div className="tienda-sidebar-card">
              <div className="tienda-cart-wrap">
                <TiendaTopDonatorPip server={serverFromPath} />

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
                  monedaSeleccionada={moneda}
                  onMonedaChange={handleMonedaChange}
                  onAbrirLogin={abrirModalCuenta}
                  onCambiarCuenta={cambiarCuenta}
                  isWebLoggedIn={isWebLoggedIn}
                  server={serverFromPath}
                  basketPulse={basketPulse}
                  mode="desktop"
                />
              </div>
            </div>
          </aside>
        )}
      </main>

      {/* MOBILE: barra inferior + bottom-sheet */}
      {isMobile && (
        <>
          <button
            type="button"
            className={[
              "tienda-mobileBar",
              basketPulse ? "is-pulse" : "",
              distinctCount === 0 ? "is-empty" : "has-items",
              badgePop ? "is-pop" : "",
            ].join(" ")}
            onClick={() => setCartOpenMobile(true)}
            data-basket-anchor="true"
            aria-label="Abrir carrito"
          >
            {/* mitad izquierda (carrito) */}
            <div className="tmb-left" aria-label={`Carrito: ${totalQty} artículos`}>
              <div className="tmb-pill">
                <span className="tmb-pill-icon" aria-hidden="true">
                  <IconCart size={18} />
                </span>
                <span className="tmb-pill-label">CARRITO</span>
                <span className="tmb-pill-val">{totalQty}</span>
              </div>
            </div>

            {/* mitad derecha (comprar) */}
            <div className="tmb-cta" aria-label={`Comprar por ${totalFormatted}`}>
              <span className="tmb-ctaText">COMPRAR</span>
              <span className="tmb-ctaPrice">{totalFormatted}</span>
            </div>
          </button>

          {cartOpenMobile &&
            createPortal(
              <div className="tienda-cartDrawer" role="dialog" aria-modal="true">
                <button
                  type="button"
                  className="tcd-backdrop"
                  aria-label="Cerrar carrito"
                  onClick={() => setCartOpenMobile(false)}
                />

                <div className="tcd-sheet">
                  <div className="tcd-grab" aria-hidden="true" />
                  <div className="tcd-head">
                    <div className="tcd-title">
                      <span className="tcd-titleIcon" aria-hidden="true">
                        <IconCart size={18} />
                      </span>
                      Carrito
                    </div>

                    <button
                      type="button"
                      className="tcd-close"
                      onClick={() => setCartOpenMobile(false)}
                      aria-label="Cerrar"
                    >
                      <IconClose size={18} />
                    </button>
                  </div>

                  <div className="tcd-body">
                    <TiendaTopDonatorPip server={serverFromPath} />

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
                      monedaSeleccionada={moneda}
                      onMonedaChange={handleMonedaChange}
                      onAbrirLogin={abrirModalCuenta}
                      onCambiarCuenta={cambiarCuenta}
                      isWebLoggedIn={isWebLoggedIn}
                      server={serverFromPath}
                      basketPulse={basketPulse}
                      mode="mobileDrawer"
                      onRequestClose={() => setCartOpenMobile(false)}
                    />
                  </div>
                </div>
              </div>,
              document.body
            )}
        </>
      )}

      <TiendaFooter />
    </div>
  );
};

export default TiendaLayout;
