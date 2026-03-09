import React, { useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";

import "../../../styles/components/Tienda/tienda-layout.scss";
import "../../../styles/components/Tienda/tienda-layout-sticky.scss";

import { UserContext } from "../../../context/UserContext";
import { apiUrl } from "../../../lib/env";
import { getStoredUser } from "../../../lib/auth/storage";
import TiendaStorefront from "./TiendaStorefront";
import TiendaCarritoLateral from "./TiendaCarritoLateral";
import TiendaModalJugador from "../modals/TiendaModalJugador";
import useTiendaCarrito from "../hooks/useTiendaCarrito";
import TiendaFooter from "./TiendaFooter";
import TiendaTopDonatorPip from "./TiendaTopDonatorPip";
import Seo from "../../SEO/Seo";
import { buildBreadcrumbJsonLd, buildCanonical } from "../../../lib/seo/siteSeo";

const readWebUser = () => getStoredUser();

const uid = () => Math.random().toString(16).slice(2);

function pickFxRate(fxData, currencyUpper) {
  const base = String(fxData?.base || "EUR").toUpperCase();
  const c = String(currencyUpper || base).toUpperCase();
  if (c === base) return 1;

  const r =
    fxData?.rates?.[c] ??
    fxData?.rates?.[c.toLowerCase?.()] ??
    fxData?.[c] ??
    fxData?.[c.toLowerCase?.()];

  const n = Number(r);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function formatCurrency(amount, currency) {
  const n = Number(amount);
  const cur = String(currency || "EUR").toUpperCase();
  if (!Number.isFinite(n)) return "—";

  const locale = cur === "USD" ? "en-US" : cur === "GBP" ? "en-GB" : "es-ES";

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: cur,
      maximumFractionDigits: 2,
      currencyDisplay: "symbol",
    }).format(n);
  } catch {
    return `${n.toFixed(2)} ${cur}`;
  }
}

