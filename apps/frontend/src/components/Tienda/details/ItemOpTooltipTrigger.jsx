import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import ItemsOpTooltipCard from "./ItemsOpTooltipCard.jsx";
import { resolveProductDetails } from "./data/productDetails/index";

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function useMedia(query) {
  const [ok, setOk] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const m = window.matchMedia(query);
    const onChange = () => setOk(m.matches);
    onChange();
    if (m.addEventListener) m.addEventListener("change", onChange);
    else m.addListener(onChange);
    return () => {
      if (m.removeEventListener) m.removeEventListener("change", onChange);
      else m.removeListener(onChange);
    };
  }, [query]);

  return ok;
}

export default function ItemOpTooltipTrigger({ detailsKey, children }) {
  const hostRef = useRef(null);
  const panelRef = useRef(null);

  const isFinePointer = useMedia("(hover: hover) and (pointer: fine)");
  const isTouchLike = useMedia("(hover: none) and (pointer: coarse)");

  const data = useMemo(() => resolveProductDetails(detailsKey) || null, [detailsKey]);

  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);

  const [pos, setPos] = useState({ left: 0, top: 0, bottom: null });

  const closeAll = () => {
    setOpen(false);
    setPinned(false);
  };

  const openPreview = () => {
    if (!data) return;
    setOpen(true);
    setPinned(false);
  };

  const openPinned = () => {
    if (!data) return;
    setOpen(true);
    setPinned(true);
  };

  const recomputePosition = () => {
    const host = hostRef.current;
    const panel = panelRef.current;
    if (!host || !panel) return;

    const r = host.getBoundingClientRect();

    // Touch: bottom sheet
    if (isTouchLike) {
      const vw = window.innerWidth;
      setPos({ left: Math.round(vw / 2), top: 0, bottom: 14 });
      return;
    }

    const M = 10;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // si el panel aún no tiene tamaño, reintenta 1 frame
    const pr = panel.getBoundingClientRect();
    if (!pr.width || !pr.height) {
      requestAnimationFrame(recomputePosition);
      return;
    }

    // Preferimos salir al lado del producto:
    // - por defecto derecha (pegadito)
    // - si no cabe, izquierda
    const gap = 10;

    const tryRight = r.right + gap;
    const tryLeft = r.left - pr.width - gap;

    let left =
      tryRight + pr.width + M <= vw ? tryRight :
      tryLeft >= M ? tryLeft :
      // si no cabe bien en ninguno, centramos respecto al host pero clamped
      (r.left + r.width / 2) - pr.width / 2;

    // Vertical: alineado al “top” del producto para que se vea natural
    // Si se sale por abajo, subimos.
    let top = r.top;

    // Clamp + correcciones viewport
    left = clamp(Math.round(left), M, vw - pr.width - M);
    top = clamp(Math.round(top), M, vh - pr.height - M);

    setPos({ left, top, bottom: null });
  };

  useEffect(() => {
    if (!open) return;

    const t = setTimeout(recomputePosition, 0);

    const onResize = () => recomputePosition();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);

    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pinned, isTouchLike]);

  // ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") closeAll();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Click fuera (solo pinned o touch)
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      const host = hostRef.current;
      const panel = panelRef.current;
      if (!host || !panel) return;

      const t = e.target;
      const insideHost = host.contains(t);
      const insidePanel = panel.contains(t);

      if (!insideHost && !insidePanel) {
        if (pinned || isTouchLike) closeAll();
      }
    };
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, [open, pinned, isTouchLike]);

  // Handlers
  const onPointerEnter = (e) => {
    if (!isFinePointer) return;
    if (pinned) return;
    openPreview();
  };

  const onPointerLeave = (e) => {
    if (!isFinePointer) return;
    if (pinned) return;
    setOpen(false);
  };

  const onClick = (e) => {
    e?.stopPropagation?.();
    if (!data) return;

    // Touch: tap = pin toggle
    if (isTouchLike) {
      if (open && pinned) closeAll();
      else openPinned();
      return;
    }

    // Desktop: click pin/unpin
    if (open && pinned) closeAll();
    else openPinned();
  };

  // Si no hay data, no tocamos nada
  if (!data) return children;

  // ✅ SIN WRAPPER: clonamos el hijo y le inyectamos handlers + ref real
  if (!React.isValidElement(children)) return children;

  const childProps = children.props || {};
  const originalRef = children.ref;

  const mergedRef = (node) => {
    hostRef.current = node;
    // reenvía ref si existía
    if (typeof originalRef === "function") originalRef(node);
    else if (originalRef && typeof originalRef === "object") originalRef.current = node;
  };

  const mergedClassName = [childProps.className, "itemsop-trigger"]
    .filter(Boolean)
    .join(" ");

  const title =
    childProps.title ||
    (isTouchLike ? "Toca para ver características" : "Hover para ver · Click para fijar");

  return (
    <>
      {React.cloneElement(children, {
        ref: mergedRef,
        className: mergedClassName,
        title,
        onPointerEnter: (e) => {
          childProps.onPointerEnter?.(e);
          onPointerEnter(e);
        },
        onPointerLeave: (e) => {
          childProps.onPointerLeave?.(e);
          onPointerLeave(e);
        },
        onClick: (e) => {
          childProps.onClick?.(e);
          onClick(e);
        },
        // teclado
        tabIndex: childProps.tabIndex ?? 0,
        role: childProps.role ?? "button",
        onKeyDown: (e) => {
          childProps.onKeyDown?.(e);
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick(e);
          }
        },
        "aria-label": childProps["aria-label"] ?? "Ver características del ítem",
      })}

      {open
        ? createPortal(
            <div className="itemsop-pop" aria-hidden={!open}>
              <div
                ref={panelRef}
                className={`itemsop-pop__panel ${pinned ? "is-pinned" : ""} ${
                  isTouchLike ? "is-touch" : ""
                }`}
                style={
                  pos.bottom != null
                    ? { left: `${pos.left}px`, bottom: `${pos.bottom}px`, transform: "translateX(-50%)" }
                    : { left: `${pos.left}px`, top: `${pos.top}px` }
                }
              >
                {isTouchLike ? (
                  <button
                    type="button"
                    className="itemsop-pop__close"
                    onClick={(e) => {
                      e.stopPropagation();
                      closeAll();
                    }}
                    aria-label="Cerrar"
                  >
                    Cerrar
                  </button>
                ) : null}

                <ItemsOpTooltipCard data={data} />

                <div className="itemsop-pop__hint">
                  {isTouchLike
                    ? "Toca fuera o usa Cerrar"
                    : pinned
                    ? "Fijado · Click fuera o ESC para cerrar"
                    : "Hover · Click para fijar"}
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
