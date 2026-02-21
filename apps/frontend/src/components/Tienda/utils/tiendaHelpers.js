// src/components/Tienda/utils/tiendaHelpers.js

export const API_URL =
  import.meta.env.VITE_BACKEND_URL || "https://flancraft-backend.onrender.com";

export const API_BASE = String(API_URL || "").replace(/\/$/, "");

export const TEBEX_PATH = import.meta.env.VITE_TEBEX_PATH || "/api/tebex";
export const TEBEX_URL = `${API_BASE}${TEBEX_PATH}`;
export const TEBEX_URL_FALLBACK = `${API_BASE}/tebex`;

async function fetchWithTimeout(url, options = {}, timeoutMs = 15000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: ctrl.signal,
      credentials: options?.credentials ?? "include",
      headers: {
        ...(options?.headers || {}),
      },
    });
  } finally {
    clearTimeout(t);
  }
}

export function withCacheBust(url = "", bust = null) {
  const u = String(url || "").trim();
  const b = bust != null ? String(bust).trim() : "";

  if (!u || !b) return u;
  if (/^(data:|blob:)/i.test(u)) return u;

  const [basePlusQuery, hash = ""] = u.split("#");
  const [base, query = ""] = basePlusQuery.split("?");

  const params = new URLSearchParams(query);
  params.set("v", b);

  const qs = params.toString();
  return `${base}${qs ? `?${qs}` : ""}${hash ? `#${hash}` : ""}`;
}

export async function fetchTebex(path, options) {
  const p = String(path || "");
  const safePath = p.startsWith("/") ? p : `/${p}`;

  const r1 = await fetchWithTimeout(`${TEBEX_URL}${safePath}`, options);
  if (r1.status !== 404) return r1;

  return fetchWithTimeout(`${TEBEX_URL_FALLBACK}${safePath}`, options);
}

export async function fetchPublicCatalog() {
  const r = await fetchTebex("/public-catalog", { method: "GET" });
  if (!r.ok) throw new Error("No se pudo cargar el catálogo público.");
  return r.json();
}

export async function fetchSaleActiva(serverKey) {
  const sv = String(serverKey || "").trim().toLowerCase();

  const tries = [
    sv ? `/sale-activa/${encodeURIComponent(sv)}` : null,
    sv ? `/sale-activa?sv=${encodeURIComponent(sv)}` : null,
    "/sale-activa",
  ].filter(Boolean);

  for (const path of tries) {
    try {
      const r = await fetchTebex(path, { method: "GET" });
      if (!r.ok) continue;

      const data = await r.json();
      const sale = data?.sale ?? data?.data?.sale ?? null;
      const active = Boolean(data?.active ?? data?.data?.active ?? sale);

      return { active, sale: active ? sale : null, raw: data };
    } catch {}
  }

  return { active: false, sale: null, raw: null };
}

export function stripAccents(str = "") {
  return String(str).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function slugify(str = "") {
  return String(str)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-]/g, "")
    .replace(/\-+/g, "-")
    .replace(/^\-|\-$/g, "");
}

