import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import RANGOS_BENEFICIOS from "./data/productDetails/rangosComparativa";
import RANGOS_PERKS_TOOLTIPS from "./data/productDetails/rangosPerksTooltips";
import "../../../styles/components/Tienda/rangos-comparativa-modal.scss";
import { getPackagePrice, getPackageImage, withCacheBust } from "../utils/tiendaHelpers";

const IconClose = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
  </svg>
);

const IconChevron = ({ size = 18, up = false }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
    style={{ transform: up ? "rotate(180deg)" : "rotate(0deg)" }}
  >
    <path
      d="M6 9l6 6 6-6"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IconCheck = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M20 6 9 17l-5-5"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IconMinus = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M6 12h12" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
  </svg>
);

function TooltipPortal({ tip }) {
  if (!tip?.open) return null;

  return createPortal(
    <div className="tsf-rcTip" role="tooltip" style={{ left: `${tip.left}px`, top: `${tip.top}px` }}>
      <div className="tsf-rcTip__bubble">
        <div className="tsf-rcTip__text">{tip.text}</div>
        <span className="tsf-rcTip__arrow" aria-hidden="true" />
      </div>
    </div>,
    document.body
  );
}

const RANKS = ["nova", "alpha", "inmortal"];

const RANK_META = {
  nova: { label: "NOVA", cls: "is-nova", deg: "/tienda/assets/degverde.svg" },
  alpha: { label: "ALPHA", cls: "is-alpha", deg: "/tienda/assets/degazul.svg" },
  inmortal: { label: "INMORTAL", cls: "is-inmortal", deg: "/tienda/assets/degrojo.svg", best: true },
};

const SERVER_META = {
  survival: { label: "Survival", icon: "/assets/reinos/survival-clasico.webp" },
};

const SERVER_ORDER = ["survival"];
const RANKSKIN_IMG = "/tienda/assets/rankskin.png";
const COINS_ICON = "/tienda/assets/coin.png";

const PERK_BASE = "/tienda/assets/perks";
const PERK_ICONS = {
  prefix: `${PERK_BASE}/prefijo.webp`,
  full_access: `${PERK_BASE}/acceso.webp`,
  prev_ranks: `${PERK_BASE}/rankup.webp`,
  coins: `${PERK_BASE}/coins.webp`,
  money: `${PERK_BASE}/dinero.webp`,
  generators: `${PERK_BASE}/gens.webp`,
  homes: `${PERK_BASE}/homes.webp`,
  kit: `${PERK_BASE}/kitexclusivo.webp`,
  "cmd:/back": `${PERK_BASE}/back.webp`,
  "cmd:/disposal": `${PERK_BASE}/disposal.webp`,
  "cmd:/enderchest": `${PERK_BASE}/enderchest.webp`,
  "cmd:/feed": `${PERK_BASE}/feed.webp`,
  "cmd:/fly": `${PERK_BASE}/fly.webp`,
  "cmd:/near": `${PERK_BASE}/near.webp`,
  "cmd:/nick": `${PERK_BASE}/nick.webp`,
  "cmd:/repair": `${PERK_BASE}/repair.webp`,
  "cmd:/workbench": `${PERK_BASE}/workbench.webp`,
  "cmd:/heal": `${PERK_BASE}/heal.webp`,
};

function getPerkIcon(rowKey) {
  return PERK_ICONS[rowKey] || null;
}

