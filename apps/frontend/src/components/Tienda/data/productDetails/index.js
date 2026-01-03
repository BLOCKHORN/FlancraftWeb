// apps/frontend/src/components/Tienda/data/productDetails/index.js
import inmortal30d from "./inmortal_30d.json";

const REGISTRY = {
  inmortal_30d: inmortal30d
};

const ALIASES = {
  inmortal: "inmortal_30d",
  "rango-inmortal": "inmortal_30d",
  "rangos/inmortal": "inmortal_30d",
  "inmortal-30d": "inmortal_30d",
  "inmortal-30-dias": "inmortal_30d",
  "rango-inmortal-30d": "inmortal_30d",
  "rango-inmortal-30-dias": "inmortal_30d",
  "rangos/inmortal-30d": "inmortal_30d",
  "rangos/inmortal-30-dias": "inmortal_30d"
};

export function resolveProductDetails(key) {
  const k = String(key || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");

  const id = ALIASES[k] || k;
  return REGISTRY[id] || null;
}

export default REGISTRY;
