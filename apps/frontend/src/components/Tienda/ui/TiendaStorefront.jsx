// src/components/Tienda/ui/TiendaStorefront.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "../../../styles/components/Tienda/tienda-storefront.scss";
import TiendaOfertaCountdown from "./TiendaOfertaCountdown";
import CoinshopModal from "../coinshop/CoinshopModal";
import DailyFreeClaimCard from "./DailyFreeClaimCard";
import BonusArrowUp from "./icons/BonusArrowUp";
import RangosComparativaPanel from "../details/RangosComparativaPanel";

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
  formatEur,
  getDiscountMeta,
  pickCoinsPackages,
  pickRangosPackages,
  rankKeyFromName,
  setTiltVars,
  sortByPriceAsc,
  parseCoinsFromPkg,
} from "./storefront/storefront.utils";

import {
  useStorefrontData,
  useTabDeck,
  useUiScale,
} from "./storefront/storefront.hooks";

const COINS_PER_USD = 1000 / 6;

function roundNiceCoins(n) {
  const v = Number(n) || 0;
  const step = 100;
  return Math.max(0, Math.round(v / step) * step);
}

function coinsFromUsdDouble(usd) {
  if (usd == null) return null;
  const u = Number(usd);
  if (!Number.isFinite(u) || u <= 0) return null;
  const coins = u * 2 * COINS_PER_USD;
  return roundNiceCoins(coins);
}