function normalizeStr(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function parseIntLoose(s) {
  const raw = String(s || "").replace(/[^\d]/g, "");
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function canonicalizePerk(raw) {
  if (!raw) return null;

  if (typeof raw === "object" && raw.type === "prefix") {
    return {
      key: "prefix",
      label: "Prefijo en chat y TAB",
      kind: raw.image ? "image" : "bool",
      value: raw.image || true,
    };
  }

  if (typeof raw === "object" && (raw.type === "image" || raw.src || raw.image)) {
    return {
      key: "kit",
      label: "Kit exclusivo",
      kind: "image",
      value: raw.src || raw.image || null,
    };
  }

  const txt = String(raw);
  const t = normalizeStr(txt);

  if (t.includes("servidor") && t.includes("lleno")) {
    return { key: "full_access", label: "Acceso cuando el servidor está lleno", kind: "bool", value: true };
  }

  if (t.includes("beneficios") && t.includes("rangos") && (t.includes("anteriore") || t.includes("anteriores"))) {
    return { key: "prev_ranks", label: "Beneficios de rangos anteriores", kind: "bool", value: true };
  }

  if (t.includes("prefijo") && (t.includes("chat") || t.includes("tab"))) {
    return { key: "prefix", label: "Prefijo en chat y TAB", kind: "bool", value: true };
  }

  if (t.includes("recibir") && t.includes("coins")) {
    const m = txt.match(/([\d.,]+)\s*coins/i);
    const v = parseIntLoose(m?.[1]);
    return { key: "coins", label: "Coins incluidos", kind: "number", value: v ?? true };
  }

  if (t.includes("recibir") && t.includes("dinero")) {
    const m = txt.match(/([\d.,]+)\s*(?:de\s*)?dinero/i);
    const v = parseIntLoose(m?.[1]);
    return { key: "money", label: "Dinero incluido", kind: "number", value: v ?? true };
  }

  if (t.includes("generador")) {
    const m = txt.match(/(\d+)\s*generador/i);
    const v = Number(m?.[1] || NaN);
    return { key: "generators", label: "Límite de generadores", kind: "number", value: Number.isFinite(v) ? v : true };
  }

  if (t.includes("/homes") || t.includes(" homes")) {
    if (t.includes("infinit") || t.includes("ilimitad")) {
      return { key: "homes", label: "Límite de /homes", kind: "number", value: "Infinitos" };
    }

    const m = txt.match(/(\d+)\s*\/homes/i) || txt.match(/(\d+)\s*homes/i);
    const v = Number(m?.[1] || NaN);
    return { key: "homes", label: "Límite de /homes", kind: "number", value: Number.isFinite(v) ? v : true };
  }

  if (t.includes("comando") && t.includes("/")) {
    const m = txt.match(/\/([a-z0-9_]+)/i);
    const cmd = m?.[1] ? `/${m[1].toLowerCase()}` : null;
    if (cmd) return { key: `cmd:${cmd}`, label: `Comando ${cmd}`, kind: "bool", value: true };
  }

  if (t.includes("kit")) {
    return { key: "kit", label: "Kit exclusivo", kind: "bool", value: true };
  }

  return { key: `txt:${t.replace(/\s+/g, " ").trim()}`, label: txt, kind: "bool", value: true };
}

function buildMatrixFromRangos(data) {
  const ranksObj = data || {};
  const serversSet = new Set();

  for (const rk of RANKS) {
    const r = ranksObj?.[rk];
    const sv = r?.servidores || r?.servers || {};
    Object.keys(sv || {}).forEach((k) => {
      if (k !== "lobby" && k !== "general") serversSet.add(k);
    });
  }

  const detected = Array.from(serversSet);
  const ordered = SERVER_ORDER.filter((k) => serversSet.has(k));
  const rest = detected.filter((k) => !SERVER_ORDER.includes(k));
  const servers = [...ordered, ...rest].filter(Boolean);

  const GLOBAL_KEYS = ["lobby", "general"];
  const matrix = new Map();

  for (const serverKey of servers) {
    const perkMap = new Map();

    for (const rk of RANKS) {
      const r = ranksObj?.[rk];
      const sv = r?.servidores || r?.servers || {};

      const localList = Array.isArray(sv?.[serverKey]) ? sv[serverKey] : [];
      const globalList = GLOBAL_KEYS.flatMap((gk) => (Array.isArray(sv?.[gk]) ? sv[gk] : []));
      const list = [...globalList, ...localList];

      for (const raw of list) {
        const perk = canonicalizePerk(raw);
        if (!perk) continue;

        const existing = perkMap.get(perk.key) || {
          key: perk.key,
          label: perk.label,
          kind: perk.kind,
          values: { nova: null, alpha: null, inmortal: null },
        };

        const kindPriority = { bool: 1, text: 2, number: 3, image: 4 };
        const curP = kindPriority[existing.kind] || 1;
        const nextP = kindPriority[perk.kind] || 1;
        if (nextP > curP) existing.kind = perk.kind;

        existing.values[rk] = perk.value ?? true;
        existing.label = existing.label || perk.label;

        perkMap.set(perk.key, existing);
      }
    }

    const ORDER = ["prefix", "full_access", "prev_ranks", "coins", "money", "generators", "homes", "kit"];
    const rows = Array.from(perkMap.values()).sort((a, b) => {
      const ia = ORDER.indexOf(a.key);
      const ib = ORDER.indexOf(b.key);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;

      const ac = a.key.startsWith("cmd:");
      const bc = b.key.startsWith("cmd:");
      if (ac && bc) return a.label.localeCompare(b.label);
      if (ac) return 1;
      if (bc) return -1;

      return a.label.localeCompare(b.label);
    });

    matrix.set(serverKey, rows);
  }

  return { servers, matrix };
}

function formatNumber(n) {
  if (n == null || n === true) return null;
  if (!Number.isFinite(Number(n))) return String(n);
  return new Intl.NumberFormat("es-ES").format(Number(n));
}

function formatPrice(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n);
}

function Cell({ kind, value, rankKey, rowKey, onZoom }) {
  const meta = RANK_META[rankKey];
  const cls = `tsf-rcCell ${meta?.cls || ""}`;
  const rankLabel = meta?.label || String(rankKey || "").toUpperCase();

  if (value == null || value === false) {
    return (
      <div className={cls} data-rank={rankLabel}>
        <span className="tsf-rcNo" aria-hidden="true">
          <IconMinus />
        </span>
      </div>
    );
  }

  if (kind === "image" && typeof value === "string") {
    const canZoom = Boolean(onZoom);
    return (
      <div className={`${cls} tsf-rcCell--image`} data-rank={rankLabel}>
        <button
          type="button"
          className={`tsf-rcImgBtn ${canZoom ? "is-zoomable" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            if (canZoom) onZoom(value, { rowKey, rankKey });
          }}
          aria-label="Ampliar imagen"
          title="Click para ampliar"
        >
          <span className="tsf-rcImgFrame">
            <img src={value} alt="" draggable="false" />
          </span>
        </button>
      </div>
    );
  }

  if (kind === "number") {
    const n = Number(value);
    const hasNumber = Number.isFinite(n);
    const txt = formatNumber(value) || "✓";

    if (rowKey === "coins" && hasNumber) {
      return (
        <div className={cls} data-rank={rankLabel}>
          <span className="tsf-rcValWrap">
            <span className="tsf-rcVal tsf-rcVal--coins">{txt}</span>
            <img className="tsf-rcInlineCoin" src={COINS_ICON} alt="" draggable="false" />
          </span>
        </div>
      );
    }

    if (rowKey === "money" && hasNumber) {
      return (
        <div className={cls} data-rank={rankLabel}>
          <span className="tsf-rcValWrap">
            <span className="tsf-rcVal tsf-rcVal--money">{txt}</span>
            <span className="tsf-rcInlineDollar tsf-rcInlineDollar--money" aria-hidden="true">
              $
            </span>
          </span>
        </div>
      );
    }

    return (
      <div className={cls} data-rank={rankLabel}>
        <span className="tsf-rcVal">{txt}</span>
      </div>
    );
  }

  if (value === true) {
    return (
      <div className={cls} data-rank={rankLabel}>
        <span className="tsf-rcYes" aria-hidden="true">
          <IconCheck />
        </span>
      </div>
    );
  }

  return (
    <div className={cls} data-rank={rankLabel}>
      <span className="tsf-rcVal">{String(value)}</span>
    </div>
  );
}

function RankCardTop({ rk, pkg, bust, isActive, onPickRank, onBuyEur }) {
  const rm = RANK_META[rk] || { label: String(rk || "").toUpperCase(), cls: "" };

  const price = pkg ? getPackagePrice(pkg) : null;
  const imgRaw = pkg ? getPackageImage(pkg) : null;
  const img = imgRaw ? withCacheBust(imgRaw, bust) : null;

  return (
    <article className={`tsf-rcRankCardTop ${rm.cls} ${isActive ? "is-active" : ""}`} data-rank={rk}>
      <button type="button" className="tsf-rcRankTopSquare" onClick={() => onPickRank?.(rk)} aria-label={`Ver ${rm.label}`}>
        <img className="tsf-rcRankTopDeg" src={rm.deg} alt="" draggable="false" />
        <div className="tsf-rcRankTopTitle">
          <span className="tsf-rcRankTopSmall">Rango</span>
          <span className="tsf-rcRankTopBig">{rm.label}</span>
        </div>
        {img ? <img className="tsf-rcRankTopIcon" src={img} alt="" draggable="false" /> : <span className="tsf-rcRankTopIconFallback" />}
      </button>

      <button
        type="button"
        className="tsf-rcRankTopCta"
        onClick={(e) => {
          e.stopPropagation();
          if (pkg) onBuyEur?.(pkg, e, rk);
        }}
        disabled={!pkg}
        aria-label={`Comprar ${rm.label}`}
      >
        <span className="tsf-rcRankTopCtaVal">{price != null ? formatPrice(price) : "—"}</span>
      </button>
    </article>
  );
}

export default function RangosComparativaPanel({
  onClose,
  rankKey = null,
  onPickRank,
  rankCards = [],
  bust = null,
  onBuyEur
}) {
  const { servers, matrix } = useMemo(() => buildMatrixFromRangos(RANGOS_BENEFICIOS), []);
  const [openSections, setOpenSections] = useState(() => new Set(servers || []));

  const scrollRef = useRef(null);
  const [isCompact, setIsCompact] = useState(false);

  const [zoomSrc, setZoomSrc] = useState(null);

  const [tip, setTip] = useState({ open: false, id: null, text: "", left: 0, top: 0 });
  const tipAnchorRef = useRef(null);
  const tipKeepIdRef = useRef(null);

  const computeTipPos = useCallback(() => {
    const el = tipAnchorRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const left = r.left + r.width / 2;
    const top = r.top - 10;
    return { left, top };
  }, []);

  const closeTip = useCallback(() => {
    tipAnchorRef.current = null;
    tipKeepIdRef.current = null;
    setTip((prev) => (prev.open ? { open: false, id: null, text: "", left: 0, top: 0 } : prev));
  }, []);

  const openTip = useCallback(
    (anchorEl, id, text) => {
      if (!anchorEl || !text) return;
      tipAnchorRef.current = anchorEl;
      tipKeepIdRef.current = id;

      const pos = computeTipPos();
      if (!pos) return;

      setTip({ open: true, id, text, left: pos.left, top: pos.top });
    },
    [computeTipPos]
  );

  const openZoom = useCallback(
    (src) => {
      if (!src) return;
      closeTip();
      setZoomSrc(src);
    },
    [closeTip]
  );

  const closeZoom = useCallback(() => setZoomSrc(null), []);

  useEffect(() => {
    if (!tip.open) return;

    const update = () => {
      const pos = computeTipPos();
      if (!pos) return;
      setTip((prev) => (prev.open ? { ...prev, left: pos.left, top: pos.top } : prev));
    };

    const onResize = () => update();
    window.addEventListener("resize", onResize);

    const sc = scrollRef.current;
    const onInnerScroll = () => update();
    sc?.addEventListener("scroll", onInnerScroll, { passive: true });

    const onPointerDown = (e) => {
      const anchor = tipAnchorRef.current;
      const target = e.target;
      if (!anchor || !(target instanceof Node)) return closeTip();
      if (anchor.contains(target)) return;
      closeTip();
    };
    window.addEventListener("pointerdown", onPointerDown, true);

    const onKey = (e) => {
      if (e.key === "Escape") closeTip();
    };
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("resize", onResize);
      sc?.removeEventListener("scroll", onInnerScroll);
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [tip.open, computeTipPos, closeTip]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const mq = window.matchMedia("(max-width: 860px)");
    let raf = 0;

    const compute = () => {
      const y = Math.max(0, el.scrollTop || 0);
      const enter = mq.matches ? 22 : 90;
      const exit = 2;

      setIsCompact((prev) => {
        if (!prev && y > enter) return true;
        if (prev && y <= exit) return false;
        return prev;
      });
    };

    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(compute);
    };

    el.addEventListener("scroll", onScroll, { passive: true });

    const onMq = () => compute();
    if (mq.addEventListener) mq.addEventListener("change", onMq);
    else mq.addListener?.(onMq);

    compute();

    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
      if (mq.removeEventListener) mq.removeEventListener("change", onMq);
      else mq.removeListener?.(onMq);
    };
  }, []);

  const rankPkgByKey = useMemo(() => {
    const out = { nova: null, alpha: null, inmortal: null };
    (rankCards || []).forEach((r) => {
      if (!r?.key) return;
      out[r.key] = r.pkg || null;
    });
    return out;
  }, [rankCards]);

  useEffect(() => {
    setOpenSections(new Set(servers || []));
  }, [servers]);

  const toggleSection = useCallback((sv) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(sv)) next.delete(sv);
      else next.add(sv);
      return next;
    });
  }, []);

  const handleClose = useCallback(() => {
    closeTip();
    setZoomSrc(null);
    onClose?.();
  }, [closeTip, onClose]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        if (tip.open) closeTip();
        else if (zoomSrc) closeZoom();
        else handleClose();
      }
    };
    window.addEventListener("keydown", onKey);

    const prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = prevOverflow || "";
    };
  }, [handleClose, zoomSrc, closeZoom, tip.open, closeTip]);

  const modal = (
    <div className="tsf-rcModal" role="dialog" aria-modal="true" aria-label="Comparativa de rangos">
      <button type="button" className="tsf-rcBackdrop" onClick={handleClose} aria-label="Cerrar comparativa" />

      <div className="tsf-rcSheet" role="document" onClick={(e) => e.stopPropagation()}>
        <header className={`tsf-rcHero ${isCompact ? "is-compact" : ""}`} aria-label="Rangos">
          <button type="button" className="tsf-rcHeroClose" onClick={handleClose} aria-label="Cerrar" title="Cerrar">
            <IconClose />
          </button>

          <div className="tsf-rcHeroGrid" aria-label="Rangos disponibles">
            <div className="tsf-rcHeroSpacer" aria-hidden="true" />
            {RANKS.map((rk) => (
              <RankCardTop
                key={rk}
                rk={rk}
                pkg={rankPkgByKey?.[rk]}
                bust={bust}
                isActive={rankKey === rk}
                onPickRank={onPickRank}
                onBuyEur={onBuyEur}
              />
            ))}
          </div>
        </header>

        <div className="tsf-rcScroll" ref={scrollRef}>
          <div className="tsf-rcPanel">
            <div className="tsf-rcSections" role="group" aria-label="Comparativa por servidor">
              {servers.map((sv) => {
                const meta = SERVER_META[sv] || { label: sv, icon: null };
                const rows = matrix.get(sv) || [];
                const isOpen = openSections.has(sv);

                return (
                  <section className={`tsf-rcSection ${isOpen ? "is-open" : "is-collapsed"}`} key={sv} data-server={sv}>
                    {sv === "oneblock" ? (
                      <span className="tsf-rcMascot" aria-hidden="true">
                        <img src={RANKSKIN_IMG} alt="" draggable="false" />
                      </span>
                    ) : null}

                    <button
                      type="button"
                      className="tsf-rcServerHead"
                      onClick={() => toggleSection(sv)}
                      aria-expanded={isOpen}
                      aria-controls={`rc-body-${sv}`}
                    >
                      <span className="tsf-rcServerHeadCenter">
                        {meta.icon ? (
                          <span className="tsf-rcServerIcon" aria-hidden="true">
                            <img src={meta.icon} alt="" draggable="false" />
                          </span>
                        ) : null}
                        <span className="tsf-rcServerLabel">{meta.label}</span>
                      </span>

                      <span className="tsf-rcServerChevron" aria-hidden="true">
                        <IconChevron up={isOpen} />
                      </span>
                    </button>

                    <div className="tsf-rcSectionBody" id={`rc-body-${sv}`}>
                      <div className="tsf-rcTable" role="table" aria-label={`Tabla ${meta.label}`}>
                        <div className="tsf-rcBody" role="rowgroup">
                          {rows.length ? (
                            rows.map((row) => {
                              const perkIcon = getPerkIcon(row.key);
                              const tipText = RANGOS_PERKS_TOOLTIPS?.[row.key] || "";
                              const tipId = `${sv}::${row.key}`;

                              return (
                                <div className="tsf-rcRow" role="row" key={row.key}>
                                  <div className="tsf-rcPerkCell" role="cell">
                                    <div className="tsf-rcPerkWrap">
                                      {perkIcon ? (
                                        <span className="tsf-rcPerkIcon" aria-hidden="true">
                                          <img src={perkIcon} alt="" draggable="false" />
                                        </span>
                                      ) : null}

                                      <div className="tsf-rcPerk">
                                        {row.label}
                                        {tipText ? (
                                          <button
                                            type="button"
                                            className={`tsf-rcPerkHelp ${tip.open && tip.id === tipId ? "is-open" : ""}`}
                                            aria-label={`Qué significa: ${row.label}`}
                                            onMouseEnter={(e) => openTip(e.currentTarget, tipId, tipText)}
                                            onMouseLeave={() => {
                                              if (tipKeepIdRef.current !== tipId) closeTip();
                                            }}
                                            onFocus={(e) => openTip(e.currentTarget, tipId, tipText)}
                                            onBlur={() => {
                                              if (tipKeepIdRef.current !== tipId) closeTip();
                                            }}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (tip.open && tip.id === tipId) closeTip();
                                              else {
                                                tipKeepIdRef.current = tipId;
                                                openTip(e.currentTarget, tipId, tipText);
                                              }
                                            }}
                                          >
                                            <span className="tsf-rcPerkHelpMark" aria-hidden="true">
                                              ?
                                            </span>
                                          </button>
                                        ) : null}
                                      </div>
                                    </div>
                                  </div>

                                  {RANKS.map((rk) => (
                                    <Cell
                                      key={`${row.key}-${rk}`}
                                      rowKey={row.key}
                                      kind={row.kind}
                                      value={row.values?.[rk]}
                                      rankKey={rk}
                                      onZoom={openZoom}
                                    />
                                  ))}
                                </div>
                              );
                            })
                          ) : (
                            <div className="tsf-rcEmpty">No hay datos para este servidor.</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        </div>

        <TooltipPortal tip={tip} />

        {zoomSrc ? (
          <div className="tsf-rcImgModal" role="dialog" aria-modal="true" aria-label="Vista ampliada">
            <button type="button" className="tsf-rcImgBackdrop" onClick={closeZoom} aria-label="Cerrar vista ampliada" />
            <div className="tsf-rcImgSheet" role="document" onClick={(e) => e.stopPropagation()}>
              <button type="button" className="tsf-rcImgClose" onClick={closeZoom} aria-label="Cerrar" title="Cerrar">
                <IconClose />
              </button>
              <div className="tsf-rcImgWrap">
                <img className="tsf-rcImgZoom" src={zoomSrc} alt="" draggable="false" />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}