import React, { useEffect, useLayoutEffect, useRef, useState, useMemo } from "react";
import ItemIcon from "./ItemIcon";
import "../../../styles/components/Tienda/coinshop-modal.scss";

// --- UTILIDADES ---
function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function safeRect(r) {
  if (!r) return null;
  const left = Number(r.left);
  const top = Number(r.top);
  const width = Number(r.width);
  const height = Number(r.height);
  if (![left, top, width, height].every(Number.isFinite)) return null;
  if (width <= 0 || height <= 0) return null;
  return { left, top, width, height };
}

const MC_COLORS = {
  "0": "#000000", "1": "#0000AA", "2": "#00AA00", "3": "#00AAAA",
  "4": "#AA0000", "5": "#AA00AA", "6": "#FFAA00", "7": "#BDBDBD",
  "8": "#6A6A6A", "9": "#5555FF", a: "#55FF55", b: "#55FFFF",
  c: "#FF5555", d: "#FF55FF", e: "#FFFF55", f: "#FFFFFF",
};

function normalizeMc(text) {
  return String(text ?? "").replace(/§/g, "&");
}

function isHexAt2(str, i) {
  return str[i] === "&" && str[i + 1] === "#" && /^[0-9a-fA-F]{6}$/.test(str.slice(i + 2, i + 8));
}

function renderMcText(input) {
  if (!input) return null;
  const text = normalizeMc(input);
  let style = { color: "#FFFFFF", bold: false, italic: false, underline: false, strikethrough: false };
  const out = [];
  let buf = "";

  const pushBuf = (key) => {
    if (!buf) return;
    out.push(
      <span
        key={key}
        style={{
          color: style.color,
          fontWeight: style.bold ? 900 : 700,
          fontStyle: style.italic ? "italic" : "normal",
          textDecoration: [style.underline ? "underline" : null, style.strikethrough ? "line-through" : null]
            .filter(Boolean)
            .join(" "),
          whiteSpace: "pre-wrap",
        }}
      >
        {buf}
      </span>
    );
    buf = "";
  };

  let k = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (isHexAt2(text, i)) {
      pushBuf(`t-${k++}`);
      style = { ...style, color: `#${text.slice(i + 2, i + 8)}` };
      i += 7;
      continue;
    }
    if (ch === "&" && i + 1 < text.length) {
      const code = text[i + 1].toLowerCase();
      if (MC_COLORS[code] || ["k", "l", "m", "n", "o", "r"].includes(code)) {
        pushBuf(`t-${k++}`);
        if (MC_COLORS[code]) style = { ...style, color: MC_COLORS[code] };
        else if (code === "l") style = { ...style, bold: true };
        else if (code === "o") style = { ...style, italic: true };
        else if (code === "n") style = { ...style, underline: true };
        else if (code === "m") style = { ...style, strikethrough: true };
        else if (code === "r") style = { color: "#FFFFFF", bold: false, italic: false, underline: false, strikethrough: false };
        i += 1;
        continue;
      }
    }
    buf += ch;
  }
  pushBuf(`t-${k++}`);
  return out;
}

function renderMcTextWithCoinIcon(input) {
  const text = normalizeMc(input);
  const parts = text.split(/(COINS)/g);
  return parts.map((p, idx) => {
    if (p === "COINS") {
      return (
        <span key={`coin-${idx}`} className="mcInlineCoin">
          <img src="/tienda/assets/coin.png" alt="COIN" draggable={false} />
        </span>
      );
    }
    return <React.Fragment key={`t-${idx}`}>{renderMcText(p)}</React.Fragment>;
  });
}