function useIsMobileQuery(maxWidth = 1024) {
  const [isMatch, setIsMatch] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(`(max-width: ${maxWidth}px)`).matches;
  });

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${maxWidth}px)`);
    const onChange = () => setIsMatch(mq.matches);

    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else mq.addListener(onChange);

    onChange();

    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", onChange);
      else mq.removeListener(onChange);
    };
  }, [maxWidth]);

  return isMatch;
}

function useIsShortHeight(maxHeight = 700) {
  const [isMatch, setIsMatch] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(`(max-height: ${maxHeight}px)`).matches;
  });

  useEffect(() => {
    const mq = window.matchMedia(`(max-height: ${maxHeight}px)`);
    const onChange = () => setIsMatch(mq.matches);

    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else mq.addListener(onChange);

    onChange();

    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", onChange);
      else mq.removeListener(onChange);
    };
  }, [maxHeight]);

  return isMatch;
}

const IconCart = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M6 6h15l-2 8H8L6 6Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    <path d="M6 6 5 3H2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path
      d="M9 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM18 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
      fill="currentColor"
    />
  </svg>
);

const TiendaLayout = () => {
  const rootRef = useRef(null);
  const shelfInnerRef = useRef(null);

  const { user, setUser } = useContext(UserContext);

  const [mostrarLogin, setMostrarLogin] = useState(false);
  const [nombreConfirmado, setNombreConfirmado] = useState(() => localStorage.getItem("nombreJugador") || "");
  const [uuidConfirmado, setUuidConfirmado] = useState(() => localStorage.getItem("uuidJugador") || "");

  const [moneda, setMoneda] = useState(() => localStorage.getItem("monedaSeleccionada") || "EUR");

  const { carrito, toggleProducto, agregar, eliminar, vaciar, total, cambiarCantidad, setCantidad } =
    useTiendaCarrito(nombreConfirmado);

  const location = useLocation();

  const isNarrow = useIsMobileQuery(1024);
  const isShort = useIsShortHeight(700);
  const isCompact = Boolean(isNarrow || isShort);

  const esPortada = useMemo(() => location.pathname === "/tienda" || location.pathname === "/tienda/", [location.pathname]);

  const serverFromPath = useMemo(() => {
    const parts = String(location.pathname || "").split("/").filter(Boolean);
    if (parts[0] !== "tienda") return "global";
    const next = String(parts[1] || "").toLowerCase();
    if (next === "gens" || next === "oneblock" || next === "survival") return next;
    return "global";
  }, [location.pathname]);

  const [webUser, setWebUser] = useState(() => readWebUser());

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === "flan_user") setWebUser(readWebUser());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const isWebLoggedIn = useMemo(() => Boolean(user?.loggedIn || webUser?.loggedIn), [user?.loggedIn, webUser?.loggedIn]);

  const prevEsPortadaRef = useRef(esPortada);
  const [expandiendo, setExpandiendo] = useState(false);

  useEffect(() => {
    const prev = prevEsPortadaRef.current;
    if (prev === true && esPortada === false) {
      setExpandiendo(true);
      const t = setTimeout(() => setExpandiendo(false), 520);
      return () => clearTimeout(t);
    }
    prevEsPortadaRef.current = esPortada;
  }, [esPortada]);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    html.classList.add("tienda");
    body.classList.add("tienda");
    return () => {
      html.classList.remove("tienda");
      body.classList.remove("tienda");
    };
  }, []);

  useLayoutEffect(() => {
    const host = rootRef.current;
    if (!host) return;

    const setVvh = () => {
      const vv = window.visualViewport;
      const h = vv?.height || window.innerHeight || 0;
      if (h > 0) host.style.setProperty("--vvh", `${h}px`);
    };

    const pickNav = () => {
      const candidates = [document.querySelector(".navbar-content"), document.querySelector(".mobile-only")].filter(Boolean);
      return candidates.find((el) => {
        const cs = window.getComputedStyle(el);
        return cs.display !== "none" && cs.visibility !== "hidden" && el.offsetHeight > 0;
      });
    };

    let navEl = pickNav();

    const applyNav = () => {
      const h = navEl?.offsetHeight || 0;
      host.style.setProperty("--navH", `${h}px`);
    };

    setVvh();
    applyNav();

    const ro = new ResizeObserver(() => applyNav());
    if (navEl) ro.observe(navEl);

    const onResize = () => {
      setVvh();
      const next = pickNav();
      if (next && next !== navEl) {
        if (navEl) ro.unobserve(navEl);
        navEl = next;
        ro.observe(navEl);
      }
      applyNav();
    };

    window.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener?.("resize", onResize);
    window.visualViewport?.addEventListener?.("scroll", onResize);

    const t1 = window.setTimeout(() => {
      setVvh();
      applyNav();
    }, 120);

    const t2 = window.setTimeout(() => {
      setVvh();
      applyNav();
    }, 420);

    return () => {
      window.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener?.("resize", onResize);
      window.visualViewport?.removeEventListener?.("scroll", onResize);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      ro.disconnect();
    };
  }, []);

  useEffect(() => {
    const ctxLogged = Boolean(user?.loggedIn && user?.username);

    const username = (user?.username || webUser?.username || "").trim();
    const uuid = (user?.uuid || webUser?.uuid || "").trim();

    if (!username) return;

    if (String(nombreConfirmado).trim() === username) {
      if (!uuidConfirmado && uuid) {
        localStorage.setItem("uuidJugador", uuid);
        setUuidConfirmado(uuid);
      }
      return;
    }

    if (ctxLogged || webUser?.loggedIn) {
      localStorage.setItem("nombreJugador", username);
      if (uuid) localStorage.setItem("uuidJugador", uuid);

      setNombreConfirmado(username);
      setUuidConfirmado(uuid);
      setMostrarLogin(false);
    }
  }, [user, webUser, nombreConfirmado, uuidConfirmado]);

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

  const abrirModalCuenta = () => setMostrarLogin(true);

  const cambiarCuenta = () => {
    const isLoggedWeb = Boolean(user?.loggedIn || webUser?.loggedIn);

    if (isLoggedWeb) {
      localStorage.removeItem("flan_user");
      setUser?.(null);
      setWebUser(null);
    }

    localStorage.removeItem("nombreJugador");
    localStorage.removeItem("uuidJugador");
    setNombreConfirmado("");
    setUuidConfirmado("");
    setMostrarLogin(true);
  };

  const [cartOpenMobile, setCartOpenMobile] = useState(false);

  useEffect(() => {
    if (!isCompact) setCartOpenMobile(false);
  }, [isCompact]);

  useEffect(() => {
    if (!isCompact) return;
    setCartOpenMobile(false);
  }, [location.pathname, isCompact]);

  useEffect(() => {
    if (!isCompact) return;
    if (!cartOpenMobile) return;

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev || "";
    };
  }, [isCompact, cartOpenMobile]);

  useEffect(() => {
    if (!cartOpenMobile) return;
    const onKey = (e) => {
      if (e.key === "Escape") setCartOpenMobile(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cartOpenMobile]);

  const [flyers, setFlyers] = useState([]);
  const [basketPulse, setBasketPulse] = useState(false);
  const pulseTimerRef = useRef(0);

  useEffect(() => {
    const onFly = (ev) => {
      const d = ev?.detail || {};
      const img = d.img;
      const rect = d.rect;
      if (!img || !rect) return;

      const basket =
        document.querySelector('[data-basket-anchor="compact"]') ||
        document.querySelector('[data-basket-anchor="true"]') ||
        document.getElementById("tienda-basket");

      const br = basket?.getBoundingClientRect?.();
      if (!br) return;

      const fromX = (Number(rect.x) || 0) - 26;
      const fromY = (Number(rect.y) || 0) - 26;

      const toX = br.left + br.width * 0.86;
      const toY = br.top + br.height * 0.3;

      const id = uid();
      const dx = toX - fromX;
      const dy = toY - fromY;

      setFlyers((prev) => [...prev, { id, img, fromX, fromY, dx, dy }]);

      window.setTimeout(() => {
        setFlyers((prev) => prev.filter((f) => f.id !== id));
      }, 900);

      setBasketPulse(true);
      window.clearTimeout(pulseTimerRef.current);
      pulseTimerRef.current = window.setTimeout(() => setBasketPulse(false), 320);
    };

    document.addEventListener("tienda:fly", onFly);
    return () => document.removeEventListener("tienda:fly", onFly);
  }, []);

  const removeFlyer = (id) => {
    setFlyers((prev) => prev.filter((f) => f.id !== id));
  };

  const distinctCount = carrito?.length || 0;

  const totalQty = useMemo(() => {
    return (carrito || []).reduce((acc, it) => acc + (Number(it.quantity) || 1), 0);
  }, [carrito]);

  const [fx, setFx] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const ctrl = new AbortController();

    const load = async () => {
      try {
        const r = await fetch(apiUrl(`/api/tebex/fx`), { signal: ctrl.signal });
        const data = await r.json().catch(() => null);
        if (!r.ok) throw new Error(data?.error || "fx");
        if (!cancelled) setFx(data);
      } catch {
        if (!cancelled) setFx(null);
      }
    };

    load();
    const t = window.setInterval(load, 10 * 60 * 1000);

    return () => {
      cancelled = true;
      window.clearInterval(t);
      ctrl.abort();
    };
  }, []);

  const baseCurrency = useMemo(() => String(fx?.base || "EUR").toUpperCase(), [fx]);
  const currencyUpper = useMemo(() => String(moneda || baseCurrency).toUpperCase(), [moneda, baseCurrency]);
  const fxRate = useMemo(() => pickFxRate(fx, currencyUpper), [fx, currencyUpper]);

  const totalDisplay = useMemo(() => {
    const base = Number(total) || 0;
    const out = base * (Number.isFinite(fxRate) ? fxRate : 1);
    return Number.isFinite(out) ? out : base;
  }, [total, fxRate]);

  const totalFormatted = useMemo(() => formatCurrency(totalDisplay, currencyUpper), [totalDisplay, currencyUpper]);

  const [badgePop, setBadgePop] = useState(false);
  const prevQtyRef = useRef(totalQty);
  const badgeTimerRef = useRef(0);

  useEffect(() => {
    const prev = prevQtyRef.current;
    if (totalQty > prev) {
      setBadgePop(true);
      window.clearTimeout(badgeTimerRef.current);
      badgeTimerRef.current = window.setTimeout(() => setBadgePop(false), 220);
    }
    prevQtyRef.current = totalQty;
  }, [totalQty]);

  const openDrawer = () => setCartOpenMobile(true);

  const [fitScale, setFitScale] = useState(1);

  useLayoutEffect(() => {
    if (isCompact || !esPortada) {
      setFitScale(1);
      return;
    }

    const host = rootRef.current;
    const inner = shelfInnerRef.current;
    if (!host || !inner) return;

    let targetEl = null;
    let ro = null;
    let mo = null;
    let rafId = 0;
    let timers = [];
    let imgUnsubs = [];
    let disposed = false;

    const measureContentH = () => {
      const t = targetEl || inner.querySelector(".tienda-storefront") || inner.firstElementChild;
      if (!t) return 0;

      const h = t.scrollHeight || 0;
      if (h > 0) return h;

      const r = t.getBoundingClientRect?.();
      return r?.height || 0;
    };

    const calc = () => {
      if (disposed) return;

      const availableH = host.getBoundingClientRect().height;
      const contentH = measureContentH();

      if (!availableH || !contentH) {
        setFitScale(1);
        return;
      }

      const margin = 14;
      const raw = (availableH - margin) / contentH;
      const s = Math.max(0.82, Math.min(1, raw));
      setFitScale(Number.isFinite(s) ? s : 1);
    };

    const bindImages = (root) => {
      imgUnsubs.forEach((fn) => fn());
      imgUnsubs = [];

      const imgs = Array.from(root.querySelectorAll("img"));
      imgs.forEach((img) => {
        if (img.complete) return;
        const onDone = () => calc();
        img.addEventListener("load", onDone, { passive: true });
        img.addEventListener("error", onDone, { passive: true });
        imgUnsubs.push(() => {
          img.removeEventListener("load", onDone);
          img.removeEventListener("error", onDone);
        });
      });
    };

    const attachTarget = () => {
      const next = inner.querySelector(".tienda-storefront") || inner.firstElementChild;
      if (!next) return;

      if (next === targetEl) return;
      targetEl = next;

      ro?.disconnect?.();
      ro = new ResizeObserver(() => calc());

      ro.observe(host);
      ro.observe(inner);
      ro.observe(targetEl);

      bindImages(targetEl);
      calc();

      timers.push(window.setTimeout(calc, 60));
      timers.push(window.setTimeout(calc, 180));
      timers.push(window.setTimeout(calc, 420));
      timers.push(window.setTimeout(calc, 900));
    };

    mo = new MutationObserver(() => attachTarget());
    mo.observe(inner, { subtree: true, childList: true });

    attachTarget();

    const onResize = () => calc();
    window.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener?.("resize", onResize);
    window.visualViewport?.addEventListener?.("scroll", onResize);

    if (document?.fonts?.ready) {
      document.fonts.ready.then(() => calc()).catch(() => {});
    }

    const tick = () => {
      calc();
      rafId = window.requestAnimationFrame(tick);
    };
    rafId = window.requestAnimationFrame(tick);

    const stopRaf = window.setTimeout(() => {
      window.cancelAnimationFrame(rafId);
      rafId = 0;
      calc();
    }, 1200);
    timers.push(stopRaf);

    return () => {
      disposed = true;
      timers.forEach((t) => window.clearTimeout(t));
      if (rafId) window.cancelAnimationFrame(rafId);
      imgUnsubs.forEach((fn) => fn());
      mo?.disconnect?.();
      ro?.disconnect?.();
      window.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener?.("resize", onResize);
      window.visualViewport?.removeEventListener?.("scroll", onResize);
    };
  }, [isCompact, esPortada, location.pathname]);

  return (
    <>
      <Seo
        title="Tienda de FlanCraft | Rangos, packs y ventajas"
        description="Explora la tienda oficial de FlanCraft y descubre rangos, ventajas y artículos para apoyar al servidor."
        canonical={buildCanonical("/tienda")}
        jsonLd={buildBreadcrumbJsonLd([
          { name: "Inicio", item: buildCanonical("/") },
          { name: "Tienda", item: buildCanonical("/tienda") },
        ])}
      />
    <div
      ref={rootRef}
      className={[
        "tienda-layout",
        esPortada ? "is-portada" : "is-contenido",
        expandiendo ? "is-expanding" : "",
        isCompact ? "is-compact" : "",
        isCompact ? "is-mobile" : "is-desktop",
      ].join(" ")}
      style={{ "--fitScale": fitScale }}
    >
      {mostrarLogin && <TiendaModalJugador onConfirmar={confirmarNombre} onCerrar={() => setMostrarLogin(false)} />}

      <div className="tienda-fly-layer" aria-hidden="true">
        {flyers.map((f) => (
          <img
            key={f.id}
            className="tienda-flyer"
            src={f.img}
            alt=""
            style={{ left: `${f.fromX}px`, top: `${f.fromY}px`, "--dx": `${f.dx}px`, "--dy": `${f.dy}px` }}
            onAnimationEnd={() => removeFlyer(f.id)}
            draggable={false}
          />
        ))}
      </div>

      <main className="tienda-layout-main">
        <section className="tienda-layout-left">
          <div className="tienda-shelf-frame">
            <div
              ref={shelfInnerRef}
              className={"tienda-shelf-inner " + (esPortada ? "tienda-shelf-portada" : "tienda-shelf-contenido")}
            >
              <div className="tienda-shelf-fit">
                <div className="tienda-shelf-fitInner">
                  <Routes>
                    <Route
                      path="/"
                      element={
                        <TiendaStorefront
                          carrito={carrito}
                          toggleProducto={toggleProducto}
                          onAgregar={agregar}
                          onCambiarCantidad={cambiarCantidad}
                          onSetCantidad={setCantidad}
                          monedaSeleccionada={currencyUpper}
                          fx={fx}
                        />
                      }
                    />

                    <Route path="/rangos" element={<Navigate to="/tienda" replace />} />
                    <Route path="/gens" element={<Navigate to="/tienda" replace />} />
                    <Route path="/oneblock" element={<Navigate to="/tienda" replace />} />
                    <Route path="/survival" element={<Navigate to="/tienda" replace />} />
                    <Route path="/antes-de-comprar" element={<Navigate to="/tienda" replace />} />
                    <Route path="/:server/:categoria/*" element={<Navigate to="/tienda" replace />} />
                  </Routes>
                </div>
              </div>
            </div>
          </div>
        </section>

        {!isCompact && (
          <aside className="tienda-layout-sidebar">
            <div className="tienda-sidebar-card">
              <div className="tienda-cart-wrap">
                <TiendaTopDonatorPip server={serverFromPath} />

                <TiendaCarritoLateral
                  carrito={carrito}
                  onAgregar={agregar}
                  eliminarItem={eliminar}
                  vaciarCarrito={vaciar}
                  total={total}
                  onCambiarCantidad={cambiarCantidad}
                  onSetCantidad={setCantidad}
                  nombreConfirmado={nombreConfirmado}
                  uuidConfirmado={uuidConfirmado}
                  monedaSeleccionada={currencyUpper}
                  onMonedaChange={handleMonedaChange}
                  onAbrirLogin={abrirModalCuenta}
                  onCambiarCuenta={cambiarCuenta}
                  isWebLoggedIn={isWebLoggedIn}
                  server={serverFromPath}
                  basketPulse={basketPulse}
                  mode="desktop"
                  fx={fx}
                />
              </div>
            </div>
          </aside>
        )}
      </main>

      {isCompact && (
        <>
          <button
            type="button"
            className={[
              "tienda-mobileCta",
              basketPulse ? "is-pulse" : "",
              distinctCount === 0 ? "is-empty" : "has-items",
              badgePop ? "is-pop" : "",
            ].join(" ")}
            onClick={() => setCartOpenMobile(true)}
            disabled={totalQty === 0}
            data-basket-anchor="compact"
            aria-label={totalQty === 0 ? "Carrito vacío" : `Abrir compra. ${totalQty} artículos, total ${totalFormatted}`}
            aria-expanded={cartOpenMobile ? "true" : "false"}
          >
            <span className="tmc-left" aria-hidden="true">
              <span className="tmc-icon">
                <IconCart size={18} />
              </span>
              <span className="tmc-qty">{totalQty}</span>
            </span>

            <span className="tmc-divider" aria-hidden="true" />

            <span className="tmc-right" aria-hidden="true">
              <span className="tmc-price">{totalFormatted}</span>
              <span className="tmc-buy">COMPRAR</span>
            </span>
          </button>

          {cartOpenMobile &&
            createPortal(
              <div className="tienda-cartDrawer" role="dialog" aria-modal="true" aria-label="Carrito">
                <button
                  type="button"
                  className="tcd-backdrop"
                  aria-label="Cerrar carrito"
                  onClick={() => setCartOpenMobile(false)}
                />

                <div className="tcd-sheet" role="document">
                  <div className="tcd-grab" aria-hidden="true" />

                  <div className="tcd-body">
                    <TiendaTopDonatorPip server={serverFromPath} />

                    <TiendaCarritoLateral
                      carrito={carrito}
                      onAgregar={agregar}
                      eliminarItem={eliminar}
                      vaciarCarrito={vaciar}
                      total={total}
                      onCambiarCantidad={cambiarCantidad}
                      onSetCantidad={setCantidad}
                      nombreConfirmado={nombreConfirmado}
                      uuidConfirmado={uuidConfirmado}
                      monedaSeleccionada={currencyUpper}
                      onMonedaChange={handleMonedaChange}
                      onAbrirLogin={abrirModalCuenta}
                      onCambiarCuenta={cambiarCuenta}
                      isWebLoggedIn={isWebLoggedIn}
                      server={serverFromPath}
                      basketPulse={basketPulse}
                      mode="mobileDrawer"
                      onRequestClose={() => setCartOpenMobile(false)}
                      fx={fx}
                    />
                  </div>
                </div>
              </div>,
              document.body
            )}
        </>
      )}

      <TiendaFooter />
    </div>
    </>
  );
};

export default TiendaLayout;