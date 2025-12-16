// src/components/Tienda/tiendaHelpers.js

export const API_URL =
  import.meta.env.VITE_BACKEND_URL ||
  "https://flancraft-backend.onrender.com";

/** Quita acentos SIN tocar mayúsculas/espacios (compat con código viejo) */
export function stripAccents(str = "") {
  return String(str).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/** Slug seguro (quita acentos, minúsculas y guiones) */
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

/** Obtiene id de paquete de forma robusta (id / package_id). */
export function getPackageId(pkg) {
  return pkg?.id ?? pkg?.package_id ?? null;
}

/** Obtiene nombre de paquete de forma robusta. */
export function getPackageName(pkg) {
  return (
    pkg?.name ??
    pkg?.nombre ??
    pkg?.package_name ??
    pkg?.title ??
    "Producto"
  );
}

/** Obtiene precio final (ya con rebajas si backend las aplica). */
export function getPackagePrice(pkg) {
  return toNumber(pkg?.price ?? pkg?.precio ?? 0, 0);
}

/** Precio original (para mostrar tachado), si existe. */
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

/** Normaliza un paquete a la forma que necesita el carrito (id/name/price + cantidad). */
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

/** Total del carrito (suma price * cantidad). Tolera strings y nulls. */
export function calcularTotal(carrito = []) {
  const total = carrito.reduce((acc, it) => {
    const price = toNumber(it?.price ?? it?.precio ?? 0, 0);
    const qty = toNumber(it?.cantidad ?? it?.quantity ?? 1, 1);
    return acc + price * qty;
  }, 0);
  return total.toFixed(2);
}

/**
 * Tiles principales de la tienda (portada).
 * Aquí definimos manualmente nombre, slug, servidor y la IMAGEN.
 *
 * 👉 SOLO CATEGORÍAS “GORDAS” (3 tiles simétricas).
 */
export const PORTADA_TILES = [
  {
    server: "lobby",
    name: "RANGOS",
    slug: "rangos",
    image: "https://i.ibb.co/k6yZSyN4/rangos.webp",
  },
  {
    server: "clasico",
    name: "SURVIVAL CLASICO",
    slug: "survival-clasico",
    image: "https://i.ibb.co/rfT6fp5k/survival-clasico.webp",
  },
  {
    server: "clasico",
    name: "CHUNKLOCK",
    slug: "chunklock",
    image: "https://i.ibb.co/yB8dyZD4/chunklock.png",
  },
];

/**
 * Tile ESPECÍFICA para el aviso a padres.
 */
export const AVISO_PADRES_TILE = {
  server: "lobby",
  name: "ANTES DE COMPRAR",
  slug: "antes-de-comprar",
  image: "https://i.imgur.com/6HSMUZu.png",
};

/**
 * Subcategorías REALES que deben verse dentro de cada tile sintética.
 * La clave es `${server}|${slugCategoria}`.
 * Los nombres deben coincidir con los de Tebex (case-insensitive).
 */
export const SUBCATS_PER_TILE = {
  // Lobby
  "lobby|rangos": ["RANGOS"],
  "lobby|antes-de-comprar": [],

  // Survival clásico (5 categorías)
  "clasico|survival-clasico": [
    "Protecciones",
    "Items OP",
    "Llaves Survival",
    "Dinero Survival",
    "Experiencia Survival",
  ],

  // Chunklock (4 categorías)
  "clasico|chunklock": [
    "Items OP",
    "Dinero Chunklock",
    "Experiencia Chunklock",
    "Llaves Chunklock",
  ],
};

/**
 * Cruza categorías de la API con una lista permitida por nombre.
 * Devuelve [{id,name,slug}, ...] existentes.
 * Si namesAllowed está vacío, devuelve todas las categorías normalizadas.
 */
export function pickSubcatsFromApi(apiCategories = [], namesAllowed = []) {
  const allowed = Array.isArray(namesAllowed) ? namesAllowed : [];
  const allowedLower = new Set(allowed.map((n) => String(n).toLowerCase()));
  const out = [];

  for (const c of apiCategories) {
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

/** Encuentra una categoría real por slug (slugify(name) === slug) */
export function findCategoryBySlug(apiCategories = [], slug = "") {
  const cats = pickSubcatsFromApi(apiCategories, []); // [] => todas normalizadas
  const target = String(slug || "").toLowerCase();
  return cats.find((c) => String(c.slug).toLowerCase() === target) || null;
}

/** Filtra paquetes por UNA categoría (id) */
export function filterPackagesByCategoryId(paquetes = [], categoryId) {
  if (!categoryId) return [];
  const wanted = String(categoryId);

  return paquetes.filter((p) => {
    const cid =
      p?.category?.id ??
      p?.category_id ??
      p?.categories?.[0]?.id ??
      p?.categories?.[0]?.category_id ??
      null;

    return cid !== null && String(cid) === wanted;
  });
}

/** Filtra paquetes por subcategorías (array de {id,name,slug}) */
export function filterPackagesBySubcats(paquetes = [], subcats = []) {
  const subcatIds = new Set(subcats.map((s) => String(s.id)));
  return paquetes.filter((p) => {
    const cid =
      p?.category?.id ??
      p?.category_id ??
      p?.categories?.[0]?.id ??
      p?.categories?.[0]?.category_id ??
      null;
    return cid && subcatIds.has(String(cid));
  });
}
