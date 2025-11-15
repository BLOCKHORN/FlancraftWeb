// src/components/Tienda/tiendaHelpers.js

export const API_URL =
  import.meta.env.VITE_BACKEND_URL ||
  "https://flancraftweb-backend.onrender.com";

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

/** Total del carrito (suma price * qty=1). Tolera strings y nulls. */
export function calcularTotal(carrito = []) {
  const total = carrito.reduce((acc, it) => {
    const n = Number.parseFloat(it?.price ?? 0);
    return acc + (Number.isFinite(n) ? n : 0);
  }, 0);
  return total.toFixed(2);
}

/**
 * Tiles principales de la tienda (portada).
 * Aquí definimos manualmente nombre, slug, servidor y la IMAGEN.
 */
export const PORTADA_TILES = [
  {
    server: "lobby",
    name: "PREMIUM",
    slug: "premium",
    image: "https://i.imgur.com/YCwSI87.png",
  },
  {
    server: "lobby",
    name: "RANGOS",
    slug: "rangos",
    image: "/tienda/categorias/rangos.png",
  },
  {
    server: "oneblock",
    name: "ONEBLOCK",
    slug: "oneblock",
    image:
      "https://images.minecraft-heads.com/render3d/head/f6/f6e95558abc321fe69c191cada67f973.webp",
  },
  {
    server: "clasico",
    name: "SURVIVAL CLASICO",
    slug: "survival-clasico",
    image: "https://i.imgur.com/m0naATb.png",
  },
  {
    server: "clasico",
    name: "CHUNKLOCK",
    slug: "chunklock",
    image:
      "https://images.minecraft-heads.com/render3d/head/cc/ccdd3e1ee43ae910f35d3cbf50a03a8f.webp",
  },
  {
    server: "lobby",
    name: "¡ANTES DE COMPRAR!",
    slug: "antes-de-comprar",
    image: "https://i.imgur.com/6HSMUZu.png",
  },
];

/**
 * Subcategorías REALES que deben verse dentro de cada tile sintético.
 * La clave es `${server}|${slugCategoria}`.
 * Los nombres deben coincidir con los de Tebex (case-insensitive).
 */
export const SUBCATS_PER_TILE = {
  // Lobby
  "lobby|premium": ["PREMIUM"],
  "lobby|rangos": ["RANGOS", "Rangos Permanentes"],
  "lobby|antes-de-comprar": [],

  // Oneblock
  "oneblock|oneblock": [
    "Keys",
    "Items OP",
    "Minions",
    "Experiencia",
    "Kits",
    "Pase de Batalla",
    "TICKETS KOTH",
  ],

  // Survival clásico
  "clasico|survival-clasico": ["Protecciones", "Items OP", "Llaves", "Dinero"],

  // Chunklock (misma conexión Tebex que Clásico)
  "clasico|chunklock": ["Items OP", "Dinero", "Experiencia"],
};

/**
 * Cruza categorías de la API con una lista permitida por nombre.
 * Devuelve [{id,name}, ...] existentes.
 */
export function pickSubcatsFromApi(apiCategories = [], namesAllowed = []) {
  const allowedLower = new Set(namesAllowed.map((n) => n.toLowerCase()));
  const out = [];
  for (const c of apiCategories) {
    const name = c?.name || c?.category_name || "";
    const id = c?.id ?? c?.category_id ?? null;
    if (!id || !name) continue;
    if (allowedLower.has(name.toLowerCase())) out.push({ id, name });
  }
  return out;
}

/** Filtra paquetes por subcategorías (array de {id,name}) */
export function filterPackagesBySubcats(paquetes = [], subcats = []) {
  const subcatIds = new Set(subcats.map((s) => s.id));
  return paquetes.filter((p) => {
    const cid =
      p?.category?.id ??
      p?.category_id ??
      p?.categories?.[0]?.id ??
      p?.categories?.[0]?.category_id ??
      null;
    return cid && subcatIds.has(cid);
  });
}
