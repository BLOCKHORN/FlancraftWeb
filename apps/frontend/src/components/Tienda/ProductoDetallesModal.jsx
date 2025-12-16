// apps/frontend/src/components/Tienda/components/ProductoDetallesModal.jsx
import { useEffect } from "react";
import { createPortal } from "react-dom";
import "../../styles/components/Tienda/productoDetallesModal.scss";

export default function ProductoDetallesModal({
  open,
  onClose,
  title = "Detalles",
  html = "",
}) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };

    document.addEventListener("keydown", onKeyDown);
    document.body.classList.add("tienda-modal-open");

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.classList.remove("tienda-modal-open");
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="tienda-modal"
      role="dialog"
      aria-modal="true"
      onMouseDown={() => onClose?.()}
    >
      <div className="tienda-modal__dialog" onMouseDown={(e) => e.stopPropagation()}>
        <div className="tienda-modal__header">
          <h2 className="tienda-modal__title">{title}</h2>
          <button
            className="tienda-modal__close"
            type="button"
            onClick={() => onClose?.()}
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <div className="tienda-modal__body">
          <div dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      </div>
    </div>,
    document.body
  );
}
