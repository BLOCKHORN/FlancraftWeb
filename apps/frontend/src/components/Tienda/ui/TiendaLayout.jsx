// src/components/Tienda/ui/TiendaLayout.jsx
import React, {
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";

import "../../../styles/components/Tienda/tienda-layout.scss";

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

  const {
    carrito,
    toggleProducto,
    agregar,
    eliminar,
    vaciar,
    total,
    cambiarCantidad,
    setCantidad,
  } = useTiendaCarrito(nombreConfirmado);

  const location = useLocation();

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

      const basket = document.getElementById("tienda-basket");
      const br = basket?.getBoundingClientRect?.();
      if (!br) return;

      const fromX = (Number(rect.x) || 0) - 26;
      const fromY = (Number(rect.y) || 0) - 26;

      const toX = br.left + br.width * 0.82;
      const toY = br.top + br.height * 0.16;

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
                "tienda-shelf-inner " +
                (esPortada ? "tienda-shelf-portada" : "tienda-shelf-contenido")
              }
            >
              <Routes>
                <Route
                  path="/"
                  element={
                    <TiendaStorefront
                      carrito={carrito}
                      toggleProducto={toggleProducto}
                      // ✅ CLAVE: handlers reales para cantidades
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

        <aside className="tienda-layout-sidebar">
          <div className="tienda-sidebar-card">
            <div className="tienda-cart-wrap">
              <TiendaTopDonatorPip server={serverFromPath} />

              <TiendaCarritoLateral
                carrito={carrito}
                // ✅ CLAVE: sumar debe ser agregar, no toggle
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