// apps/frontend/src/components/Tienda/TiendaLayout.jsx
import React, { useState, useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";

import TiendaPortada from "./TiendaPortada";
import TiendaCategoriaVista from "./TiendaCategoriaVista";
import TiendaCarritoLateral from "./TiendaCarritoLateral";
import TiendaModalJugador from "./TiendaModalJugador";
import { useTiendaCarrito } from "./useTiendaCarrito";

import "../../styles/components/Tienda/tienda-layout.scss";

/**
 * Layout general de la tienda.
 * - Fondo de taberna a pantalla completa
 * - Izquierda: contenido (portada / categorías / productos)
 * - Derecha: carrito flotando por encima del fondo, sin empujarlo
 */
const TiendaLayout = () => {
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

  const { carrito, toggleProducto } = useTiendaCarrito(nombreConfirmado);
  const location = useLocation();

  const esPortada =
    location.pathname === "/tienda" || location.pathname === "/tienda/";

  useEffect(() => {
    if (!localStorage.getItem("nombreJugador")) {
      setMostrarLogin(true);
    }
  }, []);

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

  return (
    <div className="tienda-layout">
      {/* Modal de login */}
      {mostrarLogin && (
        <TiendaModalJugador
          onConfirmar={confirmarNombre}
          onCerrar={() => setMostrarLogin(false)}
        />
      )}

      <main className="tienda-layout-main">
        {/* COLUMNA IZQUIERDA: contenido de la tienda */}
        <section className="tienda-layout-left">
          <div className="tienda-shelf-frame">
            <div
              className={
                "tienda-shelf-inner " +
                (esPortada ? "tienda-shelf-portada" : "tienda-shelf-contenido")
              }
            >
              <Routes>
                {/* /tienda => portada con categorías */}
                <Route path="/" element={<TiendaPortada />} />

                {/* /tienda/:server/:categoria */}
                <Route
                  path="/:server/:categoria"
                  element={
                    <TiendaCategoriaVista
                      carrito={carrito}
                      toggleProducto={toggleProducto}
                    />
                  }
                />

                {/* /tienda/:server/:categoria/:subcategoria */}
                <Route
                  path="/:server/:categoria/:subcategoria"
                  element={
                    <TiendaCategoriaVista
                      carrito={carrito}
                      toggleProducto={toggleProducto}
                    />
                  }
                />
              </Routes>
            </div>
          </div>
        </section>

        {/* COLUMNA DERECHA: carrito flotando sobre el mismo fondo */}
        <aside className="tienda-layout-sidebar">
          <div className="tienda-sidebar-card">
            <TiendaCarritoLateral
              carrito={carrito}
              onAgregar={toggleProducto}
              nombreConfirmado={nombreConfirmado}
              uuidConfirmado={uuidConfirmado}
              monedaSeleccionada={moneda}
              onMonedaChange={handleMonedaChange}
              onLoginClick={() => setMostrarLogin(true)}
            />
          </div>
        </aside>
      </main>
    </div>
  );
};

export default TiendaLayout;
