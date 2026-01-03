// apps/frontend/src/components/Tienda/ProductoDetallesModal.jsx
import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import "../../styles/components/Tienda/productoDetallesModal.scss";

import ProductDetailsMCMenu from "./ProductDetailsMCMenu";
import { resolveProductDetails } from "./data/productDetails/index.js";

/**
 * Modal genérico:
 * - content: objeto (RECOMENDADO) o string key (id/slug) para resolver via registry
 * - html: legacy (si aún te queda algo viejo)
 */
export default function ProductoDetallesModal({
  open,
  onClose,
  title = "Detalles",
  html = "",
  content = null,
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

  // Permite pasar: content="inmortal" o content={{...}}
  const resolved =
    typeof content === "string" ? resolveProductDetails(content) : content;

  const isMCMenu = resolved?.type === "mc_menu";

  return createPortal(
    <div
      className="tienda-modal"
      role="dialog"
      aria-modal="true"
      onMouseDown={() => onClose?.()}
    >
      <div
        className="tienda-modal__dialog"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="tienda-modal__header">
          <div className="tienda-modal__titleWrap">
            <span className="tienda-modal__kicker">
              {resolved?.kicker || "Producto"}
            </span>
            <h2 className="tienda-modal__title">{resolved?.name || title}</h2>
          </div>

          <button
            className="tienda-modal__close"
            type="button"
            onClick={() => onClose?.()}
            aria-label="Cerrar"
            title="Cerrar"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <div className="tienda-modal__body">
          {isMCMenu ? (
            <ProductDetailsMCMenu data={resolved} />
          ) : (
            <div
              className="mcx2"
              dangerouslySetInnerHTML={{ __html: html || "" }}
            />
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
