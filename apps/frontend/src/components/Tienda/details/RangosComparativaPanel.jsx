// src/components/Tienda/details/RangosComparativaPanel.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import RANGOS_BENEFICIOS from "./data/productDetails/rangosComparativa";

// IMPORTA el SCSS del modal (recomendado)
// Ajusta ruta según tu proyecto:
import "../../../styles/components/Tienda/rangos-comparativa-modal.scss";

// =========================================================
// Iconos (pro)
// =========================================================
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
    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconCheck = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconMinus = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M6 12h12" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
  </svg>
);

// =========================================================
// Meta
// =========================================================
const RANKS = ["nova", "alpha", "inmortal"];

const RANK_META = {
  nova: { label: "NOVA", cls: "is-nova", img: "/assets/rangos/nova.webp" },
  alpha: { label: "ALPHA", cls: "is-alpha", img: "/assets/rangos/alpha.webp" },
  inmortal: { label: "INMORTAL", cls: "is-inmortal", img: "/assets/rangos/inmortal.webp", best: true },
};

const SERVER_META = {
  oneblock: { label: "Oneblock", icon: "/assets/reinos/oneblock.webp" },
  gens: { label: "Gens", icon: "/assets/reinos/gens.webp" },
};

const SERVER_ORDER = ["oneblock", "gens"];

// =========================================================
// Helpers parse/normaliza
// =========================================================
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

  if (typeof raw === "object" && (raw.type === "image" || raw.src)) {
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

  return {
    key: `txt:${t.replace(/\s+/g, " ").trim()}`,
    label: txt,
    kind: "bool",
    value: true,
  };
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

  // “Perk para todos”: fusionamos lobby/general dentro de cada server
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

    const ORDER = ["prefix", "full_access", "coins", "money", "generators", "homes", "kit"];

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

function Cell({ kind, value, isFocus, rankKey }) {
  const meta = RANK_META[rankKey];
  const cls = `tsf-rcCell tsf-rcCell--rank ${meta?.cls || ""} ${isFocus ? "is-focus" : ""}`;

  if (value == null || value === false) {
    return (
      <div className={cls} data-rank={rankKey}>
        <span className="tsf-rcNo" aria-hidden="true">
          <IconMinus />
        </span>
      </div>
    );
  }

  if (kind === "image" && typeof value === "string") {
    return (
      <div className={`${cls} tsf-rcCell--image`} data-rank={rankKey}>
        <span className="tsf-rcImgFrame">
          <img src={value} alt="" draggable="false" />
        </span>
      </div>
    );
  }

  if (kind === "number") {
    const txt = formatNumber(value) || "✓";
    return (
      <div className={cls} data-rank={rankKey}>
        <span className="tsf-rcVal">{txt}</span>
      </div>
    );
  }

  if (value === true) {
    return (
      <div className={cls} data-rank={rankKey}>
        <span className="tsf-rcYes" aria-hidden="true">
          <IconCheck />
        </span>
      </div>
    );
  }

  return (
    <div className={cls} data-rank={rankKey}>
      <span className="tsf-rcVal">{String(value)}</span>
    </div>
  );
}

// =========================================================
// Panel (modal + capas por servidor colapsables)
// =========================================================
export default function RangosComparativaPanel({ rankKey, onClose, onPickRank }) {
  const [focus, setFocus] = useState(rankKey || "nova");
  const { servers, matrix } = useMemo(() => buildMatrixFromRangos(RANGOS_BENEFICIOS), []);

  const [openSections, setOpenSections] = useState(() => new Set(servers || []));

  useEffect(() => {
    if (rankKey) setFocus(rankKey);
  }, [rankKey]);

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

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);

    const prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = prevOverflow || "";
    };
  }, [onClose]);

  const modal = (
    <div className="tsf-rcModal" role="dialog" aria-modal="true" aria-label="Comparativa de rangos">
      <button type="button" className="tsf-rcModalBackdrop" onClick={onClose} aria-label="Cerrar comparativa" />

      <div className="tsf-rcModalSheet" role="document" onClick={(e) => e.stopPropagation()}>
        <div className="tsf-rcPanel" data-focus={focus}>
          {/* Barra superior: RANGOS + cerrar */}
          <div className="tsf-rcBar">


            <button type="button" className="tsf-rcClose" onClick={onClose} aria-label="Cerrar" title="Cerrar">
              <IconClose />
            </button>
          </div>

          {/* Scroll interno */}
          <div className="tsf-rcScroll" role="group" aria-label="Comparativa por servidor">
            {servers.map((sv) => {
              const meta = SERVER_META[sv] || { label: sv, icon: null };
              const rows = matrix.get(sv) || [];
              const isOpen = openSections.has(sv);

              return (
                <section
                  className={`tsf-rcSection ${isOpen ? "is-open" : "is-collapsed"}`}
                  key={sv}
                  data-server={sv}
                  aria-label={meta.label}
                >
                  <button
                    type="button"
                    className="tsf-rcSectionHead"
                    onClick={() => toggleSection(sv)}
                    aria-expanded={isOpen}
                    aria-controls={`rc-body-${sv}`}
                  >
                    <span className="tsf-rcSectionLeft">
                      <span className="tsf-rcServerIcon" aria-hidden="true">
                        {meta.icon ? <img src={meta.icon} alt="" draggable="false" /> : null}
                      </span>
                      <span className="tsf-rcServerLabel">{meta.label}</span>
                    </span>

                    <span className="tsf-rcSectionRight" aria-hidden="true">
                      <span className="tsf-rcChevron">
                        <IconChevron up={isOpen} />
                      </span>
                    </span>
                  </button>

                  <div className="tsf-rcSectionBody" id={`rc-body-${sv}`}>
                    <div className="tsf-rcTable" role="table" aria-label={`Tabla ${meta.label}`}>
                      <div className="tsf-rcHeaderRow" role="row">
                        <div className="tsf-rcHCell tsf-rcHCell--perk" role="columnheader">
                          Beneficio
                        </div>

                        <div className="tsf-rcRankHeads" role="row">
                          {RANKS.map((rk) => {
                            const rm = RANK_META[rk];
                            return (
                              <div
                                key={rk}
                                className={`tsf-rcHCell tsf-rcHCell--rank ${rm.cls} ${focus === rk ? "is-focus" : ""}`}
                                role="columnheader"
                              >
                                {rm.img ? <img className="tsf-rcRankIcon" src={rm.img} alt={rm.label} draggable="false" /> : rm.label}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="tsf-rcBody" role="rowgroup">
                        {rows.length ? (
                          rows.map((row) => (
                            <div className="tsf-rcRow" role="row" key={row.key}>
                              <div className="tsf-rcCell tsf-rcCell--perk" role="cell">
                                <div className="tsf-rcPerk">{row.label}</div>
                              </div>

                              <div className="tsf-rcRankCells" role="cell">
                                {RANKS.map((rk) => (
                                  <Cell
                                    key={`${row.key}-${rk}`}
                                    kind={row.kind}
                                    value={row.values?.[rk]}
                                    isFocus={focus === rk}
                                    rankKey={rk}
                                  />
                                ))}
                              </div>
                            </div>
                          ))
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
    </div>
  );

  return createPortal(modal, document.body);
}
