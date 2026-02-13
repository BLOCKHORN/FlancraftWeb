// src/components/Tienda/modals/TiendaCheckoutModal.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import "../../../styles/components/Tienda/tienda-checkout-modal.scss";

const API_BASE = import.meta.env.VITE_BACKEND_URL || "http://localhost:10000";

function safeStr(x) {
  return String(x ?? "").trim();
}

function IconCheck() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20 6L9 17l-5-5"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconInfo() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z"
        stroke="currentColor"
        strokeWidth="2.2"
      />
      <path d="M12 10v7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M12 7h.01" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" />
    </svg>
  );
}

function IconWarn() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 9v4" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M12 17h.01" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round" />
      <path
        d="M10.3 4.2 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0Z"
        stroke="currentColor"
        strokeWidth="2.0"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function TiendaCheckoutModal({
  open,
  ident,
  onClose,

  // UX/feedback + limpiar carrito
  playerName = "",
  server = "oneblock",
  cartItems = [],
  currencyHint = "EUR",
  onPaid,

  // ✅ DEV: fuerza éxito sin pagar
  devForceSuccess = false,
}) {
  const hostRef = useRef(null);

  const [error, setError] = useState("");
  const [rendered, setRendered] = useState(false);

  // fases: checkout | success | maybePaid | error
  const [phase, setPhase] = useState("checkout");
  const [detail, setDetail] = useState(null);

  const safeIdent = useMemo(() => safeStr(ident), [ident]);
  const hasIdent = Boolean(safeIdent);

  const player = useMemo(() => safeStr(playerName) || "—", [playerName]);
  const cur = useMemo(() => safeStr(currencyHint).toUpperCase() || "EUR", [currencyHint]);

  // refs para evitar closures viejas
  const onCloseRef = useRef(onClose);
  const onPaidRef = useRef(onPaid);
  const openRef = useRef(open);
  const identRef = useRef(safeIdent);
  const phaseRef = useRef(phase);
  const paidFiredRef = useRef(false);
  const autoCloseTimerRef = useRef(null);
  const pollStopRef = useRef(false);

  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  useEffect(() => { onPaidRef.current = onPaid; }, [onPaid]);
  useEffect(() => { openRef.current = open; }, [open]);
  useEffect(() => { identRef.current = safeIdent; }, [safeIdent]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  // ✅ PORTAL ROOT (para estar por encima de todo y evitar stacking contexts por transform)
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

  // ✅ cuando se abre, re-append para ser el último nodo del body (gana en empate de z-index)
  useEffect(() => {
    if (!open) return;
    const el = portalRef.current;
    if (el && el.parentNode === document.body) {
      document.body.appendChild(el); // mover al final
    }
  }, [open]);

  const close = useCallback(() => {
    setError("");
    setRendered(false);
    setPhase("checkout");
    setDetail(null);

    // parar timers/poll
    pollStopRef.current = true;
    if (autoCloseTimerRef.current) {
      clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = null;
    }

    onCloseRef.current?.();
  }, []);

  // ESC para cerrar
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  // Bloqueo scroll
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev || "";
    };
  }, [open]);

  const firePaidOnce = useCallback((payload) => {
    if (paidFiredRef.current) return;
    paidFiredRef.current = true;
    onPaidRef.current?.(payload);
  }, []);

  const showSuccess = useCallback((payload) => {
    setError("");
    setDetail(payload || null);
    setPhase("success");
    firePaidOnce(payload);

    // autocierra bonito
    if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
    autoCloseTimerRef.current = setTimeout(() => {
      if (openRef.current) close();
    }, 6500);
  }, [close, firePaidOnce]);

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
        `${API_BASE}/api/tebex/checkout-status/${encodeURIComponent(id)}`,
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
      setError('Tebex.js no está cargado. Revisa el <script defer src="https://js.tebex.io/v/1.js"></script>.');
      return;
    }

    const host = hostRef.current;
    if (!host) return;

    // Tamaño exacto del contenedor
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

  // Enganchar eventos Tebex UNA sola vez
  const tebexHookedRef = useRef(false);
  useEffect(() => {
    // ✅ en devForceSuccess no necesitamos enganchar eventos
    if (import.meta.env.DEV && devForceSuccess) return;

    const Tebex = window?.Tebex;
    if (!Tebex?.checkout?.on) return;

    if (tebexHookedRef.current) return;
    tebexHookedRef.current = true;

    Tebex.checkout.on("payment:complete", async (ev) => {
      if (!openRef.current) return;
      const currentIdent = identRef.current;

      showSuccess({
        source: "event:payment:complete",
        ident: currentIdent,
        event: ev || null,
      });
    });

    Tebex.checkout.on("payment:error", (ev) => {
      if (!openRef.current) return;
      setPhase("error");
      setDetail({ source: "event:payment:error", event: ev || null });
      setError("El pago no se ha podido completar. Revisa los datos o prueba otro método.");
    });

    Tebex.checkout.on("close", async () => {
      if (!openRef.current) return;

      if (phaseRef.current === "success" || phaseRef.current === "maybePaid") {
        return;
      }

      const currentIdent = identRef.current;
      const chk = await verifyPaid(currentIdent);

      if (chk.ok && chk.paid) {
        showSuccess({
          source: "event:close + status:paid",
          ident: currentIdent,
          status: chk.data,
        });
      } else {
        showMaybePaid({
          source: "event:close",
          ident: currentIdent,
          status: chk.data || null,
        });
      }
    });
  }, [showSuccess, showMaybePaid, verifyPaid, devForceSuccess]);

  // abrir: reset + render
  useEffect(() => {
    if (!open) return;

    pollStopRef.current = false;
    paidFiredRef.current = false;

    setError("");
    setRendered(false);
    setPhase("checkout");
    setDetail(null);

    // ✅ DEV: fuerza éxito sin montar Tebex
    if (import.meta.env.DEV && devForceSuccess) {
      const t = setTimeout(() => {
        showSuccess({
          source: "dev:force-success",
          ident: safeIdent || "DEV_FAKE_IDENT",
        });
      }, 700);

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

  // Fallback polling (solo en modo real)
  useEffect(() => {
    if (!open || !hasIdent) return;
    if (import.meta.env.DEV && devForceSuccess) return;

    let tries = 0;
    pollStopRef.current = false;

    const tick = async () => {
      if (pollStopRef.current) return;
      if (!openRef.current) return;
      if (phaseRef.current !== "checkout") return;

      tries += 1;

      const chk = await verifyPaid(identRef.current);
      if (chk.ok && chk.paid) {
        showSuccess({
          source: "poll:status:paid",
          ident: identRef.current,
          status: chk.data,
        });
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

  // UI de items (resumen)
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
      <div className="wcc__backdrop" onClick={open ? close : undefined} />

      <div className="wcc__embed" onClick={(e) => e.stopPropagation()}>
        {error ? <div className="wcc__error">{error}</div> : null}

        <div className="wcc__host" ref={hostRef}>
          {!error && hasIdent && open && !rendered && !(import.meta.env.DEV && devForceSuccess) ? (
            <div className="wcc__loading">Cargando pago…</div>
          ) : null}

          {/* ✅ DEV loading */}
          {open && import.meta.env.DEV && devForceSuccess && phase === "checkout" ? (
            <div className="wcc__loading">Simulando compra…</div>
          ) : null}
        </div>

        {/* RESULTADOS */}
        {phase === "success" ? (
          <div className="wcc__result" role="status" aria-live="polite">
            <div className="wcc__resultCard">
              <div className="wcc__resultTop">
                <div className="wcc__badge wcc__badge--ok" aria-hidden="true">
                  <IconCheck />
                </div>
                <div className="wcc__resultTitles">
                  <div className="wcc__resultTitle">Compra completada</div>
                  <div className="wcc__resultSub">
                    Se ha procesado correctamente para <b>{player}</b> ({server})
                  </div>
                </div>
              </div>

              <div className="wcc__resultBody">
                <div className="wcc__hint">
                  <span className="wcc__hintIcon" aria-hidden="true"><IconInfo /></span>
                  <div className="wcc__hintText">
                    Los artículos se entregan automáticamente en el juego. Si no aparecen al instante,
                    espera unos segundos y vuelve a entrar al servidor.
                  </div>
                </div>

                {itemsPreview.head.length ? (
                  <div className="wcc__items">
                    <div className="wcc__itemsTitle">Resumen</div>
                    <ul className="wcc__itemsList">
                      {itemsPreview.head.map((x, idx) => (
                        <li key={idx}>
                          <span className="wcc__itemName">{x.name}</span>
                          <span className="wcc__itemQty">x{x.qty}</span>
                        </li>
                      ))}
                      {itemsPreview.rest ? (
                        <li className="wcc__itemsMore">+{itemsPreview.rest} más</li>
                      ) : null}
                    </ul>
                    <div className="wcc__itemsFoot">Moneda: {cur}</div>
                  </div>
                ) : null}

                <div className="wcc__actions">
                  <button className="wcc__btn wcc__btn--primary" type="button" onClick={close}>
                    Volver a la tienda
                  </button>
                  <button className="wcc__btn" type="button" onClick={close}>
                    Cerrar
                  </button>
                </div>

                <div className="wcc__fineprint">
                  Si tras 2–3 minutos no lo recibes, revisa que compras con la cuenta correcta o reconecta.
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {phase === "maybePaid" ? (
          <div className="wcc__result" role="status" aria-live="polite">
            <div className="wcc__resultCard">
              <div className="wcc__resultTop">
                <div className="wcc__badge wcc__badge--warn" aria-hidden="true">
                  <IconWarn />
                </div>
                <div className="wcc__resultTitles">
                  <div className="wcc__resultTitle">Pago finalizado</div>
                  <div className="wcc__resultSub">
                    Si completaste la compra, recibirás tus artículos en el juego en breve.
                  </div>
                </div>
              </div>

              <div className="wcc__resultBody">
                <div className="wcc__hint">
                  <span className="wcc__hintIcon" aria-hidden="true"><IconInfo /></span>
                  <div className="wcc__hintText">
                    El checkout se ha cerrado. Puedes volver al servidor con <b>{player}</b> y esperar unos segundos.
                    Si no aparecen, reconecta.
                  </div>
                </div>

                <div className="wcc__actions">
                  <button className="wcc__btn wcc__btn--primary" type="button" onClick={close}>
                    Entendido
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );

  // Si aún no existe el portal root (primer render), no pintamos nada
  if (!portalRef.current) return null;

  return createPortal(content, portalRef.current);
}