export default function TiendaStorefront({
  carrito,
  toggleProducto,
  onCambiarCantidad,
  onSetCantidad,
  onAgregar,
}) {
  const wrapRef = useRef(null);

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

  // ✅ Comparativa en MODAL (portal), sin colapsar layout
  const [activeRank, setActiveRank] = useState(null);
const openRankDetails = useCallback((key) => {
  setActiveRank(key);
}, []);

const closeRankDetails = useCallback(() => {
  setActiveRank(null);
}, []);

  const [hoverFx, setHoverFx] = useState(null);

  const [coinshopOpen, setCoinshopOpen] = useState(false);
  const [coinshopFromRect, setCoinshopFromRect] = useState(null);

  useUiScale(wrapRef);

  useEffect(() => {
    if (!loading && !err) {
      const t = setTimeout(() => setReady(true), 20);
      return () => clearTimeout(t);
    }
  }, [loading, err]);


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

  const serverTabs = useMemo(
    () => [
      { key: "oneblock", label: "Oneblock", icon: "/assets/reinos/oneblock.webp" },
      { key: "gens", label: "Gens", icon: "/assets/reinos/gens.webp" },
    ],
    []
  );

  const activeTabMeta = useMemo(() => {
    const found = serverTabs.find((t) => t.key === serverTab);
    return found || { key: serverTab, label: String(serverTab || "").toUpperCase(), icon: null };
  }, [serverTabs, serverTab]);

  const activeData = dataByServer[renderTab] || { cats: [], packs: [], bust: null };

  useEffect(() => {
    const gensEmpty = (dataByServer.gens?.packs || []).length === 0;
    const obHas = (dataByServer.oneblock?.packs || []).length > 0;

    if (gensEmpty && obHas) {
      setServerTab("oneblock");
      setRenderTab("oneblock");
    }
  }, [dataByServer, setServerTab, setRenderTab]);

  const rangosAll = useMemo(() => {
    return pickRangosPackages({ apiCats: dataByServer.gens.cats, packs: dataByServer.gens.packs });
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

  const coinsPackages = useMemo(() => {
    return pickCoinsPackages({ serverKey: renderTab, apiCats: activeData.cats, packs: activeData.packs }).sort(sortByPriceAsc);
  }, [renderTab, activeData.cats, activeData.packs]);

  const tabDiscountPctByServer = useMemo(() => {
    const out = new Map();

    for (const t of serverTabs) {
      const sv = t.key;
      const data = dataByServer[sv] || { cats: [], packs: [] };
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

  const rootFxClass = hoverFx ? `fx-${hoverFx}` : "";

  const onRankBuySplitClick = (pkg, ev) => {
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

    // COINS (solo front por ahora)
    return;
  };

  return (
    <div
      className={`tienda-storefront tsf-brawl2 ${ready ? "is-ready" : ""} ${rootFxClass}`}
      ref={wrapRef}
    >
      <div className="tsf-bgFX" aria-hidden="true" />

      <CoinshopModal open={coinshopOpen} fromRect={coinshopFromRect} onClose={closeCoinshop} />

      {/* ✅ MODAL COMPARATIVA (Portal) */}
      {activeRank ? (
  <RangosComparativaPanel
    rankKey={activeRank}
    onClose={closeRankDetails}
    onPickRank={(rk) => setActiveRank(rk)}
  />
) : null}


      <header className="tsf-header tsf-header--fixed">
        <div className="tsf-signImg" aria-label="Tienda">
          <img src="/tienda/assets/cartel.png" alt="TIENDA" draggable="false" />
        </div>
      </header>

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
                    const coinsPrice = price != null ? coinsFromUsdDouble(price) : null;
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

                          {tebexImg ? (
                            <img className="tsf-icon" src={tebexImg} alt="" draggable="false" />
                          ) : (
                            <div className="tsf-iconFallback" />
                          )}

                          <div className="tsf-squareCta">
                            <button
                              type="button"
                              className={`tsf-ctaSplit ${cart ? "is-in" : ""}`}
                              onClick={(e) => {
                                if (!pkg) return;
                                onRankBuySplitClick(pkg, e);
                              }}
                              disabled={!pkg}
                              aria-label={`Comprar ${r.label} (EUR o Coins)`}
                              title="Izquierda: EUR · Derecha: Coins"
                            >
                              <span className="tsf-ctaSplitSide tsf-ctaSplitSide--usd" aria-label="Comprar con dinero">
                                <span className="tsf-ctaSplitValue">{price != null ? formatEur(price) : "—"}</span>
                              </span>

                              <span className="tsf-ctaSplitSide tsf-ctaSplitSide--coins" aria-label="Comprar con coins">
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

            {/* ✅ YA NO HAY slots colapsables: la comparativa vive en MODAL */}
            <section className="tsf-coins" aria-label="Coins">
              <div className="tsf-content">
                <div className="tsf-coinsHeader" aria-label="Selector de servidor coins">
                  <div className="tsf-tabsStack" aria-label="Oferta y selector">
                    <TiendaOfertaCountdown variant="tabs" />

                    <div className="tsf-tabsRow" aria-label="Fila tabs coinshop">
                      <nav className="tsf-tabs tsf-tabs--inHeader" aria-label="Selector de servidor">
                        {serverTabs.slice(0, 1).map((t) => {
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

                        <button
                          type="button"
                          className="tsf-openShopBtn tsf-openShopBtn--tab"
                          onClick={openCoinshopFromEvent}
                          aria-label="Abrir catálogo in-game"
                          title="Ver catálogo in-game"
                        >
                          <span className="tsf-openShopInner" aria-hidden="true">
                            <img src="/tienda/assets/openshop.png" alt="Abrir catálogo" draggable="false" />
                          </span>
                        </button>

                        {serverTabs.slice(1, 2).map((t) => {
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
                    </div>
                  </div>
                </div>

                <div className="tsf-coinsPanel" aria-label={`Lotes de coins ${serverTab}`}>
                  <div className="tsf-coinsPanelHeader" aria-label="Título lotes de coins">
                    <h2 className="tsf-coinsPanelTitle">
                      <span className="tsf-coinsPanelTitleInner">
                        {activeTabMeta?.icon ? (
                          <img className="tsf-coinsPanelTitleIcon" src={activeTabMeta.icon} alt="" draggable="false" />
                        ) : null}
                        <span className="tsf-coinsPanelTitleText">
                          LOTES DE COINS {String(activeTabMeta?.label || "").toUpperCase()}
                        </span>
                      </span>
                    </h2>
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
                          const price = disc.price;
                          const onSale = disc.onSale;
                          const original = disc.original;
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
                                    <span className="tsf-buyPrice">{formatEur(price)}</span>
                                    {onSale && original != null && (
                                      <span className="tsf-buyOld" aria-label="Precio anterior">
                                        {formatEur(original)}
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
