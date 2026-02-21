// src/components/Tienda/ui/storefront/storefront.hooks.js
import { useLayoutEffect, useRef, useState, useEffect } from "react";
import { fetchTebex } from "../../utils/tiendaHelpers";

export function useUiScale(wrapRef) {
  useLayoutEffect(() => {
    const root = wrapRef.current;
    if (!root) return;

    const BASE_W = 1280;
    const BASE_H = 820;

    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

    let raf = 0;

    let last = {
      cw: 0,
      ch: 0,
      vvh: 0,
      vvw: 0,
      vvTop: 0,
      s: "",
    };

    const apply = () => {
      const r = root.getBoundingClientRect();

      const cw = Math.max(320, Math.round(r.width || root.clientWidth || 0));
      const ch = Math.max(520, Math.round(r.height || root.clientHeight || 0));

      const vv = window.visualViewport;
      const vvh = Math.round(vv?.height || window.innerHeight || ch);
      const vvw = Math.round(vv?.width || window.innerWidth || cw);

      const vvTop = Math.round(vv?.offsetTop || 0);

      const usableH = Math.max(520, Math.min(ch, vvh - vvTop) - 16);

      const scaleW = cw / BASE_W;
      const scaleH = usableH / BASE_H;

      const scale = clamp(Math.min(scaleW, scaleH), 0.56, 0.78);
      const s = scale.toFixed(3);

      const changed =
        last.s !== s ||
        last.cw !== cw ||
        last.ch !== ch ||
        last.vvh !== vvh ||
        last.vvw !== vvw ||
        last.vvTop !== vvTop;

      if (!changed) return;

      last = { cw, ch, vvh, vvw, vvTop, s };

      root.style.setProperty("--ui-scale", s);
      root.style.setProperty("--ui-scale-auto", s);

      root.style.setProperty("--vvh", `${vvh}px`);
      root.style.setProperty("--vvw", `${vvw}px`);
      root.style.setProperty("--cwh", `${ch}px`);
      root.style.setProperty("--cww", `${cw}px`);
      root.style.setProperty("--vvtop", `${vvTop}px`);
    };

    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(apply);
    };

    apply();

    const ro = new ResizeObserver(schedule);
    ro.observe(root);

    window.addEventListener("resize", schedule, { passive: true });
    window.addEventListener("orientationchange", schedule, { passive: true });

    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", schedule);
      window.visualViewport.addEventListener("scroll", schedule);
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();

      window.removeEventListener("resize", schedule);
      window.removeEventListener("orientationchange", schedule);

      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", schedule);
        window.visualViewport.removeEventListener("scroll", schedule);
      }
    };
  }, [wrapRef]);
}

export function useOutsideClose(wrapRef, onOutside) {
  useEffect(() => {
    const onDown = (e) => {
      const root = wrapRef.current;
      if (!root) return;
      if (!root.contains(e.target)) onOutside?.();
    };

    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown, { passive: true });

    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [wrapRef, onOutside]);
}

export function useStorefrontData() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [dataByServer, setDataByServer] = useState({
    gens: { cats: [], packs: [], bust: null },
    oneblock: { cats: [], packs: [], bust: null },
    survival: { cats: [], packs: [], bust: null },
  });

  useEffect(() => {
    let alive = true;

    const loadServer = async (sv) => {
      const r = await fetchTebex(`/datos?sv=${encodeURIComponent(sv)}`, {
        method: "GET",
      });
      if (!r.ok) throw new Error(`No se pudo cargar la tienda para ${sv}`);
      const json = await r.json();

      return {
        cats: Array.isArray(json?.categorias) ? json.categorias : [],
        packs: Array.isArray(json?.paquetes) ? json.paquetes : [],
        bust: json?.bust ?? json?.cacheBust ?? null,
      };
    };

    (async () => {
      try {
        setLoading(true);
        setErr("");

        const [gens, oneblock, survival] = await Promise.allSettled([
          loadServer("gens"),
          loadServer("oneblock"),
          loadServer("survival"),
        ]);

        if (!alive) return;

        setDataByServer({
          gens:
            gens.status === "fulfilled"
              ? gens.value
              : { cats: [], packs: [], bust: null },
          oneblock:
            oneblock.status === "fulfilled"
              ? oneblock.value
              : { cats: [], packs: [], bust: null },
          survival:
            survival.status === "fulfilled"
              ? survival.value
              : { cats: [], packs: [], bust: null },
        });
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || "No se pudo cargar la tienda.");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  return { loading, err, dataByServer, setDataByServer };
}

export function useTabDeck(initialKey = "gens") {
  const [serverTab, setServerTab] = useState(initialKey);
  const [renderTab, setRenderTab] = useState(initialKey);
  const [tabAnim, setTabAnim] = useState("in");
  const [switchedOnce, setSwitchedOnce] = useState(false);
  const tabTimerRef = useRef(null);

  const changeServerTabWithDeck = (key) => {
    if (key === serverTab) return;

    setServerTab(key);

    if (tabTimerRef.current) {
      clearTimeout(tabTimerRef.current);
      tabTimerRef.current = null;
    }

    setTabAnim("out");

    tabTimerRef.current = setTimeout(() => {
      setRenderTab(key);
      setSwitchedOnce(true);
      setTabAnim("in");
    }, 280);
  };

  useEffect(() => {
    return () => {
      if (tabTimerRef.current) clearTimeout(tabTimerRef.current);
    };
  }, []);

  return {
    serverTab,
    renderTab,
    tabAnim,
    switchedOnce,
    setServerTab,
    setRenderTab,
    changeServerTabWithDeck,
  };
}
