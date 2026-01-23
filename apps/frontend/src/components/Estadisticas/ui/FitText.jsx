// src/components/Estadisticas/ui/FitText.jsx
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { cn } from "../leaderboards.utils";
import "./FitText.scss";

export default function FitText({
  text,
  className,
  title,

  maxPx = 18,
  minPx = 13,

  extraPadding = 16,
  noShrinkUnder = 7,

  responsive = true,
  mobileMaxPx = 16,
  mobileMinPx = 12,
  tabletMaxPx = 17,
  tabletMinPx = 12,

  step = 0.5,
}) {
  const wrapRef = useRef(null);
  const textRef = useRef(null);
  const rafRef = useRef(0);

  const [fs, setFs] = useState(maxPx);
  const lastGoodRef = useRef(maxPx);

  const str = String(text ?? "");

  const limits = useMemo(() => {
    if (!responsive) return { max: maxPx, min: minPx };

    const w = window.innerWidth || 1200;
    if (w <= 520) return { max: mobileMaxPx, min: mobileMinPx };
    if (w <= 920) return { max: tabletMaxPx, min: tabletMinPx };
    return { max: maxPx, min: minPx };
  }, [responsive, maxPx, minPx, mobileMaxPx, mobileMinPx, tabletMaxPx, tabletMinPx]);

  const setNodeSize = (px) => {
    const node = textRef.current;
    if (node) node.style.fontSize = `${px}px`;
  };

  const fits = (px, available) => {
    const node = textRef.current;
    if (!node) return true;
    setNodeSize(px);
    return Math.ceil(node.scrollWidth) <= available;
  };

  const roundStep = (v) => Math.round(v / step) * step;

  const recalcNow = useCallback(() => {
    const wrap = wrapRef.current;
    const node = textRef.current;
    if (!wrap || !node) return;

    const available = Math.max(1, Math.floor(wrap.clientWidth - extraPadding));
    const max = Math.max(limits.min, limits.max);
    const min = Math.min(limits.min, limits.max);

    if (!str) {
      lastGoodRef.current = max;
      setFs(max);
      setNodeSize(max);
      return;
    }

    if (str.length <= noShrinkUnder) {
      lastGoodRef.current = max;
      setFs(max);
      setNodeSize(max);
      return;
    }

    if (fits(max, available)) {
      lastGoodRef.current = max;
      setFs(max);
      return;
    }

    let hi = max;
    let lo = min;
    let best = min;

    const seed = Math.min(max, Math.max(min, lastGoodRef.current));
    if (seed > min && fits(seed, available)) {
      lo = seed;
      best = seed;
    }

    const iterations = Math.ceil((hi - lo) / step) + 2;
    for (let k = 0; k < iterations; k++) {
      const mid = roundStep((lo + hi) / 2);
      if (fits(mid, available)) {
        best = mid;
        lo = mid + step;
      } else {
        hi = mid - step;
      }
      if (lo > hi) break;
    }

    best = Math.max(min, Math.min(max, best));
    lastGoodRef.current = best;
    setFs(best);
  }, [extraPadding, limits.max, limits.min, noShrinkUnder, step, str]);

  const schedule = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      recalcNow();
    });
  }, [recalcNow]);

  useLayoutEffect(() => {
    schedule();
  }, [schedule]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const ro = new ResizeObserver(schedule);
    ro.observe(wrap);

    const onWin = () => schedule();
    window.addEventListener("resize", onWin, { passive: true });

    return () => {
      window.removeEventListener("resize", onWin);
      ro.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [schedule]);

  return (
    <span ref={wrapRef} className={cn("fitText", className)} title={title || str}>
      <span ref={textRef} style={{ fontSize: fs }} className="fitText__t">
        {str}
      </span>
    </span>
  );
}
