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

import { ANTES_DE_COMPRAR } from "../details/data/antesDeComprarData";

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

import { useStorefrontData, useUiScale } from "./storefront/storefront.hooks";

const API_BASE = (import.meta.env.VITE_BACKEND_URL || "https://flancraft-backend.onrender.com").trim().replace(/\/$/, "");
const apiUrl = (path) => (API_BASE ? `${API_BASE}${path}` : path);

const toInt = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
};

const makeIdempotencyKey = () => {
  if (typeof crypto !== "undefined" && crypto?.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`;
};

function formatUSD(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "—";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      currencyDisplay: "symbol",
    }).format(n);
  } catch {
    return `$${n.toFixed(2)}`;
  }
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

export default function TiendaStorefront({ carrito, toggleProducto, onCambiarCantidad, onSetCantidad, onAgregar }) {
  const wrapRef = useRef(null);
  const { user } = useContext(UserContext);

  const { loading, err, dataByServer } = useStorefrontData();

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

  const [antesOpen, setAntesOpen] = useState(false);
  const openAntes = useCallback((ev) => {
    ev?.preventDefault?.();
    setAntesOpen(true);
  }, []);
  const closeAntes = useCallback(() => setAntesOpen(false), []);

  useEffect(() => {
    if (!antesOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") closeAntes();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [antesOpen, closeAntes]);

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

  const serverKey = "survival";
  const activeData = dataByServer?.[serverKey] || { cats: [], packs: [], bust: null, currency: null };

  const fmtMoney = useCallback((amountFromTebex) => formatUSD(amountFromTebex), []);

  const rangosAll = useMemo(() => {
    return pickRangosPackages({
      apiCats: activeData.cats || [],
      packs: activeData.packs || [],
    });
  }, [activeData.cats, activeData.packs]);

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
      serverKey,
      apiCats: activeData.cats,
      packs: activeData.packs,
    }).sort(sortByPriceAsc);
  }, [serverKey, activeData.cats, activeData.packs]);

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

  const panelIconSrc = useMemo(() => withCacheBust("/assets/reinos/survival-clasico.webp", activeData.bust), [activeData.bust]);

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
        rankIcon={walletRankMeta?.pkg ? withCacheBust(getPackageImage(walletRankMeta.pkg), activeData.bust) : null}
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
  bust={activeData.bust}
  rankWalletPrices={rankWalletPrices}
  pricesLoaded={pricesLoaded}
  onBuyEur={(pkg, ev) => handleBuyRank(pkg, ev)}
  onBuyCoins={(pkg, ev, rk) => {
    ev?.stopPropagation?.();
    openWalletModal(rk);
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

const disc = pkg
  ? getDiscountMeta(pkg, getPackagePrice, getPackageOriginalPrice)
  : { price: null, original: null, onSale: false, discountPct: null };

const priceBase = disc.price;
const originalBase = disc.original;
const onSale = disc.onSale;

                    const walletPrice = rankWalletPrices?.[r.key];
                    const coinsPrice = Number.isFinite(Number(walletPrice)) && Number(walletPrice) > 0 ? Number(walletPrice) : null;

                    const tebexImg = pkg ? withCacheBust(getPackageImage(pkg), activeData.bust) : "";

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
  <span className={`tsf-ctaSplitPriceStack ${onSale && originalBase != null ? "is-sale" : ""}`}>
    <span className="tsf-ctaSplitPriceCurrent">{priceBase != null ? fmtMoney(priceBase) : "—"}</span>
    {onSale && originalBase != null && (
      <span className="tsf-ctaSplitPriceOld">{fmtMoney(originalBase)}</span>
    )}
  </span>
</span>

                              <span className="tsf-ctaSplitSide tsf-ctaSplitSide--coins" aria-label="Comprar con wallet coins">
                                <span className="tsf-ctaSplitCoins">
                                  <span className="tsf-ctaSplitValue">{coinsPrice != null ? fmtInt(coinsPrice) : pricesLoaded ? "—" : "…"}</span>
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
                <div className="tsf-coinsHeader">
                  <div className="tsf-tabsStack">
                    <TiendaOfertaCountdown variant="tabs" />
                  </div>
                </div>

                <div className="tsf-coinsPanel" aria-label="Lotes de coins Survival">
                  <div className="tsf-coinsPanelHeader">
                    <div className="tsf-coinsPanelHeaderInner">
                      <h2 className="tsf-coinsPanelTitle">
                        <span className="tsf-coinsPanelTitleInner">
                          {panelIconSrc ? <img className="tsf-coinsPanelTitleIcon" src={panelIconSrc} alt="" draggable="false" /> : null}
                          <span className="tsf-coinsPanelTitleText">LOTES DE COINS SURVIVAL</span>
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

                  <div className="tsf-coinsGridWrap" aria-label="Packs de coins Survival">
                    {coinsPackages?.length ? (
                      <div className="tsf-coinsGrid tsf-coinsGrid--linear4 is-in">
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
                                    <span className="tsf-buyPrice">{priceBase != null ? fmtMoney(priceBase) : "—"}</span>
                                    {onSale && originalBase != null && <span className="tsf-buyOld">{fmtMoney(originalBase)}</span>}
                                  </span>

                                  <span className="tsf-buyBtnDepth" aria-hidden="true" />

                                  {qty > 0 && <span className="tsf-buyQtyPill">x{qty}</span>}
                                </button>

                                {discountPct != null && discountPct > 0 && onSale && (
                                  <span className="tsf-saleBadge tsf-saleBadge--corner" aria-hidden="true">
                                    -{discountPct}%
                                  </span>
                                )}
                                {meta?.isBest && (
                                  <span className="tsf-bestBadge" aria-hidden="true">
                                    TOP
                                  </span>
                                )}
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="tsf-empty">No hay productos de coins para Survival (o no se ha encontrado la categoría).</div>
                    )}
                  </div>

                  <div className="tsf-antesLine" role="note" aria-label="Aviso antes de comprar">
                    <span className="tsf-antesLineText">Aviso para padres:</span>
                    <button type="button" className="tsf-antesLineBtn" onClick={openAntes} aria-haspopup="dialog">
                      Leer “Antes de comprar”
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </div>

      {antesOpen && (
        <div
          className="tsf-antesModalOverlay"
          role="dialog"
          aria-modal="true"
          aria-label={ANTES_DE_COMPRAR.titulo}
          onMouseDown={closeAntes}
        >
          <div className="tsf-antesModal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="tsf-antesModalHead">
              <div className="tsf-antesModalTitle">{ANTES_DE_COMPRAR.titulo}</div>
              <button type="button" className="tsf-antesModalClose" onClick={closeAntes} aria-label="Cerrar">
                Cerrar
              </button>
            </div>

            <div className="tsf-antesModalBody">
              <div className="tsf-antesBlock">
                {Array.isArray(ANTES_DE_COMPRAR.intro) &&
                  ANTES_DE_COMPRAR.intro.map((t, i) => (
                    <p className="tsf-antesP" key={`intro-${i}`}>
                      {t}
                    </p>
                  ))}
              </div>

              {Array.isArray(ANTES_DE_COMPRAR.avisos) && ANTES_DE_COMPRAR.avisos.length > 0 && (
                <div className="tsf-antesBlock">
                  <div className="tsf-antesH">Avisos</div>
                  <ul className="tsf-antesList">
                    {ANTES_DE_COMPRAR.avisos.map((t, i) => (
                      <li className="tsf-antesLi" key={`aviso-${i}`}>
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {ANTES_DE_COMPRAR.soporte && (
                <div className="tsf-antesBlock">
                  <div className="tsf-antesH">{ANTES_DE_COMPRAR.soporte.titulo}</div>
                  <p className="tsf-antesP">{ANTES_DE_COMPRAR.soporte.texto}</p>

                  {Array.isArray(ANTES_DE_COMPRAR.soporte.links) && ANTES_DE_COMPRAR.soporte.links.length > 0 && (
                    <div className="tsf-antesLinks">
                      {ANTES_DE_COMPRAR.soporte.links.map((l) => (
                        <a key={String(l?.href || l?.label || Math.random())} className="tsf-antesLink" href={l.href} target="_blank" rel="noreferrer">
                          {l.label}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {ANTES_DE_COMPRAR.reembolso && (
                <div className="tsf-antesBlock">
                  <div className="tsf-antesH">{ANTES_DE_COMPRAR.reembolso.titulo}</div>
                  {Array.isArray(ANTES_DE_COMPRAR.reembolso.bloques) &&
                    ANTES_DE_COMPRAR.reembolso.bloques.map((t, i) => (
                      <p className="tsf-antesP" key={`reembolso-${i}`}>
                        {t}
                      </p>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}