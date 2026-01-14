// apps/frontend/src/components/Tienda/ProductDetailsMCMenu.jsx
import React from "react";
import ProductDetailsTags from "./ProductDetailsTags.jsx";
import ProductDetailsItemsOP from "./ProductDetailsItemsOP.jsx";
import ProductDetailsLlaves from "./ProductDetailsLlaves.jsx";

function norm(v) {
  return String(v ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function normServerFlat(v) {
  return String(v ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
}

function pickServerFromData(data) {
  const raw =
    data?.props?.server ??
    data?.server ??
    data?.servidor ??
    data?.__pkg?.server ??
    data?.__pkg?.servidor ??
    data?.__pkg?.category ??
    data?.__pkg?.category_name ??
    data?.__pkg?.name ??
    data?.name ??
    null;

  const flat = normServerFlat(raw);

  if (flat.includes("oneblock")) return "oneblock";
  if (flat.includes("gens")) return "gens";
  if (flat.includes("clasico") || flat.includes("survival")) return "clasico";

  // fallback razonable
  return data?.server || data?.servidor || "clasico";
}

function pickVariantFromData(data) {
  const raw = data?.props?.variant ?? data?.variant ?? data?.tipo ?? data?.__pkg?.variant ?? null;
  const v = norm(raw);

  if (v.includes("voto")) return "voto";
  if (v.includes("cabeza")) return "cabezas";
  if (v.includes("spawner")) return "spawners";
  if (v.includes("random")) return "random";

  // fallback: si no viene, no inventamos
  return v || "random";
}

export default function ProductDetailsMCMenu({ data }) {
  const theme = norm(data?.theme);

  if (theme === "tags") return <ProductDetailsTags data={data} />;

  if (theme === "itemsop" || theme === "items-op" || theme === "items_op") {
    return <ProductDetailsItemsOP data={data} />;
  }

  if (theme === "keys" || theme === "llaves" || theme === "key" || theme === "keys_survival") {
    const server = pickServerFromData(data);
    const variant = pickVariantFromData(data);

    // ✅ MUY IMPORTANTE: ProductDetailsLlaves recibe "data", no "registryData"
    return <ProductDetailsLlaves data={data} server={server} variant={variant} />;
  }

  return (
    <div className="tienda-modal__fallback">
      <div className="tienda-modal__fallbackTitle">Detalles avanzados</div>
      <div className="tienda-modal__fallbackText">
        No hay renderer para <code>{data?.theme || data?.id || "este producto"}</code>.
      </div>
    </div>
  );
}
