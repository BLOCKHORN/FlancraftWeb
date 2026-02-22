// apps/frontend/src/components/Tienda/storefront/TiendaStorefront.jsx
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import "../../../styles/components/Tienda/tienda-storefront.scss";
import TiendaOfertaCountdown from "./TiendaOfertaCountdown";
import CoinshopModal from "../coinshop/CoinshopModal";
import DailyFreeClaimCard from "./DailyFreeClaimCard";
import BonusArrowUp from "./icons/BonusArrowUp";
import RangosComparativaPanel from "../details/RangosComparativaPanel";
import RangoWalletModal from "../details/RangoWalletModal";
import { UserContext } from "../../../context/UserContext";
import { supabase } from "@lib/supabaseClient";

import {
  getPackageId,
  getPackageImage,
  getPackageName,
  getPackagePrice,
  getPackageOriginalPrice,
  normalizeProductForCart,
  withCacheBust,
} from "../utils/tiendaHelpers";

import {
  buildCoinsValueMap,
  fmtInt,
  getDiscountMeta,
  pickCoinsPackages,
  pickRangosPackages,
  rankKeyFromName,
  setTiltVars,
  sortByPriceAsc,
  parseCoinsFromPkg,
} from "./storefront/storefront.utils";

import { useStorefrontData, useTabDeck, useUiScale } from "./storefront/storefront.hooks";

const API_BASE = (import.meta.env.VITE_BACKEND_URL || "https://flancraft-backend.onrender.com").trim().replace(/\/$/, "");
const apiUrl = (path) => (API_BASE ? `${API_BASE}${path}` : path);

const safeJson = (s) => {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
};

const toInt = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
};