function toNumber(v, fallback = 0) {
  const n = typeof v === "string" ? Number.parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function getPackageId(pkg) {
  return pkg?.id ?? pkg?.package_id ?? null;
}

export function getPackageName(pkg) {
  return (
    pkg?.name ??
    pkg?.nombre ??
    pkg?.package_name ??
    pkg?.title ??
    "Producto"
  );
}

export function getPackagePrice(pkg) {
  return toNumber(pkg?.price ?? pkg?.precio ?? 0, 0);
}

export function getPackageOriginalPrice(pkg) {
  const v = pkg?.original_price ?? pkg?.precio_original ?? null;
  if (v === null || v === undefined) return null;
  const n = toNumber(v, NaN);
  return Number.isFinite(n) ? n : null;
}

export function getPackageImage(pkg) {
  return (
    pkg?.image_url ||
    pkg?.image ||
    pkg?.imageUrl ||
    pkg?.img ||
    "/assets/tienda/producto-placeholder.png"
  );
}

export function normalizeProductForCart(pkg, cantidad = 1) {
  const id = getPackageId(pkg);
  return {
    ...pkg,
    id: id !== null ? Number(id) : id,
    name: getPackageName(pkg),
    price: getPackagePrice(pkg),
    original_price: getPackageOriginalPrice(pkg),
    image_url: getPackageImage(pkg),
    cantidad: toNumber(pkg?.cantidad ?? cantidad ?? 1, 1),
  };
}

export function calcularTotal(carrito = []) {
  const total = (carrito || []).reduce((acc, it) => {
    const price = toNumber(it?.price ?? it?.precio ?? 0, 0);
    const qty = toNumber(it?.cantidad ?? it?.quantity ?? 1, 1);
    return acc + price * qty;
  }, 0);

  return total.toFixed(2);
}

/* =========================================================
   TILES PORTADA (CANÓNICOS)
   ========================================================= */

export const PORTADA_TILES = [
  {
    key: "rangos",
    name: "RANGOS",
    to: "/tienda/rangos",
    isGlobal: true,
    image: "https://i.ibb.co/k6yZSyN4/rangos.webp",
  },
  {
    key: "oneblock",
    name: "ONEBLOCK",
    to: "/tienda/oneblock",
    isGlobal: false,
    image: "/assets/reinos/oneblock.webp",
  },
  {
    key: "survival",
    name: "SURVIVAL",
    to: "/tienda/survival",
    isGlobal: false,
    image: "/assets/reinos/survival.webp",
  },
  {
    key: "gens",
    name: "GENS",
    to: "/tienda/gens",
    isGlobal: false,
    image: "/assets/reinos/gens.webp",
  },
];

export const AVISO_PADRES_TILE = {
  key: "antes-de-comprar",
  name: "ANTES DE COMPRAR",
  to: "/tienda/antes-de-comprar",
  isGlobal: true,
  image: "https://i.imgur.com/6HSMUZu.png",
};

/* =========================================================
   SUBCATS / FILTROS (si lo usas en otras vistas)
   ========================================================= */

export const SUBCATS_PER_TILE = {
  // Rangos (aunque sea /tienda/rangos, en Tebex están en "gens")
  "gens|rangos": ["RANGOS"],

  // GENS coins
  "gens|coins": ["GENS", "Coins", "COINS", "Coins Gens", "COINS GENS"],

  // ONEBLOCK coins
  "oneblock|coins": [
    "ONEBLOCK",
    "Coins OB",
    "COINS OB",
    "Coins Oneblock",
    "COINS ONEBLOCK",
  ],

  // SURVIVAL coins
  "survival|coins": [
    "SURVIVAL",
    "Coins Surv",
    "COINS SURV",
    "Coins Survival",
    "COINS SURVIVAL",
  ],
};

export function pickSubcatsFromApi(apiCategories = [], namesAllowed = []) {
  const allowed = Array.isArray(namesAllowed) ? namesAllowed : [];
  const allowedLower = new Set(allowed.map((n) => String(n).toLowerCase()));
  const out = [];

  for (const c of apiCategories || []) {
    const name = c?.name || c?.category_name || "";
    const id = c?.id ?? c?.category_id ?? null;
    if (!id || !name) continue;

    if (
      allowedLower.size === 0 ||
      allowedLower.has(String(name).toLowerCase())
    ) {
      out.push({ id, name, slug: slugify(name) });
    }
  }

  return out;
}

export function findCategoryBySlug(apiCategories = [], slug = "") {
  const cats = pickSubcatsFromApi(apiCategories, []);
  const target = String(slug || "").toLowerCase();
  return cats.find((c) => String(c.slug).toLowerCase() === target) || null;
}

export function filterPackagesByCategoryId(paquetes = [], categoryId) {
  if (!categoryId) return [];
  const wanted = String(categoryId);

  return (paquetes || []).filter((p) => {
    const cid =
      p?.category?.id ??
      p?.category_id ??
      p?.categories?.[0]?.id ??
      p?.categories?.[0]?.category_id ??
      null;

    return cid !== null && String(cid) === wanted;
  });
}

export function filterPackagesBySubcats(paquetes = [], subcats = []) {
  const subcatIds = new Set((subcats || []).map((s) => String(s.id)));

  return (paquetes || []).filter((p) => {
    const cid =
      p?.category?.id ??
      p?.category_id ??
      p?.categories?.[0]?.id ??
      p?.categories?.[0]?.category_id ??
      null;

    return cid && subcatIds.has(String(cid));
  });
}

/* =========================================================
   STOREFRONT (Brawl-like) config + helpers
   ========================================================= */

export const STOREFRONT_CONFIG = {
  rangos: {
    categoryNames: ["RANGOS", "Rangos", "Ranks", "RANKS"],
  },

  // Orden deseado en el front: ONEBLOCK - SURVIVAL - GENS
  servers: [
    {
      key: "oneblock",
      label: "Oneblock",
      categoryNames: [
        "ONEBLOCK",
        "Oneblock",
        "Coins OB",
        "COINS OB",
        "Coins Oneblock",
        "COINS ONEBLOCK",
      ],
    },
    {
      key: "survival",
      label: "Survival",
      categoryNames: [
        "SURVIVAL",
        "Survival",
        "Coins Surv",
        "COINS SURV",
        "Coins Survival",
        "COINS SURVIVAL",
      ],
    },
    {
      key: "gens",
      label: "Gens",
      categoryNames: ["GENS", "Gens", "Coins Gens", "COINS GENS", "Coins", "COINS"],
    },
  ],
};

// Devuelve IDs de categorías cuyo nombre coincide con alguno de los names (case-insensitive)
export function findCategoriesByNames(apiCategories = [], names = []) {
  const wanted = new Set(
    (names || [])
      .map((n) => String(n).trim().toLowerCase())
      .filter(Boolean)
  );
  if (wanted.size === 0) return [];

  const out = [];
  for (const c of apiCategories || []) {
    const name = String(c?.name || c?.category_name || "")
      .trim()
      .toLowerCase();
    const id = c?.id ?? c?.category_id ?? null;
    if (!id || !name) continue;
    if (wanted.has(name)) out.push(String(id));
  }

  // fallback “contains” por si tu categoría es “GENS Coins” etc
  if (out.length === 0) {
    for (const c of apiCategories || []) {
      const raw = String(c?.name || c?.category_name || "")
        .trim()
        .toLowerCase();
      const id = c?.id ?? c?.category_id ?? null;
      if (!id || !raw) continue;

      for (const w of wanted) {
        if (raw.includes(w)) {
          out.push(String(id));
          break;
        }
      }
    }
  }

  return [...new Set(out)];
}

// Filtra paquetes por una lista de category IDs (acepta ids como string/number)
export function filterPackagesByCategoryIds(paquetes = [], categoryIds = []) {
  const set = new Set((categoryIds || []).map((x) => String(x)));
  if (set.size === 0) return [];

  return (paquetes || []).filter((p) => {
    const cid =
      p?.category?.id ??
      p?.category_id ??
      p?.categories?.[0]?.id ??
      p?.categories?.[0]?.category_id ??
      null;

    return cid !== null && set.has(String(cid));
  });
}

/* =========================================================
   FX (cambio de divisa REAL) — Frankfurter (ECB)
   - Convierte importes NUMÉRICOS (no solo símbolo)
   - Cache: memoria + localStorage (TTL 6h)
   ========================================================= */

export const STORE_BASE_CURRENCY = String(
  import.meta.env.VITE_TEBEX_CURRENCY || "EUR"
)
  .toUpperCase()
  .trim();

const FX_TTL_MS = Number(import.meta.env.VITE_FX_TTL_MS || 6 * 60 * 60 * 1000);

const fxMem = {
  byBase: new Map(), // base -> { data, ts }
};

function fxKey(base) {
  return `flan_fx_${String(base || "").toUpperCase()}`;
}

function safeUpper(v, fallback = "EUR") {
  const s = String(v || "").toUpperCase().trim();
  return s || fallback;
}

/**
 * Devuelve:
 * {
 *   base: "EUR",
 *   date: "YYYY-MM-DD",
 *   rates: { USD: 1.08, GBP: 0.86, ... },
 *   ts: 1234567890
 * }
 */
export async function fetchFxRates({
  base = STORE_BASE_CURRENCY,
  to = ["USD", "GBP"],
  force = false,
} = {}) {
  const BASE = safeUpper(base, "EUR");
  const targets = Array.from(
    new Set((Array.isArray(to) ? to : [to]).map((x) => safeUpper(x)))
  ).filter((c) => c && c !== BASE);

  if (!targets.length) {
    return { base: BASE, date: null, rates: {}, ts: Date.now() };
  }

  const now = Date.now();

  // 1) cache memoria
  const mem = fxMem.byBase.get(BASE);
  if (!force && mem?.data && now - (mem.ts || 0) < FX_TTL_MS) {
    return mem.data;
  }

  // 2) cache localStorage
  if (!force) {
    try {
      const raw = localStorage.getItem(fxKey(BASE));
      if (raw) {
        const cached = JSON.parse(raw);
        const ts = Number(cached?.ts || 0);
        if (cached?.rates && ts && now - ts < FX_TTL_MS) {
          fxMem.byBase.set(BASE, { data: cached, ts });
          return cached;
        }
      }
    } catch {}
  }

  // 3) fetch Frankfurter (ECB)
  const url =
    `https://api.frankfurter.app/latest?from=${encodeURIComponent(BASE)}` +
    `&to=${encodeURIComponent(targets.join(","))}`;

  const r = await fetchWithTimeout(
    url,
    {
      method: "GET",
      credentials: "omit",
      headers: { Accept: "application/json" },
    },
    12000
  );

  if (!r.ok) {
    if (mem?.data) return mem.data;
    throw new Error(`FX HTTP ${r.status}`);
  }

  const data = await r.json().catch(() => null);
  const rates = data?.rates && typeof data.rates === "object" ? data.rates : {};
  const payload = {
    base: safeUpper(data?.base || BASE, BASE),
    date: data?.date || null,
    rates,
    ts: now,
  };

  fxMem.byBase.set(BASE, { data: payload, ts: now });

  try {
    localStorage.setItem(fxKey(BASE), JSON.stringify(payload));
  } catch {}

  return payload;
}

/**
 * Rate para ir de fx.base -> toCurrency
 * - si toCurrency === base => 1
 * - si no existe => 1
 */
export function pickFxRate(fx, toCurrency) {
  const to = safeUpper(toCurrency, STORE_BASE_CURRENCY);
  const base = safeUpper(fx?.base || STORE_BASE_CURRENCY, STORE_BASE_CURRENCY);

  if (to === base) return 1;

  const r = Number(fx?.rates?.[to]);
  return Number.isFinite(r) && r > 0 ? r : 1;
}

/**
 * Convierte amount numérico desde fx.base -> toCurrency
 */
export function convertFx(amount, fx, toCurrency) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return NaN;

  const rate = pickFxRate(fx, toCurrency);
  const out = n * (Number.isFinite(rate) ? rate : 1);

  return Number.isFinite(out) ? out : n;
}
