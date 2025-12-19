// src/components/Tienda/TiendaLayout.jsx
import React, {
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Route, Routes, useLocation } from "react-router-dom";

import "../../styles/components/Tienda/tienda-layout.scss";

import { UserContext } from "../../context/UserContext";
import TiendaPortada from "./TiendaPortada";
import TiendaCategoriaVista from "./TiendaCategoriaVista";
import TiendaCarritoLateral from "./TiendaCarritoLateral";
import TiendaModalJugador from "./TiendaModalJugador";
import TiendaCheckoutModal from "./TiendaCheckoutModal"; // ✅ NUEVO: componente aparte
import useTiendaCarrito from "./useTiendaCarrito";
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

  const [moneda, setMoneda] = useState(
    () => localStorage.getItem("monedaSeleccionada") || "EUR"
  );

  // ✅ Hook carrito (actualizado con cantidades)
  const {
    carrito,
    toggleProducto,
    eliminar,
    vaciar,
    total,
    cambiarCantidad,
    setCantidad,
    agregar, // (opcional, por si lo quieres usar luego)
  } = useTiendaCarrito(nombreConfirmado);

  const location = useLocation();

  const esPortada = useMemo(() => {
    return location.pathname === "/tienda" || location.pathname === "/tienda/";
  }, [location.pathname]);

  const serverFromPath = useMemo(() => {
    const parts = String(location.pathname || "").split("/").filter(Boolean);
    if (parts[0] !== "tienda") return "global";
    return parts[1] || "global";
  }, [location.pathname]);

  // ✅ webUser en state (no parse en cada render)
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
      const t = setTimeout(() => setExpandiendo(false), 420);
      return () => clearTimeout(t);
    }
    prevEsPortadaRef.current = esPortada;
  }, [esPortada]);

  // ✅ Medición robusta de navbar (ResizeObserver + repick)
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
        return (
          cs.display !== "none" &&
          cs.visibility !== "hidden" &&
          el.offsetHeight > 0
        );
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

  // Auto-set cuenta tienda desde user web
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
  // ✅ FX: Fly-to-basket + basket pulse
  // =========================================================
  const [flyers, setFlyers] = useState([]);
  const [basketPulse, setBasketPulse] = useState(false);

  useEffect(() => {
    const onFly = (ev) => {
      const d = ev?.detail || {};
      const img = d.img;
      const rect = d.rect;
      if (!img || !rect) return;

      const basket = document.getElementById("tienda-basket");
      const br = basket?.getBoundingClientRect?.();
      if (!br) return;

      // rect viene como centro (x,y). Ajustamos a top-left del flyer (52px)
      const fromX = (Number(rect.x) || 0) - 26;
      const fromY = (Number(rect.y) || 0) - 26;

      const toX = br.left + br.width * 0.82;
      const toY = br.top + br.height * 0.16;

      const id = uid();
      const dx = toX - fromX;
      const dy = toY - fromY;

      setFlyers((prev) => [...prev, { id, img, fromX, fromY, dx, dy }]);

      // ✅ Fallback: si no hay animationend (CSS / reduce motion), lo limpiamos igual
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
  // ✅ Checkout modal (usando componente aparte)
  // =========================================================
  const [checkoutUrl, setCheckoutUrl] = useState("");
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const openCheckoutModal = (url) => {
    setCheckoutUrl(String(url || ""));
    setCheckoutOpen(true);
  };

  const closeCheckoutModal = () => {
    setCheckoutOpen(false);
    setCheckoutUrl("");
  };

  return (
    <div
      ref={rootRef}
      className={[
        "tienda-layout",
        esPortada ? "is-portada" : "is-contenido",
        expandiendo ? "is-expanding" : "",
      ].join(" ")}
    >
      {mostrarLogin && (
        <TiendaModalJugador
          onConfirmar={confirmarNombre}
          onCerrar={() => setMostrarLogin(false)}
        />
      )}

      {/* ✅ Flyers layer */}
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

      {/* ✅ Checkout modal (componente aparte) */}
      <TiendaCheckoutModal
        open={checkoutOpen}
        url={checkoutUrl}
        onClose={closeCheckoutModal}
      />

      {/* ZONA PRINCIPAL */}
      <main className="tienda-layout-main">
        <section className="tienda-layout-left">
          <div className="tienda-shelf-frame">
            <div
              className={
                "tienda-shelf-inner " +
                (esPortada ? "tienda-shelf-portada" : "tienda-shelf-contenido")
              }
            >
              <Routes>
                <Route path="/" element={<TiendaPortada />} />
                <Route
                  path="/:server/:categoria"
                  element={
                    <TiendaCategoriaVista
                      carrito={carrito}
                      toggleProducto={toggleProducto}
                      // Si luego quieres cambiar a “sumar +1”:
                      // agregarProducto={agregar}
                    />
                  }
                >
                  <Route path=":subcategoria" element={<></>} />
                </Route>
              </Routes>
            </div>
          </div>
        </section>

        <aside className="tienda-layout-sidebar">
          <div className="tienda-sidebar-card">
            {/* ✅ Wrap para anclar el pip al carrito (no a toda la sidebar) */}
            <div className="tienda-cart-wrap">
              <TiendaTopDonatorPip server={serverFromPath} />

              <TiendaCarritoLateral
                carrito={carrito}
                onAgregar={toggleProducto}
                eliminarItem={eliminar}
                vaciarCarrito={vaciar}
                total={total}
                // ✅ NUEVO: stepper cantidades
                onCambiarCantidad={cambiarCantidad}
                onSetCantidad={setCantidad}
                nombreConfirmado={nombreConfirmado}
                uuidConfirmado={uuidConfirmado}
                monedaSeleccionada={moneda}
                onMonedaChange={handleMonedaChange}
                onAbrirLogin={abrirModalCuenta}
                onCambiarCuenta={cambiarCuenta}
                isWebLoggedIn={isWebLoggedIn}
                onCheckoutUrl={openCheckoutModal}
                basketPulse={basketPulse}
                esPortada={esPortada}
              />
            </div>
          </div>
        </aside>
      </main>

      <TiendaFooter />
    </div>
  );
};

export default TiendaLayout;
