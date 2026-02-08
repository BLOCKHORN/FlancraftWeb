// src/components/Tienda/ui/storefront/storefront.hooks.js
import { useEffect, useRef, useState } from "react";
import { fetchTebex } from "../../utils/tiendaHelpers";

export function useUiScale(wrapRef) {
  useEffect(() => {
    const root = wrapRef.current;
    if (!root) return;

    const BASE_W = 1280;
    const BASE_H = 820;
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

    const apply = () => {
      const vv = window.visualViewport;
      const vw = vv?.width || window.innerWidth || 1200;
      const vh = vv?.height || window.innerHeight || 800;

      const safeTop = 0;
      const safeBottom = 16;
      const usableH = Math.max(520, vh - safeTop - safeBottom);

      const scaleW = vw / BASE_W;
      const scaleH = usableH / BASE_H;

      const scale = clamp(Math.min(scaleW, scaleH), 0.56, 0.78);

      const s = scale.toFixed(3);
      root.style.setProperty("--ui-scale", s);
      root.style.setProperty("--ui-scale-auto", s);
      root.style.setProperty("--vvh", `${vh}px`);
      root.style.setProperty("--vvw", `${vw}px`);
    };

    apply();

    const onResize = () => apply();
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);

    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", onResize);
      window.visualViewport.addEventListener("scroll", onResize);
    }

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", onResize);
        window.visualViewport.removeEventListener("scroll", onResize);
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
  });

  useEffect(() => {
    let alive = true;

    const loadServer = async (sv) => {
      const r = await fetchTebex(`/datos?sv=${encodeURIComponent(sv)}`, { method: "GET" });
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

        const [gens, oneblock] = await Promise.allSettled([loadServer("gens"), loadServer("oneblock")]);
        if (!alive) return;

        setDataByServer({
          gens: gens.status === "fulfilled" ? gens.value : { cats: [], packs: [], bust: null },
          oneblock: oneblock.status === "fulfilled" ? oneblock.value : { cats: [], packs: [], bust: null },
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

  return { serverTab, renderTab, tabAnim, switchedOnce, setServerTab, setRenderTab, changeServerTabWithDeck };
}
