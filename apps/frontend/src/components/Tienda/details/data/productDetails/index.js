// src/components/Tienda/details/data/productDetails/index.js

import { TAGS_DETAILS } from "./tags.details.js";
import { PROTECCIONES_DETAILS } from "./protecciones.details.js";
import { ITEMSOP_DETAILS } from "./itemsop.details.js";
import { ITEMSOP_ONEBLOCK_DETAILS } from "./itemsop.oneblock.details.js";
import { LLAVES_DETAILS } from "./llaves.details.js";
import { LLAVES_ONEBLOCK_DETAILS } from "./llaves.oneblock.details.js";
import { GENS_DETAILS } from "./gens.details.js"; // ✅ AÑADIR

export const PRODUCT_DETAILS_REGISTRY = {
  ...TAGS_DETAILS,
  ...PROTECCIONES_DETAILS,
  ...ITEMSOP_DETAILS,
  ...ITEMSOP_ONEBLOCK_DETAILS,
  ...LLAVES_DETAILS,
  ...LLAVES_ONEBLOCK_DETAILS,
  ...GENS_DETAILS, // ✅ AÑADIR
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
 * resolveProductDetails(key, scope?)
 */
export function resolveProductDetails(key, scope = null) {
  if (!key) return null;

  const visited = new Set();

  const resolveOnce = (kRaw) => {
    const k = normKey(kRaw);
    if (!k) return null;

    if (visited.has(k)) return null;
    visited.add(k);

    let v = PRODUCT_DETAILS_REGISTRY[k];
    if (v != null) return v;

    const kUnd = k.replace(/\s+/g, "_");
    v = PRODUCT_DETAILS_REGISTRY[kUnd];
    if (v != null) return v;

    const kDash = k.replace(/\s+/g, "-");
    v = PRODUCT_DETAILS_REGISTRY[kDash];
    if (v != null) return v;

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

  const kNorm = normKey(key);
  if (scope && !kNorm.includes("/")) {
    const sc = normKey(scope);
    const candidates = [
      `${sc}/${kNorm}`,
      `${sc}/${kNorm.replace(/\s+/g, "-")}`,
      `${sc}/${kNorm.replace(/\s+/g, "_")}`,
      `${sc.replace(/\s+/g, "-")}/${kNorm}`,
      `${sc.replace(/\s+/g, "_")}/${kNorm}`,
    ];

    for (const c of candidates) {
      const hit = resolveOnce(c);
      if (hit) {
        let out = hit;
        for (let i = 0; i < 10; i++) {
          if (out && typeof out === "string") out = resolveOnce(out);
          else break;
        }
        return out && typeof out === "object" ? out : null;
      }
    }
  }

  let out = resolveOnce(key);
  for (let i = 0; i < 10; i++) {
    if (out && typeof out === "string") out = resolveOnce(out);
    else break;
  }
  return out && typeof out === "object" ? out : null;
}
