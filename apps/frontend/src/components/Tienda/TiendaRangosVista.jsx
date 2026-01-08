// src/components/Tienda/TiendaRangosVista.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import "../../styles/components/Tienda/tienda-rangos-flancraft.scss";
import { RANGOS_COMPARATIVA, RANGOS_MODAL } from "./data/productDetails/rangosComparativa";

function toMoney(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return n;
}

function pickPkgByRank(productos = [], rankKey) {
  const list = Array.isArray(productos) ? productos : [];
  const rx =
    rankKey === "nova"
      ? /\bnova\b/i
      : rankKey === "alpha"
      ? /\balpha\b/i
      : /\binmortal\b/i;

  const matches = list.filter((p) => rx.test(String(p?.name || p?.nombre || "")));
  if (!matches.length) return null;

  const prefer = matches.find((p) =>
    /30\s*(d|dias|días)|mensual|30-day/i.test(String(p?.name || p?.nombre || ""))
  );
  return prefer || matches[0];
}

function isInCart(carrito = [], pkg) {
  const id = pkg?.id ?? pkg?.package_id ?? null;
  if (id == null) return false;
  return (carrito || []).some((it) => String(it?.id ?? it?.package_id) === String(id));
}

function safeText(v) {
  if (v == null) return "";
  if (typeof v === "string" || typeof v === "number") return String(v);
  return "";
}

function findScrollParent(el) {
  let node = el?.parentElement;
  while (node) {
    const st = getComputedStyle(node);
    const oy = st.overflowY;
    const canScroll = (oy === "auto" || oy === "scroll") && node.scrollHeight > node.clientHeight + 2;
    if (canScroll) return node;
    node = node.parentElement;
  }
  return null;
}

/* ===== Helpers para COMANDOS ===== */
function splitCmdText(str = "") {
  const s = String(str || "");
  const sep = s.includes("—") ? "—" : s.includes("→") ? "→" : null;
  if (!sep) return { head: s.trim(), desc: "" };
  const [a, ...rest] = s.split(sep);
  return { head: (a || "").trim(), desc: rest.join(sep).trim() };
}

function normCmdKey(str = "") {
  const { head } = splitCmdText(str);
  return head.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Construye filas de comandos con HERENCIA:
 * - Alpha incluye todo lo de Nova
 * - Inmortal incluye todo lo de Alpha + Nova
 */
function buildCommandsRows(serverKey) {
  const block = RANGOS_MODAL?.cmds?.[serverKey] || {};
  const novaList = Array.isArray(block?.nova) ? block.nova : [];
  const alphaList = Array.isArray(block?.alpha) ? block.alpha : [];
  const inmList = Array.isArray(block?.inmortal) ? block.inmortal : [];

  const novaSet = new Set(novaList.map(normCmdKey));
  const alphaOnlySet = new Set(alphaList.map(normCmdKey));
  const inmOnlySet = new Set(inmList.map(normCmdKey));

  const alphaSet = new Set([...novaSet, ...alphaOnlySet]);
  const inmSet = new Set([...alphaSet, ...inmOnlySet]);

  const ordered = [];
  const seen = new Set();

  const pushUnique = (arr) => {
    arr.forEach((x) => {
      const k = normCmdKey(x);
      if (!k || seen.has(k)) return;
      seen.add(k);
      ordered.push(x);
    });
  };

  pushUnique(novaList);
  pushUnique(alphaList);
  pushUnique(inmList);

  return ordered.map((line) => {
    const { head, desc } = splitCmdText(line);
    const key = normCmdKey(line);

    return {
      key: `cmd_${serverKey}_${key}`,
      perk: head || line,
      hint: desc || "",
      values: {
        nova: novaSet.has(key),
        alpha: alphaSet.has(key),
        inmortal: inmSet.has(key),
      },
      __isCmd: true,
    };
  });
}

/* Iconos mini (svg) */
const IconStar = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 2.6l2.9 6.2 6.7.7-5 4.4 1.5 6.6L12 17.7 5.9 20.5l1.5-6.6-5-4.4 6.7-.7L12 2.6z" />
  </svg>
);

