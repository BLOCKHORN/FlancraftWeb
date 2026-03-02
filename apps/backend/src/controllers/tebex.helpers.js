"use strict";

const crypto = require("crypto");

const CACHE_TTL = Number(process.env.TEBEX_CACHE_TTL || 300);
const ONLY_VISIBLE = String(process.env.TEBEX_ONLY_VISIBLE || "true").toLowerCase() !== "false";
const APPLY_SALES = String(process.env.TEBEX_APPLY_SALES || "false").toLowerCase() === "true";

const WEBSTORE_TOKEN =
  process.env.TEBEX_WEBSTORE_TOKEN ||
  process.env.TEBEX_ACCOUNT_TOKEN ||
  process.env.TEBEX_WEBSTORE_IDENTIFIER ||
  "";

const TEBEX_CURRENCY = String(process.env.TEBEX_CURRENCY || "EUR").toUpperCase().trim();
const WEBHOOK_SECRET = String(process.env.TEBEX_WEBHOOK_SECRET || "").trim();

const DEBUG_TEBEX =
  String(process.env.DEBUG_TEBEX || "").toLowerCase() === "true" ||
  String(process.env.DEBUG_TEBEX || "") === "1";

const STORE_SECRET = process.env.TEBEX_STORE_SECRET || process.env.TEBEX_STORE_PRIVATE_KEY || "";

const nowSec = () => Math.floor(Date.now() / 1000);
const isExpired = (c) => !c || !c.cacheAt || nowSec() - c.cacheAt >= CACHE_TTL;

function tlog(rid, ...args) {
  if (DEBUG_TEBEX) console.log(`[TEBEX][${rid}]`, ...args);
}