function useMouseTooltip() {
  const [tip, setTip] = useState({ open: false, x: 0, y: 0, content: null });
  const raf = useRef(null);
  useEffect(() => {
    const onMove = (e) => {
      const x = e.clientX;
      const y = e.clientY;
      if (raf.current) cancelAnimationFrame(raf.current);
      raf.current = requestAnimationFrame(() => setTip((t) => (t.open ? { ...t, x, y } : t)));
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);
  const show = (content) => setTip((t) => ({ ...t, open: true, content }));
  const hide = () => setTip((t) => ({ ...t, open: false, content: null }));
  return { tip, show, hide };
}

function MinecraftTooltip({ tip }) {
  if (!tip.open || !tip.content) return null;
  const offset = 14;
  return (
    <div className="mcTooltip" style={{ left: tip.x + offset, top: tip.y + offset }}>
      {tip.content}
    </div>
  );
}

function looksPurchased(it) {
  const dn = String(it?.display_name || it?.displayName || it?.name || "").toLowerCase();
  const loreTxt = Array.isArray(it?.lore) ? it.lore.join(" ").toLowerCase() : "";
  return dn.includes("comprado") || loreTxt.includes("comprado") || loreTxt.includes("ya lo tienes") || loreTxt.includes("adquirido");
}

function dedupeItems(list) {
  const out = [];
  const seen = new Set();
  for (const it of list) {
    if (!it) continue;
    const mat = String(it?.material || "");
    const md = String(it?.model_data ?? "");
    const key = String(it?.key || it?.id || "");
    const name = String(it?.display_name || it?.displayName || it?.name || "");
    const sig = `${key}__${mat}__${md}__${name}`.toLowerCase();
    if (seen.has(sig)) continue;
    seen.add(sig);
    out.push(it);
  }
  return out;
}

function extractCoinsPrice(item) {
  const lore = Array.isArray(item?.lore) ? item.lore : [];
  const joined = lore.map((l) => String(l ?? "")).join("\n");
  const m1 = joined.match(/precio[^0-9]*([0-9][0-9.,]*)/i);
  if (m1?.[1]) return m1[1].replace(/\./g, "").replace(",", ".");
  const m2 = joined.match(/([0-9][0-9.,]*)\s*COINS/i);
  if (m2?.[1]) return m2[1].replace(/\./g, "").replace(",", ".");
  return null;
}

// --- COMPONENTE PRINCIPAL ---
export default function CoinshopModal({ open, onClose, fromRect }) {
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState("idle");
  const panelRef = useRef(null);

  const [data, setData] = useState(null);
  const [view, setView] = useState({ mode: "categories", categoryId: null });
  const { tip, show, hide } = useMouseTooltip();

  useEffect(() => {
    if (open) {
      setMounted(true);
      setPhase("enter");
      return;
    }
    if (mounted) {
      setPhase("exit");
      const t = setTimeout(() => {
        setMounted(false);
        setPhase("idle");
      }, 250); // Ligeramente mayor para la nueva animación
      return () => clearTimeout(t);
    }
  }, [open, mounted]);

  useEffect(() => {
    if (!mounted) return;
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [mounted, onClose]);

  useLayoutEffect(() => {
    if (!mounted) return;
    const panel = panelRef.current;
    if (!panel) return;
    const fr = safeRect(fromRect);

    panel.style.setProperty("--csx", "0px");
    panel.style.setProperty("--csy", "0px");
    panel.style.setProperty("--css", "0.92");

    requestAnimationFrame(() => {
      const to = panel.getBoundingClientRect();
      if (fr) {
        const fx = fr.left + fr.width / 2;
        const fy = fr.top + fr.height / 2;
        const tx = to.left + to.width / 2;
        const ty = to.top + to.height / 2;
        const sx = fr.width / Math.max(1, to.width);
        const sy = fr.height / Math.max(1, to.height);
        
        panel.style.setProperty("--csx", `${(fx - tx).toFixed(2)}px`);
        panel.style.setProperty("--csy", `${(fy - ty).toFixed(2)}px`);
        panel.style.setProperty("--css", `${clamp(Math.min(sx, sy), 0.18, 0.92).toFixed(4)}`);
      }
      requestAnimationFrame(() => setPhase("open"));
    });
  }, [mounted, fromRect]);

  useEffect(() => {
    let alive = true;
    if (mounted && !data) {
      fetch(`/coinshop-data.json?cb=${Date.now()}`, { cache: "no-store" })
        .then((r) => r.json())
        .then((json) => alive && setData(json))
        .catch(() => alive && setData(null));
    }
    return () => { alive = false; };
  }, [mounted, data]);

  const categories = useMemo(() => (Array.isArray(data?.categories) ? data.categories : []).filter((c) => c && c.valid !== false), [data]);
  const activeCategory = useMemo(() => view.mode === "category" ? categories.find((c) => String(c?.id) === String(view.categoryId)) || null : null, [view, categories]);
  
  const gridItems = useMemo(() => {
    if (view.mode !== "category") return categories;
    const list = data?.itemsByCategory?.[activeCategory?.id] || [];
    let filtered = (Array.isArray(list) ? list : []).filter(Boolean).filter((it) => !looksPurchased(it));
    return dedupeItems(filtered);
  }, [view.mode, categories, activeCategory, data]);

  const headerTitle = useMemo(() => {
    const mainTitle = String(data?.main?.menu_title || "&fCOINSHOP").trim();
    if (view.mode === "category") {
      const t = String(activeCategory?.title || "").trim();
      return t ? `&fCOINSHOP: &r${t}` : mainTitle;
    }
    return mainTitle;
  }, [view.mode, activeCategory, data]);

  const onExitClick = () => {
    hide();
    if (view.mode === "category") {
      setView({ mode: "categories", categoryId: null });
      return;
    }
    onClose?.();
  };

  if (!mounted) return null;

  return (
    <div className={`mc-modal-overlay ${phase === "open" ? "is-open" : ""} ${phase === "exit" ? "is-exit" : ""}`} role="dialog" aria-modal="true">
      <div className="mc-modal-backdrop" onMouseDown={onClose} onTouchStart={onClose} />
      
      <MinecraftTooltip tip={tip} />

      <div className="mc-modal-content" ref={panelRef} onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
        
        {/* Placa del título incrustada y Botones */}
        <div className="mc-modal-header-container">
          {view.mode === "category" && (
             <button className="mc-back-btn" onClick={() => setView({ mode: "categories", categoryId: null })}>←</button>
          )}
          <div className="mc-modal-title-plate">
            <h2>{renderMcText(headerTitle)}</h2>
          </div>
          <button className="mc-close-btn" onClick={onClose} aria-label="Cerrar">X</button>
        </div>

        {/* Panel interior oscuro */}
        <div className="mc-inner-panel">
          {!data ? (
            <div className="mc-loading">Cargando catálogo...</div>
          ) : (
            <div className="mc-items-grid">
              
              {gridItems.map((item, idx) => {
                if (!item) return null;

                if (view.mode === "categories") {
                  const title = item?.title || "Categoría";
                  const loreClean = (Array.isArray(item?.description) ? item.description : [])
                    .filter((l) => !String(l || "").toLowerCase().includes("click izquierdo"))
                    .filter((l) => !String(l || "").toLowerCase().includes("➥"));

                  return (
                    <div
                      key={`cat-${item.id || idx}`}
                      className="mc-item-card"
                      onClick={() => { hide(); setView({ mode: "category", categoryId: item.id }); }}
                    >
                      <div className="mc-icon-container">
                        <ItemIcon material={item?.icon?.material} model_data={item?.icon?.model_data} className="mc-item-icon" />
                      </div>
                      <div className="mc-item-details">
                        <span className="mc-item-name">{renderMcText(title)}</span>
                        <span className="mc-item-lore">{renderMcText(loreClean[0] || "&7Ver artículos")}</span>
                      </div>
                    </div>
                  );
                }

                const display = item?.display_name || item?.displayName || item?.name || "Item";
                const lore = Array.isArray(item?.lore) ? item.lore : [];
                const price = extractCoinsPrice(item);
                const firstLore = lore.find(l => !String(l).toLowerCase().includes("precio") && !String(l).toLowerCase().includes("comprado"));

                return (
                  <div
                    key={`it-${item.key || item.id || idx}`}
                    className="mc-item-card"
                    onMouseEnter={() =>
                      show(
                        <div className="mcTipContent">
                          <div className="mcTipTitle">{renderMcText(display)}</div>
                          {lore.length > 0 && (
                            <div className="mcTipLore">
                              {lore.filter((l) => !String(l || "").toLowerCase().includes("comprado")).map((l, i) => (
                                <div key={i} className="mcTipLine">
                                  {String(l).toLowerCase().includes("precio") ? renderMcTextWithCoinIcon(l) : renderMcText(l)}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    }
                    onMouseLeave={hide}
                  >
                    <div className="mc-icon-container">
                      <ItemIcon material={item?.material} model_data={item?.model_data} className="mc-item-icon" />
                    </div>
                    <div className="mc-item-details">
                      <span className="mc-item-name">{renderMcText(display)}</span>
                      <span className="mc-item-lore">{renderMcText(firstLore || "")}</span>
                      {price && (
                        <div className="mc-item-price">
                          {/* CAMBIO: Uso de la imagen de la moneda en lugar de la letra */}
                          <img src="/tienda/assets/coin.png" alt="Coin" className="mc-coin-img" draggable={false} />
                          <span>{price} Monedas</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

            </div>
          )}
        </div>
      </div>
    </div>
  );
}