const IconChevron = ({ open }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" data-open={open ? "1" : "0"}>
    <path d="M7.4 9.1 12 13.7l4.6-4.6 1.4 1.4L12 16.5 6 10.5l1.4-1.4z" />
  </svg>
);

const Check = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M9.2 16.6 4.9 12.3l1.7-1.7 2.6 2.6 7.2-7.2 1.7 1.7-8.9 8.9z" />
  </svg>
);

const Cross = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M18.3 7.1 16.9 5.7 12 10.6 7.1 5.7 5.7 7.1 10.6 12l-4.9 4.9 1.4 1.4 4.9-4.9 4.9 4.9 1.4-1.4L13.4 12l4.9-4.9z" />
  </svg>
);

function Mark({ ok }) {
  return ok ? (
    <span className="fcr-mark fcr-mark--ok" aria-label="Si">
      <Check />
    </span>
  ) : (
    <span className="fcr-mark fcr-mark--no" aria-label="No">
      <Cross />
    </span>
  );
}

/* Rutas de rangos */
const RANK_ICONS = {
  nova: "/assets/rangos/nova.webp",
  alpha: "/assets/rangos/alpha.webp",
  inmortal: "/assets/rangos/inmortal.webp",
};

/**
 * /public/assets/reinos/...
 */
const SERVER_META = {
  lobby: { label: "Lobby", icon: "/assets/reinos/global.webp" },
  survival: { label: "Survival", icon: "/assets/reinos/survival-clasico.webp" },
  oneblock: { label: "OneBlock", icon: "/assets/reinos/oneblock.webp" },
  chunklock: { label: "ChunkLock", icon: "/assets/reinos/chunklock.webp" },
  hardcore: { label: "Hardcore", icon: "/assets/reinos/survival-hardcore.webp" },
  anarq: { label: "Anárquico", icon: "/assets/reinos/survival-anarquico.webp" },
};

function getServerFromParams(params) {
  const raw =
    params?.servidor ||
    params?.server ||
    params?.categoria ||
    params?.cat ||
    params?.mode ||
    "";
  return String(raw || "").toLowerCase();
}

/* Action button solo para KIT */
function ActionButton({ action, onOpen }) {
  const label = action?.label || "Ver";
  return (
    <button
      type="button"
      className="fcr-action"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onOpen(action);
      }}
    >
      {label}
    </button>
  );
}

