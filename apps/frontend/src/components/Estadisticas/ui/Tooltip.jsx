import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "../leaderboards.utils";
import "./Tooltip.scss";
export default function Tooltip({ content, theme = "default", children, maxWidth = 340 }) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef(null);
  const bubbleRef = useRef(null);
  const lastPointRef = useRef(null);

  const clampToViewport = useCallback((x, y, bw, bh) => {
    const margin = 12;
    const gap = 12;

    let left = x;
    let top = y + gap;

    if (top + bh > window.innerHeight - margin) top = y - gap - bh;

    const half = bw / 2;
    if (left - half < margin) left = margin + half;
    if (left + half > window.innerWidth - margin) left = window.innerWidth - margin - half;

    if (top < margin) top = margin;
    return { left, top };
  }, []);

  const placeBubble = useCallback(() => {
    const bubble = bubbleRef.current;
    if (!bubble) return;

    const b = bubble.getBoundingClientRect();
    const pt = lastPointRef.current;

    if (pt) {
      const pos = clampToViewport(pt.x, pt.y, b.width, b.height);
      bubble.style.left = `${pos.left}px`;
      bubble.style.top = `${pos.top}px`;
      bubble.classList.toggle("is-top", pos.top < pt.y);
      bubble.classList.toggle("is-bottom", !(pos.top < pt.y));
      return;
    }

    const a = anchorRef.current;
    if (!a) return;
    const r = a.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.bottom;

    const pos = clampToViewport(cx, cy, b.width, b.height);
    bubble.style.left = `${pos.left}px`;
    bubble.style.top = `${pos.top}px`;
    bubble.classList.toggle("is-top", pos.top < cy);
    bubble.classList.toggle("is-bottom", !(pos.top < cy));
  }, [clampToViewport]);

  useLayoutEffect(() => {
    if (!open) return;
    const id1 = requestAnimationFrame(() => {
      placeBubble();
      const id2 = requestAnimationFrame(placeBubble);
      if (bubbleRef.current) bubbleRef.current.__raf2 = id2;
    });
    return () => {
      cancelAnimationFrame(id1);
      const id2 = bubbleRef.current?.__raf2;
      if (id2) cancelAnimationFrame(id2);
    };
  }, [open, placeBubble]);

  useEffect(() => {
    if (!open) return;

    const onResize = () => placeBubble();
    const onScroll = () => placeBubble();
    const onDown = (e) => {
      const a = anchorRef.current;
      const bubble = bubbleRef.current;
      if (!a || !bubble) return;
      if (a.contains(e.target) || bubble.contains(e.target)) return;
      setOpen(false);
    };

    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("pointerdown", onDown);

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [open, placeBubble]);

  if (!content) return children;

  return (
    <span
      ref={anchorRef}
      className={cn("lb-tt", `lb-tt--${theme}`)}
      onPointerMove={(e) => {
        lastPointRef.current = { x: e.clientX, y: e.clientY };
        if (open) placeBubble();
      }}
      onPointerEnter={(e) => {
        lastPointRef.current = { x: e.clientX, y: e.clientY };
        setOpen(true);
      }}
      onPointerLeave={() => {
        setOpen(false);
        lastPointRef.current = null;
      }}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      tabIndex={0}
    >
      {children}

      {open &&
        createPortal(
          <span ref={bubbleRef} className={cn("lb-tt__bubble", "is-bottom")} role="tooltip" style={{ maxWidth }}>
            {content}
          </span>,
          document.body
        )}
    </span>
  );
}
