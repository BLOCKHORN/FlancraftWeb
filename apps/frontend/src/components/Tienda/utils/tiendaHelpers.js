export const API_URL = import.meta.env.VITE_BACKEND_URL || "https://flancraft-backend.onrender.com";
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

function parseMoneyStrict(v) {
  if (v === null || v === undefined) return NaN;
  if (typeof v === "number") return Number.isFinite(v) ? v : NaN;

  const s0 = String(v).trim();
  if (!s0) return NaN;
  if (s0.includes("%")) return NaN;

  let s = s0.replace(/[^\d.,-]/g, "");
  if (!s) return NaN;

  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");

  if (lastComma > -1 && lastDot > -1) {
    if (lastComma > lastDot) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(/,/g, "");
  } else if (lastComma > -1 && lastDot === -1) {
    s = s.replace(",", ".");
  }

  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

function toMoneyOrNull(v) {
  const n = parseMoneyStrict(v);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100) / 100;
}

function toIntOr(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.floor(n) : fallback;
}

export function getPackageId(pkg) {
  return pkg?.id ?? pkg?.package_id ?? null;
}

export function getPackageName(pkg) {
  return pkg?.name ?? pkg?.nombre ?? pkg?.package_name ?? pkg?.title ?? "Producto";
}

export function getPackagePrice(pkg) {
  return toMoneyOrNull(pkg?.price ?? pkg?.precio ?? pkg?.amount ?? pkg?.cost ?? null);
}

export function getPackageOriginalPrice(pkg) {
  return toMoneyOrNull(pkg?.original_price ?? pkg?.precio_original ?? pkg?.original ?? null);
}

export function getPackageImage(pkg) {
  return pkg?.image_url || pkg?.image || pkg?.imageUrl || pkg?.img || "/assets/tienda/producto-placeholder.png";
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
    cantidad: toIntOr(pkg?.cantidad ?? cantidad ?? 1, 1),
  };
}

export function calcularTotal(carrito = []) {
  const total = (carrito || []).reduce((acc, it) => {
    const price = toMoneyOrNull(it?.price ?? it?.precio ?? null);
    const qty = toIntOr(it?.cantidad ?? it?.quantity ?? 1, 1);
    if (price == null) return acc;
    return acc + price * qty;
  }, 0);

  return (Math.round(total * 100) / 100).toFixed(2);
}

export const PORTADA_TILES = [
  {
    key: "rangos",
    name: "RANGOS",
    to: "/tienda/rangos",
    isGlobal: true,
    image: "https://i.ibb.co/k6yZSyN4/rangos.webp",
  },
  {
    key: "survival",
    name: "SURVIVAL",
    to: "/tienda/survival",
    isGlobal: false,
    image: "/assets/reinos/survival.webp",
  },
];

export const AVISO_PADRES_TILE = {
  key: "antes-de-comprar",
  name: "ANTES DE COMPRAR",
  to: "/tienda/antes-de-comprar",
  isGlobal: true,
  image: "https://i.imgur.com/6HSMUZu.png",
};

export const SUBCATS_PER_TILE = {
  "survival|rangos": ["RANGOS"],
  "survival|coins": ["SURVIVAL", "Coins Surv", "COINS SURV", "Coins Survival", "COINS SURVIVAL", "Coins", "COINS"],
};

export function pickSubcatsFromApi(apiCategories = [], namesAllowed = []) {
  const allowed = Array.isArray(namesAllowed) ? namesAllowed : [];
  const allowedLower = new Set(allowed.map((n) => String(n).toLowerCase()));
  const out = [];

  for (const c of apiCategories || []) {
    const name = c?.name || c?.category_name || "";
    const id = c?.id ?? c?.category_id ?? null;
    if (!id || !name) continue;

    if (allowedLower.size === 0 || allowedLower.has(String(name).toLowerCase())) {
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
    const cid = p?.category?.id ?? p?.category_id ?? p?.categories?.[0]?.id ?? p?.categories?.[0]?.category_id ?? null;
    return cid !== null && String(cid) === wanted;
  });
}

export function filterPackagesBySubcats(paquetes = [], subcats = []) {
  const subcatIds = new Set((subcats || []).map((s) => String(s.id)));

  return (paquetes || []).filter((p) => {
    const cid = p?.category?.id ?? p?.category_id ?? p?.categories?.[0]?.id ?? p?.categories?.[0]?.category_id ?? null;
    return cid && subcatIds.has(String(cid));
  });
}

export const STOREFRONT_CONFIG = {
  rangos: {
    categoryNames: ["RANGOS", "Rangos", "Ranks", "RANKS"],
  },
  servers: [
    {
      key: "survival",
      label: "Survival",
      categoryNames: ["SURVIVAL", "Survival", "Coins Surv", "COINS SURV", "Coins Survival", "COINS SURVIVAL", "Coins", "COINS"],
    },
  ],
};

export function findCategoriesByNames(apiCategories = [], names = []) {
  const wanted = new Set((names || []).map((n) => String(n).trim().toLowerCase()).filter(Boolean));
  if (wanted.size === 0) return [];

  const out = [];
  for (const c of apiCategories || []) {
    const name = String(c?.name || c?.category_name || "").trim().toLowerCase();
    const id = c?.id ?? c?.category_id ?? null;
    if (!id || !name) continue;
    if (wanted.has(name)) out.push(String(id));
  }

  if (out.length === 0) {
    for (const c of apiCategories || []) {
      const raw = String(c?.name || c?.category_name || "").trim().toLowerCase();
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

export function filterPackagesByCategoryIds(paquetes = [], categoryIds = []) {
  const set = new Set((categoryIds || []).map((x) => String(x)));
  if (set.size === 0) return [];

  return (paquetes || []).filter((p) => {
    const cid = p?.category?.id ?? p?.category_id ?? p?.categories?.[0]?.id ?? p?.categories?.[0]?.category_id ?? null;
    return cid !== null && set.has(String(cid));
  });
}

export const STORE_BASE_CURRENCY = "USD";