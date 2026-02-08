// src/components/Tienda/ui/storefront/storefront.utils.js
import { filterPackagesByCategoryId, getPackageName, getPackagePrice, getPackageOriginalPrice } from "../../utils/tiendaHelpers";

export function truthy(v) {
  return v === true || v === 1 || v === "1" || String(v).toLowerCase() === "true";
}

export function isHiddenOrDisabledClient(pkg) {
  const pkgFlags = [pkg?.hidden, pkg?.disabled, pkg?.archived, pkg?.deleted, pkg?.gui_disabled];

  if (pkg?.status && ["hidden", "disabled", "archived", "deleted"].includes(String(pkg.status).toLowerCase())) return true;
  if (pkgFlags.some(truthy)) return true;

  const cat = pkg?.category || pkg?.categories?.[0] || {};
  const catFlags = [cat?.hidden, cat?.disabled, cat?.archived, cat?.deleted];

  if (cat?.status && ["hidden", "disabled", "archived", "deleted"].includes(String(cat.status).toLowerCase())) return true;
  if (catFlags.some(truthy)) return true;

  if (pkg?.price === null || typeof pkg?.name !== "string") return true;

  return false;
}

export function pickCoinsCategory(apiCats = []) {
  const list = Array.isArray(apiCats) ? apiCats : [];
  return (
    list.find((c) => /coins?/i.test(String(c?.name || ""))) ||
    list.find((c) => /coins?/i.test(String(c?.slug || ""))) ||
    null
  );
}

export function pickCoinsPackages({ serverKey, apiCats, packs }) {
  const visible = (Array.isArray(packs) ? packs : []).filter((p) => !isHiddenOrDisabledClient(p));
  if (!visible.length) return [];

  const coinsCat = pickCoinsCategory(apiCats);
  if (coinsCat?.id) {
    const byCat = filterPackagesByCategoryId(visible, coinsCat.id);
    if (byCat.length) {
      if (serverKey === "oneblock") {
        const ob = byCat.filter((p) => /(\bob\b|oneblock)/i.test(String(p?.name || "")));
        return ob.length ? ob : byCat;
      }
      if (serverKey === "gens") {
        const gens = byCat.filter((p) => !/(\bob\b|oneblock)/i.test(String(p?.name || "")));
        return gens.length ? gens : byCat;
      }
      return byCat;
    }
  }

  if (serverKey === "oneblock") {
    const ob = visible.filter(
      (p) => /coins?/i.test(String(p?.name || "")) && /(\bob\b|oneblock)/i.test(String(p?.name || ""))
    );
    if (ob.length) return ob;
  }

  if (serverKey === "gens") {
    const gens = visible.filter(
      (p) => /coins?/i.test(String(p?.name || "")) && !/(\bob\b|oneblock)/i.test(String(p?.name || ""))
    );
    if (gens.length) return gens;
  }

  return visible;
}

export function pickRangosPackages({ apiCats, packs }) {
  const cats = Array.isArray(apiCats) ? apiCats : [];
  const visible = (Array.isArray(packs) ? packs : []).filter((p) => !isHiddenOrDisabledClient(p));

  const rangosCat =
    cats.find((c) => /rangos/i.test(String(c?.name || ""))) ||
    cats.find((c) => /rangos/i.test(String(c?.slug || ""))) ||
    null;

  if (rangosCat?.id) {
    const byCat = filterPackagesByCategoryId(visible, rangosCat.id);
    return byCat.length ? byCat : visible;
  }

  const byName = visible.filter((p) => /(nova|alpha|inmortal|immortal)/i.test(String(p?.name || "")));
  return byName.length ? byName : visible;
}

export function rankKeyFromName(name = "") {
  const n = String(name).toLowerCase();
  if (n.includes("nova")) return "nova";
  if (n.includes("alpha")) return "alpha";
  if (n.includes("inmortal") || n.includes("immortal")) return "inmortal";
  return "";
}

export function sortByPriceAsc(a, b) {
  return getPackagePrice(a) - getPackagePrice(b);
}

export function formatEur(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(n);
}

export function fmtInt(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 }).format(Math.round(v));
}

export function parseCoinsFromText(text) {
  const s = String(text || "").trim();
  if (!s) return null;

  const candidates = [
    /coins?\s*[:\-|]?\s*[x×]?\s*([\d][\d.,\s]*)/i,
    /[x×]\s*([\d][\d.,\s]*)\s*coins?/i,
    /\b(?:coins?)\b.*?\b([0-9][0-9.,\s]*)\b/i,
    /\b[x×]\s*([\d][\d.,\s]*)\b/i,
    /\b([0-9][0-9.,\s]{2,})\b/,
  ];

  for (const re of candidates) {
    const m = s.match(re);
    if (!m || !m[1]) continue;

    const raw = String(m[1]).replace(/\s+/g, "");
    const digits = raw.replace(/[^\d]/g, "");
    if (!digits) continue;

    const n = Number(digits);
    if (Number.isFinite(n) && n > 0) return n;
  }

  return null;
}