const makeIdempotencyKey = () => {
  if (typeof crypto !== "undefined" && crypto?.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`;
};

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

function median(nums) {
  const a = (nums || [])
    .filter((n) => Number.isFinite(n) && n > 0)
    .sort((x, y) => x - y);
  if (!a.length) return null;
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

function roundNiceCoins(n) {
  const v = Number(n) || 0;
  const step = 100;
  return Math.max(0, Math.round(v / step) * step);
}

function coinsFromMoney(baseMoney, coinsPerBaseUnit) {
  const m = Number(baseMoney);
  const r = Number(coinsPerBaseUnit);
  if (!Number.isFinite(m) || m <= 0) return null;
  if (!Number.isFinite(r) || r <= 0) return null;
  return roundNiceCoins(m * r);
}

const parseWalletFromDaily = (w) => {
  const v = w?.walletBalance ?? w?.wallet_balance ?? w?.walletCoins ?? w?.wallet_coins;
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : null;
};

const readToken = () => {
  const t = localStorage.getItem("token");
  return t && String(t).trim() ? String(t).trim() : null;
};

export default function TiendaStorefront({
  carrito,
  toggleProducto,
  onCambiarCantidad,
  onSetCantidad,
  onAgregar,
  monedaSeleccionada = "EUR",
  fx = null,
}) {
  const wrapRef = useRef(null);
  const { user } = useContext(UserContext);

  const { loading, err, dataByServer } = useStorefrontData();
  const {
    serverTab,
    renderTab,
    tabAnim,
    switchedOnce,
    changeServerTabWithDeck,
    setServerTab,
    setRenderTab,
  } = useTabDeck("gens");

  const [ready, setReady] = useState(false);

  const [activeRank, setActiveRank] = useState(null);
  const openRankDetails = useCallback((key) => setActiveRank(key), []);
  const closeRankDetails = useCallback(() => setActiveRank(null), []);

  const [hoverFx, setHoverFx] = useState(null);

  const [coinshopOpen, setCoinshopOpen] = useState(false);
  const [coinshopFromRect, setCoinshopFromRect] = useState(null);

  const [rankWalletPrices, setRankWalletPrices] = useState({ nova: null, alpha: null, inmortal: null });
  const [pricesLoaded, setPricesLoaded] = useState(false);

  const [walletCoins, setWalletCoins] = useState(null);
  const [walletLoading, setWalletLoading] = useState(false);

  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [walletModalRankKey, setWalletModalRankKey] = useState(null);
  const [walletModalLoading, setWalletModalLoading] = useState(false);
  const [walletModalError, setWalletModalError] = useState(null);
  const [walletModalSuccess, setWalletModalSuccess] = useState(false);

  useUiScale(wrapRef);

  useEffect(() => {
    if (!loading && !err) {
      const t = setTimeout(() => setReady(true), 20);
      return () => clearTimeout(t);
    }
  }, [loading, err]);

  useEffect(() => {
    let alive = true;

    const loadPrices = async () => {
      try {
        const r = await fetch(apiUrl("/api/rangos/lista"), { method: "GET" });
        const j = await r.json().catch(() => []);
        if (!alive) return;

        if (!r.ok || !Array.isArray(j)) {
          setPricesLoaded(true);
          return;
        }

        const next = { nova: null, alpha: null, inmortal: null };

        for (const row of j) {
          const rk = String(row?.rango || "").trim().toLowerCase();
          const tp = String(row?.tipo || "").trim().toLowerCase();
          if (tp !== "perma") continue;
          if (!["nova", "alpha", "inmortal"].includes(rk)) continue;
          const p = Number(row?.precio_wallet);
          if (Number.isFinite(p) && p > 0) next[rk] = Math.floor(p);
        }

        setRankWalletPrices(next);
        setPricesLoaded(true);
      } catch {
        if (!alive) return;
        setPricesLoaded(true);
      }
    };

    loadPrices();
    return () => {
      alive = false;
    };
  }, []);

  const fetchWalletBalance = useCallback(async () => {
    if (!user?.uuid) {
      setWalletCoins(null);
      return;
    }

    setWalletLoading(true);

    try {
      const token = readToken();

      const [userRes, walletRes] = await Promise.all([
        supabase.from("usuarios").select("wallet_coins").eq("uuid", user.uuid).single(),
        token
          ? fetch(apiUrl("/api/daily-claim/status"), {
              headers: { Authorization: `Bearer ${token}` },
            })
          : Promise.resolve(null),
      ]);

      let wallet = toInt(userRes?.data?.wallet_coins ?? 0);

      if (walletRes) {
        if (walletRes.status === 401) {
          localStorage.removeItem("token");
        } else if (walletRes.ok) {
          const w = await walletRes.json().catch(() => ({}));
          const parsed = parseWalletFromDaily(w);
          if (parsed != null) wallet = parsed;
        }
      }

      setWalletCoins(wallet);
    } catch {
      setWalletCoins(null);
    } finally {
      setWalletLoading(false);
    }
  }, [user?.uuid]);

  useEffect(() => {
    if (!user?.uuid) {
      setWalletCoins(null);
      setWalletLoading(false);
      return;
    }
    fetchWalletBalance();
  }, [user?.uuid, fetchWalletBalance]);

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
  const closeCoinshop = () => setCoinshopOpen(false);

  const openWalletModal = useCallback(
    (rankKey) => {
      setWalletModalError(null);
      setWalletModalSuccess(false);
      setWalletModalRankKey(rankKey);
      setWalletModalOpen(true);
      if (user?.uuid) fetchWalletBalance();
    },
    [user?.uuid, fetchWalletBalance]
  );

  const closeWalletModal = useCallback(() => {
    setWalletModalOpen(false);
    setWalletModalLoading(false);
    setWalletModalError(null);
    setWalletModalSuccess(false);
    setWalletModalRankKey(null);
  }, []);

  const serverTabs = useMemo(
    () => [
      {
        key: "oneblock",
        label: "Oneblock",
        icon: "/tienda/assets/tabs/oneblock.png",
        fallbackIcon: "/assets/reinos/oneblock.webp",
      },
      {
        key: "survival",
        label: "Survival",
        icon: "/tienda/assets/tabs/survival.png",
        fallbackIcon: "/assets/reinos/survival-clasico.webp",
      },
      {
        key: "gens",
        label: "Gens",
        icon: "/tienda/assets/tabs/gens.png",
        fallbackIcon: "/assets/reinos/gens.webp",
      },
    ],
    []
  );

  const activeTabMeta = useMemo(() => {
    const found = serverTabs.find((t) => t.key === serverTab);
    return (
      found || {
        key: serverTab,
        label: String(serverTab || "").toUpperCase(),
        icon: null,
        fallbackIcon: null,
      }
    );
  }, [serverTabs, serverTab]);

  const activeData = dataByServer?.[renderTab] || { cats: [], packs: [], bust: null };

  useEffect(() => {
    const order = ["oneblock", "survival", "gens"];
    const curHas = (dataByServer?.[serverTab]?.packs || []).length > 0;
    if (curHas) return;

    const first = order.find((k) => (dataByServer?.[k]?.packs || []).length > 0);
    if (!first) return;

    if (first !== serverTab) {
      setServerTab(first);
      setRenderTab(first);
    }
  }, [dataByServer, serverTab, setServerTab, setRenderTab]);

  const baseCurrency = useMemo(() => String(fx?.base || "EUR").toUpperCase(), [fx]);
  const viewCurrency = useMemo(
    () => String(monedaSeleccionada || baseCurrency).toUpperCase(),
    [monedaSeleccionada, baseCurrency]
  );
  const fxRate = useMemo(() => pickFxRate(fx, viewCurrency), [fx, viewCurrency]);

  const money = useCallback(
    (baseAmount) => {
      const n = Number(baseAmount);
      if (!Number.isFinite(n)) return null;
      const out = n * (Number.isFinite(fxRate) ? fxRate : 1);
      return Number.isFinite(out) ? out : n;
    },
    [fxRate]
  );

  const fmtMoney = useCallback(
    (baseAmount) => {
      const v = money(baseAmount);
      return v == null ? "—" : formatCurrency(v, viewCurrency);
    },
    [money, viewCurrency]
  );

  const rangosAll = useMemo(() => {
    return pickRangosPackages({
      apiCats: dataByServer.gens?.cats || [],
      packs: dataByServer.gens?.packs || [],
    });
  }, [dataByServer.gens?.cats, dataByServer.gens?.packs]);

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

  const rankMetaByKey = useMemo(() => {
    const m = new Map();
    for (const r of rankCards) m.set(r.key, r);
    return m;
  }, [rankCards]);

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
      const data = dataByServer?.[sv] || { cats: [], packs: [] };
      const list = pickCoinsPackages({ serverKey: sv, apiCats: data.cats, packs: data.packs });

      let bestPct = 0;
      for (const p of list) {
        const meta = getDiscountMeta(p, getPackagePrice, getPackageOriginalPrice);
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

    if (rect && img) document.dispatchEvent(new CustomEvent("tienda:fly", { detail: { img, rect } }));
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

      if (rect && img) document.dispatchEvent(new CustomEvent("tienda:fly", { detail: { img, rect } }));
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

  const onRankTap = (key) => {
    if (activeRank === key) return closeRankDetails();
    return openRankDetails(key);
  };

  const coinsValue = useMemo(() => {
    return buildCoinsValueMap(coinsPackages, {
      getId: getPackageId,
      getName: getPackageName,
      getPrice: getPackagePrice,
    });
  }, [coinsPackages]);

  const coinsPerBaseUnit = useMemo(() => {
    const ratios = [];
    for (const sv of ["gens", "oneblock", "survival"]) {
      const data = dataByServer?.[sv] || { cats: [], packs: [] };
      const list = pickCoinsPackages({ serverKey: sv, apiCats: data.cats, packs: data.packs });
      for (const p of list) {
        const amount = parseCoinsFromPkg(p, getPackageName);
        const price = getPackagePrice(p);
        const a = Number(amount);
        const pr = Number(price);
        if (Number.isFinite(a) && a > 0 && Number.isFinite(pr) && pr > 0) {
          ratios.push(a / pr);
        }
      }
    }
    return median(ratios);
  }, [dataByServer]);

  const rootFxClass = hoverFx ? `fx-${hoverFx}` : "";

  const onRankBuySplitClick = (rankKey, pkg, ev) => {
    ev.stopPropagation();
    if (!pkg) return;

    const btn = ev.currentTarget;
    const rect = btn?.getBoundingClientRect?.();
    const x = (ev.clientX ?? 0) - (rect?.left ?? 0);
    const w = rect?.width ?? 0;
    const isLeft = w > 0 ? x <= w / 2 : true;

    if (isLeft) {
      handleBuyRank(pkg, ev);
      return;
    }

    openWalletModal(rankKey);
  };

  const onPanelIconError = useCallback(
    (e) => {
      const fallback = activeTabMeta?.fallbackIcon ? withCacheBust(activeTabMeta.fallbackIcon, activeData.bust) : null;
      if (!fallback) return;
      const img = e?.currentTarget;
      if (!img) return;
      if (img.dataset?.fallback === "1") return;
      img.dataset.fallback = "1";
      img.src = fallback;
    },
    [activeTabMeta?.fallbackIcon, activeData.bust]
  );

  const panelIconSrc = useMemo(() => {
    if (!activeTabMeta?.icon) return null;
    return withCacheBust(activeTabMeta.icon, activeData.bust);
  }, [activeTabMeta?.icon, activeData.bust]);

  const walletRankMeta = walletModalRankKey ? rankMetaByKey.get(walletModalRankKey) : null;
  const walletRankPrice = walletModalRankKey ? rankWalletPrices?.[walletModalRankKey] ?? null : null;

  const walletNeedsLogin = useMemo(() => {
    const token = readToken();
    return !user?.uuid || !token;
  }, [user?.uuid, walletModalOpen]);

  const canConfirmWallet = useMemo(() => {
    if (!walletModalRankKey) return false;
    const p = Number(walletRankPrice);
    if (!Number.isFinite(p) || p <= 0) return false;
    if (walletNeedsLogin) return false;

    const w = Number(walletCoins);
    if (!Number.isFinite(w)) return false;
    return w >= p;
  }, [walletModalRankKey, walletRankPrice, walletNeedsLogin, walletCoins]);

  const confirmWalletBuy = useCallback(async () => {
    if (!walletModalRankKey) return;

    const token = readToken();
    if (!token) {
      setWalletModalError("Necesitas iniciar sesión para comprar con wallet coins.");
      return;
    }

    const price = Number(rankWalletPrices?.[walletModalRankKey]);
    if (!Number.isFinite(price) || price <= 0) {
      setWalletModalError("Precio no disponible. Vuelve a abrir la tienda o recarga.");
      return;
    }

    setWalletModalLoading(true);
    setWalletModalError(null);
    setWalletModalSuccess(false);

    try {
      const r = await fetch(apiUrl("/api/rangos/comprar-wallet"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          rango: walletModalRankKey,
          tipo: "perma",
          idempotencyKey: makeIdempotencyKey(),
        }),
      });

      const j = await r.json().catch(() => ({}));

      if (!r.ok) {
        setWalletModalError(j?.error || "No se pudo completar la compra.");
        await fetchWalletBalance();
        setWalletModalLoading(false);
        return;
      }

      await fetchWalletBalance();
      setWalletModalSuccess(true);
      setWalletModalLoading(false);
    } catch {
      setWalletModalError("Error de red. Inténtalo de nuevo.");
      setWalletModalLoading(false);
    }
  }, [walletModalRankKey, rankWalletPrices, fetchWalletBalance]);

  return (
    <div className={`tienda-storefront tsf-brawl2 ${ready ? "is-ready" : ""} ${rootFxClass}`} ref={wrapRef}>
      <div className="tsf-bgFX" aria-hidden="true" />

      <CoinshopModal open={coinshopOpen} fromRect={coinshopFromRect} onClose={closeCoinshop} />

      <RangoWalletModal
        open={walletModalOpen}
        onClose={closeWalletModal}
        rankKey={walletModalRankKey}
        rankLabel={walletRankMeta?.label}
        rankDeg={walletRankMeta?.deg}
        rankIcon={walletRankMeta?.pkg ? withCacheBust(getPackageImage(walletRankMeta.pkg), dataByServer.gens?.bust) : null}
        price={walletRankPrice}
        walletCoins={walletCoins}
        loading={walletModalLoading || walletLoading}
        error={walletModalError}
        success={walletModalSuccess}
        needsLogin={walletNeedsLogin}
        canConfirm={canConfirmWallet}
        onConfirm={confirmWalletBuy}
        onOpenCoinshop={() => {
          closeWalletModal();
          setTimeout(() => openCoinshopFromEl(wrapRef.current), 0);
        }}
      />

      {activeRank ? (
        <RangosComparativaPanel
          rankKey={activeRank}
          onClose={closeRankDetails}
          onPickRank={(rk) => setActiveRank(rk)}
          rankCards={rankCards}
          bust={dataByServer.gens?.bust}
          onBuyEur={(pkg, ev) => handleBuyRank(pkg, ev)}
          onBuyCoins={(pkg, ev) => {
            ev?.stopPropagation?.();
            openWalletModal(activeRank);
          }}
        />
      ) : null}

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

                    const priceBase = pkg ? getPackagePrice(pkg) : null;

                    const walletPrice = rankWalletPrices?.[r.key];
                    const coinsPrice =
                      Number.isFinite(Number(walletPrice)) && Number(walletPrice) > 0
                        ? Number(walletPrice)
                        : pricesLoaded
                        ? null
                        : priceBase != null
                        ? coinsFromMoney(priceBase, coinsPerBaseUnit)
                        : null;

                    const tebexImg = pkg ? withCacheBust(getPackageImage(pkg), dataByServer.gens?.bust) : "";

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
                              className={`tsf-ctaSplit ${cart ? "is-in" : ""}`}
                              onClick={(e) => {
                                if (!pkg) return;
                                onRankBuySplitClick(r.key, pkg, e);
                              }}
                              disabled={!pkg}
                              aria-label={`Comprar ${r.label} (dinero o coins)`}
                              title="Izquierda: dinero · Derecha: wallet coins"
                            >
                              <span className="tsf-ctaSplitSide tsf-ctaSplitSide--usd" aria-label="Comprar con dinero">
                                <span className="tsf-ctaSplitValue">{priceBase != null ? fmtMoney(priceBase) : "—"}</span>
                              </span>

                              <span className="tsf-ctaSplitSide tsf-ctaSplitSide--coins" aria-label="Comprar con wallet coins">
                                <span className="tsf-ctaSplitCoins">
                                  <span className="tsf-ctaSplitValue">{coinsPrice != null ? fmtInt(coinsPrice) : "—"}</span>
                                  <img className="tsf-ctaCoinIcon" src="/tienda/assets/coin.png" alt="" draggable="false" />
                                </span>
                              </span>

                              <span className="tsf-ctaSplitDepth" aria-hidden="true" />
                              <span className="tsf-ctaSplitShine" aria-hidden="true" />
                              <span className="tsf-ctaSplitDivider" aria-hidden="true" />
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
                      <nav className="tsf-tabs tsf-tabs--inHeader tsf-tabs--triple" aria-label="Selector de servidor">
                        {serverTabs.map((t) => {
                          const active = t.key === serverTab;
                          const pct = tabDiscountPctByServer.get(t.key) ?? null;

                          return (
                            <button
                              key={t.key}
                              type="button"
                              className={`tsf-tab tsf-tab--${t.key} ${active ? "is-active" : ""}`}
                              onClick={() => changeServerTabWithDeck(t.key)}
                              aria-current={active ? "page" : undefined}
                            >
                              {pct != null && pct > 0 && <span className="tsf-tabBadge">-{pct}%</span>}
                              <img
                                className="tsf-tabIcon"
                                src={t.icon}
                                alt=""
                                draggable="false"
                                onError={(e) => {
                                  if (t.fallbackIcon) e.currentTarget.src = t.fallbackIcon;
                                }}
                              />
                              <span className="tsf-tabText">{t.label}</span>
                              <span className="tsf-orb" aria-hidden="true" />
                              <span className="tsf-tabGlow" aria-hidden="true" />
                            </button>
                          );
                        })}
                      </nav>
                    </div>
                  </div>
                </div>

                <div className="tsf-coinsPanel" aria-label={`Lotes de coins ${serverTab}`}>
                  <div className="tsf-coinsPanelHeader" aria-label="Título lotes de coins">
                    <div className="tsf-coinsPanelHeaderInner">
                      <h2 className="tsf-coinsPanelTitle">
                        <span className="tsf-coinsPanelTitleInner">
                          {panelIconSrc ? (
                            <img
                              className="tsf-coinsPanelTitleIcon"
                              src={panelIconSrc}
                              alt=""
                              draggable="false"
                              onError={(e) => {
                                const fallback = activeTabMeta?.fallbackIcon ? withCacheBust(activeTabMeta.fallbackIcon, activeData.bust) : null;
                                if (!fallback) return;
                                if (e?.currentTarget?.dataset?.fallback === "1") return;
                                e.currentTarget.dataset.fallback = "1";
                                e.currentTarget.src = fallback;
                              }}
                            />
                          ) : null}
                          <span className="tsf-coinsPanelTitleText">LOTES DE COINS {String(activeTabMeta?.label || "").toUpperCase()}</span>
                        </span>
                      </h2>

                      <button
                        type="button"
                        className="tsf-openShopBtn tsf-openShopBtn--panel"
                        onClick={openCoinshopFromEvent}
                        aria-label="Abrir catálogo in-game"
                        title="Ver catálogo in-game"
                      >
                        <span className="tsf-openShopInner" aria-hidden="true">
                          <img src="/tienda/assets/openshop.png" alt="Abrir catálogo" draggable="false" />
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className="tsf-coinsGridWrap" aria-label={`Packs de coins ${serverTab}`}>
                    {coinsPackages?.length ? (
                      <div
                        className={`tsf-coinsGrid tsf-coinsGrid--linear4 ${tabAnim === "out" ? "is-out" : "is-in"} ${
                          switchedOnce ? "tsf-switched" : ""
                        }`}
                      >
                        <article
                          className="tsf-coinWrap tsf-coinWrap--daily"
                          key="daily-claim"
                          style={{ "--i": 0 }}
                          onMouseMove={(ev) => setTiltVars(ev.currentTarget, ev)}
                          onMouseLeave={(ev) => {
                            ev.currentTarget.style.removeProperty("--rx");
                            ev.currentTarget.style.removeProperty("--ry");
                            ev.currentTarget.style.removeProperty("--mx");
                            ev.currentTarget.style.removeProperty("--my");
                          }}
                        >
                          <div className="tsf-coinFrame tsf-coinFrame--daily" aria-label="Claim gratuito diario">
                            <div className="tsf-dailyInFrame">
                              <DailyFreeClaimCard />
                            </div>
                          </div>
                        </article>

                        {coinsPackages.map((p, idx) => {
                          const gridIndex = idx + 1;
                          const idRaw = getPackageId(p);
                          const idKey = String(idRaw ?? getPackageName(p));

                          const name = getPackageName(p);

                          const disc = getDiscountMeta(p, getPackagePrice, getPackageOriginalPrice);
                          const priceBase = disc.price;
                          const onSale = disc.onSale;
                          const originalBase = disc.original;
                          const discountPct = disc.discountPct;

                          const img = withCacheBust(getPackageImage(p), activeData.bust);

                          const amount = parseCoinsFromPkg(p, getPackageName);
                          const qty = getQtyInCart(p);

                          const meta = coinsValue?.map?.get(idKey) || { isBest: false, extraNice: 0 };
                          const hasBonus = amount != null && meta.extraNice >= 500 && meta.extraNice < amount;
                          const baseAmount = hasBonus ? Math.max(0, amount - meta.extraNice) : null;
                          const bonusAmount = hasBonus ? meta.extraNice : null;

                          return (
                            <article
                              className={`tsf-coinWrap ${qty > 0 ? "is-inCart" : ""} ${meta?.isBest ? "is-best" : ""}`}
                              key={idKey}
                              style={{ "--i": gridIndex }}
                              onMouseMove={(ev) => setTiltVars(ev.currentTarget, ev)}
                              onMouseLeave={(ev) => {
                                ev.currentTarget.style.removeProperty("--rx");
                                ev.currentTarget.style.removeProperty("--ry");
                                ev.currentTarget.style.removeProperty("--mx");
                                ev.currentTarget.style.removeProperty("--my");
                              }}
                            >
                              <div className="tsf-coinFrame tsf-coinFrame--brawl" aria-label={`Pack ${name}`}>
                                <div className="tsf-coinQtyTop" aria-label="Cantidad de coins">
                                  X{amount != null ? fmtInt(amount) : "—"}
                                </div>

                                <button
                                  type="button"
                                  className="tsf-coinArtBtn"
                                  onClick={openCoinshopFromEvent}
                                  aria-label={`Ver ${name} en el catálogo`}
                                  title="Ver en catálogo"
                                >
                                  <img className="tsf-coinImg" src={img} alt="" draggable="false" />
                                </button>

                                {hasBonus && baseAmount != null && bonusAmount != null && (
                                  <div className="tsf-coinBand tsf-coinBand--bonus" aria-label="Bonus incluido">
                                    <span className="tsf-coinBandInner">
                                      <span className="tsf-coinBandText">
                                        {fmtInt(baseAmount)} + {fmtInt(bonusAmount)}
                                        <BonusArrowUp className="tsf-coinBandIcon" />
                                      </span>
                                    </span>
                                  </div>
                                )}

                                <button
                                  type="button"
                                  className={`tsf-buyBtn ${qty > 0 ? "is-in" : ""}`}
                                  onClick={(ev) => {
                                    ev.stopPropagation();
                                    changeCoinsQty(p, +1, ev);
                                  }}
                                  aria-label={`Comprar ${name}`}
                                >
                                  <span className="tsf-buyBtnFace">
                                    <span className="tsf-buyPrice">{fmtMoney(priceBase)}</span>
                                    {onSale && originalBase != null && (
                                      <span className="tsf-buyOld" aria-label="Precio anterior">
                                        {fmtMoney(originalBase)}
                                      </span>
                                    )}
                                  </span>

                                  <span className="tsf-buyBtnDepth" aria-hidden="true" />

                                  {qty > 0 && (
                                    <span className="tsf-buyQtyPill" aria-label="Cantidad en carrito">
                                      x{qty}
                                    </span>
                                  )}
                                </button>

                                {discountPct != null && discountPct > 0 && onSale && (
                                  <span className="tsf-saleBadge tsf-saleBadge--corner" aria-hidden="true">
                                    -{discountPct}%
                                  </span>
                                )}
                                {meta?.isBest && <span className="tsf-bestBadge" aria-hidden="true">TOP</span>}
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
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}