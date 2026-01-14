// src/components/Tienda/utils/tiendaHelpers.js

export const API_URL =
  import.meta.env.VITE_BACKEND_URL ||
  "https://flancraft-backend.onrender.com";

/* =========================
   BASE + endpoints Tebex (robusto)
   ========================= */
export const API_BASE = String(API_URL || "").replace(/\/$/, "");

// Forzable desde .env: VITE_TEBEX_PATH=/api/tebex (o /tebex)
export const TEBEX_PATH = import.meta.env.VITE_TEBEX_PATH || "/api/tebex";
export const TEBEX_URL = `${API_BASE}${TEBEX_PATH}`;

// Fallback por si el backend lo montó sin /api
export const TEBEX_URL_FALLBACK = `${API_BASE}/tebex`;

/* =========================
   Fetch helper (timeout)
   ========================= */
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

/**
 * Cache-bust: añade/actualiza ?v=<bust> respetando hash y query existentes.
 */
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

/**
 * Fetch robusto Tebex:
 * - Intenta TEBEX_URL + path
 * - Si 404, intenta TEBEX_URL_FALLBACK + path
 */
export async function fetchTebex(path, options) {
  const p = String(path || "");
  const safePath = p.startsWith("/") ? p : `/${p}`;

  const r1 = await fetchWithTimeout(`${TEBEX_URL}${safePath}`, options);
  if (r1.status !== 404) return r1;

  return fetchWithTimeout(`${TEBEX_URL_FALLBACK}${safePath}`, options);
}

/**
 * Catálogo público.
 * Endpoint esperado: /api/tebex/public-catalog (o /tebex/public-catalog)
 */
export async function fetchPublicCatalog() {
  const r = await fetchTebex("/public-catalog", { method: "GET" });
  if (!r.ok) throw new Error("No se pudo cargar el catálogo público.");
  return r.json();
}

/**
 * Sale activa (para inferir precio original si el backend solo devuelve price).
 * Intenta:
 * - /sale-activa/:server
 * - /sale-activa?sv=:server
 * - /sale-activa
 */
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
    } catch {
      // sigue probando
    }
  }

  return { active: false, sale: null, raw: null };
}

/** Quita acentos sin alterar mayúsculas/espacios. */
export function stripAccents(str = "") {
  return String(str).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/** Slug seguro (sin acentos, minúsculas, guiones). */
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

/** Id de paquete (id / package_id). */
export function getPackageId(pkg) {
  return pkg?.id ?? pkg?.package_id ?? null;
}

/** Nombre de paquete (best-effort). */
export function getPackageName(pkg) {
  return (
    pkg?.name ??
    pkg?.nombre ??
    pkg?.package_name ??
    pkg?.title ??
    "Producto"
  );
}

/** Precio final (ya con rebajas si backend las aplica). */
export function getPackagePrice(pkg) {
  return toNumber(pkg?.price ?? pkg?.precio ?? 0, 0);
}

/** Precio original (para tachado), si existe. */
export function getPackageOriginalPrice(pkg) {
  const v = pkg?.original_price ?? pkg?.precio_original ?? null;
  if (v === null || v === undefined) return null;
  const n = toNumber(v, NaN);
  return Number.isFinite(n) ? n : null;
}

/** Imagen del paquete (best-effort). */
export function getPackageImage(pkg) {
  return (
    pkg?.image_url ||
    pkg?.image ||
    pkg?.imageUrl ||
    pkg?.img ||
    "/assets/tienda/producto-placeholder.png"
  );
}

/** Normaliza un paquete para carrito (id/name/price + cantidad). */
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

/** Total del carrito (suma price * cantidad). */
export function calcularTotal(carrito = []) {
  const total = (carrito || []).reduce((acc, it) => {
    const price = toNumber(it?.price ?? it?.precio ?? 0, 0);
    const qty = toNumber(it?.cantidad ?? it?.quantity ?? 1, 1);
    return acc + price * qty;
  }, 0);

  return total.toFixed(2);
}

/**
 * Tiles principales de la tienda (portada).
 * Incluye tile sintético "GENS".
 */
export const PORTADA_TILES = [
  {
    server: "lobby",
    name: "RANGOS",
    slug: "rangos",
    image: "https://i.ibb.co/k6yZSyN4/rangos.webp",
  },
  {
    server: "lobby",
    name: "TAGS",
    slug: "tags",
    image: "/assets/reinos/tags.png",
  },
  {
    server: "lobby",
    name: "GENS",
    slug: "gens",
    image: "/assets/reinos/gens.webp",
  },
  {
    server: "clasico",
    name: "SURVIVAL CLASICO",
    slug: "survival-clasico",
    image: "https://i.ibb.co/rfT6fp5k/survival-clasico.webp",
  },
  {
    server: "oneblock",
    name: "ONEBLOCK",
    slug: "oneblock",
    image: "/assets/reinos/oneblock.webp",
  },
];

/** Tile específica para aviso a padres. */
export const AVISO_PADRES_TILE = {
  server: "lobby",
  name: "ANTES DE COMPRAR",
  slug: "antes-de-comprar",
  image: "https://i.imgur.com/6HSMUZu.png",
};

/**
 * Subcategorías reales visibles dentro de cada tile sintética.
 * Clave: `${server}|${slugCategoria}`.
 * Los nombres deben coincidir con Tebex (case-insensitive).
 */
export const SUBCATS_PER_TILE = {
  "lobby|rangos": ["RANGOS"],
  "lobby|tags": ["TAGS"],

  // Importante: debe existir una categoría real en Tebex con nombre "GENS" (o ajusta el string).
  "lobby|gens": ["GENS"],

  "lobby|antes-de-comprar": [],

  "clasico|survival-clasico": [
    "Protecciones",
    "Items OP Survival",
    "Llaves Survival",
    "Dinero Survival",
    "Experiencia Survival",
  ],

  "oneblock|oneblock": ["Items OP Oneblock", "Llaves Oneblock", "Dinero Oneblock"],
};

/**
 * Cruza categorías de la API con una lista permitida por nombre.
 * Devuelve [{id,name,slug}, ...]. Si namesAllowed está vacío, devuelve todas.
 */
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

/** Encuentra una categoría real por slug (slugify(name) === slug). */
export function findCategoryBySlug(apiCategories = [], slug = "") {
  const cats = pickSubcatsFromApi(apiCategories, []);
  const target = String(slug || "").toLowerCase();
  return cats.find((c) => String(c.slug).toLowerCase() === target) || null;
}

/** Filtra paquetes por una categoría (id). */
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

/** Filtra paquetes por subcategorías (array de {id,name,slug}). */
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
