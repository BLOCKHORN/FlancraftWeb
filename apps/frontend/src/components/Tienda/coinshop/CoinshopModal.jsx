// src/components/Tienda/coinshop/CoinshopModal.jsx
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import CoinshopViewer from "../coinshop/CoinshopViewer";
import "../../../styles/components/Tienda/coinshop-modal.scss";

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function safeRect(r) {
  if (!r) return null;
  const left = Number(r.left);
  const top = Number(r.top);
  const width = Number(r.width);
  const height = Number(r.height);
  if (![left, top, width, height].every(Number.isFinite)) return null;
  if (width <= 0 || height <= 0) return null;
  return { left, top, width, height };
}

export default function CoinshopModal({ open, onClose, fromRect }) {
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState("idle");
  const panelRef = useRef(null);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setPhase("enter");
      return;
    }

    if (mounted) {
      setPhase("exit");
      const t = setTimeout(() => {
        setMounted(false);
        setPhase("idle");
      }, 220);
      return () => clearTimeout(t);
    }
  }, [open, mounted]);

  useEffect(() => {
    if (!mounted) return;

    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };

    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [mounted, onClose]);

  useLayoutEffect(() => {
    if (!mounted) return;
    const panel = panelRef.current;
    if (!panel) return;

    const fr = safeRect(fromRect);

    panel.style.setProperty("--csx", "0px");
    panel.style.setProperty("--csy", "0px");
    panel.style.setProperty("--css", "0.92");
    panel.dataset.hasFrom = fr ? "1" : "0";

    requestAnimationFrame(() => {
      const to = panel.getBoundingClientRect();

      if (fr) {
        const fx = fr.left + fr.width / 2;
        const fy = fr.top + fr.height / 2;
        const tx = to.left + to.width / 2;
        const ty = to.top + to.height / 2;

        const dx = fx - tx;
        const dy = fy - ty;

        const sx = fr.width / Math.max(1, to.width);
        const sy = fr.height / Math.max(1, to.height);
        const s = clamp(Math.min(sx, sy), 0.18, 0.92);

        panel.style.setProperty("--csx", `${dx.toFixed(2)}px`);
        panel.style.setProperty("--csy", `${dy.toFixed(2)}px`);
        panel.style.setProperty("--css", `${s.toFixed(4)}`);
      }

      requestAnimationFrame(() => {
        setPhase("open");
      });
    });
  }, [mounted, fromRect]);

  if (!mounted) return null;

  return (
    <div className={`coinshopModal ${phase === "open" ? "is-open" : ""} ${phase === "exit" ? "is-exit" : ""}`} role="dialog" aria-modal="true">
      <div className="coinshopModal__backdrop" onMouseDown={onClose} onTouchStart={onClose} />
      <div className="coinshopModal__panel" ref={panelRef} data-phase={phase} onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
        <CoinshopViewer className="coinshopViewer--modal" onExit={onClose} />
      </div>
    </div>
  );
}
