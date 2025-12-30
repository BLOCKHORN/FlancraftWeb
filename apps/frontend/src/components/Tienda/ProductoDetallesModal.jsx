// apps/frontend/src/components/Tienda/components/ProductoDetallesModal.jsx
import { useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import "../../styles/components/Tienda/productoDetallesModal.scss";
import "../../styles/components/Tienda/inmortal-mcx.scss";

/**
 * Modal genérico para detalles de producto.
 * - Cierra con Escape
 * - Cierra al clickar overlay
 * - Bloquea scroll del body
 * - Si el HTML no viene envuelto, lo envuelve en .mcx para que el SCSS “minecraft cartoon” aplique
 */
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

  // Asegura que el HTML “minecraft” siempre se pinte con tus estilos (.mcx)
  const wrappedHtml = useMemo(() => {
    const raw = String(html || "").trim();
    if (!raw) return "";

    // Si ya viene con un wrapper mcx/prod-desc, no lo toques
    const alreadyWrapped =
      raw.includes('class="mcx') ||
      raw.includes("class='mcx") ||
      raw.includes('class="prod-desc') ||
      raw.includes("class='prod-desc");

    if (alreadyWrapped) return raw;

    return `<div class="mcx"><div class="mcx-modal">${raw}</div></div>`;
  }, [html]);

  if (!open) return null;

  return createPortal(
    <div
      className="tienda-modal"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={() => onClose?.()}
    >
      <div
        className="tienda-modal__dialog"
        role="document"
        onMouseDown={(e) => e.stopPropagation()}
      >
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
          {wrappedHtml ? (
            <div dangerouslySetInnerHTML={{ __html: wrappedHtml }} />
          ) : (
            <div className="tienda-modal__empty">Sin detalles disponibles.</div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
