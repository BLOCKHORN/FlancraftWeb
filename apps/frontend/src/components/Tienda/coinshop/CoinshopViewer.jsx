import React, { useEffect, useMemo, useRef, useState } from "react";
import "../../../styles/components/Tienda/coinshop-viewer.scss";
import ItemIcon from "../ui/ItemIcon";

const MC_COLORS = {
  "0": "#000000",
  "1": "#0000AA",
  "2": "#00AA00",
  "3": "#00AAAA",
  "4": "#AA0000",
  "5": "#AA00AA",
  "6": "#FFAA00",
  "7": "#BDBDBD",
  "8": "#6A6A6A",
  "9": "#5555FF",
  a: "#55FF55",
  b: "#55FFFF",
  c: "#FF5555",
  d: "#FF55FF",
  e: "#FFFF55",
  f: "#FFFFFF",
};

function normalizeMc(text) {
  return String(text ?? "").replace(/§/g, "&");
}

function isHexAt(str, i) {
  return str[i] === "&" && str[i + 1] === "&" && false;
}

function isHexAt2(str, i) {
  return str[i] === "&" && str[i + 1] === "#" && /^[0-9a-fA-F]{6}$/.test(str.slice(i + 2, i + 8));
}

function renderMcText(input) {
  const text = normalizeMc(input);

  let style = {
    color: "#FFFFFF",
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
  };

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
        else if (code === "r")
          style = { color: "#FFFFFF", bold: false, italic: false, underline: false, strikethrough: false };

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
          <img src="/mc/custom/coin.png" alt="COIN" draggable={false} />
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
      raf.current = requestAnimationFrame(() => {
        setTip((t) => (t.open ? { ...t, x, y } : t));
      });
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

function padToGrid(list, max) {
  const out = (Array.isArray(list) ? list.slice(0, max) : []).slice();
  while (out.length < max) out.push(null);
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

export default function CoinshopViewer({ className = "", onExit }) {
  const [data, setData] = useState(null);
  const [view, setView] = useState({ mode: "categories", categoryId: null });
  const { tip, show, hide } = useMouseTooltip();

  useEffect(() => {
    let alive = true;
    fetch(`/coinshop-data.json?cb=${Date.now()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((json) => alive && setData(json))
      .catch(() => alive && setData(null));
    return () => {
      alive = false;
    };
  }, []);

  const categoriesRaw = Array.isArray(data?.categories) ? data.categories : [];
  const itemsByCategory = data?.itemsByCategory || {};
  const categories = useMemo(() => categoriesRaw.filter((c) => c && c.valid !== false), [categoriesRaw]);

  const activeCategory = useMemo(() => {
    if (view.mode !== "category") return null;
    return categories.find((c) => String(c?.id) === String(view.categoryId)) || null;
  }, [view, categories]);

  const rawActiveItems = useMemo(() => {
    if (!activeCategory) return [];
    const list = itemsByCategory[activeCategory.id] || [];
    return Array.isArray(list) ? list.slice() : [];
  }, [activeCategory, itemsByCategory]);

  const gridItems = useMemo(() => {
    if (view.mode !== "category") return categories;
    let filtered = rawActiveItems.filter(Boolean).filter((it) => !looksPurchased(it));
    filtered = dedupeItems(filtered);
    return filtered;
  }, [view.mode, categories, rawActiveItems]);

  const mainTitle = useMemo(() => {
    const t = String(data?.main?.menu_title || "&fCOINSHOP").trim();
    return t || "&fCOINSHOP";
  }, [data]);

  const headerTitle = useMemo(() => {
    if (view.mode === "category") {
      const t = String(activeCategory?.title || "").trim();
      return t ? `&fCOINSHOP: &r${t}` : mainTitle;
    }
    return mainTitle;
  }, [view.mode, activeCategory, mainTitle]);

  const gridCols = view.mode === "categories" ? 3 : 6;
  const gridSlots = view.mode === "categories" ? 12 : 18;
  const fixedGrid = useMemo(() => padToGrid(gridItems, gridSlots), [gridItems, gridSlots]);

  const renderEmptyCell = (idx) => <div key={`empty-${idx}`} className="mcSlot mcSlot--empty" aria-hidden="true" />;

  const renderCategoryCell = (cat, idx) => {
    if (!cat) return renderEmptyCell(idx);

    const titleMc = cat?.title || "Categoría";
    const lore = Array.isArray(cat?.description) ? cat.description : [];
    const loreClean = lore
      .filter((l) => !String(l || "").toLowerCase().includes("click izquierdo"))
      .filter((l) => !String(l || "").toLowerCase().includes("➥"));

    return (
      <button
        key={`cat-${cat.id}`}
        type="button"
        className="mcSlot mcSlot--click"
        onMouseEnter={() =>
          show(
            <div className="mcTipContent">
              <div className="mcTipTitle">{renderMcText(titleMc)}</div>
              {loreClean.length ? (
                <div className="mcTipLore">
                  {loreClean.slice(0, 12).map((l, i) => (
                    <div key={i} className="mcTipLine">
                      {renderMcText(l)}
                    </div>
                  ))}
                </div>
              ) : null}
              <div className="mcTipHint">{renderMcText("&eClic para abrir")}</div>
            </div>
          )
        }
        onMouseLeave={hide}
        onClick={() => {
          hide();
          setView({ mode: "category", categoryId: cat.id });
        }}
      >
        <ItemIcon material={cat?.icon?.material} model_data={cat?.icon?.model_data} className="mcItemImg" ctx={{ type: "category", id: cat?.id }} />
      </button>
    );
  };

  const renderItemCell = (item, idx) => {
    if (!item) return renderEmptyCell(idx);

    const display = item?.display_name || item?.displayName || item?.name || "Item";
    const lore = Array.isArray(item?.lore) ? item.lore : [];
    const price = extractCoinsPrice(item);

    return (
      <div
        key={`it-${item.key || item.id || item.name || `${item.material}-${item.model_data}-${display}`}`}
        className="mcSlot mcSlot--item"
        onMouseEnter={() =>
          show(
            <div className="mcTipContent">
              <div className="mcTipTitle">{renderMcText(display)}</div>
              {lore.length ? (
                <div className="mcTipLore">
                  {lore
                    .filter((l) => !String(l || "").toLowerCase().includes("comprado"))
                    .slice(0, 18)
                    .map((l, i) => {
                      const line = String(l ?? "");
                      const isPriceLine = line.toLowerCase().includes("precio") || line.toLowerCase().includes("coins");
                      return (
                        <div key={i} className="mcTipLine">
                          {isPriceLine ? renderMcTextWithCoinIcon(line) : renderMcText(line)}
                        </div>
                      );
                    })}
                </div>
              ) : null}
            </div>
          )
        }
        onMouseLeave={hide}
      >
        <ItemIcon material={item?.material} model_data={item?.model_data} className="mcItemImg" ctx={{ type: "item", categoryId: activeCategory?.id, key: item?.key }} />

        {price ? (
          <div className="mcPriceBadge" aria-hidden="true">
            <img src="/mc/custom/coin.png" alt="" draggable={false} />
            <span>{price}</span>
          </div>
        ) : null}
      </div>
    );
  };

  const gridContent = useMemo(() => {
    if (view.mode === "category") return fixedGrid.map((it, idx) => renderItemCell(it, idx));
    return fixedGrid.map((cat, idx) => renderCategoryCell(cat, idx));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fixedGrid, view.mode, activeCategory?.id]);

  const onExitClick = () => {
    hide();
    if (view.mode === "category") {
      setView({ mode: "categories", categoryId: null });
      return;
    }
    onExit?.();
  };

  const invStyle = {
    gridTemplateColumns: `repeat(${gridCols}, var(--slot))`,
  };

  return (
    <section className={`coinshopViewer ${className} ${view.mode === "categories" ? "coinshopViewer--cats" : "coinshopViewer--items"}`}>
      <MinecraftTooltip tip={tip} />

      <div className="mcWindow">
        <div className="mcTopbar">
          <div className="mcTopTitle">{renderMcText(headerTitle)}</div>
          <button className="mcClose" type="button" onClick={onExitClick} aria-label="Cerrar">
            ✕
          </button>
        </div>

        <div className="mcBody">
          {!data ? (
            <div className="mcLoading">Cargando…</div>
          ) : (
            <div className="mcLayout">
              <div className="mcInv" style={invStyle}>
                {gridContent}
              </div>
            </div>
          )}

          <button className="mcExit" type="button" onClick={onExitClick}>
            SALIR
          </button>
        </div>
      </div>
    </section>
  );
}
