// apps/frontend/src/components/Tienda/TiendaLayout.jsx
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
import useTiendaCarrito from "./useTiendaCarrito";
import TiendaFooter from "./TiendaFooter";
import TiendaTopDonator from "./TiendaTopDonator";
import TiendaOfertaCountdown from "./TiendaOfertaCountdown";

const readWebUser = () => {
  try {
    const raw = localStorage.getItem("flan_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

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

  const { carrito, toggleProducto, eliminar, vaciar, total } =
    useTiendaCarrito(nombreConfirmado);

  const location = useLocation();

  const esPortada = useMemo(() => {
    return location.pathname === "/tienda" || location.pathname === "/tienda/";
  }, [location.pathname]);

  // ✅ Server actual desde URL (para Top Donator por servidor)
  const serverFromPath = useMemo(() => {
    const parts = String(location.pathname || "").split("/").filter(Boolean);
    // /tienda/:server/:categoria...
    if (parts[0] !== "tienda") return "global";
    return parts[1] || "global";
  }, [location.pathname]);

  // ✅ Estado "expandiendo" para animación solo cuando pasas de portada -> contenido
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

  // ✅ altura real header (para que no choque con navbar)
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
        return (
          cs.display !== "none" &&
          cs.visibility !== "hidden" &&
          el.offsetHeight > 0
        );
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

    if (String(nombreConfirmado).trim() === username) {
      if (!uuidConfirmado && uuid) {
        localStorage.setItem("uuidJugador", uuid);
        setUuidConfirmado(uuid);
      }
      return;
    }

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
    const web = readWebUser();
    const isLoggedWeb = Boolean(user?.loggedIn || web?.loggedIn);

    if (isLoggedWeb) {
      localStorage.removeItem("flan_user");
      setUser?.(null);
    }

    localStorage.removeItem("nombreJugador");
    localStorage.removeItem("uuidJugador");
    setNombreConfirmado("");
    setUuidConfirmado("");
    setMostrarLogin(true);
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

                {/* ✅ Ruta anidada: NO se remonta el componente al entrar a subcategoria */}
                <Route
                  path="/:server/:categoria"
                  element={
                    <TiendaCategoriaVista
                      carrito={carrito}
                      toggleProducto={toggleProducto}
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
            {/* ✅ TOP DONATOR arriba */}
            <TiendaTopDonator server={serverFromPath} />

            {/* ✅ Carrito ocupa el resto sin ser comido por el footer */}
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

      {/* Footer: NO se toca */}
      <TiendaFooter />
    </div>
  );
};

export default TiendaLayout;
