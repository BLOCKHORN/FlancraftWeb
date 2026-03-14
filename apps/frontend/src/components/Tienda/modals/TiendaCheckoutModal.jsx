// src/components/Tienda/modals/TiendaCheckoutModal.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { apiUrl } from "../../../lib/env";
import "../../../styles/components/Tienda/tienda-checkout-modal.scss";

// MEMORIA EXTERNA: Sobrevive a los re-renders
const TEBEX_MEM = {
  inited: false,
  ident: null,
  eventsBound: false
};

function safeStr(x) {
  return String(x ?? "").trim();
}

function IconCheck() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="3.5" strokeLinecap="square" strokeLinejoin="miter" />
    </svg>
  );
}

function IconInfo() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 20v-8" stroke="currentColor" strokeWidth="3" strokeLinecap="square" />
      <path d="M12 8V6" stroke="currentColor" strokeWidth="3" strokeLinecap="square" />
    </svg>
  );
}

function IconWarn() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 9v5" stroke="currentColor" strokeWidth="3" strokeLinecap="square" />
      <path d="M12 18v-2" stroke="currentColor" strokeWidth="3" strokeLinecap="square" />
      <path d="M12 3L2 21h20L12 3z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="miter" />
    </svg>
  );
}

export default function TiendaCheckoutModal({
  open,
  ident,
  onClose,
  playerName = "",
  server = "oneblock",
  cartItems = [],
  currencyHint = "EUR",
  onPaid,
  devForceSuccess = false,
}) {
  const hostRef = useRef(null);

  const [error, setError] = useState("");
  const [rendered, setRendered] = useState(false);
  const [phase, setPhase] = useState("checkout");
  const [detail, setDetail] = useState(null);

  const safeIdent = useMemo(() => safeStr(ident), [ident]);
  const hasIdent = Boolean(safeIdent);

  const player = useMemo(() => safeStr(playerName) || "—", [playerName]);
  const cur = useMemo(() => safeStr(currencyHint).toUpperCase() || "EUR", [currencyHint]);

  const onCloseRef = useRef(onClose);
  const onPaidRef = useRef(onPaid);
  const openRef = useRef(open);
  const identRef = useRef(safeIdent);
  const phaseRef = useRef(phase);
  const autoCloseTimerRef = useRef(null);
  const pollStopRef = useRef(false);

  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  useEffect(() => { onPaidRef.current = onPaid; }, [onPaid]);
  useEffect(() => { openRef.current = open; }, [open]);
  useEffect(() => { identRef.current = safeIdent; }, [safeIdent]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  const portalRef = useRef(null);
  useEffect(() => {
    const el = document.createElement("div");
    el.setAttribute("data-wcc-portal", "true");
    portalRef.current = el;
    document.body.appendChild(el);

    return () => {
      try { el.remove(); } catch {}
      portalRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const el = portalRef.current;
    if (el && el.parentNode === document.body) {
      document.body.appendChild(el); 
    }
  }, [open]);

  const close = useCallback(() => {
    setError("");
    setPhase("checkout");
    setDetail(null);

    pollStopRef.current = true;
    if (autoCloseTimerRef.current) {
      clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = null;
    }

    onCloseRef.current?.();
  }, []);

  // ❌ ¡AQUÍ ESTABA EL LISTENER DE LA TECLA ESCAPE! Lo he borrado para que no puedan salir con el teclado.

  // Bloqueo de scroll global
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev || ""; };
  }, [open]);

  const showSuccess = useCallback((payload) => {
    setError("");
    setDetail(payload || null);
    setPhase("success");
    onPaidRef.current?.(payload);

    if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
    autoCloseTimerRef.current = setTimeout(() => {
      if (openRef.current) close();
    }, 6500);
  }, [close]);

  const showMaybePaid = useCallback((payload) => {
    setDetail(payload || null);
    setPhase("maybePaid");
    if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
    autoCloseTimerRef.current = setTimeout(() => {
      if (openRef.current) close();
    }, 8000);
  }, [close]);

  const verifyPaid = useCallback(async (basketIdent) => {
    const id = safeStr(basketIdent);
    if (!id) return { ok: false, paid: false };
    try {
      const r = await fetch(
        apiUrl(`/api/tebex/checkout-status/${encodeURIComponent(id)}`),
        { method: "GET", headers: { "Accept": "application/json" } }
      );
      const data = await r.json().catch(() => ({}));
      if (!r.ok) return { ok: false, paid: false, data };
      return { ok: true, paid: Boolean(data?.paid), data };
    } catch (e) {
      return { ok: false, paid: false, error: String(e?.message || e) };
    }
  }, []);

  const mountCheckout = useCallback(() => {
    const Tebex = window?.Tebex;
    
    if (!Tebex?.checkout?.init || !Tebex?.checkout?.render) {
      setError('La pasarela de pago no está lista. Recarga la página.');
      return;
    }

    const host = hostRef.current;
    if (!host) return;
    
    host.innerHTML = ""; 

    if (TEBEX_MEM.inited && TEBEX_MEM.ident !== safeIdent) {
      window.location.href = `https://checkout.tebex.io/checkout/${safeIdent}`;
      return;
    }

    if (!TEBEX_MEM.inited) {
      try {
        Tebex.checkout.init({
          ident: safeIdent,
          theme: "dark",
          locale: "es_ES",
          colors: [
            { name: "primary", color: "#5EE034" },
            { name: "secondary", color: "#fbbf24" },
          ],
        });
        TEBEX_MEM.inited = true;
        TEBEX_MEM.ident = safeIdent;
      } catch (e) {
        window.location.href = `https://checkout.tebex.io/checkout/${safeIdent}`;
        return;
      }
    }

    try {
      Tebex.checkout.render(host, "100%", "100%", false);
      setTimeout(() => setRendered(true), 1500);
    } catch (e) {
      window.location.href = `https://checkout.tebex.io/checkout/${safeIdent}`;
    }
  }, [safeIdent]);

  // ✅ Enrutador Global (Revisado)
  useEffect(() => {
    window.__flanTebexCallback = async (type, ev) => {
      if (!openRef.current) return;
      const currentIdent = identRef.current;

      if (type === "success") {
        showSuccess({ source: "event:payment:complete", ident: currentIdent, event: ev || null });
      } else if (type === "error") {
        setPhase("error");
        setDetail({ source: "event:payment:error", event: ev || null });
        setError("El pago no se ha podido completar.");
      } else if (type === "close") {
        if (phaseRef.current === "success" || phaseRef.current === "maybePaid") return;
        
        // Verificamos por última vez si el pago se coló milisegundos antes de darle a cancelar
        const chk = await verifyPaid(currentIdent);
        if (chk.ok && chk.paid) {
          showSuccess({ source: "event:close + status:paid", ident: currentIdent, status: chk.data });
        } else {
          // ⚠️ RECARGA LA PÁGINA SI EL USUARIO DA A CANCELAR
          window.location.reload();
        }
      }
    };

    return () => { window.__flanTebexCallback = null; };
  }, [showSuccess, showMaybePaid, verifyPaid]);

  useEffect(() => {
    if (import.meta.env.DEV && devForceSuccess) return;

    const Tebex = window?.Tebex;
    if (!Tebex?.checkout?.on) return;

    if (TEBEX_MEM.eventsBound) return;
    TEBEX_MEM.eventsBound = true;

    Tebex.checkout.on("payment:complete", (ev) => window.__flanTebexCallback?.("success", ev));
    Tebex.checkout.on("payment:error", (ev) => window.__flanTebexCallback?.("error", ev));
    Tebex.checkout.on("close", (ev) => window.__flanTebexCallback?.("close", ev));
  }, [devForceSuccess]);

  useEffect(() => {
    if (!open) return;

    pollStopRef.current = false;

    setError("");
    setPhase("checkout");
    setDetail(null);
    setRendered(false);

    if (import.meta.env.DEV && devForceSuccess) {
      const t = setTimeout(() => {
        showSuccess({ source: "dev:force-success", ident: safeIdent || "DEV_FAKE_IDENT" });
      }, 1500);
      return () => clearTimeout(t);
    }

    if (!hasIdent) return;

    const raf = requestAnimationFrame(() => {
      const Tebex = window?.Tebex;
      if (Tebex?.checkout?.init) mountCheckout();
      else window.addEventListener("load", mountCheckout, { once: true });
    });

    return () => cancelAnimationFrame(raf);
  }, [open, hasIdent, mountCheckout, devForceSuccess, showSuccess, safeIdent]);

  useEffect(() => {
    if (!open || !hasIdent) return;
    if (import.meta.env.DEV && devForceSuccess) return;

    let tries = 0;
    pollStopRef.current = false;

    const tick = async () => {
      if (pollStopRef.current || !openRef.current || phaseRef.current !== "checkout") return;

      tries += 1;
      const chk = await verifyPaid(identRef.current);
      if (chk.ok && chk.paid) {
        showSuccess({ source: "poll:status:paid", ident: identRef.current, status: chk.data });
        return;
      }
      if (tries < 48) setTimeout(tick, 2500);
    };

    const t0 = setTimeout(tick, 3000);
    return () => {
      clearTimeout(t0);
      pollStopRef.current = true;
    };
  }, [open, hasIdent, verifyPaid, showSuccess, devForceSuccess]);

  const itemsPreview = useMemo(() => {
    const list = Array.isArray(cartItems) ? cartItems : [];
    const simplified = list.map((it) => ({
      name: safeStr(it?.name) || "Producto",
      qty: Number(it?.quantity) || 1,
    }));
    const head = simplified.slice(0, 6);
    const rest = Math.max(0, simplified.length - head.length);
    return { head, rest };
  }, [cartItems]);

  const content = (
    <div
      className={`wcc ${open ? "wcc--open" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label="Checkout"
      aria-hidden={!open}
    >
      {/* ❌ NO HAY ONCLICK AQUÍ, EL FONDO ES INMUNE A CLICS */}
      <div className="wcc__backdrop" />

      {/* ❌ NO HAY ONCLICK AQUÍ TAMPOCO */}
      <div className="wcc__embed">
        
        <div 
          className="wcc__host" 
          ref={hostRef} 
          style={{ display: phase === "checkout" && !error ? "block" : "none" }}
        ></div>

        {!error && hasIdent && open && !rendered && phase === "checkout" && !(import.meta.env.DEV && devForceSuccess) ? (
          <div className="wcc__loading">
            <div className="wcc__loading-block"></div>
            <span className="wcc__loading-text">Conectando con la pasarela...</span>
          </div>
        ) : null}

        {open && import.meta.env.DEV && devForceSuccess && phase === "checkout" ? (
          <div className="wcc__loading">
            <div className="wcc__loading-block"></div>
            <span className="wcc__loading-text">Simulando compra...</span>
          </div>
        ) : null}

        {error ? (
          <div className="wcc__error">
            <p style={{ margin: "0 0 12px 0" }}>{error}</p>
            <button className="wcc__btn wcc__btn--secondary" onClick={() => window.location.reload()}>
              RECARGAR PÁGINA
            </button>
          </div>
        ) : null}

        {/* PANTALLA ÉXITO */}
        {phase === "success" ? (
          <div className="wcc__result" role="status" aria-live="polite">
            <div className="wcc__resultCard">
              <div className="wcc__resultTop">
                <div className="wcc__badge wcc__badge--ok" aria-hidden="true"><IconCheck /></div>
                <div className="wcc__resultTitles">
                  <div className="wcc__resultTitle">¡COMPRA COMPLETADA!</div>
                  <div className="wcc__resultSub">
                    Se ha procesado para <span className="highlight-user">{player}</span> ({server})
                  </div>
                </div>
              </div>

              <div className="wcc__resultBody">
                <div className="wcc__hint">
                  <span className="wcc__hintIcon" aria-hidden="true"><IconInfo /></span>
                  <div className="wcc__hintText">
                    Los artículos se entregan automáticamente. Si no aparecen al instante,
                    espera unos segundos y vuelve a entrar.
                  </div>
                </div>

                {itemsPreview.head.length ? (
                  <div className="wcc__items">
                    <div className="wcc__itemsTitle">RESUMEN DEL BOTÍN</div>
                    <ul className="wcc__itemsList">
                      {itemsPreview.head.map((x, idx) => (
                        <li key={idx}>
                          <span className="wcc__itemName">{x.name}</span>
                          <span className="wcc__itemQty">x{x.qty}</span>
                        </li>
                      ))}
                      {itemsPreview.rest ? (
                        <li className="wcc__itemsMore">Y {itemsPreview.rest} bloques más...</li>
                      ) : null}
                    </ul>
                    <div className="wcc__itemsFoot">MONEDA DE PAGO: {cur}</div>
                  </div>
                ) : null}

                <div className="wcc__actions">
                  <button className="wcc__btn wcc__btn--primary" type="button" onClick={close}>
                    VOLVER A LA TIENDA
                  </button>
                  <button className="wcc__btn wcc__btn--secondary" type="button" onClick={close}>
                    CERRAR
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* PANTALLA CERRADO SIN CONFIRMAR */}
        {phase === "maybePaid" ? (
          <div className="wcc__result" role="status" aria-live="polite">
            <div className="wcc__resultCard">
              <div className="wcc__resultTop">
                <div className="wcc__badge wcc__badge--warn" aria-hidden="true"><IconWarn /></div>
                <div className="wcc__resultTitles">
                  <div className="wcc__resultTitle">PAGO FINALIZADO</div>
                  <div className="wcc__resultSub">
                    Si se completó, recibirás tus artículos pronto.
                  </div>
                </div>
              </div>

              <div className="wcc__resultBody">
                <div className="wcc__hint">
                  <span className="wcc__hintIcon" aria-hidden="true"><IconInfo /></span>
                  <div className="wcc__hintText">
                    El checkout se ha cerrado. Vuelve al servidor con <span className="highlight-user">{player}</span>.
                    Si no aparece nada, reconecta.
                  </div>
                </div>

                <div className="wcc__actions">
                  <button className="wcc__btn wcc__btn--primary" type="button" onClick={close}>
                    ENTENDIDO
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );

  if (!portalRef.current) return null;
  return createPortal(content, portalRef.current);
}