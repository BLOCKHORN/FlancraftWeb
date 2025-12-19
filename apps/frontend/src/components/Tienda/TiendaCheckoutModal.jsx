// src/components/Tienda/TiendaCheckoutModal.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import "../../styles/components/Tienda/tienda-checkout-modal.scss";

export default function TiendaCheckoutModal({ open, ident, onClose }) {
  const hostRef = useRef(null);
  const [error, setError] = useState("");
  const [rendered, setRendered] = useState(false);

  const safeIdent = useMemo(() => String(ident || "").trim(), [ident]);
  const hasIdent = Boolean(safeIdent);

  const close = useCallback(() => {
    // No tocamos el DOM interno (Tebex lo controla)
    setError("");
    setRendered(false);
    onClose?.();
  }, [onClose]);

  // ESC para cerrar (como un modal real)
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  // Bloqueo scroll del body
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev || "";
    };
  }, [open]);

  const mountCheckout = useCallback(() => {
    const Tebex = window?.Tebex;
    if (!Tebex?.checkout?.init || !Tebex?.checkout?.render) {
      setError(
        "Tebex.js no está cargado. Revisa index.html (https://js.tebex.io/v/1.js)."
      );
      return;
    }

    const host = hostRef.current;
    if (!host) return;

    // Tamaño EXACTO del contenedor (sin topbars/paddings nuestros)
    const rect = host.getBoundingClientRect();
    const w = Math.max(360, Math.floor(rect.width));
    const h = Math.max(520, Math.floor(rect.height));

    try {
      Tebex.checkout.init({
        ident: safeIdent,
        theme: "dark",
        locale: "es_ES",
        colors: [
          { name: "primary", color: "#6dbf2a" },
          { name: "secondary", color: "#009BE4" },
        ],
      });

      Tebex.checkout.render(host, w, h, false);
      setRendered(true);
    } catch (e) {
      setError(String(e?.message || "No se pudo renderizar el checkout."));
    }
  }, [safeIdent]);

  useEffect(() => {
    if (!open) return;

    setError("");
    setRendered(false);
    if (!hasIdent) return;

    // Espera a que el layout tenga el tamaño final
    const raf = requestAnimationFrame(() => {
      const Tebex = window?.Tebex;
      if (Tebex?.checkout?.init) {
        mountCheckout();
      } else {
        const onLoad = () => mountCheckout();
        window.addEventListener("load", onLoad, { once: true });
      }
    });

    return () => cancelAnimationFrame(raf);
  }, [open, hasIdent, mountCheckout]);

  return (
    <div
      className={`wcc ${open ? "wcc--open" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label="Checkout"
      aria-hidden={!open}
    >
      <div className="wcc__backdrop" onClick={open ? close : undefined} />

      {/* Contenedor estilo Wynncraft: sin header ni padding */}
      <div className="wcc__embed" onClick={(e) => e.stopPropagation()}>
        {error ? <div className="wcc__error">{error}</div> : null}

        <div className="wcc__host" ref={hostRef}>
          {!error && hasIdent && open && !rendered ? (
            <div className="wcc__loading">Loading…</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
