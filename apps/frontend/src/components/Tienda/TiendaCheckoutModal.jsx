// src/components/Tienda/TiendaCheckoutModal.jsx
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import "../../styles/components/Tienda/tienda-checkout-modal.scss";

function ensureTebexScript() {
  const ID = "tebex-js-v1";
  const existing = document.getElementById(ID);
  if (existing) return Promise.resolve(true);

  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.id = ID;
    s.src = "https://js.tebex.io/v/1.js";
    s.defer = true;
    s.onload = () => resolve(true);
    s.onerror = () => reject(new Error("No se pudo cargar Tebex.js"));
    document.head.appendChild(s);
  });
}

function extractIdentFromUrl(url) {
  const raw = String(url || "").trim();
  if (!raw) return "";
  try {
    const u = new URL(raw);
    const path = (u.pathname || "").replace(/^\/+/, "");
    const ident = path.split("/")[0] || "";
    return ident.trim();
  } catch {
    const m = raw.match(/pay\.tebex\.io\/([^/?#]+)/i);
    return (m?.[1] || "").trim();
  }
}

function buildPayUrlFromIdent(ident) {
  const id = String(ident || "").trim();
  if (!id) return "";
  return `https://pay.tebex.io/${encodeURIComponent(id)}`;
}

export default function TiendaCheckoutModal({
  open,
  url,
  ident,
  onClose,
  locale = "es_ES",
  title = "Checkout",
}) {
  const panelRef = useRef(null);
  const footerRef = useRef(null);
  const checkoutElRef = useRef(null);

  const [scriptReady, setScriptReady] = useState(false);
  const [embedHeight, setEmbedHeight] = useState(640);

  const checkoutIdent = useMemo(() => {
    const direct = String(ident || "").trim();
    if (direct) return direct;
    return extractIdentFromUrl(url);
  }, [ident, url]);

  const fallbackPayUrl = useMemo(() => {
    const u = String(url || "").trim();
    if (u) return u;
    return buildPayUrlFromIdent(checkoutIdent);
  }, [url, checkoutIdent]);

  useEffect(() => {
    if (!open) return;

    let alive = true;
    ensureTebexScript()
      .then(() => alive && setScriptReady(true))
      .catch(() => alive && setScriptReady(false));

    return () => {
      alive = false;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;

    const measure = () => {
      const panel = panelRef.current;
      if (!panel) return;

      const panelRect = panel.getBoundingClientRect();
      const footerH = footerRef.current ? footerRef.current.getBoundingClientRect().height : 0;

      const h = Math.max(520, Math.floor(panelRect.height - footerH));
      setEmbedHeight(h);
    };

    measure();

    const ro = new ResizeObserver(measure);
    if (panelRef.current) ro.observe(panelRef.current);
    if (footerRef.current) ro.observe(footerRef.current);

    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("resize", measure);
      ro.disconnect();
    };
  }, [open]);

  if (!open) return null;

  const canRender = scriptReady && !!checkoutIdent;

  return (
    <div className="tcm" role="dialog" aria-modal="true" aria-label={title}>
      <div className="tcm__backdrop" onClick={onClose} />

      <button className="tcm__close" type="button" onClick={onClose} aria-label="Cerrar" />

      <div className="tcm__panel" ref={panelRef}>
        {!canRender ? (
          <div className="tcm__loading" aria-live="polite">
            <div className="tcm__spinner" aria-hidden="true" />
            <div className="tcm__loadingTitle">Cargando checkout…</div>
            <div className="tcm__loadingHint">
              Si tarda en cargar, prueba “Abrir en nueva pestaña”.
            </div>

            {fallbackPayUrl ? (
              <div className="tcm__loadingActions">
                <a className="tcm__link" href={fallbackPayUrl} target="_blank" rel="noreferrer noopener">
                  Abrir en nueva pestaña
                </a>
              </div>
            ) : null}
          </div>
        ) : (
          <tebex-checkout
            ref={checkoutElRef}
            inline=""
            ident={checkoutIdent}
            theme="dark"
            locale={locale}
            height={String(embedHeight)}
            style={{ width: "100%", height: `${embedHeight}px`, display: "block" }}
          />
        )}

        <div className="tcm__footer" ref={footerRef}>
          {fallbackPayUrl ? (
            <a className="tcm__btn" href={fallbackPayUrl} target="_blank" rel="noreferrer noopener">
              Abrir en nueva pestaña
            </a>
          ) : (
            <span />
          )}

          <button className="tcm__btn tcm__btn--ghost" type="button" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