export default function TiendaRangosVista({ productos = [], carrito = [], toggleProducto }) {
  const params = useParams();

  // ✅ Colapsa SOLO beneficios globales (no comandos)
  const [openGlobals, setOpenGlobals] = useState(true);

  const [hoverRank, setHoverRank] = useState(null);
  const [collapse, setCollapse] = useState(0);

  // modal SOLO para kits
  const [modal, setModal] = useState(null);
  const rootRef = useRef(null);

  const [mode] = useState("30d");

  // ✅ Secciones colapsables (comandos)
  const [openSections, setOpenSections] = useState(() => ({}));
  const isSectionOpen = useCallback(
    (id) => {
      if (!id) return true;
      const v = openSections[id];
      return typeof v === "boolean" ? v : true;
    },
    [openSections]
  );

  const toggleSection = useCallback((id) => {
    if (!id) return;
    setOpenSections((prev) => {
      const cur = typeof prev[id] === "boolean" ? prev[id] : true;
      return { ...prev, [id]: !cur };
    });
  }, []);

  const serversAvailable = useMemo(() => {
    const block = RANGOS_COMPARATIVA?.[mode];
    if (!block || typeof block !== "object") return [];
    return Object.keys(block).filter((k) => Array.isArray(block[k]));
  }, [mode]);

  const [serverKey, setServerKey] = useState(() => {
    const fromUrl = getServerFromParams(params);
    return fromUrl || "lobby";
  });

  useEffect(() => {
    const fromUrl = getServerFromParams(params);
    if (fromUrl) setServerKey(fromUrl);
  }, [params]);

  useEffect(() => {
    if (!serversAvailable.length) return;
    if (!serversAvailable.includes(serverKey)) setServerKey(serversAvailable[0]);
  }, [serversAvailable, serverKey]);

  const ranks = useMemo(() => {
    const nova = pickPkgByRank(productos, "nova");
    const alpha = pickPkgByRank(productos, "alpha");
    const inmortal = pickPkgByRank(productos, "inmortal");

    const mk = (key, label, ribbon) => {
      const pkg = key === "nova" ? nova : key === "alpha" ? alpha : inmortal;
      const price = toMoney(pkg?.precio ?? pkg?.price);
      const priceLabel = price != null ? `${price.toFixed(2)} €` : "X.XX €";
      return { key, label, ribbon, pkg, priceLabel };
    };

    return [
      mk("nova", "NOVA", null),
      mk("alpha", "ALPHA", "POPULAR"),
      mk("inmortal", "INMORTAL", "MEJOR"),
    ];
  }, [productos]);

  /* Construimos la tabla y expandimos "cmds" en filas reales */
  const perks = useMemo(() => {
    const rows = RANGOS_COMPARATIVA?.[mode]?.[serverKey];
    const list = Array.isArray(rows) ? rows : [];

    const out = [];

    list.forEach((r) => {
      const vN = r?.values?.nova;
      const vA = r?.values?.alpha;
      const vI = r?.values?.inmortal;

      const isCmdRow =
        (vN && typeof vN === "object" && vN.kind === "cmds") ||
        (vA && typeof vA === "object" && vA.kind === "cmds") ||
        (vI && typeof vI === "object" && vI.kind === "cmds") ||
        r?.key === "cmds";

      if (isCmdRow) {
        const srv = (vN && vN.id) || (vA && vA.id) || (vI && vI.id) || serverKey;

        const sectionId = `cmds_${srv}`;

        out.push({
          key: `cmd_header_${srv}`,
          perk: "Comandos del rango",
          values: { nova: "", alpha: "", inmortal: "" },
          __isHeader: true,
          __isCmdHeader: true,
          __sectionId: sectionId,
        });

        const cmdRows = buildCommandsRows(srv);
        cmdRows.forEach((cr) =>
          out.push({
            ...cr,
            __inSection: true,
            __sectionId: sectionId,
          })
        );
        return;
      }

      out.push({
        key: r.key || r.label || String(Math.random()),
        perk: r.label ?? "-",
        hint: r.hint ?? "",
        values: {
          nova: vN,
          alpha: vA,
          inmortal: vI,
        },
        __isGlobal: true,
      });
    });

    return out;
  }, [mode, serverKey]);

  const onEnter = useCallback((k) => setHoverRank(k), []);
  const onLeave = useCallback(() => setHoverRank(null), []);

  // ✅ Animación “montaje” al cambiar server
  const [swapTick, setSwapTick] = useState(0);
  useEffect(() => {
    setSwapTick((n) => n + 1);
  }, [serverKey]);

  // sticky collapse
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const sp = findScrollParent(root) || window;

    const getRects = () => {
      const rootRect = root.getBoundingClientRect();
      const parentRect = sp === window ? { top: 0 } : sp.getBoundingClientRect();
      return { rootRect, parentRect };
    };

    const onScroll = () => {
      const { rootRect, parentRect } = getRects();
      const start = parentRect.top + 8;
      const dist = start - rootRect.top;
      const t = Math.max(0, Math.min(1, dist / 170));
      setCollapse(t);
    };

    onScroll();

    const target = sp === window ? window : sp;
    target.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      target.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  // ✅ Estado visual del panel reinos según colapso (evita cortes)
  const cState = collapse > 0.72 ? "collapsed" : collapse > 0.35 ? "mid" : "open";

  const closeModal = () => setModal(null);

  const openAction = (action) => {
    if (!action?.kind) return;
    if (action.kind !== "kit") return;
    setModal(action);
  };

  const isPrefixRow = (row) => {
    const k = String(row?.key || "").toLowerCase();
    const p = String(row?.perk || "").toLowerCase();
    return k.includes("prefijo") || p.includes("prefijo");
  };

  // ✅ Prefijo: NO fallback a [NOVA]
  const renderPrefix = (v) => {
    if (typeof v === "string" && v.trim()) return v.trim();
    if (v && typeof v === "object" && v.kind === "prefix" && String(v.text || "").trim()) {
      return String(v.text).trim();
    }
    return "";
  };

  const renderCell = (v, row, colKey) => {
    if (isPrefixRow(row)) {
      const txt = renderPrefix(v);
      if (!txt) return <span className="fcr-val">—</span>;
      return <span className={`fcr-prefixText is-${colKey}`}>{txt}</span>;
    }

    if (typeof v === "boolean") return <Mark ok={v} />;

    if (v && typeof v === "object" && v.kind === "kit") {
      return <ActionButton action={v} onOpen={openAction} />;
    }

    if (Array.isArray(v)) {
      const shown = v.slice(0, 2);
      const rest = v.length - shown.length;
      return (
        <span className="fcr-val">
          {shown.join(" · ")}
          {rest > 0 ? ` · +${rest}` : ""}
        </span>
      );
    }

    const t = safeText(v);
    return <span className="fcr-val">{t || "-"}</span>;
  };

  const modalContent = useMemo(() => {
    if (!modal) return null;

    if (modal.kind === "kit") {
      const kit = RANGOS_MODAL?.kits?.[modal.id];
      if (!kit) return { title: "Kit", body: ["No hay datos del kit."] };

      const body = [];
      if (kit.subtitle) body.push(kit.subtitle);
      if (kit.cooldown) body.push(`Cooldown: ${kit.cooldown}`);

      const armor = Array.isArray(kit.armor) ? kit.armor : [];
      const tools = Array.isArray(kit.tools) ? kit.tools : [];
      const resources = Array.isArray(kit.resources) ? kit.resources : [];

      body.push("");
      body.push("Armadura");
      armor.forEach((it) => body.push(`• ${it.name}`));

      body.push("");
      body.push("Herramientas");
      tools.forEach((it) => body.push(`• ${it.name}`));

      body.push("");
      body.push("Recursos");
      resources.forEach((it) => body.push(`• ${it}`));

      return { title: kit.title || "Kit", body };
    }

    return null;
  }, [modal]);

  const serverTitle = SERVER_META?.[serverKey]?.label || serverKey;
  const serverIcon = SERVER_META?.[serverKey]?.icon || "";

  return (
    <div
      ref={rootRef}
      className="fcr"
      data-hover={hoverRank || ""}
      data-cstate={cState}
      style={{ "--fc-collapse": String(collapse) }}
      onMouseLeave={onLeave}
    >
      <section className="fcr-wrap">
        <div className="fcr-zone">
          <div className="fcr-stickyShell">
            <div className="fcr-cards">
              {/* ✅ Panel izquierdo: selector de reinos (se adapta al colapso) */}
              <aside className="fcr-side" aria-label="Selector de reinos">
                <div className="fcr-sideBox">


                  {serversAvailable.length > 1 ? (
                    <div className="fcr-sideGrid" role="tablist" aria-label="Reinos">
                      {serversAvailable.map((k) => {
                        const meta = SERVER_META?.[k] || { label: k, icon: "" };
                        const active = serverKey === k;

                        return (
                          <button
                            key={k}
                            type="button"
                            role="tab"
                            className={`fcr-sideBtn ${active ? "is-active" : ""}`}
                            aria-selected={active}
                            aria-current={active ? "true" : undefined}
                            aria-label={meta.label}
                            title={meta.label}
                            onClick={() => setServerKey(k)}
                          >
                            <span className="fcr-sideBtnInner">
                              <span className="fcr-sideBtnIcon" aria-hidden="true">
                                {meta.icon ? <img src={meta.icon} alt="" draggable="false" /> : null}
                              </span>

                              <span className="fcr-sideBtnText">
                                <span className="fcr-sideBtnLabel">{meta.label}</span>
                              </span>

                              <span className="fcr-sideBtnDot" aria-hidden="true" />
                              <span className="fcr-srOnly">{meta.label}</span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="fcr-sideEmpty">—</div>
                  )}
                </div>
              </aside>

              {ranks.map((r) => {
                const inCart = r.pkg ? isInCart(carrito, r.pkg) : false;

                return (
                  <article
                    key={r.key}
                    className={`fcr-card is-${r.key}`}
                    onMouseEnter={() => onEnter(r.key)}
                  >
                    {r.ribbon && (
                      <div
                        className={`fcr-ribbon is-${r.ribbon.toLowerCase()} ${
                          r.ribbon === "MEJOR" ? "is-right" : ""
                        }`}
                        aria-hidden="true"
                      >
                        <span>{r.ribbon}</span>
                      </div>
                    )}

                    <div className="fcr-cardInner">
                      <div className="fcr-cardTop">
                        <div className="fcr-emblem" aria-hidden="true">
                          <img
                            className="fcr-emblemImg"
                            src={RANK_ICONS[r.key]}
                            alt=""
                            loading="lazy"
                            draggable="false"
                          />
                        </div>
                        <div className="fcr-rankName">{r.label}</div>
                        <div className="fcr-rankDot" aria-hidden="true" />
                      </div>
                    </div>

                    <div className="fcr-mini" aria-hidden="true">
                      <div className="fcr-miniPlate">{r.label}</div>
                    </div>

                    <button
                      type="button"
                      className={`fcr-buy is-${r.key}`}
                      data-state={inCart ? "in" : "out"}
                      disabled={!r.pkg}
                      onClick={() => r.pkg && toggleProducto(r.pkg)}
                    >
                      {inCart ? "QUITAR DEL CARRITO" : `COMPRAR POR ${r.priceLabel}`}
                    </button>
                  </article>
                );
              })}
            </div>
          </div>

          {/* ===== Beneficios globales: colapsa SOLO perks (NO comandos) ===== */}
          <div className="fcr-perksRow">
            <div className="fcr-perksSpacer" aria-hidden="true" />
            <button
              type="button"
              className="fcr-perksBar"
              onClick={() => setOpenGlobals((v) => !v)}
              aria-expanded={openGlobals}
            >
              <span className="fcr-perksCenter">
                <span className="fcr-perksRealm" aria-hidden="true">
                  {serverIcon ? <img src={serverIcon} alt="" draggable="false" /> : null}
                </span>
                <span className="fcr-perksStar" aria-hidden="true">
                  <IconStar />
                </span>
                <span className="fcr-perksTitle">Beneficios Globales · {serverTitle}</span>
              </span>
              <span className="fcr-perksChevron" aria-hidden="true">
                <IconChevron open={openGlobals} />
              </span>
            </button>
          </div>

          {/* ===== Tabla ===== */}
          <div className="fcr-table" role="table">
            {perks.length === 0 ? (
              <div className="fcr-empty">
                No hay perks configuradas para <b>{serverTitle}</b>.
              </div>
            ) : (
              <div
                key={`${serverKey}_${swapTick}`}
                className="fcr-swap"
                data-open={openGlobals ? "1" : "0"}
              >
                {(() => {
                  let dataCount = 0;

                  return perks.map((row, idx) => {
                    const sectionId = row.__sectionId || null;
                    const hiddenBySection = row.__inSection && sectionId && !isSectionOpen(sectionId);

                    if (hiddenBySection) return null;

                    // ✅ Si globales están cerrados, ocultamos SOLO filas globales
                    const isCmdRow = !!row.__isCmd;
                    const isCmdHeader = !!row.__isCmdHeader;
                    const isGlobalRow = !!row.__isGlobal;

                    if (!openGlobals && isGlobalRow) return null;

                    // === Header de sección colapsable (comandos) ===
                    if (row.__isHeader) {
                      const canToggle = !!row.__sectionId;
                      const sectionOpen = canToggle ? isSectionOpen(row.__sectionId) : true;

                      return (
                        <div
                          key={`${row.key}-${idx}`}
                          className="fcr-sectionRow"
                          role="row"
                          aria-label={row.perk}
                        >
                          <div className="fcr-sectionSpacer" aria-hidden="true" />

                          <button
                            type="button"
                            className={`fcr-sectionBar ${canToggle ? "is-toggle" : ""}`}
                            onClick={() => canToggle && toggleSection(row.__sectionId)}
                            aria-expanded={sectionOpen}
                          >
                            <span className="fcr-sectionCenter">
                              <span className="fcr-sectionStar" aria-hidden="true">
                                <IconStar />
                              </span>
                              <span className="fcr-sectionTexts">
                                <span className="fcr-sectionTitle">{row.perk}</span>
                                {row.hint ? <span className="fcr-sectionHint">{row.hint}</span> : null}
                              </span>
                            </span>

                            {canToggle ? (
                              <span className="fcr-sectionChevron" aria-hidden="true">
                                <IconChevron open={sectionOpen} />
                              </span>
                            ) : null}
                          </button>
                        </div>
                      );
                    }

                    const isFirstDataRow = dataCount === 0;
                    dataCount += 1;

                    return (
                      <div
                        key={`${row.key}-${idx}`}
                        className={`fcr-row ${idx % 2 ? "is-alt" : ""} ${
                          isCmdRow ? "is-cmdRow" : ""
                        } ${isFirstDataRow ? "is-firstData" : ""} ${
                          !openGlobals && (isCmdRow || isCmdHeader) ? "is-afterCollapsedGlobals" : ""
                        }`}
                        role="row"
                      >
                        <div className="fcr-perkCell" role="cell">
                          <div className="fcr-perkPill" data-kind={isCmdRow ? "cmd" : "perk"}>
                            <div className="fcr-perkTitle">{row.perk}</div>
                            {row.hint ? <div className="fcr-perkHint">{row.hint}</div> : null}
                          </div>
                        </div>

                        <div
                          className={`fcr-cell is-nova ${isFirstDataRow ? "has-colLabel" : ""}`}
                          role="cell"
                          onMouseEnter={() => onEnter("nova")}
                        >
                          {isFirstDataRow ? <div className="fcr-colLabel is-nova">NOVA</div> : null}
                          {renderCell(row.values.nova, row, "nova")}
                        </div>

                        <div
                          className={`fcr-cell is-alpha ${isFirstDataRow ? "has-colLabel" : ""}`}
                          role="cell"
                          onMouseEnter={() => onEnter("alpha")}
                        >
                          {isFirstDataRow ? <div className="fcr-colLabel is-alpha">ALPHA</div> : null}
                          {renderCell(row.values.alpha, row, "alpha")}
                        </div>

                        <div
                          className={`fcr-cell is-inmortal ${isFirstDataRow ? "has-colLabel" : ""}`}
                          role="cell"
                          onMouseEnter={() => onEnter("inmortal")}
                        >
                          {isFirstDataRow ? (
                            <div className="fcr-colLabel is-inmortal">INMORTAL</div>
                          ) : null}
                          {renderCell(row.values.inmortal, row, "inmortal")}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>
        </div>
      </section>

      {modal && (
        <div className="fcr-modalOverlay" onClick={closeModal} role="dialog" aria-modal="true">
          <div className="fcr-modal" onClick={(e) => e.stopPropagation()}>
            <div className="fcr-modalTop">
              <div className="fcr-modalTitle">{modalContent?.title || "Kit"}</div>
              <button type="button" className="fcr-modalClose" onClick={closeModal}>
                Cerrar
              </button>
            </div>

            <div className="fcr-modalBody">
              {(modalContent?.body || []).map((line, i) =>
                line === "" ? (
                  <div key={i} className="fcr-modalSep" />
                ) : (
                  <div key={i} className="fcr-modalLine">
                    {line}
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
