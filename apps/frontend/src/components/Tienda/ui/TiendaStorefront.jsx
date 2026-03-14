import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import "../../../styles/components/Tienda/tienda-storefront.scss";
import CoinshopModal from "./CoinshopModal";
import DailyFreeClaimCard from "./DailyFreeClaimCard";
import RangosComparativaPanel from "../details/RangosComparativaPanel";
import RangoWalletModal from "../details/RangoWalletModal";
import TiendaWelcomePackPopup from "./TiendaWelcomePackPopup";
import TiendaOfertaCountdown from "./TiendaOfertaCountdown"; 
import { UserContext } from "../../../context/UserContext";
import { supabase } from "@lib/supabaseClient";
import { clearSessionStorage, getAuthToken } from "../../../lib/auth/storage";
import { apiUrl } from "../../../lib/env";
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
  sortByPriceAsc,
  parseCoinsFromPkg,
} from "./storefront/storefront.utils";

import { useStorefrontData } from "./storefront/storefront.hooks";

const BonusArrowUp = ({ className }) => (
  <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 19V5M5 12l7-7 7 7" />
  </svg>
);

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
  const t = getAuthToken();
  return t && String(t).trim() ? String(t).trim() : null;
};

export default function TiendaStorefront({
  carrito,
  toggleProducto,
  onCambiarCantidad,
  onSetCantidad,
  onAgregar,
  nombreConfirmado,
  uuidConfirmado,
}) {
  const wrapRef = useRef(null);
  const { user, logout } = useContext(UserContext);
  const { loading, err, dataByServer } = useStorefrontData();

  const [activeRank, setActiveRank] = useState(null);
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
          clearSessionStorage();
          logout();
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
  }, [user?.uuid, logout]);

  useEffect(() => {
    if (!user?.uuid) {
      setWalletCoins(null);
      setWalletLoading(false);
      return;
    }
    fetchWalletBalance();
  }, [user?.uuid, fetchWalletBalance]);

  const openCoinshopFromEl = useCallback((el) => {
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
  }, []);

  const openCoinshopFromEvent = useCallback(
    (ev) => {
      openCoinshopFromEl(ev?.currentTarget);
    },
    [openCoinshopFromEl]
  );

  const closeCoinshop = useCallback(() => {
    setCoinshopOpen(false);
  }, []);

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
  const activeData = dataByServer?.[serverKey] || { cats: [], packs: [], bust: null };

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

    const pickMain = (arr) => (arr && arr.length ? arr.sort(sortByPriceAsc)[0] : null);

    return [
      { key: "nova", label: "NOVA", pkg: pickMain(by.nova) },
      { key: "alpha", label: "ALPHA", pkg: pickMain(by.alpha) },
      { key: "inmortal", label: "INMORTAL", pkg: pickMain(by.inmortal), best: true },
    ];
  }, [rangosAll]);

  const rankMetaByKey = useMemo(() => {
    const map = new Map();
    for (const rank of rankCards) map.set(rank.key, rank);
    return map;
  }, [rankCards]);

  const coinsPackages = useMemo(() => {
    return pickCoinsPackages({
      serverKey,
      apiCats: activeData.cats,
      packs: activeData.packs,
    }).sort(sortByPriceAsc);
  }, [serverKey, activeData.cats, activeData.packs]);

  const coinsValue = useMemo(() => {
    return buildCoinsValueMap(coinsPackages, {
      getId: getPackageId,
      getName: getPackageName,
      getPrice: getPackagePrice,
    });
  }, [coinsPackages]);

  const getQtyInCart = useCallback(
    (pkg) => {
      const it = (carrito || []).find((x) => String(x?.id) === String(getPackageId(pkg)));
      return Math.max(0, Math.min(999, Number(it?.quantity || it?.cantidad || 0) || 0));
    },
    [carrito]
  );

  const handleBuyRank = useCallback(
    (pkg) => {
      toggleProducto(normalizeProductForCart(pkg, 1));
    },
    [toggleProducto]
  );

  const changeCoinsQty = useCallback(
    (pkg, delta) => {
      if (!pkg) return;
      const id = getPackageId(pkg);
      const norm = normalizeProductForCart(pkg, 1);

      if (typeof onCambiarCantidad === "function") return onCambiarCantidad(id, delta, norm);
      if (typeof onSetCantidad === "function") return onSetCantidad(id, Math.max(0, Math.min(999, getQtyInCart(pkg) + delta)), norm);
      if (typeof onAgregar === "function" && delta > 0) return onAgregar(norm, 1);
      if (delta > 0 && getQtyInCart(pkg) <= 0) return toggleProducto(norm);
    },
    [onCambiarCantidad, onSetCantidad, onAgregar, getQtyInCart, toggleProducto]
  );

  const walletRankMeta = walletModalRankKey ? rankMetaByKey.get(walletModalRankKey) : null;
  const walletRankPrice = walletModalRankKey ? Number(rankWalletPrices?.[walletModalRankKey]) : NaN;
  const walletNeedsLogin = !user?.uuid || !readToken();
  const canConfirmWallet =
    !!walletModalRankKey &&
    Number.isFinite(walletRankPrice) &&
    walletRankPrice > 0 &&
    !walletNeedsLogin &&
    Number.isFinite(Number(walletCoins)) &&
    Number(walletCoins) >= walletRankPrice;

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
    <div className="pixel-storefront" ref={wrapRef}>
      <CoinshopModal open={coinshopOpen} fromRect={coinshopFromRect} onClose={closeCoinshop} />

      <RangoWalletModal
        open={walletModalOpen}
        onClose={closeWalletModal}
        rankKey={walletModalRankKey}
        rankIcon={walletRankMeta?.pkg ? getPackageImage(walletRankMeta.pkg) : null}
        rankLabel={walletRankMeta?.label}
        price={Number.isFinite(walletRankPrice) ? walletRankPrice : null}
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

      <TiendaWelcomePackPopup
        nombreConfirmado={nombreConfirmado}
        uuidConfirmado={uuidConfirmado}
        carrito={carrito}
        onAgregar={onAgregar}
      />

      {activeRank && (
        <RangosComparativaPanel
          rankKey={activeRank}
          onClose={() => setActiveRank(null)}
          onPickRank={setActiveRank}
          rankCards={rankCards}
          rankWalletPrices={rankWalletPrices}
          pricesLoaded={pricesLoaded}
          bust={activeData.bust}
          onBuyEur={handleBuyRank}
          onBuyCoins={(_, ev, rk) => {
            ev?.stopPropagation?.();
            openWalletModal(rk);
          }}
        />
      )}

      {loading ? (
        <div className="pixel-state-box">
          <div className="pixel-spinner"></div>
          <span>Cargando inventario...</span>
        </div>
      ) : err ? (
        <div className="pixel-state-box error">
          <span>{err}</span>
          <button className="pixel-btn-gray" onClick={() => window.location.reload()}>
            REINTENTAR
          </button>
        </div>
      ) : (
        <div className="pixel-store-scroll">
          
          <TiendaOfertaCountdown />

          <section className="pixel-section">
            <h2 className="pixel-section-title">RANGOS PERMANENTES</h2>
            <div className="pixel-ranks-grid">
              {rankCards.map((r) => {
                const pkg = r.pkg;
                const priceInfo = pkg ? getDiscountMeta(pkg, getPackagePrice, getPackageOriginalPrice) : null;
                const coinsPrice = rankWalletPrices?.[r.key];
                const active = activeRank === r.key;

                return (
                  <div
                    key={r.key}
                    className={`pixel-card rank-card ${r.key} ${active ? "active" : ""}`}
                    onClick={() => setActiveRank(active ? null : r.key)}
                  >
                    <div className="card-bg-glow"></div>
                    {r.best && <div className="pixel-tag best-tag">TOP</div>}

                    <div className="card-content-wrapper">
                      <div className="rank-header">
                        <span className="rank-name">{r.label}</span>
                      </div>

                      <div className="card-image-wrapper">
                        {pkg && <img src={withCacheBust(getPackageImage(pkg), activeData.bust)} alt={r.label} />}
                      </div>
                    </div>

                    <div className="rank-actions">
                      <button
                        className="pixel-btn-green split-btn btn-container-query"
                        disabled={!pkg}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleBuyRank(pkg);
                        }}
                      >
                        {priceInfo?.onSale && <span className="old-price">{formatUSD(priceInfo.original)}</span>}
                        <span className="new-price">{priceInfo?.price != null ? formatUSD(priceInfo.price) : "—"}</span>
                      </button>

                      <button
                        className="pixel-btn-gold split-btn btn-container-query"
                        disabled={!coinsPrice}
                        onClick={(e) => {
                          e.stopPropagation();
                          openWalletModal(r.key);
                        }}
                      >
                        <span className="new-price">
                          <span className="price-text">{coinsPrice != null ? fmtInt(coinsPrice) : pricesLoaded ? "—" : "…"}</span>
                          <img src="/tienda/assets/coin.png" alt="coins" className="inline-coin" />
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="pixel-section">
            <div className="pixel-section-header">
              <h2 className="pixel-section-title">LOTES DE COINS SURVIVAL</h2>
              <button className="pixel-btn-gray open-shop-btn" onClick={openCoinshopFromEvent}>
                <img src="/tienda/assets/openshop.png" alt="Catálogo" />
                <span>CATALOGO</span>
              </button>
            </div>

            <div className="pixel-daily-wrapper">
              <DailyFreeClaimCard />
            </div>

            <div className="pixel-coins-grid">
              {coinsPackages.map((p) => {
                const qty = getQtyInCart(p);
                const disc = getDiscountMeta(p, getPackagePrice, getPackageOriginalPrice);
                const idRaw = getPackageId(p);
                const idKey = String(idRaw ?? getPackageName(p));
                const amount = parseCoinsFromPkg(p, getPackageName);
                const meta = coinsValue?.map?.get(idKey) || { isBest: false, extraNice: 0 };
                const hasBonus = amount != null && meta.extraNice > 0 && meta.extraNice < amount;
                const baseAmount = hasBonus ? Math.max(0, amount - meta.extraNice) : null;
                const bonusAmount = hasBonus ? meta.extraNice : null;

                return (
                  <div key={getPackageId(p)} className={`pixel-card coin-card ${qty > 0 ? "in-cart" : ""}`}>
                    <div className="card-bg-glow"></div>
                    {qty > 0 && <div className="pixel-tag cart-tag">x{qty}</div>}
                    {meta.isBest && qty <= 0 && <div className="pixel-tag best-tag">TOP</div>}

                    <div className="card-content-wrapper">
                      <div className="coin-amount-wrapper">
                        <div className="coin-amount">x{amount != null ? fmtInt(amount) : "—"}</div>
                      </div>

                      <div className="card-image-wrapper coin-image-size">
                        <img
                          src={withCacheBust(getPackageImage(p), activeData.bust)}
                          alt={getPackageName(p)}
                          onClick={openCoinshopFromEvent}
                        />
                      </div>
                    </div>

                    <div className="coin-actions">
                      {hasBonus && baseAmount != null && bonusAmount != null && (
                        <div className="clean-bonus">
                          <span className="base">{fmtInt(baseAmount)}</span>
                          <span className="plus">+</span>
                          <span className="bonus">
                            {fmtInt(bonusAmount)} <BonusArrowUp className="bonus-icon" />
                          </span>
                        </div>
                      )}

                      <button className="pixel-btn-green full-btn" onClick={() => changeCoinsQty(p, 1)}>
                        {disc.onSale && <span className="old-price">{formatUSD(disc.original)}</span>}
                        <span className="new-price">{disc.price != null ? formatUSD(disc.price) : "—"}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <div className="mc-parents-bar">
            <span className="mc-parents-text">AVISO PARA PADRES:</span>
            <button className="pixel-btn-gray mc-parents-btn" onClick={() => setAntesOpen(true)}>
              LEER ANTES DE COMPRAR
            </button>
          </div>
        </div>
      )}

      {antesOpen && (
        <div className="mc-parents-overlay is-open" onClick={() => setAntesOpen(false)}>
          <div className="mc-parents-backdrop" />
          <div className="mc-parents-modal" onClick={(e) => e.stopPropagation()}>
            <button className="mc-parents-close" onClick={() => setAntesOpen(false)}>X</button>
            
            <div className="mc-parents-content">
              <div className="mc-title-plate">
                <h2>{ANTES_DE_COMPRAR.titulo}</h2>
              </div>
              
              <div className="mc-parents-scroll">
                {ANTES_DE_COMPRAR.intro.map((t, i) => (
                  <p key={i}>{t}</p>
                ))}

                {ANTES_DE_COMPRAR.avisos && (
                  <div>
                    <h4>Avisos</h4>
                    <ul>
                      {ANTES_DE_COMPRAR.avisos.map((t, i) => (
                        <li key={i}>{t}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {ANTES_DE_COMPRAR.soporte && (
                  <div>
                    <h4>{ANTES_DE_COMPRAR.soporte.titulo}</h4>
                    <p>{ANTES_DE_COMPRAR.soporte.texto}</p>
                    {ANTES_DE_COMPRAR.soporte.links && (
                      <div className="mc-parents-links">
                        {ANTES_DE_COMPRAR.soporte.links.map((l, i) => (
                          <a key={i} href={l.href} target="_blank" rel="noreferrer" className="pixel-btn-gray link-btn">
                            {l.label}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {ANTES_DE_COMPRAR.reembolso && (
                  <div>
                    <h4>{ANTES_DE_COMPRAR.reembolso.titulo}</h4>
                    {ANTES_DE_COMPRAR.reembolso.bloques?.map((t, i) => (
                      <p key={i}>{t}</p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}