function safeParseJSON(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function cleanSecret(raw) {
  return String(raw || "")
    .replace(/^tebex\s+secret\s+/i, "")
    .replace(/^"+|"+$/g, "")
    .trim();
}

function truthy(v) {
  return v === true || v === 1 || v === "1" || String(v).toLowerCase() === "true";
}

function sha256Hex(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function hmacSha256Hex(secret, data) {
  return crypto.createHmac("sha256", secret).update(data).digest("hex");
}

function timingSafeEqualHex(a, b) {
  try {
    const ba = Buffer.from(String(a || ""), "hex");
    const bb = Buffer.from(String(b || ""), "hex");
    if (ba.length !== bb.length) return false;
    return crypto.timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

function getClientIPv4(req) {
  const xf = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  const raw = xf || req.socket?.remoteAddress || "";
  const m = raw.match(/(\d{1,3}\.){3}\d{1,3}/);
  return m ? m[0] : null;
}

function loadStoreSecret() {
  const fromJson = safeParseJSON(process.env.TEBEX_SECRETS_JSON);
  const fallback = process.env.TEBEX_PLUGIN_SECRET || process.env.TEBEX_STORE_PLUGIN_SECRET || "";
  const merged = (fromJson && (fromJson.store || fromJson.STORE || fromJson.secret || fromJson.SECRET)) || fallback;
  return cleanSecret(merged);
}

const STORE_PLUGIN_SECRET = loadStoreSecret();

function getStoreKey() {
  return "store";
}

const cache = {
  store: { categorias: [], paquetes: [], cacheAt: 0 },
};

const salesCache = {
  all: { sale: null, cacheAt: 0 },
  store: { sale: null, cacheAt: 0 },
};

const headlessCache = {
  sidebar: { data: null, cacheAt: 0 },
  topDonator: { data: null, cacheAt: 0 },
  recentPayments: { data: null, cacheAt: 0 },
  sidebarRaw: { data: null, cacheAt: 0 },
};

function normalizarPaquetes(json) {
  if (Array.isArray(json)) return json;
  if (json && Array.isArray(json.packages)) return json.packages;
  if (json && json.data && Array.isArray(json.data.packages)) return json.data.packages;
  if (json && typeof json === "object") {
    const vals = Object.values(json);
    if (vals.length && vals.every((v) => typeof v === "object")) return vals;
  }
  return [];
}

function isHiddenOrDisabled(pkg) {
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

async function tebexFetchPlugin(secret, path) {
  const url = `https://plugin.tebex.io/${path}`;
  const res = await fetch(url, {
    headers: {
      "X-Tebex-Secret": cleanSecret(secret),
      "User-Agent": "FlanCraftStore/1.0",
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error(`[TEBEX ${path}] HTTP ${res.status} ${res.statusText} ${text}`);
    err.status = res.status;
    throw err;
  }

  return res.json();
}

async function tebexFetchHeadless(path, init = {}) {
  if (!WEBSTORE_TOKEN) throw new Error("Falta TEBEX_WEBSTORE_TOKEN (Headless API).");
  const url = `https://headless.tebex.io/api/accounts/${WEBSTORE_TOKEN}/${path}`;

  const res = await fetch(url, {
    method: init.method || "GET",
    headers: {
      "User-Agent": "FlanCraftStore/1.0",
      ...(init.headers || {}),
    },
    body: init.body,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error(`[TEBEX headless ${path}] HTTP ${res.status} ${res.statusText} ${text}`);
    err.status = res.status;
    throw err;
  }

  return res.json();
}

async function getSidebarModulesCached(force = false) {
  const c = headlessCache.sidebar;
  if (!force && c.cacheAt && !isExpired(c) && c.data) return c.data;

  const data = await tebexFetchHeadless("sidebar");
  headlessCache.sidebar = { data, cacheAt: nowSec() };
  return data;
}

function sidebarArray(sidebar) {
  return Array.isArray(sidebar?.data) ? sidebar.data : Array.isArray(sidebar) ? sidebar : [];
}

function pickTopCustomerModule(sidebar) {
  const arr = sidebarArray(sidebar);
  if (!arr.length) return null;
  return arr.find((m) => String(m?.type || "").toLowerCase() === "top_customer") || null;
}

function pickPaymentsModule(sidebar) {
  const arr = sidebarArray(sidebar);
  if (!arr.length) return null;

  const byType = arr.find((m) => String(m?.type || "").toLowerCase() === "recent_payments");
  if (byType) return byType;

  return arr.find((m) => Array.isArray(m?.data?.payments)) || null;
}

function parseNumberFromString(str) {
  const s = String(str ?? "").trim();
  if (!s) return NaN;

  let c = s.replace(/[^\d.,-]/g, "");
  if (!c) return NaN;

  const lastComma = c.lastIndexOf(",");
  const lastDot = c.lastIndexOf(".");

  if (lastComma > -1 && lastDot > -1) {
    if (lastComma > lastDot) c = c.replace(/\./g, "").replace(",", ".");
    else c = c.replace(/,/g, "");
  } else if (lastComma > -1 && lastDot === -1) {
    c = c.replace(",", ".");
  }

  const n = Number(c);
  return Number.isFinite(n) ? n : NaN;
}

function hasPercentHint(v) {
  if (!v) return false;
  if (typeof v === "string") return v.includes("%");
  if (typeof v === "object") {
    const txt = String(v.formatted ?? v.text ?? v.label ?? v.display ?? "");
    return txt.includes("%");
  }
  return false;
}

function toMoneyNumberStrict(v) {
  if (hasPercentHint(v)) return NaN;

  if (v && typeof v === "object") {
    const raw = v.raw ?? v.value ?? v.amount;
    if (typeof raw === "number" && Number.isFinite(raw)) return raw;

    const formatted = v.formatted ?? v.text ?? v.label ?? v.display;
    const n1 = parseNumberFromString(formatted);
    if (Number.isFinite(n1)) return n1;

    return parseNumberFromString(raw);
  }

  const s = String(v ?? "").trim();
  if (s.includes("%")) return NaN;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  return parseNumberFromString(s);
}

function normalizeTopDonatorFromModule(module) {
  const d = module?.data || {};
  const username = String(d.username || d.ign || "").trim();
  const uuid = String(d.username_id || d.uuid || "").trim();

  const amountNum = toMoneyNumberStrict(d.total);
  const amount = Number.isFinite(amountNum) ? Number(amountNum.toFixed(2)) : null;

  return {
    username: username || "Guest",
    uuid: uuid || "",
    amount,
    currency: String(d.currency || TEBEX_CURRENCY || "EUR").toUpperCase(),
    periodLabel: String(d.header || "TOP DONATOR").trim() || "TOP DONATOR",
    serverLabel: "GLOBAL",
  };
}

function normalizarSales(json) {
  const arr = Array.isArray(json?.data)
    ? json.data
    : Array.isArray(json?.sales)
    ? json.sales
    : Array.isArray(json)
    ? json
    : [];

  return arr
    .map((s) => {
      const discount = s?.discount || {};
      const effective = s?.effective || {};
      return {
        id: s?.id ?? null,
        name: s?.name ?? null,
        percentage: Number(discount?.percentage ?? 0),
        expire: Number(s?.expire ?? 0),
        start: Number(s?.start ?? 0),
        order: Number(s?.order ?? 999),
        effectiveType: effective?.type || null,
      };
    })
    .filter((s) => s.expire && Number.isFinite(s.expire) && s.percentage > 0);
}

function pickBestSale(list = []) {
  const now = nowSec();
  const active = list.filter((s) => s.expire > now && (!s.start || s.start <= now));
  if (!active.length) return null;

  active.sort((a, b) => {
    if (b.percentage !== a.percentage) return b.percentage - a.percentage;
    if (a.expire !== b.expire) return a.expire - b.expire;
    return a.order - b.order;
  });

  return active[0] || null;
}

async function getBestSaleForServer(_server) {
  const secret = STORE_PLUGIN_SECRET;
  if (!secret) return null;

  const c = salesCache.store || { sale: null, cacheAt: 0 };
  if (c.cacheAt && !isExpired(c)) return c.sale;

  try {
    const salesJson = await tebexFetchPlugin(secret, "sales");
    const list = normalizarSales(salesJson);
    const best = pickBestSale(list);

    salesCache.store = { sale: best, cacheAt: nowSec() };
    return best;
  } catch {
    salesCache.store = { sale: null, cacheAt: nowSec() };
    return null;
  }
}

async function getBestSaleGlobal() {
  const c = salesCache.all;
  if (c.cacheAt && !isExpired(c)) return c.sale;

  const best = await getBestSaleForServer("store");
  const candidate = best ? { ...best, server: "store" } : null;

  salesCache.all = { sale: candidate, cacheAt: nowSec() };
  return candidate;
}

function toNum(v, fallback = NaN) {
  const n = typeof v === "string" ? Number.parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function getPkgId(p) {
  const id = p?.id ?? p?.package_id ?? p?.packageId;
  const n = toNum(id, NaN);
  return Number.isFinite(n) ? n : null;
}

function getPkgCategoryId(p) {
  const cid =
    p?.category?.id ??
    p?.category_id ??
    p?.categories?.[0]?.id ??
    p?.categories?.[0]?.category_id ??
    null;

  const n = toNum(cid, NaN);
  return Number.isFinite(n) ? n : null;
}

function normalizeSalesForApply(salesJson) {
  const arr = Array.isArray(salesJson?.data)
    ? salesJson.data
    : Array.isArray(salesJson?.sales)
    ? salesJson.sales
    : Array.isArray(salesJson)
    ? salesJson
    : [];

  const now = nowSec();

  return arr
    .map((s) => {
      const pct = toNum(s?.discount?.percentage ?? 0, 0);
      const start = toNum(s?.start ?? 0, 0);
      const expire = toNum(s?.expire ?? 0, 0);

      const effectiveType = String(s?.effective?.type || "").toLowerCase().trim();
      const packages = Array.isArray(s?.effective?.packages) ? s.effective.packages : [];
      const categories = Array.isArray(s?.effective?.categories) ? s.effective.categories : [];

      return {
        pct,
        start,
        expire,
        effectiveType,
        packages: packages.map((x) => toNum(x, NaN)).filter(Number.isFinite),
        categories: categories.map((x) => toNum(x, NaN)).filter(Number.isFinite),
      };
    })
    .filter((s) => {
      if (!(s.pct > 0)) return false;
      if (!s.expire || s.expire <= now) return false;
      if (s.start && s.start > now) return false;
      return true;
    });
}

function applySalesToPackages(paquetes = [], salesJson) {
  const sales = normalizeSalesForApply(salesJson);
  if (!sales.length) return paquetes;

  const byPkg = new Map();
  const byCat = new Map();
  let globalPct = 0;

  for (const s of sales) {
    if (s.effectiveType === "package") {
      for (const pid of s.packages) {
        const prev = byPkg.get(pid) || 0;
        if (s.pct > prev) byPkg.set(pid, s.pct);
      }
    } else if (s.effectiveType === "category") {
      for (const cid of s.categories) {
        const prev = byCat.get(cid) || 0;
        if (s.pct > prev) byCat.set(cid, s.pct);
      }
    } else {
      if (s.pct > globalPct) globalPct = s.pct;
    }
  }

  return (Array.isArray(paquetes) ? paquetes : []).map((p) => {
    const pid = getPkgId(p);
    if (!pid) return p;

    const cid = getPkgCategoryId(p);
    const pctPkg = byPkg.get(pid) || 0;
    const pctCat = cid ? byCat.get(cid) || 0 : 0;
    const pct = Math.max(pctPkg, pctCat, globalPct);

    if (!(pct > 0)) return p;

    const currentPrice = toNum(p?.price ?? p?.precio, NaN);
    if (!Number.isFinite(currentPrice) || currentPrice <= 0) return p;

    const existingOriginal = toNum(p?.original_price ?? p?.precio_original, NaN);
    const original = Number.isFinite(existingOriginal) && existingOriginal > 0 ? existingOriginal : currentPrice;

    const discounted = round2(original * (1 - pct / 100));

    return {
      ...p,
      original_price: original,
      price: discounted,
      precio_original: original,
      precio: discounted,
      sale_percentage: pct,
    };
  });
}

function normalizeCurrencyIso(v, fallback = "EUR") {
  const s = String(v || "").trim().toUpperCase();
  return /^[A-Z]{3}$/.test(s) ? s : fallback;
}

async function actualizarCacheDe(_server) {
  const secret = STORE_PLUGIN_SECRET;
  if (!secret) throw new Error("Falta TEBEX_PLUGIN_SECRET (plugin secret único).");

  const json = await tebexFetchPlugin(secret, "packages");
  let paquetes = normalizarPaquetes(json);

  if (APPLY_SALES) {
    try {
      const salesJson = await tebexFetchPlugin(secret, "sales");
      paquetes = applySalesToPackages(paquetes, salesJson);
    } catch (e) {
      console.warn(`[TEBEX sales] No se pudieron aplicar rebajas:`, e?.message || e);
    }
  }

  if (ONLY_VISIBLE) {
    paquetes = paquetes.filter((p) => !isHiddenOrDisabled(p));
  }

  const iso = normalizeCurrencyIso(TEBEX_CURRENCY, "EUR");
  paquetes = paquetes.map((p) => ({
    ...p,
    currency: normalizeCurrencyIso(p?.currency, iso),
  }));

  const categoriasMap = new Map();
  for (const p of paquetes) {
    const cat = p?.category || p?.categories?.[0];
    const id = cat?.id ?? cat?.category_id ?? p?.category_id;
    const name = cat?.name ?? cat?.category_name ?? p?.category_name;
    if (id && !categoriasMap.has(id)) categoriasMap.set(id, { id, name: name || `Categoría ${id}` });
  }

  cache.store = {
    categorias: Array.from(categoriasMap.values()),
    paquetes,
    cacheAt: nowSec(),
  };

  console.log(`[store] cache: ${paquetes.length} paquetes visibles, ${categoriasMap.size} categorias (TTL ${CACHE_TTL}s).`);
}

function getHeadlessBasic() {
  const HEADLESS_PUBLIC = String(process.env.TEBEX_HEADLESS_PUBLIC_TOKEN || "").trim();
  const HEADLESS_PRIVATE = String(process.env.TEBEX_HEADLESS_PRIVATE_KEY || "").trim();

  const BASIC =
    HEADLESS_PUBLIC && HEADLESS_PRIVATE
      ? Buffer.from(`${HEADLESS_PUBLIC}:${HEADLESS_PRIVATE}`).toString("base64")
      : "";

  if (!BASIC) {
    const err = new Error("Faltan credenciales Headless Basic Auth (TEBEX_HEADLESS_PUBLIC_TOKEN / TEBEX_HEADLESS_PRIVATE_KEY).");
    err.status = 500;
    throw err;
  }

  return BASIC;
}

async function headlessFetchJson({ rid, url, method = "GET", body = null }) {
  const BASIC = getHeadlessBasic();

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15000);

  try {
    const res = await fetch(url, {
      method,
      signal: ctrl.signal,
      headers: {
        "User-Agent": "FlanCraftStore/1.0",
        Accept: "application/json",
        Authorization: `Basic ${BASIC}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const text = await res.text().catch(() => "");
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }

    if (!res.ok) {
      const err = new Error(`HTTP ${res.status} ${res.statusText}`);
      err.status = res.status;
      err.data = data;
      err.raw = (text || "").slice(0, 800);
      throw err;
    }

    return data;
  } finally {
    clearTimeout(t);
  }
}

(async () => {
  try {
    await actualizarCacheDe("store");
  } catch (e) {
    console.warn(`No se pudo precargar [store]:`, e.message);
  }
})();

module.exports = {
  CACHE_TTL,
  ONLY_VISIBLE,
  APPLY_SALES,
  WEBSTORE_TOKEN,
  TEBEX_CURRENCY,
  WEBHOOK_SECRET,
  STORE_SECRET,
  STORE_PLUGIN_SECRET,
  cache,
  salesCache,
  headlessCache,
  nowSec,
  isExpired,
  tlog,
  getClientIPv4,
  sha256Hex,
  hmacSha256Hex,
  timingSafeEqualHex,
  getServerKey: getStoreKey,
  isHiddenOrDisabled,
  tebexFetchPlugin,
  actualizarCacheDe,
  tebexFetchHeadless,
  getSidebarModulesCached,
  sidebarArray,
  pickTopCustomerModule,
  pickPaymentsModule,
  normalizeTopDonatorFromModule,
  getBestSaleForServer,
  getBestSaleGlobal,
  applySalesToPackages,
  getHeadlessBasic,
  headlessFetchJson,
};