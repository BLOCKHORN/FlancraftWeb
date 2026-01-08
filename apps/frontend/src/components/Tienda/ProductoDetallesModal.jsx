// apps/frontend/src/components/Tienda/ProductoDetallesModal.jsx
import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import "../../styles/components/Tienda/productoDetallesModal.scss";

import { resolveProductDetails } from "./data/productDetails/index.js";
import ProductDetailsMCMenu from "./ProductDetailsMCMenu.jsx";

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

  // content puede ser:
  // - string => key del registry
  // - object => payload ya resuelto
  const resolved = typeof content === "string" ? resolveProductDetails(content) : content;

  const isMCMenu = resolved?.type === "mc_menu";
  const bodyHtml = resolved?.html || html || "";

  const theme = resolved?.theme ? String(resolved.theme).trim().toLowerCase() : "";
  const dialogThemeClass = theme ? `tienda-modal__dialog--${theme}` : "";
  const bodyThemeClass = theme ? `tienda-modal__body--${theme}` : "";

  const kickerText = resolved?.kicker || "Producto";
  const titleText = resolved?.name || title;

  return createPortal(
    <div
      className="tienda-modal"
      role="dialog"
      aria-modal="true"
      onMouseDown={() => onClose?.()}
    >
      <div
        className={`tienda-modal__dialog ${dialogThemeClass}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="tienda-modal__header">
          <div className="tienda-modal__titleWrap">
            <span className="tienda-modal__kicker">{kickerText}</span>
            <h2 className="tienda-modal__title">{titleText}</h2>
          </div>

          {/* ❌ quitamos title="" para evitar tooltip nativo
              ✅ usamos data-tooltip + hasTip */}
          <button
            className="tienda-modal__close hasTip"
            type="button"
            onClick={() => onClose?.()}
            aria-label="Cerrar"
            data-tooltip="Cerrar"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <div className={`tienda-modal__body ${bodyThemeClass}`}>
          {isMCMenu ? (
            <ProductDetailsMCMenu data={resolved} />
          ) : bodyHtml ? (
            <div className="mcx2" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
          ) : (
            <div className="tienda-modal__fallback">
              <div className="tienda-modal__fallbackTitle">Sin detalles</div>
              <div className="tienda-modal__fallbackText">
                Este producto aún no tiene una ficha personalizada.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
