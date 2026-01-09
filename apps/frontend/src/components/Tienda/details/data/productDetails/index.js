// apps/frontend/src/components/Tienda/details/data/productDetails/index.js

import { TAGS_DETAILS } from "./tags.details.js";
import { PROTECCIONES_DETAILS } from "./protecciones.details.js";
import { ITEMSOP_DETAILS } from "./itemsop.details.js";
import { LLAVES_DETAILS } from "./llaves.details.js";
// import { DINERO_DETAILS } from "./dinero.details.js";
// import { EXPERIENCIA_DETAILS } from "./experiencia.details.js";

/* =========================================================
   Registry global
   ========================================================= */
export const PRODUCT_DETAILS_REGISTRY = {
  ...TAGS_DETAILS,
  ...PROTECCIONES_DETAILS,
  ...ITEMSOP_DETAILS,
  ...LLAVES_DETAILS,
  // ...DINERO_DETAILS,
  // ...EXPERIENCIA_DETAILS,
};

/** Normaliza clave */
function normKey(v) {
  return String(v || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\/+/g, "/");
}

/**
 * Resuelve detalles por:
 * - "categoria/slug"
 * - "slug"
 * - "1234567" (id si lo añades como alias)
 *
 * ✅ Soporta alias:
 *   "pico-way": "items-op/pico-way"
 */
export function resolveProductDetails(key) {
  if (!key) return null;

  const visited = new Set();

  const resolveOnce = (kRaw) => {
    const k = normKey(kRaw);
    if (!k) return null;

    if (visited.has(k)) return null;
    visited.add(k);

    // 1) match directo
    let v = PRODUCT_DETAILS_REGISTRY[k];
    if (v != null) return v;

    // 2) variaciones
    const kUnd = k.replace(/\s+/g, "_");
    v = PRODUCT_DETAILS_REGISTRY[kUnd];
    if (v != null) return v;

    const kDash = k.replace(/\s+/g, "-");
    v = PRODUCT_DETAILS_REGISTRY[kDash];
    if (v != null) return v;

    // 3) si viene "categoria/slug", prueba "slug"
    if (k.includes("/")) {
      const slugOnly = k.split("/").pop();

      v = PRODUCT_DETAILS_REGISTRY[slugOnly];
      if (v != null) return v;

      const slugUnd = slugOnly.replace(/\s+/g, "_");
      v = PRODUCT_DETAILS_REGISTRY[slugUnd];
      if (v != null) return v;

      const slugDash = slugOnly.replace(/\s+/g, "-");
      v = PRODUCT_DETAILS_REGISTRY[slugDash];
      if (v != null) return v;
    }

    return null;
  };

  let out = resolveOnce(key);

  for (let i = 0; i < 10; i++) {
    if (out && typeof out === "string") {
      out = resolveOnce(out);
      continue;
    }
    break;
  }

  return out && typeof out === "object" ? out : null;
}
