// src/components/Tienda/ui/TiendaStorefront.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import "../../../styles/components/Tienda/tienda-storefront.scss";
import TiendaOfertaCountdown from "./TiendaOfertaCountdown";
import CoinshopModal from "../coinshop/CoinshopModal";
import DailyFreeClaimCard from "./DailyFreeClaimCard";

import {
  fetchTebex,
  filterPackagesByCategoryId,
  getPackageId,
  getPackageImage,
  getPackageName,
  getPackagePrice,
  getPackageOriginalPrice,
  normalizeProductForCart,
  withCacheBust,
} from "../utils/tiendaHelpers";

function truthy(v) {
  return v === true || v === 1 || v === "1" || String(v).toLowerCase() === "true";
}

function isHiddenOrDisabledClient(pkg) {
  const pkgFlags = [pkg?.hidden, pkg?.disabled, pkg?.archived, pkg?.deleted, pkg?.gui_disabled];

  if (pkg?.status && ["hidden", "disabled", "archived", "deleted"].includes(String(pkg.status).toLowerCase())) return true;
  if (pkgFlags.some(truthy)) return true;

  const cat = pkg?.category || pkg?.categories?.[0] || {};
  const catFlags = [cat?.hidden, cat?.disabled, cat?.archived, cat?.deleted];

  if (cat?.status && ["hidden", "disabled", "archived", "deleted"].includes(String(cat.status).toLowerCase())) return true;
  if (catFlags.some(truthy)) return true;

  if (pkg?.price === null || typeof pkg?.name !== "string") return true;

  return false;
}

function pickCoinsCategory(apiCats = []) {
  const list = Array.isArray(apiCats) ? apiCats : [];
  return (
    list.find((c) => /coins?/i.test(String(c?.name || ""))) ||
    list.find((c) => /coins?/i.test(String(c?.slug || ""))) ||
    null
  );
}

function pickCoinsPackages({ serverKey, apiCats, packs }) {
  const visible = (Array.isArray(packs) ? packs : []).filter((p) => !isHiddenOrDisabledClient(p));
  if (!visible.length) return [];

  const coinsCat = pickCoinsCategory(apiCats);
  if (coinsCat?.id) {
    const byCat = filterPackagesByCategoryId(visible, coinsCat.id);
    if (byCat.length) {
      if (serverKey === "oneblock") {
        const ob = byCat.filter((p) => /(\bob\b|oneblock)/i.test(String(p?.name || "")));
        return ob.length ? ob : byCat;
      }
      if (serverKey === "gens") {
        const gens = byCat.filter((p) => !/(\bob\b|oneblock)/i.test(String(p?.name || "")));
        return gens.length ? gens : byCat;
      }
      return byCat;
    }
  }

  if (serverKey === "oneblock") {
    const ob = visible.filter(
      (p) => /coins?/i.test(String(p?.name || "")) && /(\bob\b|oneblock)/i.test(String(p?.name || ""))
    );
    if (ob.length) return ob;
  }

  if (serverKey === "gens") {
    const gens = visible.filter(
      (p) => /coins?/i.test(String(p?.name || "")) && !/(\bob\b|oneblock)/i.test(String(p?.name || ""))
    );
    if (gens.length) return gens;
  }

  return visible;
}

function pickRangosPackages({ apiCats, packs }) {
  const cats = Array.isArray(apiCats) ? apiCats : [];
  const visible = (Array.isArray(packs) ? packs : []).filter((p) => !isHiddenOrDisabledClient(p));

  const rangosCat =
    cats.find((c) => /rangos/i.test(String(c?.name || ""))) ||
    cats.find((c) => /rangos/i.test(String(c?.slug || ""))) ||
    null;

  if (rangosCat?.id) {
    const byCat = filterPackagesByCategoryId(visible, rangosCat.id);
    return byCat.length ? byCat : visible;
  }

  const byName = visible.filter((p) => /(nova|alpha|inmortal|immortal)/i.test(String(p?.name || "")));
  return byName.length ? byName : visible;
}

const rankKeyFromName = (name = "") => {
  const n = String(name).toLowerCase();
  if (n.includes("nova")) return "nova";
  if (n.includes("alpha")) return "alpha";
  if (n.includes("inmortal") || n.includes("immortal")) return "inmortal";
  return "";
};