export function parseCoinsFromPkg(pkg, getName) {
  if (!pkg) return null;

  const name = typeof getName === "function" ? getName(pkg) : getPackageName(pkg);
  let n = parseCoinsFromText(name);
  if (n) return n;

  const extraTexts = [
    pkg?.description,
    pkg?.short_description,
    pkg?.shortDescription,
    pkg?.details,
    pkg?.meta?.description,
  ].filter(Boolean);

  for (const t of extraTexts) {
    n = parseCoinsFromText(t);
    if (n) return n;
  }
  return null;
}

export function setTiltVars(el, ev) {
  if (!el) return;
  const r = el.getBoundingClientRect();
  const x = (ev.clientX - r.left) / r.width;
  const y = (ev.clientY - r.top) / r.height;
  const rx = (0.5 - y) * 9;
  const ry = (x - 0.5) * 12;
  el.style.setProperty("--rx", rx.toFixed(2));
  el.style.setProperty("--ry", ry.toFixed(2));
  el.style.setProperty("--mx", `${(x * 100).toFixed(2)}%`);
  el.style.setProperty("--my", `${(y * 100).toFixed(2)}%`);
}

export function roundNiceExtra(extra) {
  const e = Number(extra);
  if (!Number.isFinite(e) || e <= 0) return 0;
  const step = e >= 2000 ? 500 : 100;
  return Math.max(step, Math.round(e / step) * step);
}

export function hasSaleSignal(pkg) {
  if (!pkg) return false;

  const any = [
    pkg?.on_sale,
    pkg?.is_sale,
    pkg?.sale,
    pkg?.sale_active,
    pkg?.discount,
    pkg?.discount_active,
    pkg?.discount_percentage,
    pkg?.discountPercent,
    pkg?.sale_percentage,
    pkg?.salePercentage,
  ];

  if (typeof pkg?.sale === "object" && pkg?.sale) {
    if (truthy(pkg.sale.active) || truthy(pkg.sale.is_active) || truthy(pkg.sale.enabled)) return true;
    if (typeof pkg.sale.percentage === "number" && pkg.sale.percentage > 0) return true;
  }

  if (typeof pkg?.discount === "object" && pkg?.discount) {
    if (truthy(pkg.discount.active) || truthy(pkg.discount.is_active) || truthy(pkg.discount.enabled)) return true;
    if (typeof pkg.discount.percentage === "number" && pkg.discount.percentage > 0) return true;
  }

  for (const v of any) {
    if (truthy(v)) return true;
    if (typeof v === "number" && v > 0) return true;
  }

  return false;
}

export function getDiscountMeta(pkg, getPrice = getPackagePrice, getOriginal = getPackageOriginalPrice) {
  const price = Number(getPrice(pkg) || 0);
  const originalRaw = getOriginal(pkg);
  const original = Number(originalRaw);

  const saleSignal = hasSaleSignal(pkg);
  if (!saleSignal) return { onSale: false, discountPct: null, original: null, price };

  if (!Number.isFinite(price) || price <= 0) return { onSale: false, discountPct: null, original: null, price };
  if (!Number.isFinite(original) || original <= 0) return { onSale: false, discountPct: null, original: null, price };

  const diff = original - price;
  if (diff <= 0.009) return { onSale: false, discountPct: null, original: null, price };

  const pct = Math.round((1 - price / original) * 100);
  if (!Number.isFinite(pct) || pct < 2) return { onSale: false, discountPct: null, original: null, price };

  return { onSale: true, discountPct: pct, original, price };
}

export function buildCoinsValueMap(coinsPackages, { getId, getName, getPrice }) {
  const list = (coinsPackages || []).map((p) => {
    const id = String(getId(p) ?? getName(p));
    const price = Number(getPrice(p) || 0);
    const amount = parseCoinsFromPkg(p, getName);
    const rate = amount && price > 0 ? amount / price : null;
    return { id, price, amount, rate };
  });

  const base = list.find((x) => x.amount && x.price > 0);
  const baseRate = base?.amount && base?.price ? base.amount / base.price : null;

  let best = null;
  for (const it of list) {
    if (!it.rate) continue;
    if (!best || it.rate > best.rate) best = it;
  }

  const bestId = best?.id ?? null;

  const map = new Map();
  for (const it of list) {
    if (!baseRate || !it.amount || !it.price) {
      map.set(it.id, { isBest: it.id === bestId, extraNice: 0 });
      continue;
    }
    const expected = baseRate * it.price;
    const extraRaw = it.amount - expected;
    const extraNice = extraRaw >= 500 ? roundNiceExtra(extraRaw) : 0;
    map.set(it.id, { isBest: it.id === bestId, extraNice });
  }

  return { bestId, map };
}
