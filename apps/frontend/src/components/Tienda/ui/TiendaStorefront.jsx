import React, { useCallback, useMemo, useRef, useState } from "react";
import "../../../styles/components/Tienda/tienda-storefront.scss";
import CoinshopModal from "./CoinshopModal";
import DailyFreeClaimCard from "./DailyFreeClaimCard";
import RangosComparativaPanel from "../details/RangosComparativaPanel";
import TiendaWelcomePackPopup from "./TiendaWelcomePackPopup";
import TiendaOfertaCountdown from "./TiendaOfertaCountdown"; 
import { ANTES_DE_COMPRAR } from "../details/data/antesDeComprarData";

import {
  getPackageId,
  getPackageImage,
  getPackageName,
  getPackagePrice,
  getPackageOriginalPrice,
  normalizeProductForCart,
  withCacheBust,
  getPackageFlanpoints
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

export const FlaniteIcon = ({ className = "flanite-img" }) => (
  <img src="/tienda/assets/flanite.webp" alt="Flanite" className={className} />
);

export const FlanCoinIcon = ({ size = 18, className = "inline-coin" }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" fill="#f59e0b" stroke="#000" strokeWidth="2"/>
    <circle cx="12" cy="12" r="7" fill="#fbbf24" stroke="#d97706" strokeWidth="1"/>
    <path d="M10 8h5v2h-3v2h2v2h-2v3h-2V8z" fill="#fff" stroke="#b45309" strokeWidth="0.5"/>
  </svg>
);

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
  const { loading, err, dataByServer } = useStorefrontData();

  const [activeRank, setActiveRank] = useState(null);
  const [coinshopOpen, setCoinshopOpen] = useState(false);
  const [coinshopFromRect, setCoinshopFromRect] = useState(null);
  const [antesOpen, setAntesOpen] = useState(false);

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

  const tierNames = ["Pack Bronce", "Pack Plata", "Pack Oro", "Pack Diamante", "Pack Esmeralda", "Pack Mítico"];
  const classTiers = ["bronce", "plata", "oro", "diamante", "esmeralda", "mitico"];

  return (
    <div className="pixel-storefront" ref={wrapRef}>
      <CoinshopModal open={coinshopOpen} fromRect={coinshopFromRect} onClose={closeCoinshop} />

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
          bust={activeData.bust}
          onBuyEur={handleBuyRank}
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
                const active = activeRank === r.key;

                return (
                  <div key={r.key} className="rank-card-wrapper">
                    <div
                      className={`pixel-card rank-card ${r.key} ${active ? "active" : ""}`}
                      onClick={() => setActiveRank(active ? null : r.key)}
                    >
                      <div className="card-bg-glow"></div>
                      
                      {r.best && <div className="pixel-tag best-tag">TOP</div>}

                      <div className="card-content-wrapper">
                        <div className="rank-header">
                          <span className="rank-name">{r.label}</span>
                          {pkg && getPackageFlanpoints(pkg) > 0 && (
                            <div className="flanite-reward">
                              <FlaniteIcon />
                              <span className="flanite-val">+{getPackageFlanpoints(pkg)} FLT</span>
                            </div>
                          )}
                        </div>

                        <div className="card-image-wrapper">
                          {pkg && <img src={withCacheBust(getPackageImage(pkg), activeData.bust)} alt={r.label} />}
                        </div>
                      </div>

                      <div className="rank-actions">
                        <button
                          className="pixel-btn-green full-btn btn-container-query"
                          disabled={!pkg}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleBuyRank(pkg);
                          }}
                        >
                          {priceInfo?.onSale && <span className="old-price">{formatUSD(priceInfo.original)}</span>}
                          <span className="new-price">{priceInfo?.price != null ? formatUSD(priceInfo.price) : "—"}</span>
                        </button>
                      </div>
                    </div>
                    <div className="rank-info-text">
                      <span className="info-icon">i</span> Haz Clic para Ver Beneficios
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="pixel-section">
            
            <div className="pixel-section-header">
              <div className="header-text-group">
                <h2 className="pixel-section-title">COINS Y RECOMPENSAS</h2>
                <p className="pixel-section-desc">
                  ¡Acumula el <strong>Regalo Diario</strong> para conseguir objetos o rangos <strong>GRATIS</strong>!
                </p>
              </div>
              <button className="pixel-btn-gray open-shop-btn" onClick={openCoinshopFromEvent}>
                <img src="/tienda/assets/openshop.png" alt="Catálogo" />
                <span>CATÁLOGO</span>
              </button>
            </div>

            <div className="pixel-daily-wrapper">
              <DailyFreeClaimCard />
            </div>

            <div className="pixel-coins-grid">
              {coinsPackages.map((p, index) => {
                const qty = getQtyInCart(p);
                const disc = getDiscountMeta(p, getPackagePrice, getPackageOriginalPrice);
                const idRaw = getPackageId(p);
                const idKey = String(idRaw ?? getPackageName(p));
                const amount = parseCoinsFromPkg(p, getPackageName);
                const meta = coinsValue?.map?.get(idKey) || { isBest: false, extraNice: 0 };
                const hasBonus = amount != null && meta.extraNice > 0 && meta.extraNice < amount;
                const baseAmount = hasBonus ? Math.max(0, amount - meta.extraNice) : null;
                const bonusAmount = hasBonus ? meta.extraNice : null;
                const tierName = tierNames[index] || `Pack ${index + 1}`;
                const tierClass = classTiers[index] || "bronce";

                return (
                  <div key={getPackageId(p)} className={`pixel-card coin-card ${tierClass} ${qty > 0 ? "in-cart" : ""}`}>
                    <div className="card-bg-glow"></div>
                    
                    {qty > 0 && <div className="pixel-tag cart-tag">x{qty}</div>}
                    {meta.isBest && qty <= 0 && <div className="mas-valor-badge">¡MÁS VALOR!</div>}

                    <div className="card-content-wrapper">
                      <div className="coin-header">
                        <div className="coin-tier-name">{tierName}</div>
                        <div className="coin-amount-sub">
                          (x{amount != null ? fmtInt(amount) : "—"}&nbsp;<img src="/tienda/assets/coin.png" alt="Coin" className="inline-coin" />)
                        </div>
                        {p && getPackageFlanpoints(p) > 0 && (
                          <div className="flanite-reward">
                            <FlaniteIcon />
                            <span className="flanite-val">+{getPackageFlanpoints(p)} FLT</span>
                          </div>
                        )}
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