const sortByPriceAsc = (a, b) => getPackagePrice(a) - getPackagePrice(b);

function formatEur(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(n);
}

function fmtInt(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 }).format(Math.round(v));
}

function parseCoinsFromText(text) {
  const s = String(text || "").trim();
  if (!s) return null;

  const candidates = [
    /coins?\s*[:\-|]?\s*[x×]?\s*([\d][\d.,\s]*)/i,
    /[x×]\s*([\d][\d.,\s]*)\s*coins?/i,
    /\b(?:coins?)\b.*?\b([0-9][0-9.,\s]*)\b/i,
    /\b[x×]\s*([\d][\d.,\s]*)\b/i,
    /\b([0-9][0-9.,\s]{2,})\b/,
  ];

  for (const re of candidates) {
    const m = s.match(re);
    if (!m || !m[1]) continue;

    const raw = String(m[1]).replace(/\s+/g, "");
    const digits = raw.replace(/[^\d]/g, "");
    if (!digits) continue;

    const n = Number(digits);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

function parseCoinsFromPkg(pkg) {
  if (!pkg) return null;
  const name = getPackageName(pkg);
  let n = parseCoinsFromText(name);
  if (n) return n;

  const extraTexts = [
    pkg?.description,
    pkg?.short_description,
    pkg?.shortDescription,
    pkg?.details,
    pkg?.meta?.description,
  ].filter(Boolean);

  for (const t of extraTexts) {
    n = parseCoinsFromText(t);
    if (n) return n;
  }
  return null;
}

function setTiltVars(el, ev) {
  if (!el) return;
  const r = el.getBoundingClientRect();
  const x = (ev.clientX - r.left) / r.width;
  const y = (ev.clientY - r.top) / r.height;
  const rx = (0.5 - y) * 9;
  const ry = (x - 0.5) * 12;
  el.style.setProperty("--rx", rx.toFixed(2));
  el.style.setProperty("--ry", ry.toFixed(2));
  el.style.setProperty("--mx", `${(x * 100).toFixed(2)}%`);
  el.style.setProperty("--my", `${(y * 100).toFixed(2)}%`);
}

function roundNiceExtra(extra) {
  const e = Number(extra);
  if (!Number.isFinite(e) || e <= 0) return 0;

  const step = e >= 2000 ? 500 : 100;
  return Math.max(step, Math.round(e / step) * step);
}

function hasSaleSignal(pkg) {
  if (!pkg) return false;

  const any = [
    pkg?.on_sale,
    pkg?.is_sale,
    pkg?.sale,
    pkg?.sale_active,
    pkg?.discount,
    pkg?.discount_active,
    pkg?.discount_percentage,
    pkg?.discountPercent,
    pkg?.sale_percentage,
    pkg?.salePercentage,
  ];

  if (typeof pkg?.sale === "object" && pkg?.sale) {
    if (truthy(pkg.sale.active) || truthy(pkg.sale.is_active) || truthy(pkg.sale.enabled)) return true;
    if (typeof pkg.sale.percentage === "number" && pkg.sale.percentage > 0) return true;
  }

  if (typeof pkg?.discount === "object" && pkg?.discount) {
    if (truthy(pkg.discount.active) || truthy(pkg.discount.is_active) || truthy(pkg.discount.enabled)) return true;
    if (typeof pkg.discount.percentage === "number" && pkg.discount.percentage > 0) return true;
  }

  for (const v of any) {
    if (truthy(v)) return true;
    if (typeof v === "number" && v > 0) return true;
  }

  return false;
}

function getDiscountMeta(pkg) {
  const price = Number(getPackagePrice(pkg) || 0);
  const originalRaw = getPackageOriginalPrice(pkg);
  const original = Number(originalRaw);

  const saleSignal = hasSaleSignal(pkg);
  if (!saleSignal) return { onSale: false, discountPct: null, original: null, price };

  if (!Number.isFinite(price) || price <= 0) return { onSale: false, discountPct: null, original: null, price };
  if (!Number.isFinite(original) || original <= 0) return { onSale: false, discountPct: null, original: null, price };

  const diff = original - price;
  if (diff <= 0.009) return { onSale: false, discountPct: null, original: null, price };

  const pct = Math.round((1 - price / original) * 100);
  if (!Number.isFinite(pct) || pct < 2) return { onSale: false, discountPct: null, original: null, price };

  return { onSale: true, discountPct: pct, original, price };
}

function BonusArrowUp({ className = "" }) {
  return (
    <svg className={className} width="26" height="26" viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="bUpMain" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#19C94B" />
          <stop offset="0.55" stopColor="#59FF8E" />
          <stop offset="1" stopColor="#D6FFE7" />
        </linearGradient>
        <linearGradient id="bUpShine" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="rgba(255,255,255,0.85)" />
          <stop offset="0.55" stopColor="rgba(255,255,255,0.12)" />
          <stop offset="1" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
        <filter id="bUpDrop" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="rgba(0,0,0,0.35)" />
        </filter>
      </defs>

      <path
        d="M32 8c1.8 0 3.3.7 4.5 2l15.5 16.8c1.2 1.3 1.4 3.2.5 4.7-.9 1.5-2.5 2.4-4.2 2.4H41v18.3c0 2.8-2.3 5-5 5H28c-2.8 0-5-2.2-5-5V34.6h-7.3c-1.7 0-3.3-.9-4.2-2.4-.9-1.5-.7-3.4.5-4.7L27.5 10c1.2-1.3 2.7-2 4.5-2z"
        fill="url(#bUpMain)"
        stroke="rgba(0,0,0,0.38)"
        strokeWidth="3"
        strokeLinejoin="round"
        filter="url(#bUpDrop)"
      />

      <path d="M16 40 L48 18" stroke="rgba(255,255,255,0.22)" strokeWidth="6" strokeLinecap="round" opacity="0.55" />
      <path d="M16 40 L48 18" stroke="rgba(0,0,0,0.30)" strokeWidth="2" strokeLinecap="round" opacity="0.45" />

      <path
        d="M32 11c1 0 1.9.4 2.6 1.1l13.9 15.1c.3.3.2.7-.1.9-.2.2-.5.3-.8.3H39c-1.1 0-2 .9-2 2v0.2c0 0 0 0 0 0
           C37 21.5 34.2 11 32 11z"
        fill="url(#bUpShine)"
        opacity="0.55"
      />

      <path
        d="M32 12c.9 0 1.7.3 2.3 1l14.4 15.7c.4.5.1 1.2-.6 1.2H40.5c-1.4 0-2.5 1.1-2.5 2.5v19.8c0 1.7-1.3 3-3 3H29c-1.7 0-3-1.3-3-3V32.4c0-1.4-1.1-2.5-2.5-2.5H15.9c-.7 0-1-0.7-.6-1.2L29.7 13c.6-.7 1.4-1 2.3-1z"
        fill="none"
        stroke="rgba(255,255,255,0.18)"
        strokeWidth="2"
        strokeLinejoin="round"
        opacity="0.9"
      />
    </svg>
  );
}

export default function TiendaStorefront({ carrito, toggleProducto, onCambiarCantidad, onSetCantidad, onAgregar }) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [dataByServer, setDataByServer] = useState({
    gens: { cats: [], packs: [], bust: null },
    oneblock: { cats: [], packs: [], bust: null },
  });

  const [serverTab, setServerTab] = useState("gens");
  const [renderTab, setRenderTab] = useState("gens");
  const [tabAnim, setTabAnim] = useState("in");
  const [switchedOnce, setSwitchedOnce] = useState(false);
  const tabTimerRef = useRef(null);

  const [activeRank, setActiveRank] = useState(null);
  const [hoverFx, setHoverFx] = useState(null);
  const wrapRef = useRef(null);

  const [coinshopOpen, setCoinshopOpen] = useState(false);
  const [coinshopFromRect, setCoinshopFromRect] = useState(null);

  const openCoinshopFromEl = (el) => {
    const r = el?.getBoundingClientRect?.();
    if (r) {
      setCoinshopFromRect({
        left: r.left,
        top: r.top,
        width: r.width,
        height: r.height,
        right: r.right,
        bottom: r.bottom,
      });
    } else {
      setCoinshopFromRect(null);
    }
    setCoinshopOpen(true);
  };

  const openCoinshopFromEvent = (ev) => openCoinshopFromEl(ev?.currentTarget);

  const closeCoinshop = () => {
    setCoinshopOpen(false);
  };

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

      root.style.setProperty("--ui-scale", scale.toFixed(3));
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
  }, []);

  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!loading && !err) {
      const t = setTimeout(() => setReady(true), 20);
      return () => clearTimeout(t);
    }
  }, [loading, err]);

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

        const next = {
          gens: gens.status === "fulfilled" ? gens.value : { cats: [], packs: [], bust: null },
          oneblock: oneblock.status === "fulfilled" ? oneblock.value : { cats: [], packs: [], bust: null },
        };

        setDataByServer(next);

        if (
          gens.status === "fulfilled" &&
          Array.isArray(gens.value?.packs) &&
          gens.value.packs.length === 0 &&
          oneblock.status === "fulfilled" &&
          Array.isArray(oneblock.value?.packs) &&
          oneblock.value.packs.length > 0
        ) {
          setServerTab("oneblock");
          setRenderTab("oneblock");
        }
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

  useEffect(() => {
    const onDown = (e) => {
      const root = wrapRef.current;
      if (!root) return;
      if (!root.contains(e.target)) setActiveRank(null);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, []);

  const rangosAll = useMemo(() => {
    return pickRangosPackages({
      apiCats: dataByServer.gens.cats,
      packs: dataByServer.gens.packs,
    });
  }, [dataByServer.gens.cats, dataByServer.gens.packs]);

  const rankCards = useMemo(() => {
    const by = { nova: [], alpha: [], inmortal: [] };

    for (const p of rangosAll) {
      const key = rankKeyFromName(getPackageName(p));
      if (!key) continue;
      by[key].push(p);
    }

    by.nova.sort(sortByPriceAsc);
    by.alpha.sort(sortByPriceAsc);
    by.inmortal.sort(sortByPriceAsc);

    const pickMain = (arr) => (arr && arr.length ? arr[0] : null);

    return [
      { key: "nova", label: "NOVA", deg: "/tienda/assets/degverde.svg", pkg: pickMain(by.nova) },
      { key: "alpha", label: "ALPHA", deg: "/tienda/assets/degazul.svg", pkg: pickMain(by.alpha) },
      { key: "inmortal", label: "INMORTAL", deg: "/tienda/assets/degrojo.svg", pkg: pickMain(by.inmortal), best: true },
    ];
  }, [rangosAll]);

  const serverTabs = useMemo(
    () => [
      { key: "oneblock", label: "Oneblock", icon: "/assets/reinos/oneblock.webp" },
      { key: "gens", label: "Gens", icon: "/assets/reinos/gens.webp" },
    ],
    []
  );

  const activeData = dataByServer[renderTab] || { cats: [], packs: [], bust: null };

  const coinsPackages = useMemo(() => {
    return pickCoinsPackages({
      serverKey: renderTab,
      apiCats: activeData.cats,
      packs: activeData.packs,
    }).sort(sortByPriceAsc);
  }, [renderTab, activeData.cats, activeData.packs]);

  const tabDiscountPctByServer = useMemo(() => {
    const out = new Map();

    for (const t of serverTabs) {
      const sv = t.key;
      const data = dataByServer[sv] || { cats: [], packs: [] };
      const list = pickCoinsPackages({ serverKey: sv, apiCats: data.cats, packs: data.packs });

      let bestPct = 0;
      for (const p of list) {
        const meta = getDiscountMeta(p);
        if (meta.onSale && meta.discountPct && meta.discountPct > bestPct) bestPct = meta.discountPct;
      }
      out.set(sv, bestPct > 0 ? bestPct : null);
    }

    return out;
  }, [dataByServer, serverTabs]);

  const isInCart = (pkg) => {
    if (!pkg) return false;
    const id = getPackageId(pkg);
    return (carrito || []).some((it) => String(it?.id) === String(id));
  };

  const getQtyInCart = (pkg) => {
    if (!pkg) return 0;
    const id = getPackageId(pkg);
    const it = (carrito || []).find((x) => String(x?.id) === String(id));
    const q = Number(it?.quantity || it?.cantidad || 0) || 0;
    return Math.max(0, Math.min(999, q));
  };

  const handleBuyRank = (pkg, ev) => {
    const target = ev?.currentTarget || ev?.target;
    const rect = target?.getBoundingClientRect?.();

    const imgRaw = getPackageImage(pkg);
    const img = withCacheBust(imgRaw, activeData.bust);

    if (rect && img) {
      document.dispatchEvent(new CustomEvent("tienda:fly", { detail: { img, rect } }));
    }

    toggleProducto(normalizeProductForCart(pkg, 1));
  };

  const changeCoinsQty = (pkg, delta, ev) => {
    if (!pkg) return;

    const id = getPackageId(pkg);
    const norm = normalizeProductForCart(pkg, 1);

    if (delta > 0) {
      const target = ev?.currentTarget || ev?.target;
      const rect = target?.getBoundingClientRect?.();

      const imgRaw = getPackageImage(pkg);
      const img = withCacheBust(imgRaw, activeData.bust);

      if (rect && img) {
        document.dispatchEvent(new CustomEvent("tienda:fly", { detail: { img, rect } }));
      }
    }

    if (typeof onCambiarCantidad === "function") return onCambiarCantidad(id, delta, norm);

    if (typeof onSetCantidad === "function") {
      const cur = getQtyInCart(pkg);
      const next = Math.max(0, Math.min(999, cur + delta));
      return onSetCantidad(id, next, norm);
    }

    if (typeof onAgregar === "function") {
      if (delta > 0) return onAgregar(norm, 1);
      return;
    }

    if (delta > 0 && getQtyInCart(pkg) <= 0) return toggleProducto(norm);
  };

  const onRankTap = (key) => setActiveRank((cur) => (cur === key ? null : key));

  const coinsValue = useMemo(() => {
    const list = (coinsPackages || []).map((p) => {
      const id = String(getPackageId(p) ?? getPackageName(p));
      const price = Number(getPackagePrice(p) || 0);
      const amount = parseCoinsFromPkg(p);
      const rate = amount && price > 0 ? amount / price : null;
      return { id, price, amount, rate };
    });

    const base = list.find((x) => x.amount && x.price > 0);
    const baseRate = base?.amount && base?.price ? base.amount / base.price : null;

    let best = null;
    for (const it of list) {
      if (!it.rate) continue;
      if (!best || it.rate > best.rate) best = it;
    }

    const bestId = best?.id ?? null;

    const map = new Map();
    for (const it of list) {
      if (!baseRate || !it.amount || !it.price) {
        map.set(it.id, { isBest: it.id === bestId, extraNice: 0 });
        continue;
      }
      const expected = baseRate * it.price;
      const extraRaw = it.amount - expected;

      const extraNice = extraRaw >= 500 ? roundNiceExtra(extraRaw) : 0;

      map.set(it.id, { isBest: it.id === bestId, extraNice });
    }

    return { bestId, map };
  }, [coinsPackages]);

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

  const rootFxClass = hoverFx ? `fx-${hoverFx}` : "";

  return (
    <div className={`tienda-storefront tsf-brawl2 ${ready ? "is-ready" : ""} ${rootFxClass}`} ref={wrapRef}>
      <div className="tsf-bgFX" aria-hidden="true" />

      <CoinshopModal open={coinshopOpen} fromRect={coinshopFromRect} onClose={closeCoinshop} />

      <header className="tsf-header tsf-header--fixed">
        <div className="tsf-signImg" aria-label="Tienda">
          <img src="/tienda/assets/cartel.png" alt="TIENDA" draggable="false" />
        </div>
      </header>
<div className="tsf-dailyClaimFloat">
  <DailyFreeClaimCard />
</div>
      <div className="tsf-scroll">
        {loading && (
          <div className="tsf-state">
            <div className="tsf-loader" />
            <div className="tsf-state-text">Cargando tienda…</div>
          </div>
        )}

        {!loading && err && (
          <div className="tsf-state tsf-state--error">
            <div className="tsf-state-text">{err}</div>
            <button className="tsf-retry" onClick={() => window.location.reload()}>
              Reintentar
            </button>
          </div>
        )}

        {!loading && !err && (
          <>
            <section className="tsf-ranks" aria-label="Rangos">
              <div className="tsf-content">
                <div className="tsf-ranksRow">
                  {rankCards.map((r, idx) => {
                    const pkg = r.pkg;
                    const price = pkg ? getPackagePrice(pkg) : null;
                    const tebexImg = pkg ? withCacheBust(getPackageImage(pkg), dataByServer.gens.bust) : "";
                    const active = activeRank === r.key;
                    const cart = isInCart(pkg);

                    return (
                      <article
                        key={r.key}
                        className={`tsf-rank ${r.key} ${active ? "is-active" : ""} ${cart ? "is-inCart" : ""}`}
                        style={{ "--i": idx }}
                        onClick={() => onRankTap(r.key)}
                        role="button"
                        tabIndex={0}
                        aria-label={`Rango ${r.label}`}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") onRankTap(r.key);
                        }}
                        onMouseEnter={() => setHoverFx(r.key)}
                        onMouseLeave={() => setHoverFx(null)}
                        onMouseMove={(ev) => setTiltVars(ev.currentTarget, ev)}
                        onMouseLeaveCapture={(ev) => {
                          ev.currentTarget.style.removeProperty("--rx");
                          ev.currentTarget.style.removeProperty("--ry");
                          ev.currentTarget.style.removeProperty("--mx");
                          ev.currentTarget.style.removeProperty("--my");
                        }}
                      >
                        <div className="tsf-rankLabel">
                          <span className="tsf-rankTop">Rango</span>
                          <span className="tsf-rankName">{r.label}</span>
                        </div>

                        <div className="tsf-square">
                          <img className="tsf-deg" src={r.deg} alt="" draggable="false" />
                          <span className="tsf-rankParticles" aria-hidden="true" />

                          {r.best && <div className="tsf-best">TOP</div>}

                          <div className="tsf-perma" aria-hidden="true">
                            PERMANENTE
                          </div>

                          {tebexImg ? <img className="tsf-icon" src={tebexImg} alt="" draggable="false" /> : <div className="tsf-iconFallback" />}

                          <div className="tsf-squareCta">
                            <button
                              type="button"
                              className={`tsf-cta ${cart ? "is-in" : ""}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!pkg) return;
                                handleBuyRank(pkg, e);
                              }}
                              disabled={!pkg}
                            >
                              <span className="t">{cart ? "EN CARRITO" : "COMPRAR"}</span>
                              <span className="p">{price != null ? formatEur(price) : "—"}</span>
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            </section>

            <section className="tsf-coins" aria-label="Coins">
              <div className="tsf-content">
                <div className="tsf-coinsHeader" aria-label="Selector de servidor coins">
                  <div className="tsf-tabsStack" aria-label="Oferta y selector">
                    <TiendaOfertaCountdown variant="tabs" />

                    <div className="tsf-tabsRow" aria-label="Fila tabs coinshop">
                      <nav className="tsf-tabs tsf-tabs--inHeader" aria-label="Selector de servidor">
                        {serverTabs.map((t) => {
                          const active = t.key === serverTab;
                          const pct = tabDiscountPctByServer.get(t.key) ?? null;

                          return (
                            <button
                              key={t.key}
                              type="button"
                              className={`tsf-tab ${active ? "is-active" : ""}`}
                              onClick={() => changeServerTabWithDeck(t.key)}
                            >
                              {pct != null && pct > 0 && <span className="tsf-tabBadge">-{pct}%</span>}
                              <img className="tsf-tabIcon" src={t.icon} alt="" draggable="false" />
                              <span className="tsf-tabText">{t.label}</span>
                              <span className="tsf-orb" aria-hidden="true" />
                            </button>
                          );
                        })}
                      </nav>

                      <button
  type="button"
  className="tsf-openShopBtn"
  onClick={openCoinshopFromEvent}
  aria-label="Abrir catálogo in-game"
  title="Ver catálogo in-game"
>
  <span
    className="tsf-openShopInner"
    aria-hidden="true"
    style={{ "--os-mask": "url(/tienda/assets/openshop.png)" }}
  >
    <img src="/tienda/assets/openshop.png" alt="Abrir catálogo" draggable="false" />
  </span>
</button>

                    </div>
                  </div>
                </div>

                <div className="tsf-coinsGridWrap" aria-label={`Packs de coins ${serverTab}`}>
                  {coinsPackages?.length ? (
                    <div className={`tsf-coinsGrid ${tabAnim === "out" ? "is-out" : "is-in"} ${switchedOnce ? "tsf-switched" : ""}`}>
                      {coinsPackages.map((p, idx) => {
                        const idRaw = getPackageId(p);
                        const idKey = String(idRaw ?? getPackageName(p));

                        const name = getPackageName(p);

                        const disc = getDiscountMeta(p);
                        const price = disc.price;
                        const onSale = disc.onSale;
                        const original = disc.original;
                        const discountPct = disc.discountPct;

                        const img = withCacheBust(getPackageImage(p), activeData.bust);
                        const amount = parseCoinsFromPkg(p);
                        const qty = getQtyInCart(p);

                        const meta = coinsValue?.map?.get(idKey) || { isBest: false, extraNice: 0 };
                        const hasBonus = amount != null && meta.extraNice >= 500 && meta.extraNice < amount;

                        const baseAmount = hasBonus ? Math.max(0, amount - meta.extraNice) : null;
                        const bonusAmount = hasBonus ? meta.extraNice : null;

                        return (
                          <article
                            className={`tsf-coinWrap ${qty > 0 ? "is-inCart" : ""}`}
                            key={idKey}
                            style={{ "--i": idx }}
                            onMouseMove={(ev) => setTiltVars(ev.currentTarget, ev)}
                            onMouseLeave={(ev) => {
                              ev.currentTarget.style.removeProperty("--rx");
                              ev.currentTarget.style.removeProperty("--ry");
                              ev.currentTarget.style.removeProperty("--mx");
                              ev.currentTarget.style.removeProperty("--my");
                            }}
                          >
                            <div
                              className="tsf-coinFrame"
                              aria-label={`Pack ${name}`}
                              role="button"
                              tabIndex={0}
                              onClick={openCoinshopFromEvent}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") openCoinshopFromEl(e.currentTarget);
                              }}
                            >
                              <div className="tsf-coinCard">
                                <div className="tsf-coinBadges" aria-hidden="true">
                                  {discountPct != null && discountPct > 0 && onSale && <span className="tsf-badge tsf-badge--sale">-{discountPct}%</span>}
                                </div>

                                <div className="tsf-coinAmount">
                                  <div className="tsf-amountMain">X{amount != null ? fmtInt(amount) : "—"}</div>

                                  {hasBonus && baseAmount != null && bonusAmount != null && (
                                    <div className="tsf-amountBonus" aria-label="Bonus">
                                      <span className="tsf-bonusText">
                                        <span className="tsf-bonusLine">
                                          {fmtInt(baseAmount)} + {fmtInt(bonusAmount)}
                                        </span>
                                      </span>
                                      <BonusArrowUp className="tsf-bonusIcon" />
                                    </div>
                                  )}
                                </div>

                                <div className="tsf-coinIcon" aria-hidden="true">
                                  <img src={img} alt="" draggable="false" />
                                </div>

                                <div className="tsf-coinPrices" aria-label="Precio">
                                  <span className="tsf-priceNow">{formatEur(price)}</span>
                                  {onSale && original != null && <span className="tsf-priceOld">{formatEur(original)}</span>}
                                </div>
                              </div>

                              <div
                                className={`tsf-buyBar ${qty > 0 ? "is-in" : ""}`}
                                role="group"
                                aria-label={`Cantidad ${name}`}
                                onClick={(e) => e.stopPropagation()}
                                onMouseDown={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  className="tsf-buySeg tsf-buySeg--dec"
                                  onClick={(ev) => {
                                    ev.stopPropagation();
                                    if (qty <= 0) return;
                                    changeCoinsQty(p, -1, ev);
                                  }}
                                  disabled={qty <= 0}
                                  aria-label="Restar"
                                >
                                  −
                                </button>

                                <button
                                  type="button"
                                  className="tsf-buySeg tsf-buySeg--main"
                                  onClick={(ev) => {
                                    ev.stopPropagation();
                                    changeCoinsQty(p, +1, ev);
                                  }}
                                  aria-label={`Añadir ${name}`}
                                >
                                  {qty > 0 ? `X${qty}` : "COMPRAR"}
                                </button>

                                <button
                                  type="button"
                                  className="tsf-buySeg tsf-buySeg--inc"
                                  onClick={(ev) => {
                                    ev.stopPropagation();
                                    if (qty >= 999) return;
                                    changeCoinsQty(p, +1, ev);
                                  }}
                                  disabled={qty >= 999}
                                  aria-label="Sumar"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="tsf-empty">No hay productos para este servidor (o no se ha encontrado la categoría).</div>
                  )}
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
