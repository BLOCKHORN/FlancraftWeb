// apps/frontend/src/components/Rangos/ModalCompraRango.jsx

import { useEffect, useRef } from "react";

function ModalCompraRango({
  open,
  rangoSeleccionado,
  precios,
  comprando,
  onConfirm,
  onCancel,
}) {
  // ✅ Guard CLAUSULE *antes* de cualquier hook
  if (!open || !rangoSeleccionado) return null;

  // Hooks (siempre en el mismo orden cuando el modal está abierto)
  const closeBtnRef = useRef(null);

  const { rango } = rangoSeleccionado;
  const precio30 =
    precios?.[rangoSeleccionado.rango.id]?.["30d"] ?? rangoSeleccionado.precio;

  // Cerrar con ESC y enfocar al abrir
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") onCancel?.();
    };
    document.addEventListener("keydown", handleKey);

    // Focus al botón cerrar para accesibilidad
    closeBtnRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", handleKey);
    };
  }, [onCancel]);

  // Cerrar si clicas sobre el backdrop
  const handleBackdropMouseDown = (e) => {
    if (e.currentTarget === e.target) onCancel?.();
  };

  return (
    <div
      className="modal-compra"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-titulo"
      onMouseDown={handleBackdropMouseDown}
    >
      <div className={`modal-contenido ${comprando ? "cargando" : ""}`}>
        {/* Cerrar */}
        <button
          ref={closeBtnRef}
          className="modal-close"
          aria-label="Cerrar"
          onClick={onCancel}
          type="button"
        >
          ×
        </button>

        {/* Cabecera visual */}
        <div className="modal-head">
          <div className="modal-badge">Rango 30 días</div>
          <h3 id="modal-titulo" className="modal-titulo">
            Confirmar compra
          </h3>
          <div className="modal-hero">
            <div className="modal-hero-imgwrap">
              <img
                src={rango.imagen}
                alt={rango.nombre}
                className="modal-rango-hero"
                draggable="false"
              />
            </div>
            <div className="modal-hero-info">
              <span className="modal-rango-nombre">{rango.nombre}</span>
              {precio30 !== undefined && (
                <span className="modal-price-pill" aria-label="Precio en ECOS">
                  {precio30.toLocaleString("es-ES")}
                  <img
                    src="/assets/eco.png"
                    alt=""
                    aria-hidden="true"
                    className="eco-mini"
                  />
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Cuerpo / texto breve */}
        <div className="modal-desglose">
          <p className="modal-texto">
            Este rango se activa al instante y dura <strong>30 días</strong>.
          </p>
          <p className="modal-texto sutil">
            Se descontarán automáticamente tus <strong>ECOS</strong> disponibles
            al confirmar.
          </p>
        </div>

        {/* Acciones */}
        <div className="modal-botones">
          <button
            className={`btn-confirmar ${comprando ? "deshabilitado" : ""}`}
            onClick={onConfirm}
            disabled={comprando}
            type="button"
          >
            {comprando ? <span className="spinner" aria-hidden="true" /> : null}
            {comprando ? "Procesando..." : "Confirmar compra"}
          </button>
          <button className="btn-cancelar btn-ghost" onClick={onCancel} type="button">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

export default ModalCompraRango;
