// apps/frontend/src/components/Tienda/TiendaLayout.jsx
import React, { useContext, useLayoutEffect, useMemo, useRef, useState, useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";

import TiendaPortada from "./TiendaPortada";
import TiendaCategoriaVista from "./TiendaCategoriaVista";
import TiendaCarritoLateral from "./TiendaCarritoLateral";
import TiendaModalJugador from "./TiendaModalJugador";
import { useTiendaCarrito } from "./useTiendaCarrito";

import { UserContext } from "../../context/UserContext";
import "../../styles/components/Tienda/tienda-layout.scss";

function readWebUser() {
  try {
    const raw = localStorage.getItem("flan_user");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.loggedIn) return null;
    // LoginModal guarda { uuid, username, loggedIn:true }
    return {
      uuid: String(parsed.uuid || "").trim(),
      username: String(parsed.username || "").trim(),
      loggedIn: true,
    };
  } catch {
    return null;
  }
}

const TiendaLayout = () => {
  const rootRef = useRef(null);
  const { user, setUser } = useContext(UserContext);

  const [mostrarLogin, setMostrarLogin] = useState(false);

  // Cuenta tienda (puede venir de web login o de elección manual)
  const [nombreConfirmado, setNombreConfirmado] = useState(() => {
    const web = readWebUser();
    if (web?.loggedIn && web?.username) return web.username;
    return localStorage.getItem("nombreJugador") || "";
  });

  const [uuidConfirmado, setUuidConfirmado] = useState(() => {
    const web = readWebUser();
    if (web?.loggedIn && web?.uuid) return web.uuid;
    return localStorage.getItem("uuidJugador") || "";
  });

  const [moneda, setMoneda] = useState(() => localStorage.getItem("monedaSeleccionada") || "EUR");

  const { carrito, toggleProducto, eliminar, vaciar, total } = useTiendaCarrito(nombreConfirmado);

  const location = useLocation();
  const esPortada = useMemo(() => {
    return location.pathname === "/tienda" || location.pathname === "/tienda/";
  }, [location.pathname]);

  // ✅ altura real header
  useLayoutEffect(() => {
    const host = rootRef.current;
    if (!host) return;

    const compute = () => {
      const candidates = [
        document.querySelector(".navbar-content"),
        document.querySelector(".mobile-only"),
      ].filter(Boolean);

      const visible = candidates.find((el) => {
        const cs = window.getComputedStyle(el);
        return cs.display !== "none" && cs.visibility !== "hidden" && el.offsetHeight > 0;
      });

      const h = visible ? Math.ceil(visible.getBoundingClientRect().height) : 0;
      host.style.setProperty("--top-offset", `${h}px`);
    };

    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, []);

  // Si el user global está logueado, auto-set cuenta tienda
  useEffect(() => {
    const web = readWebUser();
    const ctxLogged = Boolean(user?.loggedIn && user?.username);

    const username = (user?.username || web?.username || "").trim();
    const uuid = (user?.uuid || web?.uuid || "").trim();

    if (!username) return;

    // Si ya está igual, no tocar
    if (String(nombreConfirmado).trim() === username) {
      // si falta uuid tienda y tenemos uuid web, rellena
      if (!uuidConfirmado && uuid) {
        localStorage.setItem("uuidJugador", uuid);
        setUuidConfirmado(uuid);
      }
      return;
    }

    // Autodetecta SOLO si estás logueado en web
    if (ctxLogged || web?.loggedIn) {
      localStorage.setItem("nombreJugador", username);
      if (uuid) localStorage.setItem("uuidJugador", uuid);

      setNombreConfirmado(username);
      setUuidConfirmado(uuid);
      setMostrarLogin(false);
    }
  }, [user, nombreConfirmado, uuidConfirmado]);

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
    // Requisito: si estás logueado en web, al cambiar cuenta desde carrito -> logout global
    const web = readWebUser();
    const isLoggedWeb = Boolean(user?.loggedIn || web?.loggedIn);

    if (isLoggedWeb) {
      // limpia storage del login global
      localStorage.removeItem("flan_user");
      // limpia context
      setUser?.(null);
    }

    // limpia cuenta de tienda
    localStorage.removeItem("nombreJugador");
    localStorage.removeItem("uuidJugador");
    setNombreConfirmado("");
    setUuidConfirmado("");

    // abre modal para elegir
    setMostrarLogin(true);
  };

  return (
    <div ref={rootRef} className={`tienda-layout ${esPortada ? "is-portada" : "is-contenido"}`}>
      {mostrarLogin && (
        <TiendaModalJugador
          onConfirmar={confirmarNombre}
          onCerrar={() => setMostrarLogin(false)}
        />
      )}

      <main className="tienda-layout-main">
        <section className="tienda-layout-left">
          <div className="tienda-shelf-frame">
            <div className={"tienda-shelf-inner " + (esPortada ? "tienda-shelf-portada" : "tienda-shelf-contenido")}>
              <Routes>
                <Route path="/" element={<TiendaPortada />} />

                <Route
                  path="/:server/:categoria"
                  element={<TiendaCategoriaVista carrito={carrito} toggleProducto={toggleProducto} />}
                />

                <Route
                  path="/:server/:categoria/:subcategoria"
                  element={<TiendaCategoriaVista carrito={carrito} toggleProducto={toggleProducto} />}
                />
              </Routes>
            </div>
          </div>
        </section>

        <aside className="tienda-layout-sidebar">
          <div className="tienda-sidebar-card">
            <TiendaCarritoLateral
              carrito={carrito}
              onAgregar={toggleProducto}
              eliminarItem={eliminar}
              vaciarCarrito={vaciar}
              total={total}
              nombreConfirmado={nombreConfirmado}
              uuidConfirmado={uuidConfirmado}
              monedaSeleccionada={moneda}
              onMonedaChange={handleMonedaChange}
              onAbrirLogin={abrirModalCuenta}
              onCambiarCuenta={cambiarCuenta}
              isWebLoggedIn={Boolean(user?.loggedIn || readWebUser()?.loggedIn)}
            />
          </div>
        </aside>
      </main>
    </div>
  );
};

export default TiendaLayout;
